import { parseEffectRuleSet } from "../parse-effect-rule-set.ts"
import type {
  AstraYaoM4ConditionalModel,
  AstraYaoM4DamageInput,
  AstraYaoM4DamageResult,
  AstraYaoM4Event,
  AstraYaoM4Rule,
  BindingId,
  ContributionRule,
  EffectId,
  EffectRule,
  Result,
  RuleSet,
  StaticCatalogDamageInput,
  StaticEffectCatalog,
  StaticEffectSelection,
} from "../types.ts"
import { expectArray, expectObject, rejectUnknownFields } from "./checks.ts"
import { IssueCollector, failure } from "./issues.ts"
import { validateSourceBindings, validateSourceReference } from "./rule.ts"
import {
  calculateOrdinaryStaticDamageFromCatalog,
  validateStaticCatalog,
} from "./static-catalog.ts"
import { calculateOrdinaryStaticDamage } from "./static-damage.ts"
import { DAMAGE_ELEMENTS, isIdentityString } from "./vocabulary.ts"
import {
  validateAttributeSource,
  validateSnapshots,
  validateWorldObservation,
} from "./world.ts"

export const ASTRA_YAO_M4_MECHANISM =
  "astra-yao-m4-quick-assist-damage" as const
export const ASTRA_YAO_M4_ITEM =
  "astrayao:m4-quick-assist-bonus-damage" as const
export const ASTRA_YAO_M4_TARGET =
  "zzz-hp:skill:astrayao-m4-quick-assist-bonus-damage" as const

export function isAstraYaoM4Rule(rule: EffectRule): rule is AstraYaoM4Rule {
  return (
    rule.kind === "contribution" &&
    rule.operation.kind === ASTRA_YAO_M4_MECHANISM
  )
}

/** 只由具名入口构造，不属于普通输入，也不从包入口导出。 */
export interface ValidatedAstraYaoM4Context {
  readonly effectId: EffectId
  readonly bindingId: BindingId
  readonly active: boolean
  readonly conditionalModel: AstraYaoM4ConditionalModel
}

export function bridgeAstraYaoM4Rule(rule: AstraYaoM4Rule): ContributionRule {
  return {
    ...rule,
    operation: {
      kind: "hit-adjustment",
      field: "damageMultiplier",
      operator: "add",
      itemIds: [ASTRA_YAO_M4_ITEM],
      value: { kind: "literal", unit: "multiplier", value: 3 },
    },
  }
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .toSorted(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`
  return JSON.stringify(value)
}

/** 在普通目录结构验证之后检查规则、选项、具名目标及 metadata 的双向唯一性。 */
export function validateAstraYaoM4Catalog(
  catalog: StaticEffectCatalog,
  definitions: RuleSet,
  collector: IssueCollector,
): void {
  const rules = definitions.effects.filter(isAstraYaoM4Rule)
  const mechanisms = (catalog.mechanisms ?? []).filter(
    (m) => m.mechanism === ASTRA_YAO_M4_MECHANISM,
  )
  const targets = catalog.skillTargets.filter(
    (t) => t.targetId === ASTRA_YAO_M4_TARGET,
  )
  if (!rules.length && !mechanisms.length && !targets.length) return
  if (rules.length !== 1 || mechanisms.length !== 1) {
    collector.report(
      mechanisms.length > 1 ? "DUPLICATE_ID" : "INVALID_DEFINITION",
      "/catalog/mechanisms",
      "Astra Yao M4 requires exactly one corresponding rule and mechanism",
    )
    return
  }
  const rule = rules[0]!,
    mechanism = mechanisms[0]!
  const pointer = `/catalog/mechanisms/${catalog.mechanisms!.indexOf(mechanism)}`
  const checks = {
    collector,
    pointer,
    structureCode: "INVALID_DEFINITION" as const,
  }
  rejectUnknownFields(
    mechanism as unknown as Record<string, unknown>,
    [
      "mechanism",
      "agentEntityId",
      "optionId",
      "effectId",
      "itemId",
      "skillTargetId",
      "references",
    ],
    checks,
    "Astra Yao M4 mechanism",
  )
  const option = catalog.options.find((o) => o.optionId === mechanism.optionId)
  const entity = catalog.entities.find(
    (e) => e.catalogEntityId === option?.catalogEntityId,
  )
  const variant = option?.variants[0]
  const referring = catalog.options.filter((o) =>
    o.variants.some((v) => v.effectIds.includes(rule.effectId)),
  )
  const requiredItem = {
    itemId: ASTRA_YAO_M4_ITEM,
    stat: "attack",
    role: "base",
    allowedModes: ["direct"],
    source: "holder-current",
    requiredDirectMultiplier: 0,
    requiredSkillCategory: "uncategorized",
  }
  if (
    mechanism.agentEntityId !== "1311" ||
    mechanism.effectId !== rule.effectId ||
    mechanism.itemId !== ASTRA_YAO_M4_ITEM ||
    mechanism.skillTargetId !== ASTRA_YAO_M4_TARGET ||
    !option ||
    entity?.identity?.kind !== "agent" ||
    entity.identity.entityId !== "1311" ||
    entity.status !== "mapped" ||
    option.target !== "team" ||
    option.exclusiveGroup !== undefined ||
    referring.length !== 1 ||
    referring[0] !== option ||
    option.variants.length !== 1 ||
    !variant ||
    (variant.target ?? option.target) !== "team" ||
    canonical(variant.effectIds) !== canonical([rule.effectId]) ||
    variant.maximumLayers !== 1 ||
    variant.status === "unsupported" ||
    variant.inputs.length !== 0 ||
    Object.keys(variant.applicability).length !== 0 ||
    canonical(variant.configuration) !==
      canonical({
        minimumMindscape: 4,
        coreSkillLevels: [1, 2, 3, 4, 5, 6, 7],
      }) ||
    variant.mechanism?.kind !== "independent-settlement" ||
    canonical(variant.mechanism.damageItemRequirements) !==
      canonical([requiredItem]) ||
    variant.mechanism.isolateDamageItems !== true ||
    variant.mechanism.completeState !== undefined ||
    targets.length !== 1 ||
    targets[0]?.agentEntityId !== "1311" ||
    targets[0]?.category !== "uncategorized" ||
    targets[0]?.countsAsFollowUp !== false
  ) {
    collector.report(
      "INVALID_DEFINITION",
      pointer,
      "Astra Yao M4 metadata, source, sole team option, fixed item and provider-owned target must correspond",
    )
  }
  if (!option || !variant || !collector.isEmpty) return
  const references = expectArray(
    mechanism.references,
    { ...checks, pointer: `${pointer}/references` },
    "mechanism references",
  )
  if (!references) return
  for (const [referencePointer, sourceReferences] of [
    [`${pointer}/references`, references],
    [
      `/catalog/options/${catalog.options.indexOf(option)}/variants/0/references`,
      variant.references,
    ],
  ] as const)
    for (const [index, reference] of sourceReferences.entries())
      validateSourceReference(reference, {
        ...checks,
        pointer: `${referencePointer}/${index}`,
      })
  if (!collector.isEmpty) return
  const expected = rule.source.references.map(canonical).toSorted(),
    actual = references.map(canonical).toSorted()
  if (new Set(actual).size !== actual.length)
    collector.report(
      "DUPLICATE_ID",
      `${pointer}/references`,
      "Duplicate M4 source references",
    )
  if (
    !actual.length ||
    canonical(actual) !== canonical(expected) ||
    canonical(variant?.references.map(canonical).toSorted()) !==
      canonical(expected)
  )
    collector.report(
      "INVALID_DEFINITION",
      `${pointer}/references`,
      "M4 references must retain the complete common source",
    )
}

export function calculateAstraYaoM4Damage(
  input: unknown,
  fromCatalog: boolean,
): Result<AstraYaoM4DamageResult> {
  const collector = new IssueCollector()
  const checks = (pointer: string) => ({
    collector,
    pointer,
    structureCode: "INVALID_INPUT" as const,
  })
  const object = expectObject(input, checks(""), "Astra Yao M4 input")
  if (!object) return failure(collector)
  rejectUnknownFields(
    object,
    [
      "mechanism",
      "event",
      "conditionalModel",
      "definitions",
      "bindings",
      "selections",
      "world",
      "hit",
      "damage",
      "inputs",
      "snapshots",
      "atSeconds",
      ...(fromCatalog ? ["catalog", "actorSources"] : []),
    ],
    checks(""),
    "Astra Yao M4 input",
  )
  if (object.mechanism !== ASTRA_YAO_M4_MECHANISM)
    collector.report(
      "INVALID_INPUT",
      "/mechanism",
      "Unknown named damage mechanism",
    )
  const parsed = parseEffectRuleSet(object.definitions)
  if (!parsed.ok) return parsed
  const rule = parsed.value.effects.find(isAstraYaoM4Rule)
  if (!rule)
    collector.report(
      "MISSING_REFERENCE",
      "/definitions/effects",
      "The sealed Astra Yao M4 rule is required",
    )
  let catalog: StaticEffectCatalog | undefined
  if (fromCatalog) {
    const validated = validateStaticCatalog(object.catalog, parsed.value)
    if (!validated.ok) return validated
    catalog = validated.value
  }
  const bindings = validateSourceBindings(object.bindings, collector)
  const world = validateWorldObservation(object.world, collector, "/world")
  const snapshots = validateSnapshots(
    object.snapshots === undefined ? [] : object.snapshots,
    collector,
    "/snapshots",
  )
  const selections = expectArray(
    object.selections,
    checks("/selections"),
    "selections",
  )
  const event = expectObject(object.event, checks("/event"), "M4 event")
  const model = expectObject(
    object.conditionalModel,
    checks("/conditionalModel"),
    "M4 conditional model",
  )
  const hit = expectObject(object.hit, checks("/hit"), "M4 hit")
  const damage = expectObject(object.damage, checks("/damage"), "M4 damage")
  const time = object.atSeconds
  if (typeof time !== "number" || !Number.isFinite(time) || time < 0)
    collector.report(
      "INVALID_INPUT",
      "/atSeconds",
      "M4 requires an explicit finite non-negative event time",
    )
  if (event) {
    rejectUnknownFields(
      event,
      [
        "eventId",
        "sourceBindingId",
        "triggerActorId",
        "targetId",
        "triggerSpecialty",
        "idyllicCadenza",
        "enteredViaQuickAssist",
        "nextQuickAssistHeavyHit",
      ],
      checks("/event"),
      "M4 event",
    )
    for (const [name, prefix] of [
      ["eventId", "event"],
      ["sourceBindingId", "binding"],
      ["triggerActorId", "entity"],
      ["targetId", "entity"],
    ] as const)
      if (!isIdentityString(event[name], prefix))
        collector.report(
          "INVALID_INPUT",
          `/event/${name}`,
          `Expected a ${prefix}: identity`,
        )
    for (const name of [
      "idyllicCadenza",
      "enteredViaQuickAssist",
      "nextQuickAssistHeavyHit",
    ])
      if (event[name] !== true)
        collector.report(
          "CONTEXT_MISMATCH",
          `/event/${name}`,
          "The M4 triggering fact must be explicitly true",
        )
    if (event.triggerSpecialty !== "attack")
      collector.report(
        "CONTEXT_MISMATCH",
        "/event/triggerSpecialty",
        "The actual trigger must be an Attack teammate",
      )
  }
  if (model) {
    rejectUnknownFields(
      model,
      [
        "attackReading",
        "factorBeneficiary",
        "criticalRate",
        "criticalDamageSource",
        "penetrationRatioSource",
      ],
      checks("/conditionalModel"),
      "M4 conditional model",
    )
    if (
      model.attackReading !== "holder-current" ||
      model.factorBeneficiary !== "trigger-actor-current"
    )
      collector.report(
        "CONTEXT_MISMATCH",
        "/conditionalModel",
        "M4 uses holder-current ATK and trigger-current ordinary factors",
      )
    const rate = expectObject(
      model.criticalRate,
      checks("/conditionalModel/criticalRate"),
      "explicit probability",
    )
    if (rate) {
      rejectUnknownFields(
        rate,
        ["unit", "value"],
        checks("/conditionalModel/criticalRate"),
        "explicit probability",
      )
      if (rate.unit !== "ratio")
        collector.report(
          "UNIT_MISMATCH",
          "/conditionalModel/criticalRate/unit",
          "Probability must use ratio units",
        )
      if (
        typeof rate.value !== "number" ||
        !Number.isFinite(rate.value) ||
        rate.value < 0 ||
        rate.value > 1
      )
        collector.report(
          "INVALID_INPUT",
          "/conditionalModel/criticalRate/value",
          "Probability must be finite within [0, 1]",
        )
    }
    validateAttributeSource(
      model.criticalDamageSource,
      collector,
      "/conditionalModel/criticalDamageSource",
    )
    validateAttributeSource(
      model.penetrationRatioSource,
      collector,
      "/conditionalModel/penetrationRatioSource",
    )
  }
  if (hit) {
    rejectUnknownFields(
      hit,
      [
        "actorId",
        "targetId",
        "actionId",
        "skillCategory",
        "skillTags",
        "damageItems",
        "element",
        "actionSnapshotId",
        ...(fromCatalog ? ["skillTargetIds"] : []),
      ],
      checks("/hit"),
      "M4 hit",
    )
    if (hit.skillCategory !== "uncategorized")
      collector.report(
        "CONTEXT_MISMATCH",
        "/hit/skillCategory",
        "M4 is explicitly uncategorized",
      )
    if (
      !DAMAGE_ELEMENTS.includes(hit.element as (typeof DAMAGE_ELEMENTS)[number])
    )
      collector.report(
        hit.element === undefined ? "MISSING_FACT" : "INVALID_INPUT",
        "/hit/element",
        "An explicit regular damage element is required",
      )
    if (hit.skillTags !== undefined) {
      const tags = expectArray(
        hit.skillTags,
        checks("/hit/skillTags"),
        "M4 skill tags",
      )
      if (
        tags?.some(
          (tag) =>
            tag !== ASTRA_YAO_M4_TARGET &&
            tag !== "zzz-hp:category:uncategorized",
        )
      )
        collector.report(
          "CONTEXT_MISMATCH",
          "/hit/skillTags",
          "M4 cannot inherit another action's tags",
        )
    }
    if (
      fromCatalog &&
      (!Array.isArray(hit.skillTargetIds) ||
        hit.skillTargetIds.length !== 1 ||
        hit.skillTargetIds[0] !== ASTRA_YAO_M4_TARGET)
    )
      collector.report(
        "CONTEXT_MISMATCH",
        "/hit/skillTargetIds",
        "Exactly the M4 provider-owned target is required",
      )
  }
  if (damage && damage.kind !== "regular")
    collector.report(
      "CONTEXT_MISMATCH",
      "/damage/kind",
      "M4 requires the explicit regular conditional model",
    )
  if (
    !collector.isEmpty ||
    !rule ||
    !bindings ||
    !world ||
    !snapshots ||
    !selections ||
    !event ||
    !model ||
    !hit ||
    !damage
  )
    return failure(collector)
  const typed = object as unknown as AstraYaoM4DamageInput
  const typedEvent = event as unknown as AstraYaoM4Event
  const typedModel = model as unknown as AstraYaoM4ConditionalModel
  const binding = bindings.find(
    (b) => b.bindingId === typedEvent.sourceBindingId,
  )
  if (!binding)
    collector.report(
      "MISSING_REFERENCE",
      "/event/sourceBindingId",
      "Unknown M4 source binding",
    )
  else if (
    binding.kind !== "agent" ||
    binding.sourceEntityId !== "1311" ||
    !binding.eligible
  )
    collector.report(
      "CONTEXT_MISMATCH",
      "/event/sourceBindingId",
      "M4 event source must be an eligible Astra Yao binding",
    )
  if (!binding || !collector.isEmpty) return failure(collector)
  const holder = world.actors.get(binding.holderId),
    trigger = world.actors.get(typedEvent.triggerActorId),
    target = world.actors.get(typedEvent.targetId)
  if (!holder || !trigger || !target)
    collector.report(
      "MISSING_FACT",
      "/event",
      "M4 holder, trigger and target must all be observed actors",
    )
  else if (
    holder.entityId === trigger.entityId ||
    holder.teamId !== trigger.teamId ||
    target.teamId === trigger.teamId ||
    typedEvent.triggerActorId !== hit.actorId ||
    typedEvent.targetId !== hit.targetId
  )
    collector.report(
      "CONTEXT_MISMATCH",
      "/event",
      "M4 requires a different teammate as this hit's trigger and an opposing target",
    )
  if (catalog) {
    const actors = expectArray(
      object.actorSources,
      checks("/actorSources"),
      "actor sources",
    )
    const sources = actors?.map((actor, index) =>
      expectObject(actor, checks(`/actorSources/${index}`), "actor source"),
    )
    const triggerSource = sources?.find(
      (source) => source?.entityId === typedEvent.triggerActorId,
    )
    const triggerEntity = catalog.entities.find(
      (e) =>
        e.identity?.kind === "agent" &&
        e.identity.entityId === triggerSource?.agentEntityId,
    )
    if (!triggerEntity)
      collector.report(
        "MISSING_REFERENCE",
        "/actorSources",
        "The actual M4 trigger needs a catalog agent identity",
      )
    else if (triggerEntity.profession !== "强攻")
      collector.report(
        "CONTEXT_MISMATCH",
        "/event/triggerActorId",
        "The actual catalog trigger must have Attack specialty",
      )
  }
  for (const [field, stat] of [
    ["criticalDamageSource", "criticalDamage"],
    ["penetrationRatioSource", "penetrationRatio"],
  ] as const) {
    const source = typedModel[field],
      pointer = `/conditionalModel/${field}`
    if (
      source.entityId !== binding.holderId &&
      source.entityId !== typedEvent.triggerActorId
    )
      collector.report(
        "CONTEXT_MISMATCH",
        pointer,
        "M4 stat source must be this holder or this trigger",
      )
    if (source.snapshotId !== undefined) {
      const saved = snapshots.find((s) => s.snapshotId === source.snapshotId)
      if (
        !saved ||
        !saved.world.entities.some(
          (e) => e.kind === "actor" && e.entityId === source.entityId,
        ) ||
        !saved.attributes.some(
          (a) =>
            a.entityId === source.entityId &&
            a.stat === stat &&
            a.stage === "current",
        )
      )
        collector.report(
          "MISSING_SNAPSHOT",
          pointer,
          "A saved current-stage attribute and its observed actor are required",
        )
      else if (saved.atSeconds > (time as number))
        collector.report(
          "CONTEXT_MISMATCH",
          pointer,
          "M4 cannot read a future snapshot",
        )
    }
  }
  const items = expectArray(
    hit.damageItems,
    checks("/hit/damageItems"),
    "M4 damage items",
  )
  if (items?.length !== 1)
    collector.report(
      "CONTEXT_MISMATCH",
      "/hit/damageItems",
      "Exactly one M4 damage item is required",
    )
  const item =
    items?.length === 1
      ? expectObject(items[0], checks("/hit/damageItems/0"), "M4 item")
      : undefined
  const statSource = item
    ? validateAttributeSource(
        item.statSource,
        collector,
        "/hit/damageItems/0/statSource",
      )
    : undefined
  if (
    statSource &&
    (statSource.entityId !== binding.holderId ||
      statSource.snapshotId !== undefined ||
      Object.keys(statSource).length !== 1 ||
      Object.keys(statSource)[0] !== "entityId")
  )
    collector.report(
      "CONTEXT_MISMATCH",
      "/hit/damageItems/0/statSource",
      "M4 requires only the current holder as its ATK source",
    )
  if (
    item &&
    (item.itemId !== ASTRA_YAO_M4_ITEM ||
      item.stat !== "attack" ||
      item.damageMultiplier !== 0 ||
      (fromCatalog && (item.mode !== "direct" || item.role !== "base")))
  )
    collector.report(
      "CONTEXT_MISMATCH",
      "/hit/damageItems/0",
      "M4 requires its sole zero-input direct ATK item from the current holder",
    )
  const mechanism = catalog?.mechanisms?.find(
    (m) => m.mechanism === ASTRA_YAO_M4_MECHANISM,
  )
  const selectedKey = fromCatalog ? "optionId" : "effectId"
  const namedId = fromCatalog ? mechanism!.optionId : rule.effectId
  const ordinary: unknown[] = [],
    effective: BindingId[] = [],
    seen = new Set<string>()
  for (const [index, raw] of selections.entries()) {
    const pointer = `/selections/${index}`,
      selection = expectObject(raw, checks(pointer), "effect selection")
    if (!selection) continue
    if (selection[selectedKey] !== namedId) {
      ordinary.push(raw)
      continue
    }
    rejectUnknownFields(
      selection,
      [selectedKey, "bindingId", "layers"],
      checks(pointer),
      "M4 selection",
    )
    const selectedBinding = bindings.find(
      (b) => b.bindingId === selection.bindingId,
    )
    if (!selectedBinding) {
      collector.report(
        "MISSING_REFERENCE",
        `${pointer}/bindingId`,
        "Unknown selected source binding",
      )
      continue
    }
    if (seen.has(selectedBinding.bindingId))
      collector.report(
        "DUPLICATE_ID",
        pointer,
        "Select a bound M4 source only once",
      )
    seen.add(selectedBinding.bindingId)
    if (selection.layers !== 0 && selection.layers !== 1)
      collector.report(
        "INVALID_INPUT",
        `${pointer}/layers`,
        "M4 layers must be 0 or 1",
      )
    if (
      selectedBinding.kind !== "agent" ||
      selectedBinding.sourceEntityId !== "1311"
    ) {
      collector.report(
        "CONTEXT_MISMATCH",
        pointer,
        "M4 selection must bind Astra Yao",
      )
      continue
    }
    if (
      selection.layers === 1 &&
      selectedBinding.configuration.mindscapeRank < 4
    )
      collector.report(
        "CONTEXT_MISMATCH",
        pointer,
        "An active M4 source requires mindscape rank 4 or higher",
      )
    const selectedHolder = world.actors.get(selectedBinding.holderId)
    if (!selectedHolder)
      collector.report(
        "MISSING_FACT",
        pointer,
        "Selected holder must be observed",
      )
    if (
      selection.layers === 1 &&
      selectedBinding.eligible &&
      selectedHolder &&
      trigger &&
      selectedHolder.teamId === trigger.teamId &&
      selectedHolder.entityId !== trigger.entityId
    )
      effective.push(selectedBinding.bindingId)
  }
  if (
    effective.length > 1 ||
    (effective.length === 1 && effective[0] !== binding.bindingId)
  )
    collector.report(
      "CONTEXT_MISMATCH",
      "/selections",
      "The sole effective M4 source must be the event binding; multiple sources are unsupported",
    )
  if (!collector.isEmpty) return failure(collector)
  const context: ValidatedAstraYaoM4Context = {
    effectId: rule.effectId,
    bindingId: binding.bindingId,
    active: effective.length === 1,
    conditionalModel: typedModel,
  }
  const {
    mechanism: _mechanism,
    event: _event,
    conditionalModel: _model,
    ...ordinaryInput
  } = typed
  const result = fromCatalog
    ? calculateOrdinaryStaticDamageFromCatalog(
        {
          ...ordinaryInput,
          selections: ordinary,
        } as unknown as StaticCatalogDamageInput,
        context,
      )
    : calculateOrdinaryStaticDamage(
        {
          ...ordinaryInput,
          definitions: {
            ...parsed.value,
            effects: parsed.value.effects.map((r) =>
              isAstraYaoM4Rule(r) ? bridgeAstraYaoM4Rule(r) : r,
            ),
          },
          selections: [
            ...ordinary,
            ...(context.active
              ? [
                  {
                    effectId: rule.effectId,
                    bindingId: binding.bindingId,
                    layers: 1,
                  },
                ]
              : []),
          ] as StaticEffectSelection[],
          hit: {
            ...typed.hit,
            skillTags: [ASTRA_YAO_M4_TARGET, "zzz-hp:category:uncategorized"],
            attributeSources: {
              criticalDamage: typedModel.criticalDamageSource,
              penetrationRatio: typedModel.penetrationRatioSource,
            },
          },
        },
        context,
      )
  if (!result.ok) return result
  const attack = result.value.evaluation.attributes.find(
    (a) =>
      a.entityId === binding.holderId &&
      a.stat === "attack" &&
      a.stage === "current",
  )?.value.value
  if (attack === undefined || !Number.isFinite(attack) || attack < 0) {
    collector.report(
      "INVALID_INPUT",
      "/hit/damageItems/0/statSource",
      "The actual holder current ATK must be finite and non-negative",
    )
    return failure(collector)
  }
  return {
    ok: true,
    value: {
      ...result.value,
      mechanism: ASTRA_YAO_M4_MECHANISM,
      status: context.active ? "applied" : "inactive",
      provenance: {
        event: structuredClone(typedEvent),
        sourceBindingId: binding.bindingId,
        effectId: rule.effectId,
        holderId: binding.holderId,
        triggerActorId: typedEvent.triggerActorId,
        hitActorId: typedEvent.triggerActorId,
        beneficiaryId: typedEvent.triggerActorId,
        attackProvider: { entityId: binding.holderId, stage: "current" },
        criticalDamageSource: { ...typedModel.criticalDamageSource },
        penetrationRatioSource: { ...typedModel.penetrationRatioSource },
        targetId: typedEvent.targetId,
        criticalRate: { ...typedModel.criticalRate },
        specialtyEvidence: fromCatalog ? "catalog-verified" : "caller-asserted",
        conditionalModel: structuredClone(typedModel),
      },
    },
  }
}
