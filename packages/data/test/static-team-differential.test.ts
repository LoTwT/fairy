import { readFileSync } from "node:fs"
import { beforeAll, describe, expect, it } from "vitest"
import { loadStaticCalculationData, resolveAgentAction } from "../src/index.ts"
import {
  calculateStaticActionDamage,
  calculateStaticDamageFromCatalog,
  staticSourceBindingId,
} from "../../core/src/index.ts"
import type {
  DirectStatInput,
  EffectNumericInput,
  GeneralStatInput,
  StaticActionCalculationInput,
  StaticActorConfiguration,
  StaticCatalogDamageInput,
  StaticDamageResult,
} from "../../core/src/index.ts"
import { STAT_UNIT_MAP } from "@randomplay/shared"
import {
  actorEntityId,
  teamDifferentialAgentByKey,
  teamDifferentialBuffGroups,
  teamDifferentialSlots,
  teamDifferentialTarget,
} from "./fixtures/static-team-differential-cases.ts"
import type {
  TeamDifferentialPanel,
  TeamDifferentialSlot,
} from "./fixtures/static-team-differential-cases.ts"

/**
 * 固定面板队伍差分回归：12 原始预设 + 4 个边界预设，共 58 个独立事件。
 *
 * - 期望值来自 `fixtures/static-team-differential-reference.json`：固定上游原始
 *   记录 + 独立十进制有理数算式生成，不由本实现回填，也不能用被测函数生成；
 * - 上游真实整数返回来自 `fixtures/static-team-differential-upstream-returns.json`，
 *   只覆盖原批次 42 个槽位，只在比较投影中应用已证取整（含仪玄贯穿力 round(2)）；
 *   新增边界预设标记为 `pinned-records-only`，不比较也不补造上游整数。
 * - 面板、动作、状态与显式增益的唯一输入是
 *   `fixtures/static-team-differential-cases.ts`；除其中列出的增益组外，全部效果关闭。
 */
interface ReferencePanel {
  stats: Record<string, number>
  penetrationValue: number
  damageBonuses: Record<string, number>
}
interface ReferenceChannel {
  channel: string
  entityId: string
  optionId: string
  value: string
}
interface ReferenceCase {
  presetId: string
  caseId: string
  label: string
  eventId: string
  kind: "regular" | "sheer" | "sharpen" | "anomaly" | "disorder" | "luminize"
  team: string[]
  buffGroups: string[]
  upstreamEvidence: "reviewed-adapter-run" | "pinned-records-only"
  conversionBoundary?: {
    optionId: string
    pointers: string[]
    position:
      | "below-threshold"
      | "at-threshold"
      | "above-threshold"
      | "at-cap"
      | "above-cap"
      | "off"
    sourceUnit: "anomaly-proficiency-points" | "ratio"
    sourceValue: string
    initialBase: string
    ratioPercent: string
    cap: string | null
    outputUnit: "attack-points" | "ratio"
    expectedConversion: string
    recordConversion: string
  }
  selections: {
    holderId: `entity:${string}`
    optionId: string
    layers: number
  }[]
  declaredPanels: Record<string, ReferencePanel>
  hitReadPanel: ReferencePanel
  totals: {
    nonCritical: string
    critical: string | null
    expected: string
    displayedNonCritical: null
    displayedCritical: null
  }
  criticalRate: string
  criticalSemantics: string
  factors: {
    nonCritical: Record<string, number>
    critical: Record<string, number> | null
  }
  channels: ReferenceChannel[]
  durationPreparations: { seconds: string; optionId: string }[]
  identity: {
    actorEntityId: string
    powerSourceEntityId: string
    damageBonusSource: string
    durationAdjustmentSeconds: string | null
    baseStat: {
      stat: string
      entityId: string
      multiplier: string
      value: string
    }
    attributeReads: {
      entityId: string
      stat: string
      stage: string
      value: string
    }[]
    referencePiercePower?: number
    luminize?: {
      restrictedAttack: string
      restrictedMastery: string
      proficiencyInput: string
      proficiencyConversionRate: string
    }
  }
}
interface UpstreamReturn {
  slotId: string
  pickKind: string
  enginePick: number
  returnedField: string
  expected: number
  anomalyTiers?: { noCritical: number; expected: number; fullCritical: number }
  pierceForceRounded?: number
}

const reference = JSON.parse(
  readFileSync(
    new URL(
      "./fixtures/static-team-differential-reference.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as {
  provenance: {
    fairyBaseline: string
    snapshotId: string
    effectsRevision: number
    effectSource: { commit: string; sha256: string }
    skillSource: { commit: string; sha256: string }
  }
  cases: Record<string, ReferenceCase>
}
const upstreamReturns = JSON.parse(
  readFileSync(
    new URL(
      "./fixtures/static-team-differential-upstream-returns.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as { provenance: Record<string, string>; returns: UpstreamReturn[] }

const slotsById = new Map(
  teamDifferentialSlots.map((slot) => [slot.slotId, slot]),
)
const upstreamBySlot = new Map(
  upstreamReturns.returns.map((entry) => [entry.slotId, entry]),
)
const agentNames = Object.values(teamDifferentialAgentByKey).map(
  (agent) => agent.agentName,
)
const PLAYER_TEAM_ID = "team:players" as const

let loaded: Awaited<ReturnType<typeof loadStaticCalculationData>>
beforeAll(async () => {
  loaded = await loadStaticCalculationData({ agents: agentNames, wEngines: [] })
})

/** 只容忍浮点运算顺序；期望取整与上游整数投影一律严格相等。 */
function close(
  actual: number | null | undefined,
  expected: string | number | null,
  label: string,
): void {
  if (expected === null) {
    expect(actual, label).toBeNull()
    return
  }
  expect(typeof actual, label).toBe("number")
  const value = typeof expected === "string" ? Number(expected) : expected
  expect(Math.abs(actual! - value), label).toBeLessThanOrEqual(
    Math.max(1e-9, Math.abs(value) * 1e-12),
  )
}
function panelFor(key: string, referencePanel: ReferencePanel) {
  return {
    mode: "out-of-combat" as const,
    stats: Object.fromEntries(
      Object.entries(referencePanel.stats).map(([stat, value]) => [
        stat,
        { unit: STAT_UNIT_MAP[stat as keyof typeof STAT_UNIT_MAP], value },
      ]),
    ) as StaticActorConfiguration["panel"] extends { stats: infer S }
      ? S
      : never,
    penetrationValue: referencePanel.penetrationValue,
    damageBonuses: referencePanel.damageBonuses,
  }
}
function actorConfiguration(
  key: string,
  referencePanel: ReferencePanel,
): StaticActorConfiguration {
  const agent = teamDifferentialAgentByKey[key]!
  return {
    entityId: actorEntityId(key),
    teamId: PLAYER_TEAM_ID,
    agentEntityId: agent.agentEntityId,
    coreSkillLevel: agent.coreSkillLevel,
    mindscapeRank: agent.mindscapeRank,
    potentialLevel: agent.potentialLevel,
    wEngine: null,
    driveDiscs: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
    panel: panelFor(key, referencePanel),
  }
}
function agentBinding(key: string) {
  const agent = teamDifferentialAgentByKey[key]!
  return {
    kind: "agent" as const,
    bindingId: staticSourceBindingId(
      actorEntityId(key),
      "agent",
      agent.agentEntityId,
    ),
    holderId: actorEntityId(key),
    sourceEntityId: agent.agentEntityId,
    eligible: true,
    configuration: {
      coreSkillLevel: agent.coreSkillLevel,
      mindscapeRank: agent.mindscapeRank,
      potentialLevel: agent.potentialLevel,
    },
  }
}
function worldActor(key: string, referencePanel: ReferencePanel) {
  const generalStats: Record<string, GeneralStatInput> = {}
  const directStats: Record<string, DirectStatInput> = {}
  for (const [stat, value] of Object.entries(referencePanel.stats)) {
    if (
      stat === "criticalRate" ||
      stat === "criticalDamage" ||
      stat === "penetrationRatio" ||
      stat === "sharpCriticalDamage"
    )
      directStats[stat] = { baseValue: value, additions: [] }
    else
      generalStats[stat] = {
        settledInitialValue: value,
        finalPercentage: [],
        finalFixed: [],
      }
  }
  return {
    kind: "actor" as const,
    entityId: actorEntityId(key),
    teamId: PLAYER_TEAM_ID,
    generalStats,
    directStats,
  }
}
/** 目录选项 → 该选项合并的规则身份，用于逐条核对贡献来源。 */
function effectIdsOf(optionId: string): readonly string[] {
  const option = loaded.catalog.options.find(
    (entry) => entry.optionId === optionId,
  )
  expect(option, optionId).toBeDefined()
  return [...new Set(option!.variants.flatMap((variant) => variant.effectIds))]
}
/** 手填来源输入按目录声明的名称与单位构造，不硬编码名称。 */
function sourceInputs(slot: TeamDifferentialSlot): EffectNumericInput[] {
  const inputs: EffectNumericInput[] = []
  for (const groupId of slot.case.buffGroups) {
    const group = teamDifferentialBuffGroups[groupId]!
    const holderEntityId = actorEntityId(group.holder)
    const agent = teamDifferentialAgentByKey[group.holder]!
    for (const effect of group.effects) {
      if (!effect.source) continue
      const option = loaded.catalog.options.find(
        (entry) => entry.optionId === effect.optionId,
      )
      expect(option, effect.optionId).toBeDefined()
      const declared = [
        ...new Map(
          option!.variants
            .flatMap((variant) => variant.inputs ?? [])
            .map((input) => [input.name, input]),
        ).values(),
      ]
      expect(declared, effect.optionId).toHaveLength(1)
      expect(declared[0]!.unit, effect.optionId).toBe(effect.source.unit)
      inputs.push({
        bindingId: staticSourceBindingId(
          holderEntityId,
          "agent",
          agent.agentEntityId,
        ),
        name: declared[0]!.name,
        value: { unit: effect.source.unit, value: effect.source.value },
      })
    }
  }
  return inputs
}
/**
 * 引擎输入一律由**实时夹具**构造：面板取 `agent.panel` 并按状态应用
 * `panelOverrides`，选项取增益组声明；冻结参考只用于对照期望与一致性。
 */
function livePanel(slot: TeamDifferentialSlot, key: string): ReferencePanel {
  return panelWithOverride(key, slot.case.panelOverrides?.[key])
}
/** 声明面板的独立副本加可选覆盖；当前世界与保存世界的对照共用。 */
function panelWithOverride(
  key: string,
  override?: Partial<TeamDifferentialPanel>,
): ReferencePanel {
  const agent = teamDifferentialAgentByKey[key]!
  const overridden = { ...agent.panel, ...override }
  const { damageBonuses, penetrationValue, ...stats } = overridden
  return {
    stats: { ...stats },
    penetrationValue,
    damageBonuses: { ...damageBonuses },
  }
}
function liveSelections(slot: TeamDifferentialSlot) {
  return slot.case.buffGroups.flatMap((groupId) => {
    const group = teamDifferentialBuffGroups[groupId]!
    return group.effects.map((effect) => ({
      holderId: actorEntityId(group.holder),
      optionId: effect.optionId,
      layers: effect.layers,
    }))
  })
}
function referenceSelections(slot: TeamDifferentialSlot) {
  return reference.cases[slot.slotId]!.selections
}

/** 耀变等效元素抗性由调用方按"循环下一位非流明队友"确定；缺失即拒绝。 */
function equivalentElementResistanceOf(event: {
  luminizeEquivalentElementResistance?: number
}): number {
  const value = event.luminizeEquivalentElementResistance
  expect(value, "luminize equivalent element resistance").toBeTypeOf("number")
  if (value === undefined)
    throw new Error("missing equivalent element resistance")
  return value
}
function actionInputFor(
  slot: TeamDifferentialSlot,
): StaticActionCalculationInput {
  const event = slot.event
  if (event.kind !== "agent-action") throw new Error("agent action expected")
  const actor = teamDifferentialAgentByKey[event.actor]!
  const record = loaded.agents.find(
    (candidate) => candidate.actions.entityId === actor.agentEntityId,
  )!
  const luminize: StaticActionCalculationInput["luminize"] =
    event.damageKind === "luminize"
      ? {
          hit: {
            element: "lumiflux" as const,
            damageItems: [
              {
                mode: "direct" as const,
                role: "base" as const,
                itemId: "special-voidflare",
                stat: "attack" as const,
                statSource: { entityId: actorEntityId(event.actor) },
                damageMultiplier: 1,
              },
            ],
          },
          damage: {
            kind: "luminize" as const,
            damageBonus: [],
            anomalyDamageBonus: [],
            refringe: { mode: "from-effects" as const },
            anomalySource: {
              mechanism: "remielle-special-voidflare" as const,
              entityId: actorEntityId(event.actor),
              level: 60,
              strength: "full" as const,
            },
            luminizeMultiplier: {
              baseLuminizeMultiplier: event.multiplier,
              multiplicativeLuminizeMultiplierAdjustments: [],
            },
            defense: {
              targetBaseDefense: teamDifferentialTarget.baseDefense,
              defensePercentageAdjustments: [],
              penetrationValues: [
                livePanel(slot, event.actor).penetrationValue,
              ],
            },
            resistance: {
              targetResistance: equivalentElementResistanceOf(event),
              targetResistanceReductions: [],
              attackerResistanceIgnoreValues: [],
            },
            damageTaken: {
              targetDamageTakenIncreases: [],
              targetDamageTakenReductions: [],
            },
            stunDamage: {
              isTargetStunned: teamDifferentialTarget.isStunned,
              targetBaseStunDamageMultiplier:
                teamDifferentialTarget.baseStunDamageMultiplier,
              targetStunDamageMultiplierAdjustments: [],
            },
          },
        }
      : undefined
  return {
    data: loaded,
    actors: slot.team.map((key) =>
      actorConfiguration(key, livePanel(slot, key)),
    ),
    actorId: actorEntityId(event.actor),
    action: resolveAgentAction({
      agent: record.actions,
      actionId: event.actionId,
      mindscapeRank: actor.mindscapeRank,
      levels: {
        [event.levelGroup]: { mode: "effective", value: event.effectiveLevel },
      },
      requireIndividualHits: false,
    }),
    target: teamDifferentialTarget,
    selections: liveSelections(slot),
    inputs: sourceInputs(slot),
    requireIndividualHits: false,
    ...(luminize ? { luminize } : {}),
  }
}

function catalogInputFor(slot: TeamDifferentialSlot): StaticCatalogDamageInput {
  const event = slot.event
  if (event.kind === "agent-action") throw new Error("anomaly event expected")
  const powerSourceEntityId = actorEntityId(event.powerSource)
  const powerPanel = livePanel(slot, event.powerSource)
  const isDisorder = event.kind === "standard-disorder"
  return {
    definitions: loaded.definitions,
    catalog: loaded.catalog,
    bindings: slot.team.map(agentBinding),
    selections: liveSelections(slot).map((selection) => {
      const key = slot.team.find(
        (candidate) => actorEntityId(candidate) === selection.holderId,
      )!
      return {
        optionId: selection.optionId,
        bindingId: agentBinding(key).bindingId,
        layers: selection.layers,
      }
    }),
    actorSources: slot.team.map((key) => ({
      entityId: actorEntityId(key),
      agentEntityId: teamDifferentialAgentByKey[key]!.agentEntityId,
    })),
    world: {
      entities: [
        ...slot.team.map((key) => worldActor(key, livePanel(slot, key))),
        {
          kind: "actor",
          entityId: teamDifferentialTarget.entityId,
          teamId: teamDifferentialTarget.teamId,
          generalStats: {},
          directStats: {},
        },
      ],
      states: [],
      distances: [],
    },
    hit: {
      actorId: actorEntityId(event.actor),
      targetId: teamDifferentialTarget.entityId,
      // 普通异常/紊乱没有需要伪造的代理人动作；调用方身份在上游证据中具名。
      actionId: isDisorder
        ? "action:public-anomaly:fire-disorder"
        : "action:public-anomaly:physical-assault",
      skillCategory: "uncategorized",
      skillTags: [],
      element: event.element,
      damageItems: [
        isDisorder
          ? {
              mode: "standard-disorder" as const,
              role: "base" as const,
              itemId: "disorder-base",
              stat: "attack" as const,
              statSource: { entityId: powerSourceEntityId },
              originalAnomalyAttribute: event.originalAnomalyAttribute,
              baseDurationSeconds: event.baseDurationSeconds,
              elapsedSeconds: event.elapsedSeconds,
            }
          : {
              mode: "direct" as const,
              role: "base" as const,
              itemId: "assault-base",
              stat: "attack" as const,
              statSource: { entityId: powerSourceEntityId },
              damageMultiplier: event.baseMultiplier,
            },
      ],
    },
    damage: {
      kind: isDisorder ? "disorder" : "anomaly",
      // 已结算增伤：异常强度提供者的面板元素增伤直接作为乘区，不再叠加效果通道。
      damageBonus: {
        settledMultiplier: 1 + (powerPanel.damageBonuses[event.element] ?? 0),
      },
      anomalySource: {
        entityId: powerSourceEntityId,
        level: event.sourceLevel,
      },
      defense: {
        attackerLevel: event.sourceLevel,
        targetBaseDefense: teamDifferentialTarget.baseDefense,
        defensePercentageAdjustments: [],
        penetrationValues: [powerPanel.penetrationValue],
      },
      resistance: {
        targetResistance:
          teamDifferentialTarget.resistances[event.element] ?? 0,
        targetResistanceReductions: [],
        attackerResistanceIgnoreValues: [],
      },
      damageTaken: {
        targetDamageTakenIncreases: [],
        targetDamageTakenReductions: [],
      },
      stunDamage: {
        isTargetStunned: teamDifferentialTarget.isStunned,
        targetBaseStunDamageMultiplier:
          teamDifferentialTarget.baseStunDamageMultiplier,
        targetStunDamageMultiplierAdjustments: [],
      },
      anomalyDamageBonus: [],
      refringe: { mode: "from-effects" },
      anomalyCriticalRate: 0,
      anomalyCriticalDamage: [],
    },
    inputs: sourceInputs(slot),
  }
}

interface SlotComputation {
  action: StaticActionCalculationInput["action"] | null
  damage: StaticDamageResult
  totals: {
    displayedNonCritical: number | null
    displayedCritical: number | null
  } | null
  panelResults: readonly {
    entityId: string
    stats: Record<string, { value: number }>
    penetrationValue: number
    damageBonuses: Record<string, number>
  }[]
}
/** 面板/直伤属性调整（`stat` 地址）按来源规则逐条取出，用于核对转换贡献。 */
function conversionContributions(damage: StaticDamageResult, optionId: string) {
  const effectIds = effectIdsOf(optionId)
  return damage.evaluation.contributions.filter(
    (contribution) =>
      contribution.address.kind === "stat" &&
      effectIds.includes(contribution.origin.effectId),
  )
}
/** 防御区闭式：与参考生成器同口径，只用于交叉核对读数身份。 */
function defenseZoneFromPanel(panel: {
  penetrationRatio: number
  penetrationValue: number
}): number {
  const ratio = Math.min(Math.max(panel.penetrationRatio, 0), 0.95)
  const effectiveDefense = Math.max(
    0,
    teamDifferentialTarget.baseDefense * (1 - ratio) - panel.penetrationValue,
  )
  return effectiveDefense === 0 ? 1 : 794 / (794 + effectiveDefense)
}
const cache = new Map<string, SlotComputation>()
function compute(slot: TeamDifferentialSlot): SlotComputation {
  const cached = cache.get(slot.slotId)
  if (cached) return cached
  let computation: SlotComputation
  if (slot.event.kind === "agent-action") {
    const input = actionInputFor(slot)
    const result = calculateStaticActionDamage(input)
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (!result.ok || result.value.kind !== "damage")
      throw new Error(slot.slotId)
    computation = {
      action: input.action,
      damage: result.value.segments[0]!.damage,
      totals: result.value.totals,
      panelResults: result.value.panels,
    }
    expect(result.value.segments, slot.slotId).toHaveLength(1)
  } else {
    const result = calculateStaticDamageFromCatalog(catalogInputFor(slot))
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (!result.ok) throw new Error(slot.slotId)
    computation = {
      action: null,
      damage: result.value,
      totals: null,
      panelResults: [],
    }
  }
  cache.set(slot.slotId, computation)
  return computation
}
describe("fixed-panel team differential fixtures", () => {
  it("keeps the frozen fixtures aligned with the loaded calculation data", () => {
    expect(teamDifferentialSlots).toHaveLength(59)
    expect(new Set(Object.keys(reference.cases))).toEqual(
      new Set(slotsById.keys()),
    )
    // 上游整数投影只覆盖校正适配器真实执行过的批次；新增边界没有执行结果。
    const coveredSlotIds = teamDifferentialSlots
      .filter((slot) => slot.upstreamEvidence === "reviewed-adapter-run")
      .map((slot) => slot.slotId)
    expect(upstreamReturns.returns).toHaveLength(42)
    expect(coveredSlotIds).toHaveLength(42)
    expect(new Set(upstreamBySlot.keys())).toEqual(new Set(coveredSlotIds))
    for (const slot of teamDifferentialSlots) {
      const entry = reference.cases[slot.slotId]!
      expect(entry.kind).toBe(
        slot.event.kind === "agent-action"
          ? slot.event.damageKind
          : slot.event.kind === "ordinary-anomaly"
            ? "anomaly"
            : "disorder",
      )
      expect(entry.upstreamEvidence, slot.slotId).toBe(slot.upstreamEvidence)
      expect(upstreamBySlot.has(slot.slotId), slot.slotId).toBe(
        slot.upstreamEvidence === "reviewed-adapter-run",
      )
      expect(entry.totals.nonCritical.length).toBeGreaterThan(0)
      expect(entry.totals.expected.length).toBeGreaterThan(0)
      expect(Object.keys(entry.factors.nonCritical).length).toBeGreaterThan(0)
      expect(entry.identity.baseStat.stat.length).toBeGreaterThan(0)
      // 转换边界声明：来源事实由生成器从固定记录核对，这里核对与实时夹具一致。
      const boundary = slot.case.conversionBoundary
      if (boundary === undefined) {
        expect(entry.conversionBoundary, slot.slotId).toBeUndefined()
      } else {
        const group = teamDifferentialBuffGroups[boundary.groupId]!
        expect(entry.conversionBoundary, slot.slotId).toBeDefined()
        expect(entry.conversionBoundary!.optionId, slot.slotId).toBe(
          group.effects[0]!.optionId,
        )
        expect(entry.conversionBoundary!.pointers, slot.slotId).toEqual([
          ...group.effects[0]!.pointers,
        ])
        expect(entry.conversionBoundary!.position, slot.slotId).toBe(
          boundary.position,
        )
        expect(entry.conversionBoundary!.sourceUnit, slot.slotId).toBe(
          boundary.sourceUnit,
        )
        expect(entry.conversionBoundary!.outputUnit, slot.slotId).toBe(
          boundary.outputUnit,
        )
        expect(Number(entry.conversionBoundary!.sourceValue), slot.slotId).toBe(
          boundary.sourceValue,
        )
        expect(
          Number(entry.conversionBoundary!.expectedConversion),
          slot.slotId,
        ).toBe(boundary.expectedConversion)
      }
      // 冻结参考必须与实时夹具一致：选项、每名成员的面板与当前读数。
      expect(entry.selections, slot.slotId).toEqual(liveSelections(slot))
      expect(referenceSelections(slot), slot.slotId).toEqual(
        liveSelections(slot),
      )
      expect(Object.keys(entry.declaredPanels).toSorted(), slot.slotId).toEqual(
        slot.team.map(actorEntityId).toSorted(),
      )
      for (const key of slot.team) {
        const entityId = actorEntityId(key)
        expect(
          entry.declaredPanels[entityId],
          `${slot.slotId} ${entityId}`,
        ).toEqual(livePanel(slot, key))
      }
      expect(entry.identity.actorEntityId, slot.slotId).toBe(
        actorEntityId(slot.event.actor),
      )
      expect(entry.identity.powerSourceEntityId, slot.slotId).toBe(
        actorEntityId(
          slot.event.kind === "agent-action"
            ? slot.event.actor
            : slot.event.powerSource,
        ),
      )
      // 属性读数必须覆盖命中基础属性，且异常/紊乱的来源与触发者身份可区分。
      const baseRead = entry.identity.attributeReads.find(
        (read) => read.stat === entry.identity.baseStat.stat,
      )!
      expect(baseRead, slot.slotId).toBeDefined()
      expect(baseRead.entityId, slot.slotId).toBe(
        entry.identity.baseStat.entityId,
      )
      expect(Number(baseRead.value), `${slot.slotId} base read`).toBeCloseTo(
        Number(entry.identity.baseStat.value),
        12,
      )
      if (entry.kind === "anomaly" || entry.kind === "disorder") {
        expect(entry.identity.baseStat.entityId, slot.slotId).toBe(
          entry.identity.powerSourceEntityId,
        )
        expect(
          entry.identity.attributeReads.find(
            (read) => read.stat === "criticalRate",
          )!.entityId,
          `${slot.slotId} trigger read`,
        ).toBe(entry.identity.actorEntityId)
      }
    }
    // 数据版本与固定来源：历史独立参考与当前消费快照分别断言。
    // 参考文件由 generate-static-team-differential-reference.mjs 从固定上游
    // 再生，其 provenance 是冻结时的历史事实（基线 c77e549a、快照 e946d6、
    // revision 14），不随当前制品演进改写；当前加载的数据用自身快照断言。
    // 参考数值仍然有效：固定效果提交未变（下行断言），且本批 59 槽位不消费
    // revision 15 改动的规则（逐槽数值对照在后续用例中锁定）。
    expect(loaded.version).toEqual({
      packageVersion: "0.2.1",
      contractVersion: 2,
      gameVersion: "3.2",
      snapshotId:
        "sha256:61946f8150f84463116eac55437ecd9d356ec2f375b85b45cd48a4f52a3154e8",
    })
    expect(loaded.catalog.source.commit).toBe(
      reference.provenance.effectSource.commit,
    )
    expect(reference.provenance).toMatchObject({
      fairyBaseline: "c77e549a6c503e257f554126203380295814fc40",
      snapshotId:
        "sha256:e946d6b30b9747a3daeaac034fc14a4dc127c7e550ab63f0c54b1e1d4bf693c4",
      effectsRevision: 14,
    })
    // 耀变精通换算比例来自目录映射，与本批记录的 0.002 一致。
    const radiance = loaded.catalog.options.find(
      (option) =>
        option.optionId ===
        "agents:remiel:mindscape:0:blk-legacy:eff-ms7tarv6-tfz2kz",
    )!
    expect(radiance.variants[0]!.parameterMapping?.rate).toBe(
      Number(
        reference.cases["T1-0/remiel-radiance"]!.identity.luminize!
          .proficiencyConversionRate,
      ),
    )
  })

  it.each(teamDifferentialSlots.map((slot) => [slot.slotId]))(
    "%s reproduces the independent reference and the upstream integer returns",
    (slotId) => {
      const slot = slotsById.get(slotId)!
      const entry = reference.cases[slotId]!
      const upstream = upstreamBySlot.get(slotId)
      const { action, damage, totals, panelResults } = compute(slot)

      // 三档全精度期望：只容忍浮点运算顺序，不吸收机制差异。
      close(
        damage.nonCritical,
        entry.totals.nonCritical,
        `${slotId} nonCritical`,
      )
      close(damage.critical, entry.totals.critical, `${slotId} critical`)
      close(damage.expected, entry.totals.expected, `${slotId} expected`)
      close(damage.criticalRate, entry.criticalRate, `${slotId} criticalRate`)
      expect(damage.criticalSemantics, slotId).toBe(entry.criticalSemantics)

      // 关键乘区逐项对照（非暴击与暴击档）。
      for (const [name, value] of Object.entries(entry.factors.nonCritical))
        close(
          damage.factors.nonCritical[name],
          value,
          `${slotId} nonCritical ${name}`,
        )
      if (entry.factors.critical === null) {
        expect(damage.factors.critical, slotId).toBeNull()
      } else {
        for (const [name, value] of Object.entries(entry.factors.critical))
          close(
            damage.factors.critical![name],
            value,
            `${slotId} critical ${name}`,
          )
      }

      if (totals !== null) {
        // 聚合动作不给显示跳字，沿用契约的 null，不冒充游戏逐次显示。
        expect(totals.displayedNonCritical, slotId).toBeNull()
        expect(totals.displayedCritical, slotId).toBeNull()
      }

      // 面板以声明的局外最终值为权威：不按装备重建、不重复叠加。
      if (panelResults.length) {
        expect(panelResults.map((panel) => panel.entityId).toSorted()).toEqual(
          slot.team.map(actorEntityId).toSorted(),
        )
        for (const panel of panelResults) {
          const key = slot.team.find(
            (candidate) => actorEntityId(candidate) === panel.entityId,
          )!
          const declared = livePanel(slot, key)
          expect(Object.keys(panel.stats).toSorted(), slotId).toEqual(
            Object.keys(declared.stats).toSorted(),
          )
          for (const [stat, value] of Object.entries(declared.stats))
            close(panel.stats[stat]!.value, value, `${slotId} panel ${stat}`)
          close(
            panel.penetrationValue,
            declared.penetrationValue,
            `${slotId} panel penetrationValue`,
          )
          expect(panel.damageBonuses, `${slotId} panel damageBonuses`).toEqual(
            declared.damageBonuses,
          )
        }
      }

      // 已解析动作的类别、技能目标、段结构、元素与倍率必须与固定输入一致。
      if (slot.event.kind === "agent-action") {
        const event = slot.event
        expect(action, slotId).not.toBeNull()
        if (!action || !action.ok) throw new Error(`${slotId} action`)
        expect(action.resolutionContext.agentEntityId, slotId).toBe(
          teamDifferentialAgentByKey[event.actor]!.agentEntityId,
        )
        expect(action.skillCategory, slotId).toBe(event.skillCategory)
        expect(action.skillTargetIds.toSorted(), slotId).toEqual(
          [...event.skillTargetIds].toSorted(),
        )
        if (action.calculation.kind === "luminize") {
          expect(event.damageKind, slotId).toBe("luminize")
          expect(action.calculation.multiplier, slotId).toBeCloseTo(
            event.multiplier,
            12,
          )
        } else {
          expect(action.calculation.kind, slotId).toBe("damage")
          if (action.calculation.kind !== "damage")
            throw new Error(`${slotId} calculation`)
          expect(action.calculation.segments, slotId).toHaveLength(1)
          const segment = action.calculation.segments[0]!
          expect(segment.element, slotId).toBe(event.element)
          expect(segment.damageKind, slotId).toBe(event.damageKind)
          expect(segment.granularity, slotId).toBe("aggregate")
          expect(segment.repeat, slotId).toBe(1)
          expect(segment.damageItems, slotId).toHaveLength(1)
          expect(segment.damageItems[0]!.damageMultiplier, slotId).toBeCloseTo(
            event.multiplier,
            12,
          )
        }
      }

      // 属性读数身份：实体、属性与数值逐条对得上（异常/紊乱可区分来源与触发者）。
      const actualReads = damage.evaluation.attributes.map((attribute) => ({
        entityId: attribute.entityId,
        stat: attribute.stat,
        stage: attribute.stage,
        value: attribute.value.value,
      }))
      const expectedReads = entry.identity.attributeReads
      expect(actualReads, `${slotId} attribute read count`).toHaveLength(
        expectedReads.length,
      )
      const unmatchedReads = [...expectedReads]
      for (const actual of actualReads) {
        const index = unmatchedReads.findIndex(
          (expected) =>
            expected.entityId === actual.entityId &&
            expected.stat === actual.stat &&
            expected.stage === actual.stage &&
            Math.abs(Number(expected.value) - actual.value) <=
              Math.max(1e-9, Math.abs(actual.value) * 1e-12),
        )
        expect(
          index,
          `${slotId} unexplained attribute read ${actual.entityId} ${actual.stat}`,
        ).toBeGreaterThanOrEqual(0)
        unmatchedReads.splice(index, 1)
      }
      expect(unmatchedReads, `${slotId} unconsumed attribute reads`).toEqual([])

      // 命中贡献身份：通道、受益者与来源选项逐条一致。
      const actor = entry.identity.actorEntityId
      const actualChannels = damage.evaluation.contributions
        .filter(
          (contribution) =>
            contribution.address.kind === "factor" &&
            contribution.address.channel !== "anomaly-duration-addition" &&
            contribution.address.entityId === actor,
        )
        .map((contribution) => ({
          channel: (contribution.address as { channel: string }).channel,
          value: contribution.value.value,
          effectId: contribution.origin.effectId,
        }))
      expect(actualChannels, `${slotId} channel count`).toHaveLength(
        entry.channels.length,
      )
      // 逐条配对：通道与数值一致，且来源规则属于记录里的那个选项。
      const unmatched = [...entry.channels]
      for (const actual of actualChannels) {
        const index = unmatched.findIndex(
          (expected) =>
            expected.channel === actual.channel &&
            Math.abs(Number(expected.value) - actual.value) <=
              Math.max(1e-9, Math.abs(actual.value) * 1e-12) &&
            effectIdsOf(expected.optionId).includes(actual.effectId),
        )
        expect(
          index,
          `${slotId} unexplained contribution ${actual.channel} ${actual.effectId}`,
        ).toBeGreaterThanOrEqual(0)
        unmatched.splice(index, 1)
      }
      expect(unmatched, `${slotId} unconsumed reference channels`).toEqual([])

      // 持续时间：只有紊乱会消费，且与目录 preparations 的时长一致。
      const durationContributions = (damage.preparations ?? []).flatMap(
        (preparation) =>
          preparation.contributions.map((contribution) => ({
            seconds: contribution.value.value,
            effectId: contribution.origin.effectId,
          })),
      )
      expect(durationContributions, `${slotId} duration`).toHaveLength(
        entry.durationPreparations.length,
      )
      for (const [index, expected] of entry.durationPreparations.entries()) {
        close(
          durationContributions[index]!.seconds,
          expected.seconds,
          `${slotId} duration`,
        )
        expect(
          effectIdsOf(expected.optionId),
          `${slotId} duration source`,
        ).toContain(durationContributions[index]!.effectId)
      }

      // 基础读数身份：伤害项的属性、倍率与来源实体。
      const item = damage.evaluation.hit!.damageItems[0]!
      expect(item.damageMultiplier, slotId).toBeCloseTo(
        Number(entry.identity.baseStat.multiplier),
        12,
      )
      close(
        item.finalStat,
        entry.identity.baseStat.value,
        `${slotId} base stat`,
      )
      if (entry.identity.luminize) {
        close(
          Number(entry.identity.luminize.restrictedMastery),
          damage.factors.nonCritical.anomalyProficiency! * 100,
          `${slotId} restricted mastery`,
        )
        close(
          damage.factors.nonCritical.baseDamage,
          entry.identity.luminize.restrictedAttack,
          `${slotId} restricted attack`,
        )
      }

      // 上游真实返回：异常事件三档分别取整对照；仪玄只投影已证贯穿力 round(2)。
      // 新增边界没有上游执行结果，明确不比较整数，也不补造整数。
      expect(upstream !== undefined, slotId).toBe(
        slot.upstreamEvidence === "reviewed-adapter-run",
      )
      if (upstream === undefined) return
      if (upstream.anomalyTiers) {
        expect(
          Math.round(damage.nonCritical),
          `${slotId} upstream noCritical`,
        ).toBe(upstream.anomalyTiers.noCritical)
        expect(
          Math.round(damage.critical!),
          `${slotId} upstream fullCritical`,
        ).toBe(upstream.anomalyTiers.fullCritical)
        expect(Math.round(damage.expected), `${slotId} upstream expected`).toBe(
          upstream.anomalyTiers.expected,
        )
      } else if (entry.identity.referencePiercePower !== undefined) {
        // 上游贯穿力提前 round(2)：只在比较投影中替换该读数，其余保持不变。
        const scale =
          entry.identity.referencePiercePower /
          Number(entry.identity.baseStat.value)
        expect(
          Math.round(damage.expected * scale),
          `${slotId} upstream expected`,
        ).toBe(upstream.expected)
      } else {
        expect(Math.round(damage.expected), `${slotId} upstream expected`).toBe(
          upstream.expected,
        )
      }
    },
  )

  it("keeps the single, duo and team increments meaningful", () => {
    const damageOf = (slotId: string) => compute(slotsById.get(slotId)!).damage
    const factor = (slotId: string, name: string) =>
      damageOf(slotId).factors.nonCritical[name]!
    // 影画/核心增伤只改变增伤区，不改变面板基础伤害。
    close(
      factor("S3-1/yixuan-charge", "baseDamage"),
      factor("S3-0/yixuan-charge", "baseDamage"),
      "yixuan base damage",
    )
    close(
      factor("S3-1/yixuan-charge", "damageBonus") -
        factor("S3-0/yixuan-charge", "damageBonus"),
      0.6,
      "yixuan core bonus",
    )
    // 耀嘉音攻击转模只贡献一次 360 贯穿力增量（0.3 × 1200）。
    close(
      factor("T3-1/yixuan-charge", "baseDamage") -
        factor("T3-0/yixuan-charge", "baseDamage"),
      Number(
        reference.cases["T3-1/yixuan-charge"]!.identity.baseStat.multiplier,
      ) *
        0.3 *
        1200,
      "astra attack increment",
    )
    // 灼烧时长 +3 秒使火紊乱倍率从 11.5 提升到 14.5，已过时间 6 秒回到 11.5。
    close(
      damageOf("D3-1/burnice-fire-disorder").evaluation.hit!.damageItems[0]!
        .damageMultiplier,
      14.5,
      "disorder +3s multiplier",
    )
    close(
      damageOf("D3-2/burnice-fire-disorder").evaluation.hit!.damageItems[0]!
        .damageMultiplier,
      11.5,
      "disorder elapsed 6s multiplier",
    )
    // 影画 1 完整选项：队友异常增伤 +0.1，持有者自身净 0。
    close(
      factor("T5-1/burnice-fire-disorder", "anomalyDamageBonus"),
      1,
      "disorder keeps M1 out",
    )
    close(
      factor("T5-1/jane-assault", "anomalyDamageBonus"),
      1.1,
      "teammate anomaly bonus",
    )
  })

  it("keeps the critical-rate clamp and sharp-critical controls meaningful", () => {
    // 暴击率超过 100% 时按 1 结算：期望等于必暴击档。
    for (const slotId of ["S1-2/nicole-cannon", "S3-2/yixuan-charge"]) {
      const damage = compute(slotsById.get(slotId)!).damage
      close(damage.criticalRate, 1, `${slotId} clamped critical rate`)
      close(damage.expected, damage.critical, `${slotId} clamped expectation`)
    }
    // 锐暴：r ≤ 1 时必暴击档为 1 + B，期望按 (1 − r) + r × 必暴击档加权。
    const sharp = compute(slotsById.get("S4-1/claret-ultimate")!).damage
    close(
      sharp.factors.critical!.sharpCritical,
      1.4,
      "S4-1 sharp critical zone",
    )
    close(
      sharp.expected,
      sharp.nonCritical * 0.25 + sharp.critical! * 0.75,
      "S4-1 sharpen expectation",
    )
    const remnant = compute(slotsById.get("T4-2/claret-ultimate")!).damage
    // 残锋 +25 个百分点：B 从面板的 0.4 提高到 0.65，不落回资料默认值。
    close(remnant.factors.critical!.sharpCritical, 1.65, "T4-2 remnant B")
    close(
      compute(slotsById.get("T4-1/claret-ultimate")!).damage.factors.nonCritical
        .damageBonus,
      1.5,
      "T4-1 claret state and M4",
    )
    close(
      compute(slotsById.get("T4-2/claret-ultimate")!).damage.factors.nonCritical
        .damageBonus,
      1.7,
      "T4-2 astra song added",
    )
  })

  it("keeps the conversion threshold, cap and off boundaries explicit", () => {
    const bounded = teamDifferentialSlots.filter(
      (slot) => slot.case.conversionBoundary !== undefined,
    )
    expect(bounded.length).toBe(9)
    for (const slot of bounded) {
      const boundary = slot.case.conversionBoundary!
      const frozen = reference.cases[slot.slotId]!.conversionBoundary!
      const group = teamDifferentialBuffGroups[boundary.groupId]!
      const optionId = group.effects[0]!.optionId
      const damage = compute(slot).damage
      const contributions = conversionContributions(damage, optionId)
      const actorKey = slot.event.actor
      if (boundary.position === "off") {
        // 关闭效果：同面板下不产生任何贡献，读数保持声明值。
        expect(contributions, slot.slotId).toEqual([])
        expect(
          damage.evaluation.contributions.some((contribution) =>
            effectIdsOf(optionId).includes(contribution.origin.effectId),
          ),
          `${slot.slotId} off control`,
        ).toBe(false)
        // 关闭对照必须非平凡：同一面板选中该记录时确实有转换值。
        expect(
          Number(frozen.recordConversion),
          `${slot.slotId} off control is not trivial`,
        ).toBeGreaterThan(0)
      } else {
        // 贡献只出现一次，且落在声明的输出属性上；来源绑定仍是持有者，
        // 受益实体是本次命中消费该读数的角色（团队转换不写成持有者自身）。
        expect(contributions, slot.slotId).toHaveLength(1)
        const contribution = contributions[0]!
        expect(contribution.address.kind, slot.slotId).toBe("stat")
        const address = contribution.address as {
          stat: string
          stage: string
          entityId: string
        }
        expect(address.stat, slot.slotId).toBe(
          boundary.outputUnit === "ratio" ? "penetrationRatio" : "attack",
        )
        expect(address.stage, slot.slotId).toBe(
          boundary.outputUnit === "ratio" ? "direct" : "final-fixed",
        )
        expect(address.entityId, slot.slotId).toBe(actorEntityId(actorKey))
        expect(contribution.origin.bindingId, slot.slotId).toBe(
          agentBinding(group.holder).bindingId,
        )
        // 贡献值与冻结参考的边界期望一致（阈值/上限由固定记录推出）。
        close(
          contribution.value.value,
          frozen.expectedConversion,
          `${slot.slotId} conversion contribution`,
        )
      }
      // 引擎实际输入取实时夹具的声明面板，不取参考；面板是权威局外输入。
      const declared = livePanel(slot, actorKey)
      if (boundary.outputUnit === "ratio") {
        const read = damage.evaluation.attributes.find(
          (attribute) =>
            attribute.entityId === actorEntityId(actorKey) &&
            attribute.stat === "penetrationRatio" &&
            attribute.stage === "current",
        )!
        expect(read, `${slot.slotId} penetration read`).toBeDefined()
        close(
          read.value.value,
          declared.stats.penetrationRatio! +
            (boundary.position === "off"
              ? 0
              : Number(frozen.expectedConversion)),
          `${slot.slotId} penetration after conversion`,
        )
      } else {
        // 自身攻击转换：命中基础读数等于声明攻击加唯一一次转换。
        close(
          damage.evaluation.hit!.damageItems[0]!.finalStat,
          declared.stats.attack! +
            (boundary.position === "off"
              ? 0
              : Number(frozen.expectedConversion)),
          `${slot.slotId} attack after conversion`,
        )
      }
    }
  })

  it("keeps the anomaly strength source, trigger and buff holder separate", () => {
    // D3-0 是原批次的双人紊乱；B1-0 把两个面板刻意拉开，互换不可能被掩盖。
    for (const slotId of [
      "D3-0/burnice-fire-disorder",
      "B1-0/burnice-fire-disorder",
    ]) {
      const slot = slotsById.get(slotId)!
      if (slot.event.kind !== "standard-disorder")
        throw new Error(`${slotId} standard-disorder`)
      const providerKey = slot.event.powerSource
      const triggerKey = slot.event.actor
      expect(providerKey, slotId).not.toBe(triggerKey)
      const provider = livePanel(slot, providerKey)
      const trigger = livePanel(slot, triggerKey)
      const damage = compute(slot).damage
      const multiplier = damage.evaluation.hit!.damageItems[0]!.damageMultiplier
      // 基础属性、精通与穿透读强度提供者，不读出招者。
      close(
        damage.factors.nonCritical.baseDamage,
        provider.stats.attack! * multiplier,
        `${slotId} base damage from the power source`,
      )
      close(
        damage.factors.nonCritical.anomalyProficiency,
        provider.stats.anomalyProficiency! / 100,
        `${slotId} proficiency from the power source`,
      )
      close(
        damage.factors.nonCritical.defense,
        defenseZoneFromPanel({
          penetrationRatio: provider.stats.penetrationRatio!,
          penetrationValue: provider.penetrationValue,
        }),
        `${slotId} defense from the power source`,
      )
      // 两个面板必须显著不同：否则把身份读错也看不出来。
      expect(
        Math.abs(provider.stats.attack! - trigger.stats.attack!) /
          provider.stats.attack!,
        `${slotId} attack separation`,
      ).toBeGreaterThan(0.05)
      expect(
        Math.abs(
          provider.stats.anomalyProficiency! -
            trigger.stats.anomalyProficiency!,
        ) / provider.stats.anomalyProficiency!,
        `${slotId} proficiency separation`,
      ).toBeGreaterThan(0.1)
      expect(
        provider.stats.penetrationRatio!,
        `${slotId} penetration separation`,
      ).not.toBe(trigger.stats.penetrationRatio!)
      // 每项属性读数带实体与阶段；强度读数属提供者，触发者只承载自己的当前读数。
      for (const stat of [
        "attack",
        "anomalyProficiency",
        "penetrationRatio",
      ] as const) {
        const read = damage.evaluation.attributes.find(
          (attribute) =>
            attribute.entityId === actorEntityId(providerKey) &&
            attribute.stat === stat,
        )
        expect(read, `${slotId} ${stat} read`).toBeDefined()
        expect(read!.stage, `${slotId} ${stat} read stage`).toBe("current")
      }
      const triggerRead = damage.evaluation.attributes.find(
        (attribute) =>
          attribute.entityId === actorEntityId(triggerKey) &&
          attribute.stat === "criticalRate",
      )
      expect(triggerRead, `${slotId} trigger read`).toBeDefined()
      expect(triggerRead!.stage, `${slotId} trigger read stage`).toBe("current")
      close(
        triggerRead!.value.value,
        trigger.stats.criticalRate!,
        `${slotId} trigger current critical rate`,
      )
    }
  })

  it("keeps the disorder duration boundaries explicit and rejects invalid input", () => {
    const multiplierOf = (slotId: string) =>
      compute(slotsById.get(slotId)!).damage.evaluation.hit!.damageItems[0]!
        .damageMultiplier
    // 未经过：基础 10 秒全部剩余，火紊乱每 0.5 秒一档。
    close(multiplierOf("C1-0/burnice-fire-disorder"), 14.5, "C1-0")
    // 正小数剩余：7 − 0.25 = 6.75 秒 → floor(13.5) = 13 档。
    close(multiplierOf("C1-1/burnice-fire-disorder"), 11, "C1-1")
    // 低于半档的剩余（0.25 秒）不产生补偿档，回到基础倍率。
    close(multiplierOf("C1-2/burnice-fire-disorder"), 4.5, "C1-2")
    // 恰好耗尽与超过持续时间都被钳制到同一基础倍率，不是零伤害也不是拒绝。
    close(multiplierOf("C1-3/burnice-fire-disorder"), 4.5, "C1-3 exhausted")
    close(multiplierOf("C1-4/burnice-fire-disorder"), 4.5, "C1-4 clamped")
    expect(
      multiplierOf("C1-3/burnice-fire-disorder"),
      "exhausted equals beyond",
    ).toBe(multiplierOf("C1-4/burnice-fire-disorder"))
    expect(
      compute(slotsById.get("C1-3/burnice-fire-disorder")!).damage.nonCritical,
      "exhausted is not zero damage",
    ).toBeGreaterThan(0)
    // 延长 3 秒后恰好耗尽：剩余 0，仍为基础倍率，且时长贡献只出现一次。
    close(multiplierOf("C1-5/burnice-fire-disorder"), 4.5, "C1-5 extended")
    const extended = compute(slotsById.get("C1-5/burnice-fire-disorder")!)
    const durationContributions = (extended.damage.preparations ?? []).flatMap(
      (preparation) => preparation.contributions,
    )
    expect(durationContributions, "C1-5 duration preparation").toHaveLength(1)
    close(durationContributions[0]!.value.value, 3, "C1-5 duration seconds")
    // 延长仍有余量：基础 10 秒已过、延长 3 秒还剩 1 秒，与同已过秒数的关闭档配对；
    // "基础时长耗尽后丢弃延长"的错误实现会给出与关闭档相同的 4.5。
    close(multiplierOf("C1-6/burnice-fire-disorder"), 5.5, "C1-6 extended")
    expect(
      multiplierOf("C1-6/burnice-fire-disorder"),
      "extension still in effect differs from the same elapsed without it",
    ).toBeGreaterThan(multiplierOf("C1-4/burnice-fire-disorder"))
    const stillExtended = compute(slotsById.get("C1-6/burnice-fire-disorder")!)
    const stillExtendedDuration = (
      stillExtended.damage.preparations ?? []
    ).flatMap((preparation) => preparation.contributions)
    expect(stillExtendedDuration, "C1-6 duration preparation").toHaveLength(1)
    close(stillExtendedDuration[0]!.value.value, 3, "C1-6 duration seconds")
    const noExtensionPair = compute(
      slotsById.get("C1-4/burnice-fire-disorder")!,
    )
    expect(
      (noExtensionPair.damage.preparations ?? []).flatMap(
        (preparation) => preparation.contributions,
      ),
      "C1-4 has no duration contribution",
    ).toEqual([])
    // 同一已过秒数下只有延长贡献与倍率不同：攻击读数不变，非暴击档按倍率比缩放
    // （暴击与期望同为该倍率的派生，由逐槽位参考断言覆盖）。
    close(
      stillExtended.damage.evaluation.hit!.damageItems[0]!.finalStat,
      noExtensionPair.damage.evaluation.hit!.damageItems[0]!.finalStat,
      "C1-6 attack stat unchanged",
    )
    close(
      stillExtended.damage.nonCritical,
      noExtensionPair.damage.nonCritical *
        (Number(
          reference.cases["C1-6/burnice-fire-disorder"]!.identity.baseStat
            .multiplier,
        ) /
          Number(
            reference.cases["C1-4/burnice-fire-disorder"]!.identity.baseStat
              .multiplier,
          )),
      "C1-6 damage scales with the extra disorder ticks",
    )
    // 非法输入必须被明确拒绝，不能被当成零剩余或零伤害。
    const base = catalogInputFor(slotsById.get("C1-3/burnice-fire-disorder")!)
    // 面板与事件仍取实时夹具；这里只把时长字段改成非法值以核对拒绝契约。
    const baseItem = base.hit.damageItems[0] as unknown as Record<
      string,
      unknown
    >
    for (const [field, mutated] of [
      ["elapsedSeconds", -1],
      ["baseDurationSeconds", -10],
    ] as const) {
      const result = calculateStaticDamageFromCatalog({
        ...base,
        hit: {
          ...base.hit,
          damageItems: [
            { ...baseItem, [field]: mutated },
          ] as unknown as typeof base.hit.damageItems,
        },
      })
      expect(result.ok, `${field} ${mutated}`).toBe(false)
      if (result.ok) continue
      expect(
        result.issues.map((issue) => [issue.code, issue.pointer]),
        `${field} ${mutated}`,
      ).toEqual([["INVALID_INPUT", `/hit/damageItems/0/${field}`]])
    }
  })

  /**
   * 历史强度快照：固定上游没有时间快照对象，因此这里不做上游时间线模拟。
   * 与之等价的上游可表达形式是「冻结强度面板 + 当前触发者面板」，也就是本批
   * `D3-0` 的静态槽位；快照版本必须复现该槽位的冻结期望，而当前触发者的读数
   * 仍按当前状态读取。强度读数（攻击/精通/穿透率）经公开 `snapshots` +
   * `anomalySource.snapshotId`（伤害项 `statSource.snapshotId`）构造，不是把
   * 当前面板改成旧值。
   */
  const snapshotStaticSlotId = "D3-0/burnice-fire-disorder"
  const historicalSnapshotId = "snapshot:d3-0-historical" as const

  /**
   * 保存世界的触发者面板刻意与当前不同：如果无快照的读数（本次紊乱只消费触发者的
   * 暴击率）错误取自保存世界，实际读数会是这里的值而不是当前面板值。
   */
  const savedWorldTriggerPanel = {
    attack: 2222.5,
    criticalRate: 0.75,
  } as const

  /** 以 `D3-0` 的实时输入为底，构造读取历史快照的等价输入。 */
  function historicalSnapshotInput(options: {
    /** 当前 world 是否仍观察到强度提供者。 */
    observed: boolean
    /** 快照缺少的保存读数（用于反例）。 */
    omit?: "attack" | "anomalyProficiency" | "penetrationRatio"
    /** 当前 world 中强度提供者的面板；省略即用声明面板。 */
    currentProvider?: Partial<
      (typeof teamDifferentialAgentByKey)[string]["panel"]
    >
  }) {
    const slot = slotsById.get(snapshotStaticSlotId)!
    const event = slot.event
    if (event.kind !== "standard-disorder") throw new Error("disorder expected")
    const providerKey = event.powerSource
    const triggerKey = event.actor
    // 保存的历史读数来自实时夹具的声明面板，不来自冻结参考。
    const declared = livePanel(slot, providerKey)
    const observations = [
      {
        entityId: actorEntityId(providerKey),
        stat: "attack" as const,
        stage: "current" as const,
        value: {
          unit: "attack-points" as const,
          value: declared.stats.attack!,
        },
      },
      {
        entityId: actorEntityId(providerKey),
        stat: "anomalyProficiency" as const,
        stage: "current" as const,
        value: {
          unit: "anomaly-proficiency-points" as const,
          value: declared.stats.anomalyProficiency!,
        },
      },
      {
        entityId: actorEntityId(providerKey),
        stat: "penetrationRatio" as const,
        stage: "current" as const,
        value: {
          unit: "ratio" as const,
          value: declared.stats.penetrationRatio!,
        },
      },
    ].filter(
      (observation) =>
        observation.stat !==
        (options.omit as "attack" | "anomalyProficiency" | "penetrationRatio"),
    )
    const input = catalogInputFor(slot)
    // 当前世界与保存世界分开构造：当前世界用变化后的提供者面板，保存世界保留声明
    // 读数，但触发者面板刻意不同，使"错读保存世界"能被实际读数区分出来。
    const currentWorldEntities = slot.team
      .filter((key) => options.observed || key !== providerKey)
      .map((key) =>
        worldActor(
          key,
          key === providerKey && options.currentProvider !== undefined
            ? panelWithOverride(key, options.currentProvider)
            : panelWithOverride(key),
        ),
      )
    const savedWorldEntities = slot.team.map((key) =>
      worldActor(
        key,
        key === triggerKey
          ? panelWithOverride(key, { ...savedWorldTriggerPanel })
          : panelWithOverride(key),
      ),
    )
    return {
      ...input,
      // 强度提供者可以不在当前 world；它仍须是已声明的目录角色身份，
      // 因此只移除观察到的成员与绑定，保留 actorSources。
      bindings: options.observed
        ? input.bindings
        : input.bindings.filter(
            (binding) => binding.holderId !== actorEntityId(providerKey),
          ),
      world: {
        ...input.world,
        entities: [
          ...currentWorldEntities,
          input.world.entities.find(
            (entity) => entity.entityId === teamDifferentialTarget.entityId,
          )!,
        ],
      },
      snapshots: [
        {
          snapshotId: historicalSnapshotId,
          atSeconds: 0,
          attributes: observations,
          world: {
            entities: savedWorldEntities,
            states: [],
            distances: [],
          },
        },
      ],
      hit: {
        ...input.hit,
        damageItems: [
          {
            ...input.hit.damageItems[0]!,
            statSource: {
              entityId: actorEntityId(providerKey),
              snapshotId: historicalSnapshotId,
            },
          },
        ] as unknown as StaticCatalogDamageInput["hit"]["damageItems"],
      },
      damage: {
        ...input.damage,
        // 快照只保存属性读数；穿透值与已结算增伤仍由调用方按冻结的强度输入给出。
        anomalySource: {
          ...(
            input.damage as unknown as {
              anomalySource: { entityId: string; level: number }
            }
          ).anomalySource,
          snapshotId: historicalSnapshotId,
        },
      } as StaticCatalogDamageInput["damage"],
    }
  }

  it("reads the historical anomaly strength from the saved snapshot, not the current panel", () => {
    const slot = slotsById.get(snapshotStaticSlotId)!
    const frozen = reference.cases[snapshotStaticSlotId]!
    const providerKey = (slot.event as { powerSource: string }).powerSource
    // 当前面板显著变化；若强度取自当前面板，结果不可能落在冻结容差内。
    const changedProvider = {
      attack: 1500.25,
      anomalyProficiency: 480,
      penetrationRatio: 0.3,
    }
    for (const observed of [true, false]) {
      const result = calculateStaticDamageFromCatalog(
        historicalSnapshotInput({ observed, currentProvider: changedProvider }),
      )
      expect(result.ok, JSON.stringify(result)).toBe(true)
      if (!result.ok) return
      const damage = result.value
      // 与静态等价槽位（D3-0）的冻结期望一致：冻结强度 + 当前触发者。
      close(
        damage.nonCritical,
        frozen.totals.nonCritical,
        "snapshot nonCritical",
      )
      close(damage.critical, frozen.totals.critical, "snapshot critical")
      close(damage.expected, frozen.totals.expected, "snapshot expected")
      // 每项强度读数带保存快照的身份与阶段，数值等于保存（声明）读数而不是
      // 变化后的当前面板；触发者读数仍是当前值、没有快照。
      const savedProvider = livePanel(slot, providerKey)
      for (const stat of [
        "attack",
        "anomalyProficiency",
        "penetrationRatio",
      ] as const) {
        const read = damage.evaluation.attributes.find(
          (attribute) =>
            attribute.entityId === actorEntityId(providerKey) &&
            attribute.stat === stat,
        )
        expect(read, `snapshot ${stat} read`).toBeDefined()
        expect(read!.stage, `snapshot ${stat} stage`).toBe("current")
        expect(read!.snapshotId, `snapshot ${stat} identity`).toBe(
          historicalSnapshotId,
        )
        close(
          read!.value.value,
          savedProvider.stats[stat]!,
          `snapshot ${stat} saved value`,
        )
        expect(
          changedProvider[stat],
          `snapshot ${stat} discriminator`,
        ).not.toBe(savedProvider.stats[stat]!)
      }
      const triggerKey = slot.event.actor
      const currentTrigger = livePanel(slot, triggerKey)
      const triggerRead = damage.evaluation.attributes.find(
        (attribute) =>
          attribute.entityId === actorEntityId(triggerKey) &&
          attribute.stat === "criticalRate",
      )!
      // 触发者读数必须来自当前 world：实体、阶段、无快照，且数值等于当前面板；
      // 保存世界的触发者暴击率刻意不同（0.75），错读会在这里暴露。
      expect(triggerRead.entityId, "trigger read entity").toBe(
        actorEntityId(triggerKey),
      )
      expect(triggerRead.stage, "trigger read stage").toBe("current")
      expect(
        triggerRead.snapshotId,
        "trigger read stays current",
      ).toBeUndefined()
      close(
        triggerRead.value.value,
        currentTrigger.stats.criticalRate!,
        "trigger read current value",
      )
      expect(
        savedWorldTriggerPanel.criticalRate,
        "saved trigger panel is a real discriminator",
      ).not.toBe(currentTrigger.stats.criticalRate!)
      // 普通紊乱不消费触发者暴击率（异常暴击率走独立通道，此处为 0），
      // 因此区分保存/当前触发者读数不改变三档伤害期望，只改变属性读取身份。
      expect(
        damage.criticalRate,
        "disorder crit rate stays channel-based",
      ).toBe(0)
    }
    // 未变化的当前面板 + 同一快照仍一致：快照读数与声明面板同值。
    const unchanged = calculateStaticDamageFromCatalog(
      historicalSnapshotInput({ observed: true }),
    )
    expect(unchanged.ok).toBe(true)
    if (unchanged.ok)
      close(
        unchanged.value.expected,
        frozen.totals.expected,
        "snapshot with unchanged current panel",
      )
    // 反例：读当前面板（去掉快照）时必须明显不同，证明相等断言不是空的。
    const unfrozenInput = historicalSnapshotInput({
      observed: true,
      currentProvider: changedProvider,
    })
    const { snapshotId: _unfrozenSnapshotId, ...anomalySourceWithoutSnapshot } =
      (
        unfrozenInput.damage as unknown as {
          anomalySource: {
            entityId: string
            level: number
            snapshotId?: string
          }
        }
      ).anomalySource
    const unfrozen = calculateStaticDamageFromCatalog({
      ...unfrozenInput,
      snapshots: [],
      hit: {
        ...unfrozenInput.hit,
        damageItems: [
          {
            ...unfrozenInput.hit.damageItems[0]!,
            statSource: { entityId: actorEntityId(providerKey) },
          },
        ],
      },
      damage: {
        ...unfrozenInput.damage,
        anomalySource: anomalySourceWithoutSnapshot,
      } as StaticCatalogDamageInput["damage"],
    })
    expect(unfrozen.ok, JSON.stringify(unfrozen)).toBe(true)
    if (unfrozen.ok) {
      const frozenExpected = Number(frozen.totals.expected)
      // 读取当前面板与冻结强度的相对差远大于浮点容差，相等断言不是空的。
      expect(
        Math.abs(unfrozen.value.expected - frozenExpected) / frozenExpected,
        "current panel must not reproduce the frozen strength",
      ).toBeGreaterThan(0.05)
    }
    // 反例：快照缺少任一保存读数时明确拒绝，不静默回落到当前面板。
    for (const omit of [
      "attack",
      "anomalyProficiency",
      "penetrationRatio",
    ] as const) {
      const missing = calculateStaticDamageFromCatalog(
        historicalSnapshotInput({
          observed: true,
          currentProvider: changedProvider,
          omit,
        }),
      )
      expect(missing.ok, `missing ${omit}`).toBe(false)
      if (missing.ok) continue
      expect(
        missing.issues.map((issue) => issue.code),
        `missing ${omit}`,
      ).toContain("MISSING_SNAPSHOT")
    }
    // 反例：异常强度提供者没有声明目录身份时明确拒绝。
    const undeclared = calculateStaticDamageFromCatalog({
      ...historicalSnapshotInput({
        observed: false,
        currentProvider: changedProvider,
      }),
      actorSources: slotsById
        .get(snapshotStaticSlotId)!
        .team.filter((key) => key !== providerKey)
        .map((key) => ({
          entityId: actorEntityId(key),
          agentEntityId: teamDifferentialAgentByKey[key]!.agentEntityId,
        })),
    })
    expect(undeclared.ok, JSON.stringify(undeclared)).toBe(false)
    if (!undeclared.ok)
      expect(
        undeclared.issues.map((issue) => issue.pointer),
        "undeclared anomaly source identity",
      ).toContain("/damage/anomalySource")
  })
})
