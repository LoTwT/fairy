import {
  CALCULATION_CONTRACT_VERSION,
  CALCULATION_GAME_VERSION,
  DAMAGE_ELEMENTS,
  STAT_UNIT_MAP,
} from "@randomplay/shared"
import type {
  DamageElement,
  EntityId,
  EffectId,
  PanelAttributeBonus,
  SourceBinding,
  Stat,
  GeneralStat,
  DirectStat,
  ContributionRule,
  RuleSet,
  NonEmpty,
  BindingId,
} from "@randomplay/shared"
import { CORE_PACKAGE_VERSION } from "../package-version.ts"
import { inheritDamageElements } from "./element-inheritance.ts"
import { calculateTotalDisplayedDamage } from "../damage.ts"
import {
  calculateStaticDamageFromCatalog,
  evaluateEffects,
  parseEffectRuleSet,
  prepareEffects,
  supplyEffectState,
} from "../effects/index.ts"
import type {
  EntityObservation,
  Result,
  StaticCatalogDamageInput,
  StaticDamageParameters,
  WorldObservation,
  Issue,
  ComponentStatInput,
  EvaluationInput,
} from "../effects/types.ts"
import { IssueCollector } from "../effects/internal/issues.ts"
import { validateSourceBindings } from "../effects/internal/rule.ts"
import { validateStaticCatalog } from "../effects/internal/static-catalog.ts"
import type {
  StaticActionCalculationInput,
  StaticActionCalculationResult,
  StaticActorConfiguration,
  StaticPanelResult,
  StaticPanelValues,
} from "./types.ts"

type Actor = Extract<EntityObservation, { kind: "actor" }>
type Mutable<T> = { -readonly [K in keyof T]: T[K] }
type Components = Mutable<Omit<Actor, "generalStats" | "directStats">> & {
  generalStats: Partial<Record<GeneralStat, Mutable<ComponentStatInput>>>
  directStats: Partial<
    Record<DirectStat, { baseValue: number; additions: number[] }>
  >
}
const direct = new Set<Stat>([
  "criticalRate",
  "criticalDamage",
  "penetrationRatio",
])
const slots = [1, 2, 3, 4, 5, 6] as const

class InputFailure extends Error {
  constructor(readonly issues: NonEmpty<Issue>) {
    super(issues[0].message)
  }
}
function requireValue(
  condition: unknown,
  pointer: string,
  message: string,
  code: Issue["code"] = "INVALID_INPUT",
): asserts condition {
  if (!condition) throw new InputFailure([{ code, pointer, message }])
}
function finite(
  value: unknown,
  pointer: string,
  nonnegative = false,
): asserts value is number {
  requireValue(
    typeof value === "number" &&
      Number.isFinite(value) &&
      (!nonnegative || value >= 0),
    pointer,
    "Expected a finite numeric value in the declared unit",
  )
}
function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw new InputFailure(result.issues)
  return result.value
}
const components = (baseValue: number): Mutable<ComponentStatInput> => ({
  baseValue,
  initialPercentage: [],
  initialFixed: [],
  finalPercentage: [],
  finalFixed: [],
})

/** 稳定来源绑定身份，可用于提供按绑定隔离的效果输入。 */
export function staticSourceBindingId(
  holderId: EntityId,
  kind: SourceBinding["kind"],
  sourceEntityId: string,
): BindingId {
  return `binding:${holderId}:${kind}:${sourceEntityId}`
}

function sourceBindings(actor: StaticActorConfiguration): SourceBinding[] {
  requireValue(
    Object.keys(actor.driveDiscs).toSorted().join(",") === "1,2,3,4,5,6",
    `/actors/${actor.entityId}/driveDiscs`,
    "Provide exactly the six drive-disc slots",
  )
  const bindings: SourceBinding[] = [
    {
      kind: "agent",
      bindingId: staticSourceBindingId(
        actor.entityId,
        "agent",
        actor.agentEntityId,
      ),
      holderId: actor.entityId,
      sourceEntityId: actor.agentEntityId,
      eligible: true,
      configuration: {
        coreSkillLevel: actor.coreSkillLevel,
        mindscapeRank: actor.mindscapeRank,
      },
    },
  ]
  if (actor.wEngine)
    bindings.push({
      kind: "w-engine",
      bindingId: staticSourceBindingId(
        actor.entityId,
        "w-engine",
        actor.wEngine.entityId,
      ),
      holderId: actor.entityId,
      sourceEntityId: actor.wEngine.entityId,
      eligible: actor.wEngine.eligible,
      configuration: { refinement: actor.wEngine.refinement },
    })
  const counts = new Map<string, number>()
  for (const slot of slots) {
    const disc = actor.driveDiscs[slot]
    requireValue(
      disc !== undefined,
      `/actors/${actor.entityId}/driveDiscs/${slot}`,
      "Every slot must be provided; use null for an empty slot",
    )
    if (disc) {
      requireValue(
        typeof disc.setEntityId === "string" && disc.setEntityId.length,
        `/actors/${actor.entityId}/driveDiscs/${slot}/setEntityId`,
        "Missing set identity",
      )
      counts.set(disc.setEntityId, (counts.get(disc.setEntityId) ?? 0) + 1)
    }
  }
  for (const [id, setPieces] of counts)
    bindings.push({
      kind: "drive-disc",
      bindingId: staticSourceBindingId(actor.entityId, "drive-disc", id),
      holderId: actor.entityId,
      sourceEntityId: id,
      eligible: true,
      configuration: { setPieces: setPieces as 1 | 2 | 3 | 4 | 5 | 6 },
    })
  return bindings
}

function applyBonus(
  actor: Components,
  bonus: PanelAttributeBonus,
  extras: {
    penetrationValue: number
    damageBonuses: Partial<Record<DamageElement, number>>
  },
  pointer: string,
): void {
  finite(bonus.value, `${pointer}/value`)
  if (bonus.attribute === "damageBonus") {
    requireValue(
      bonus.operation === "damage-bonus" &&
        bonus.unit === "ratio" &&
        DAMAGE_ELEMENTS.includes(bonus.element),
      pointer,
      "Invalid elemental damage bonus",
      "UNIT_MISMATCH",
    )
    extras.damageBonuses[bonus.element] =
      (extras.damageBonuses[bonus.element] ?? 0) + bonus.value
    return
  }
  if (bonus.attribute === "penetrationValue") {
    requireValue(
      bonus.operation === "initial-fixed" && bonus.unit === "defense-points",
      pointer,
      "Invalid penetration value",
      "UNIT_MISMATCH",
    )
    extras.penetrationValue += bonus.value
    return
  }
  requireValue(
    Object.hasOwn(STAT_UNIT_MAP, bonus.attribute),
    pointer,
    "Unknown attribute",
  )
  if (bonus.operation === "ratio-add") {
    requireValue(
      direct.has(bonus.attribute) && bonus.unit === "ratio",
      pointer,
      "Invalid direct-stat unit",
      "UNIT_MISMATCH",
    )
    const input = actor.directStats[bonus.attribute]
    requireValue(input, pointer, "Missing direct-stat baseline")
    input.additions.push(bonus.value)
    return
  }
  requireValue(
    !direct.has(bonus.attribute),
    pointer,
    "Point-stat contribution required",
  )
  const input = actor.generalStats[bonus.attribute as GeneralStat]
  requireValue(input, pointer, "Missing general-stat baseline")
  requireValue(
    bonus.unit ===
      (bonus.operation === "initial-percentage"
        ? "ratio"
        : STAT_UNIT_MAP[bonus.attribute]),
    pointer,
    "Attribute bonus unit mismatch",
    "UNIT_MISMATCH",
  )
  if (bonus.operation === "base-add") input.baseValue += bonus.value
  else if (bonus.operation === "initial-percentage")
    input.initialPercentage = [...input.initialPercentage, bonus.value]
  else if (bonus.operation === "initial-fixed")
    input.initialFixed = [...input.initialFixed, bonus.value]
  else requireValue(false, pointer, "Unsupported attribute operation")
}

function assembleComponents(
  input: StaticActionCalculationInput,
  actor: StaticActorConfiguration,
) {
  const p = `/actors/${actor.entityId}`
  const record = input.data.agents.find(
    (a) => a.attributes.entityId === actor.agentEntityId,
  )
  requireValue(
    record,
    `${p}/agentEntityId`,
    "Agent attributes were not loaded",
    "MISSING_REFERENCE",
  )
  requireValue(
    record.attributes.schemaVersion === 1 &&
      record.attributes.level === 60 &&
      record.actions.schemaVersion === 1 &&
      record.actions.entityId === actor.agentEntityId,
    p,
    "Agent record/schema mismatch",
    "CONTEXT_MISMATCH",
  )
  const model: Components = {
    kind: "actor",
    entityId: actor.entityId,
    teamId: actor.teamId,
    deriveSheerForce:
      input.data.panelRules.agents[actor.agentEntityId]?.deriveSheerForce ??
      false,
    generalStats: {},
    directStats: {},
  }
  const extras = {
    penetrationValue: 0,
    damageBonuses: {} as Partial<Record<DamageElement, number>>,
  }
  for (const [key, quantity] of Object.entries(
    record.attributes.baseAttributes,
  )) {
    const stat = key as Stat
    requireValue(
      Object.hasOwn(STAT_UNIT_MAP, stat) &&
        quantity.unit === STAT_UNIT_MAP[stat],
      `${p}/baseAttributes/${stat}`,
      "Attribute unit mismatch",
      "UNIT_MISMATCH",
    )
    finite(
      quantity.value,
      `${p}/baseAttributes/${stat}/value`,
      !direct.has(stat),
    )
    if (direct.has(stat))
      model.directStats[stat as DirectStat] = {
        baseValue: quantity.value,
        additions: [],
      }
    else model.generalStats[stat as GeneralStat] = components(quantity.value)
  }
  if (model.deriveSheerForce) model.generalStats.sheerForce = components(0)
  const core = record.attributes.coreAttributeBonuses[actor.coreSkillLevel]
  requireValue(
    Array.isArray(core),
    `${p}/coreSkillLevel`,
    "Missing core attribute row",
    "MISSING_RANK",
  )
  for (const bonus of core)
    applyBonus(model, bonus, extras, `${p}/coreAttributeBonuses`)
  if (actor.wEngine) {
    const engine = input.data.wEngines.find(
      (e) => e.entityId === actor.wEngine!.entityId,
    )
    requireValue(
      engine,
      `${p}/wEngine`,
      "W-engine attributes were not loaded",
      "MISSING_REFERENCE",
    )
    requireValue(
      engine.schemaVersion === 1 && engine.level === 60,
      `${p}/wEngine`,
      "Unsupported w-engine schema",
    )
    applyBonus(
      model,
      engine.baseAttribute,
      extras,
      `${p}/wEngine/baseAttribute`,
    )
    if (actor.panel.mode === "equipment")
      applyBonus(
        model,
        engine.advancedAttribute,
        extras,
        `${p}/wEngine/advancedAttribute`,
      )
  }
  if (actor.panel.mode === "equipment") {
    const table = input.data.driveDiscAffixes
    requireValue(
      table.schemaVersion === 1 &&
        table.rarity === "S" &&
        table.enhancement === "maximum",
      "/data/driveDiscAffixes",
      "Expected the S-rank maximum-enhancement table",
    )
    for (const slot of slots) {
      const disc = actor.driveDiscs[slot]
      if (!disc) continue
      requireValue(
        disc.mainStat && Array.isArray(disc.substats),
        `${p}/driveDiscs/${slot}`,
        "Equipment input requires main stat and substat rolls",
      )
      const main = table.mainStatsBySlot[slot].find(
        (b) =>
          b.attribute === disc.mainStat!.attribute &&
          (b.attribute === "damageBonus"
            ? b.element === disc.mainStat!.element
            : disc.mainStat!.element === undefined),
      )
      requireValue(
        main,
        `${p}/driveDiscs/${slot}/mainStat`,
        "Illegal main stat for this slot",
      )
      applyBonus(model, main, extras, `${p}/driveDiscs/${slot}/mainStat`)
      const seen = new Set<string>()
      let total = 0
      requireValue(
        disc.substats.length <= 4,
        `${p}/driveDiscs/${slot}/substats`,
        "At most four distinct substats are allowed",
      )
      for (const [i, sub] of disc.substats.entries()) {
        const path = `${p}/driveDiscs/${slot}/substats/${i}`
        requireValue(
          !seen.has(`${sub.attribute}:${sub.operation}`),
          path,
          "Duplicate substat",
          "DUPLICATE_ID",
        )
        seen.add(`${sub.attribute}:${sub.operation}`)
        requireValue(
          Number.isInteger(sub.rolls) && sub.rolls >= 1 && sub.rolls <= 6,
          `${path}/rolls`,
          "Rolls include the initial roll and must be between 1 and 6",
        )
        total += sub.rolls
        const base = table.substatsPerRoll.find(
          (b) => b.attribute === sub.attribute && b.operation === sub.operation,
        )
        requireValue(
          base &&
            !(
              base.attribute === main.attribute &&
              base.operation === main.operation
            ),
          path,
          "Illegal substat or substat matching the main stat",
        )
        applyBonus(
          model,
          { ...base, value: base.value * sub.rolls },
          extras,
          path,
        )
      }
      requireValue(
        total <= 9,
        `${p}/driveDiscs/${slot}/substats`,
        "Substat rolls exceed the maximum of nine",
      )
    }
  }
  return { model, extras, record }
}

function panelDefinitions(input: StaticActionCalculationInput): RuleSet {
  const metadata = input.data.panelRules.twoPieceOptions.flatMap(
    (o) => o.outputs,
  )
  const effects: ContributionRule[] = []
  for (const output of metadata) {
    if (output.kind === "conditional-damage") continue
    const rule = input.data.definitions.effects.find(
      (r) => r.effectId === output.effectId,
    )
    requireValue(
      rule?.kind === "contribution" && rule.beneficiary.kind === "holder",
      "/data/panelRules",
      "Panel output must identify a holder contribution",
      "CONTEXT_MISMATCH",
    )
    const operation =
      rule.operation.kind === "stat-adjustment" &&
      rule.operation.stage === "final-fixed"
        ? { ...rule.operation, stage: "initial-fixed" as const }
        : rule.operation
    effects.push({
      ...rule,
      activation: { kind: "continuous" },
      operation,
    } as ContributionRule)
  }
  for (const actor of input.actors) {
    const rules = input.data.panelRules.agents[actor.agentEntityId]
    requireValue(
      rules,
      `/data/panelRules/agents/${actor.agentEntityId}`,
      "Missing permanent panel rules",
      "MISSING_REFERENCE",
    )
    for (const rule of rules.initialConversions)
      if (!effects.some((r) => r.effectId === rule.effectId)) effects.push(rule)
  }
  return {
    schemaVersion: 1,
    ruleSetId: `${input.data.definitions.ruleSetId}:panels`,
    revision: input.data.version.snapshotId,
    effects,
    states: [],
    actions: [],
  }
}

function settlePanel(
  input: StaticActionCalculationInput,
  actor: StaticActorConfiguration,
  bindings: readonly SourceBinding[],
  definitions: RuleSet,
): { observation: Actor; result: StaticPanelResult } {
  const { model, extras } = assembleComponents(input, actor)
  let stats: StaticPanelValues
  let contributions: StaticPanelResult["contributions"] = []
  if (actor.panel.mode === "out-of-combat") {
    stats = actor.panel.stats
    finite(
      actor.panel.penetrationValue,
      `/actors/${actor.entityId}/panel/penetrationValue`,
      true,
    )
    extras.penetrationValue = actor.panel.penetrationValue
    extras.damageBonuses = { ...actor.panel.damageBonuses }
    for (const relation of input.data.panelRules.damageElementInheritance) {
      const base = extras.damageBonuses[relation.baseElement]
      if (
        extras.damageBonuses[relation.element] === undefined &&
        base !== undefined
      )
        extras.damageBonuses[relation.element] = base
    }
    for (const [element, bonus] of Object.entries(extras.damageBonuses)) {
      requireValue(
        DAMAGE_ELEMENTS.includes(element as DamageElement),
        `/actors/${actor.entityId}/panel/damageBonuses/${element}`,
        "Unknown damage element",
      )
      finite(bonus, `/actors/${actor.entityId}/panel/damageBonuses/${element}`)
    }
  } else {
    const equipmentBonuses = { ...extras.damageBonuses }
    for (const relation of input.data.panelRules.damageElementInheritance) {
      extras.damageBonuses[relation.element] =
        (equipmentBonuses[relation.element] ?? 0) +
        (equipmentBonuses[relation.baseElement] ?? 0)
    }
    const prepared = unwrap(
      prepareEffects(
        definitions,
        bindings.filter((b) => b.holderId === actor.entityId),
      ),
    )
    const state = unwrap(
      supplyEffectState(prepared, {
        sessionId: "session:static-panel",
        atSeconds: 0,
        instances: [],
        snapshots: [],
        cooldowns: [],
        eventHistory: { processedIds: [], last: null },
      }),
    )
    const world: WorldObservation = {
      entities: [model],
      states: [],
      distances: [],
    }
    const query = (queryInput: EvaluationInput) =>
      unwrap(evaluateEffects(prepared, state, queryInput))
    const panel = query({
      kind: "panel",
      world,
      atSeconds: 0,
      observedSnapshots: [],
      entities: [actor.entityId],
      stats: [
        ...Object.keys(model.generalStats),
        ...Object.keys(model.directStats),
      ] as unknown as NonEmpty<Stat>,
    })
    stats = Object.fromEntries(
      panel.attributes.map((a) => [a.stat, a.value]),
    ) as StaticPanelValues
    contributions = panel.contributions
    for (const element of DAMAGE_ELEMENTS) {
      const evaluated = query({
        kind: "hit",
        world,
        atSeconds: 0,
        observedSnapshots: [],
        hit: {
          hitId: `hit:panel:${element}`,
          actionId: "action:panel",
          actionInstanceId: "action-instance:panel",
          actorId: actor.entityId,
          targetId: actor.entityId,
          skillCategory: "uncategorized",
          element,
          damageKind: "regular",
          skillTags: [],
          targetState: "not-stunned",
          actionSnapshotId: "snapshot:panel",
          origin: { kind: "direct" },
          damageItems: [
            { itemId: "panel", damageMultiplier: 1, stat: "attack" },
          ],
        },
      })
      const damage = evaluated.contributions.filter(
        (c) =>
          c.address.kind === "factor" && c.address.channel === "damage-bonus",
      )
      extras.damageBonuses[element] =
        (extras.damageBonuses[element] ?? 0) +
        damage.reduce((sum, c) => sum + c.value.value, 0)
      contributions = [...contributions, ...damage]
    }
  }
  const generalStats: Mutable<Actor["generalStats"]> = {}
  const directStats: Mutable<Actor["directStats"]> = {}
  requireValue(
    stats && typeof stats === "object",
    `/actors/${actor.entityId}/panel/stats`,
    "A settled panel is required",
  )
  for (const [key, quantity] of Object.entries(stats)) {
    const stat = key as Stat
    requireValue(
      Object.hasOwn(STAT_UNIT_MAP, stat) &&
        quantity &&
        quantity.unit === STAT_UNIT_MAP[stat],
      `/actors/${actor.entityId}/panel/stats/${stat}`,
      "Panel unit mismatch",
      "UNIT_MISMATCH",
    )
    finite(
      quantity.value,
      `/actors/${actor.entityId}/panel/stats/${stat}/value`,
      !direct.has(stat),
    )
    if (direct.has(stat))
      directStats[stat as DirectStat] = {
        baseValue: quantity.value,
        additions: [],
      }
    else {
      const baseValue = model.generalStats[stat as GeneralStat]?.baseValue
      generalStats[stat as GeneralStat] = {
        settledInitialValue: quantity.value,
        ...(baseValue === undefined ? {} : { baseValue }),
        finalPercentage: [],
        finalFixed: [],
      }
    }
  }
  return {
    observation: { ...model, generalStats, directStats },
    result: {
      entityId: actor.entityId,
      stats: structuredClone(stats),
      ...extras,
      contributions,
    },
  }
}

function battleSelections(
  input: StaticActionCalculationInput,
  bindings: readonly SourceBinding[],
): StaticCatalogDamageInput["selections"] {
  const result: StaticCatalogDamageInput["selections"][number][] = []
  for (const [i, selection] of input.selections.entries()) {
    requireValue(
      Number.isSafeInteger(selection.layers) && selection.layers >= 0,
      `/selections/${i}/layers`,
      "Layers must be a non-negative safe integer",
    )
    const option = input.data.catalog.options.find(
      (o) => o.optionId === selection.optionId,
    )
    const identity = input.data.catalog.entities.find(
      (e) => e.catalogEntityId === option?.catalogEntityId,
    )?.identity
    const binding = bindings.find(
      (b) =>
        b.holderId === selection.holderId &&
        b.kind === identity?.kind &&
        b.sourceEntityId === identity.entityId,
    )
    requireValue(
      binding,
      `/selections/${i}`,
      "Selected option does not belong to this holder's configured equipment",
      "CONTEXT_MISMATCH",
    )
    requireValue(
      !input.data.panelRules.twoPieceOptions.some(
        (o) => o.optionId === selection.optionId,
      ),
      `/selections/${i}`,
      "Two-piece effects are selected automatically from equipped piece counts",
    )
    result.push({
      optionId: selection.optionId,
      bindingId: binding.bindingId,
      layers: selection.layers,
    })
  }
  for (const binding of bindings) {
    if (binding.kind !== "drive-disc" || binding.configuration.setPieces < 2)
      continue
    const options = input.data.panelRules.twoPieceOptions.filter(
      (o) => o.sourceEntityId === binding.sourceEntityId,
    )
    requireValue(
      options.length,
      `/bindings/${binding.bindingId}`,
      "Missing two-piece definitions",
      "MISSING_REFERENCE",
    )
    for (const option of options)
      result.push({
        optionId: option.optionId,
        bindingId: binding.bindingId,
        layers: 1,
      })
  }
  return result
}

/** 完整静态计算；全部数据由调用方提供，不装载文件、网络或 data 包。 */
export function calculateStaticActionDamage(
  input: StaticActionCalculationInput,
): Result<StaticActionCalculationResult> {
  try {
    requireValue(
      input &&
        typeof input === "object" &&
        input.data &&
        Array.isArray(input.actors) &&
        Array.isArray(input.selections),
      "",
      "Expected static calculation data, actors and selections",
    )
    const version = input.data.version
    requireValue(
      version && version.packageVersion === CORE_PACKAGE_VERSION,
      "/data/version/packageVersion",
      `core and data must use the same release (${CORE_PACKAGE_VERSION})`,
      "CONTEXT_MISMATCH",
    )
    requireValue(
      version.contractVersion === CALCULATION_CONTRACT_VERSION,
      "/data/version/contractVersion",
      "Unsupported calculation contract",
      "CONTEXT_MISMATCH",
    )
    requireValue(
      version.gameVersion === CALCULATION_GAME_VERSION,
      "/data/version/gameVersion",
      "Unsupported game rules",
      "CONTEXT_MISMATCH",
    )
    requireValue(
      /^sha256:[a-f0-9]{64}$/u.test(version.snapshotId),
      "/data/version/snapshotId",
      "Missing calculation snapshot identity",
      "CONTEXT_MISMATCH",
    )
    unwrap(parseEffectRuleSet(input.data.definitions))
    unwrap(validateStaticCatalog(input.data.catalog, input.data.definitions))
    input = {
      ...input,
      data: {
        ...input.data,
        definitions: inheritDamageElements(
          input.data.definitions,
          input.data.panelRules.damageElementInheritance,
        ),
        catalog: inheritDamageElements(
          input.data.catalog,
          input.data.panelRules.damageElementInheritance,
        ),
      },
    }
    requireValue(
      input.actors.length > 0 &&
        new Set(input.actors.map((a) => a.entityId)).size ===
          input.actors.length,
      "/actors",
      "Provide distinct actor identities",
    )
    requireValue(
      input.target &&
        !input.actors.some((a) => a.entityId === input.target.entityId),
      "/target/entityId",
      "Target must have a distinct identity",
    )
    const selectedActor = input.actors.find((a) => a.entityId === input.actorId)
    requireValue(
      selectedActor,
      "/actorId",
      "The action actor is not configured",
      "MISSING_REFERENCE",
    )
    for (const [i, actor] of input.actors.entries())
      requireValue(
        actor.panel &&
          (actor.panel.mode === "equipment" ||
            actor.panel.mode === "out-of-combat") &&
          actor.driveDiscs,
        `/actors/${i}/panel`,
        "Only equipment and out-of-combat panels are supported",
      )
    requireValue(
      input.action?.ok,
      "/action",
      input.action?.ok === false
        ? input.action.issues.map((i) => i.message).join("; ")
        : "A resolved action is required",
    )
    const action = input.action
    requireValue(
      action.resolutionContext?.agentEntityId === selectedActor.agentEntityId &&
        action.resolutionContext?.mindscapeRank === selectedActor.mindscapeRank,
      "/action/resolutionContext",
      "Resolved action must match the configured agent and mindscape rank",
      "CONTEXT_MISMATCH",
    )
    const record = input.data.agents.find(
      (a) => a.attributes.entityId === selectedActor.agentEntityId,
    )
    const catalogAction = record?.actions.actions.find(
      (a) => a.actionId === action.actionId,
    )
    requireValue(
      catalogAction && catalogAction.skillCategory === action.skillCategory,
      "/action/actionId",
      "Action and actor identity disagree",
      "CONTEXT_MISMATCH",
    )
    requireValue(
      catalogAction.calculation.kind === action.calculation.kind &&
        JSON.stringify(catalogAction.skillTargetIds) ===
          JSON.stringify(action.skillTargetIds) &&
        JSON.stringify(catalogAction.skillTags) ===
          JSON.stringify(action.skillTags),
      "/action",
      "Resolved action classification and targets must match the loaded record",
      "CONTEXT_MISMATCH",
    )
    if (
      catalogAction.calculation.kind === "damage" &&
      action.calculation.kind === "damage"
    ) {
      const sourceSegments = catalogAction.calculation.segments
      requireValue(
        sourceSegments.length === action.calculation.segments.length,
        "/action/calculation/segments",
        "Resolved segment membership must match the loaded record",
        "CONTEXT_MISMATCH",
      )
      for (const [i, segment] of action.calculation.segments.entries()) {
        const source = sourceSegments[i]!
        requireValue(
          source.segmentId === segment.segmentId &&
            source.repeat === segment.repeat &&
            source.granularity === segment.granularity &&
            source.element === segment.element &&
            source.damageKind === segment.damageKind &&
            source.items.length === segment.damageItems.length &&
            source.items.every(
              (item, index) =>
                item.itemId === segment.damageItems[index]?.itemId &&
                item.stat === segment.damageItems[index]?.stat,
            ),
          `/action/calculation/segments/${i}`,
          "Resolved hit structure must match the loaded record",
          "CONTEXT_MISMATCH",
        )
      }
    }
    const bindings = input.actors.flatMap(sourceBindings)
    const selections = battleSelections(input, bindings)
    const panelRules = panelDefinitions(input)
    const bindingIssues = new IssueCollector()
    validateSourceBindings(bindings, bindingIssues)
    const issues = bindingIssues.toIssues()
    if (issues) throw new InputFailure(issues)
    const settled = input.actors.map((a) =>
      settlePanel(input, a, bindings, panelRules),
    )
    const panels = settled.map((s) => s.result)
    if (action.calculation.kind === "daze-only")
      return {
        ok: true,
        value: { kind: "daze-only", panels, limitations: action.limitations },
      }
    const included = new Set<EffectId>(
      input.data.panelRules.twoPieceOptions.flatMap((o) =>
        o.outputs
          .filter((v) => v.kind !== "conditional-damage")
          .map((v) => v.effectId),
      ),
    )
    const definitions: RuleSet = {
      ...input.data.definitions,
      effects: input.data.definitions.effects.map((rule) =>
        rule.kind === "contribution" && included.has(rule.effectId)
          ? { ...rule, when: { kind: "constant", value: false } }
          : rule,
      ),
    }
    const world: WorldObservation = {
      entities: [
        ...settled.map((s) => s.observation),
        {
          kind: "actor",
          entityId: input.target.entityId,
          teamId: input.target.teamId,
          generalStats: {},
          directStats: {},
        },
      ],
      states: input.observedWorld?.states ?? [],
      distances: input.observedWorld?.distances ?? [],
    }
    const panel = panels.find((p) => p.entityId === input.actorId)!
    const common = {
      definitions,
      catalog: input.data.catalog,
      bindings,
      selections,
      world,
      actorSources: input.actors.map((a) => ({
        entityId: a.entityId,
        agentEntityId: a.agentEntityId,
      })),
      ...(input.inputs ? { inputs: input.inputs } : {}),
      ...(input.snapshots ? { snapshots: input.snapshots } : {}),
      ...(input.atSeconds === undefined ? {} : { atSeconds: input.atSeconds }),
    }
    const segments: Extract<
      StaticActionCalculationResult,
      { kind: "damage" }
    >["segments"][number][] = []
    requireValue(
      action.skillCategory !== null,
      "/action/skillCategory",
      "Action category is unavailable",
    )
    const hit = {
      actorId: input.actorId,
      targetId: input.target.entityId,
      actionId: action.actionId,
      skillCategory: action.skillCategory,
      skillTags: action.skillTags,
      skillTargetIds: action.skillTargetIds,
    }
    if (action.calculation.kind === "luminize") {
      requireValue(
        !input.requireIndividualHits,
        "/action",
        "Individual luminize hits have not been verified",
      )
      requireValue(
        input.luminize?.damage.kind === "luminize",
        "/luminize",
        "Luminize requires explicit damage sources, parameters and snapshots",
      )
      requireValue(
        input.luminize.damage.luminizeMultiplier.baseLuminizeMultiplier ===
          action.calculation.multiplier,
        "/luminize/damage/luminizeMultiplier",
        "Luminize multiplier must match the resolved action",
      )
      const damage = unwrap(
        calculateStaticDamageFromCatalog({
          ...common,
          ...input.luminize,
          hit: { ...input.luminize.hit, ...hit },
        }),
      )
      segments.push({
        segmentId: action.actionId,
        repetition: 1,
        granularity: "aggregate",
        damage,
      })
    } else {
      requireValue(
        action.calculation.segments.length > 0,
        "/action/calculation/segments",
        "Damage action has no segments",
      )
      for (const segment of action.calculation.segments) {
        requireValue(
          segment.damageKind === "regular" || segment.damageKind === "sheer",
          `/action/segments/${segment.segmentId}/damageKind`,
          "Unsupported action damage kind",
        )
        requireValue(
          Number.isSafeInteger(segment.repeat) && segment.repeat > 0,
          `/action/segments/${segment.segmentId}/repeat`,
          "Repeat must be a positive safe integer",
        )
        requireValue(
          segment.granularity === "individual" ||
            segment.granularity === "aggregate",
          `/action/segments/${segment.segmentId}/granularity`,
          "Unknown hit granularity",
        )
        requireValue(
          !input.requireIndividualHits || segment.granularity === "individual",
          `/action/segments/${segment.segmentId}`,
          "Individual hits have not been verified",
        )
        const damageBonus = panel.damageBonuses[segment.element]
        finite(
          damageBonus,
          `/actors/${input.actorId}/panel/damageBonuses/${segment.element}`,
        )
        const baseElement = input.data.panelRules.damageElementInheritance.find(
          (relation) => relation.element === segment.element,
        )?.baseElement
        const resistance =
          input.target.resistances[segment.element] ??
          (baseElement === undefined
            ? undefined
            : input.target.resistances[baseElement])
        finite(resistance, `/target/resistances/${segment.element}`)
        const commonDamage = {
          damageBonus: [damageBonus],
          resistance: {
            targetResistance: resistance,
            targetResistanceReductions: [],
            attackerResistanceIgnoreValues: [],
          },
          damageTaken: {
            targetDamageTakenIncreases: [],
            targetDamageTakenReductions: [],
          },
          stunDamage: {
            isTargetStunned: input.target.isStunned,
            targetBaseStunDamageMultiplier:
              input.target.baseStunDamageMultiplier,
            targetStunDamageMultiplierAdjustments: [],
          },
        }
        const damage: StaticDamageParameters =
          segment.damageKind === "regular"
            ? {
                ...commonDamage,
                kind: "regular",
                defense: {
                  attackerLevel: 60,
                  targetBaseDefense: input.target.baseDefense,
                  defensePercentageAdjustments: [],
                  penetrationValues: [panel.penetrationValue],
                },
              }
            : { ...commonDamage, kind: "sheer", sheerDamageBonus: [] }
        for (let repetition = 1; repetition <= segment.repeat; repetition++) {
          const result = unwrap(
            calculateStaticDamageFromCatalog({
              ...common,
              hit: {
                ...hit,
                element: segment.element,
                damageItems: segment.damageItems.map((item) => ({
                  ...item,
                  role: "base",
                  mode: "direct",
                  statSource: { entityId: input.actorId },
                })) as unknown as StaticCatalogDamageInput["hit"]["damageItems"],
              },
              damage,
            }),
          )
          if (segment.granularity === "aggregate") {
            requireValue(
              !result.evaluation.contributions.some(
                (c) =>
                  (c.address.kind === "hit" && c.operator === "add") ||
                  (c.address.kind === "factor" &&
                    c.address.channel === "base-multiplier-addition"),
              ),
              `/action/segments/${segment.segmentId}`,
              "The selected per-hit addition requires verified individual hits",
            )
          }
          segments.push({
            segmentId: segment.segmentId,
            repetition,
            granularity: segment.granularity,
            damage: result,
          })
        }
      }
    }
    const nonCritical = segments.map((s) => s.damage.nonCritical)
    const critical = segments.every((s) => s.damage.critical !== null)
      ? segments.map((s) => s.damage.critical!)
      : null
    const individual = segments.every((s) => s.granularity === "individual")
    const totals = {
      nonCritical: nonCritical.reduce((a, b) => a + b, 0),
      critical: critical?.reduce((a, b) => a + b, 0) ?? null,
      expected: segments.reduce((sum, s) => sum + s.damage.expected, 0),
      displayedNonCritical: individual
        ? calculateTotalDisplayedDamage(nonCritical)
        : null,
      displayedCritical:
        individual && critical ? calculateTotalDisplayedDamage(critical) : null,
    }
    for (const value of Object.values(totals))
      if (value !== null) finite(value, "/totals")
    return {
      ok: true,
      value: {
        kind: "damage",
        panels,
        segments,
        totals,
        limitations: action.limitations,
      },
    }
  } catch (error) {
    if (error instanceof InputFailure)
      return { ok: false, issues: error.issues }
    if (error instanceof TypeError || error instanceof RangeError)
      return {
        ok: false,
        issues: [
          { code: "INVALID_INPUT", pointer: "", message: error.message },
        ],
      }
    throw error
  }
}
