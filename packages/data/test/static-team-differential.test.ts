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
import type { TeamDifferentialSlot } from "./fixtures/static-team-differential-cases.ts"

/**
 * 固定面板队伍差分回归：12 预设 / 36 状态 / 42 个独立事件。
 *
 * - 期望值来自 `fixtures/static-team-differential-reference.json`：固定上游原始
 *   记录 + 独立十进制有理数算式生成，不由本实现回填，也不能用被测函数生成；
 * - 上游真实整数返回来自 `fixtures/static-team-differential-upstream-returns.json`，
 *   只在比较投影中应用已证取整（含仪玄贯穿力 round(2)），不改本实现的数值与精度。
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
  const agent = teamDifferentialAgentByKey[key]!
  const overridden = { ...agent.panel, ...slot.case.panelOverrides?.[key] }
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
    expect(teamDifferentialSlots).toHaveLength(42)
    expect(new Set(Object.keys(reference.cases))).toEqual(
      new Set(slotsById.keys()),
    )
    expect(upstreamReturns.returns).toHaveLength(42)
    expect(new Set(upstreamBySlot.keys())).toEqual(new Set(slotsById.keys()))
    for (const slot of teamDifferentialSlots) {
      const entry = reference.cases[slot.slotId]!
      expect(entry.kind).toBe(
        slot.event.kind === "agent-action"
          ? slot.event.damageKind
          : slot.event.kind === "ordinary-anomaly"
            ? "anomaly"
            : "disorder",
      )
      expect(entry.totals.nonCritical.length).toBeGreaterThan(0)
      expect(entry.totals.expected.length).toBeGreaterThan(0)
      expect(Object.keys(entry.factors.nonCritical).length).toBeGreaterThan(0)
      expect(entry.identity.baseStat.stat.length).toBeGreaterThan(0)
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
    // 数据版本与固定来源：快照、契约与固定提交在测试里直接可见。
    expect(loaded.version).toEqual({
      packageVersion: "0.2.1",
      contractVersion: 1,
      gameVersion: "3.2",
      snapshotId: reference.provenance.snapshotId,
    })
    expect(loaded.catalog.source.commit).toBe(
      reference.provenance.effectSource.commit,
    )
    expect(reference.provenance.effectsRevision).toBe(14)
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
      const upstream = upstreamBySlot.get(slotId)!
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
})
