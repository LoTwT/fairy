import { describe, expect, it } from "vitest"
import { calculateStaticActionDamage } from "../src/static/calculate.ts"
import { calculateStaticDamageFromCatalog } from "../src/effects/index.ts"
import { CORE_PACKAGE_VERSION } from "../src/package-version.ts"
import type { StaticActionCalculationInput } from "../src/static/types.ts"
import type {
  AstraYaoM4CatalogInput,
  LucyGuardBoarCatalogInput,
} from "../src/effects/types.ts"
import {
  CALCULATION_CONTRACT_VERSION,
  CALCULATION_GAME_VERSION,
} from "@randomplay/shared"
import type {
  AgentAction,
  AstraYaoM4Rule,
  CalculationDataVersion,
  PanelAttributeValues,
  ResolvedAgentAction,
  RuleSet,
  SDriveDiscMaxLevelAffixes,
  SourceReference,
  StaticCalculationData,
  StaticEffectCatalog,
  StaticPanelRules,
} from "@randomplay/shared"

/**
 * 完整静态计算根入口 `calculateStaticActionDamage` 的包边界契约测试。
 *
 * 夹具全部合成：不依赖 data 包、不装载真实游戏数据——「全部数据由调用方
 * 提供」正是该入口的契约。数值期望按乘区公式与 60 级防御基数 794 手工推导，
 * 不从被测实现反推。覆盖范围只针对根入口自身：
 *
 * - 普通路径的代表性输入校验拒绝（错误码与指针）；
 * - 一条端到端数值断言（out-of-combat 面板、单段两次独立命中）；
 * - 具名机制转发：露西小猪与耀嘉音 M4 的转发结果等价于直接调用
 *   `calculateStaticDamageFromCatalog`，未知 mechanism 明确拒绝。
 *
 * `calculateStaticDamage` 与 `calculateStaticDamageFromCatalog` 的行为验收
 * 已由 test/effects 既有测试覆盖，这里不重复。
 */

const AGENT_ENTITY_ID = "9101"
const ATTACKER_ID = "entity:attacker" as const
const TARGET_ID = "entity:target" as const

const sourceReference = (resourcePath: string): SourceReference => ({
  sourceId: "fairy-static-action-tests",
  version: "1",
  locale: "zh",
  resourcePath,
  pointer: "",
})

const emptyDefinitions = (ruleSetId: string): RuleSet => ({
  schemaVersion: 1,
  ruleSetId,
  revision: "1",
  effects: [],
  states: [],
  actions: [],
})

const emptyCatalog = (ruleSetId: string): StaticEffectCatalog => ({
  schemaVersion: 2,
  ruleSetId,
  revision: "1",
  source: { repository: "fairy", commit: "synthetic", files: [] },
  entities: [],
  options: [],
  skillTargets: [],
  differences: [],
})

const version: CalculationDataVersion = {
  packageVersion: CORE_PACKAGE_VERSION,
  contractVersion: CALCULATION_CONTRACT_VERSION,
  gameVersion: CALCULATION_GAME_VERSION,
  snapshotId: `sha256:${"a".repeat(64)}`,
}

const baseAttributes: PanelAttributeValues = {
  health: { unit: "health-points", value: 12000 },
  attack: { unit: "attack-points", value: 800 },
  defense: { unit: "defense-points", value: 600 },
  impact: { unit: "impact-points", value: 96 },
  anomalyProficiency: { unit: "anomaly-proficiency-points", value: 92 },
  anomalyMastery: { unit: "anomaly-mastery-points", value: 90 },
  energyRegen: { unit: "energy-per-second", value: 1.2 },
  criticalRate: { unit: "ratio", value: 0.05 },
  criticalDamage: { unit: "ratio", value: 0.5 },
  penetrationRatio: { unit: "ratio", value: 0 },
  sharpCriticalDamage: { unit: "ratio", value: 0.5 },
}

const actionId = "action:agent:9101:basic-1" as const
const segmentId = "segment:9101:basic-1:hit-1" as const

/** 目录动作与解析结果共用同一段结构；倍率按解析语义固定为 2.0×攻击。 */
const catalogAction: AgentAction = {
  actionId,
  branchId: "branch:9101:basic-1",
  name: "Synthetic Basic",
  rowName: "Synthetic Basic",
  levelGroup: "basic",
  skillCategory: "basic",
  skillTargetIds: [],
  skillTags: [],
  source: { path: "synthetic", pointer: "" },
  descriptionSources: [],
  description: "synthetic action for the static entry contract tests",
  parameterIds: [],
  sourceExpression: "2.0×ATK",
  damageCoefficient: { levelGroup: "basic", base: 2, growth: 0 },
  dazeCoefficient: null,
  calculation: {
    kind: "damage",
    segments: [
      {
        segmentId,
        damageKind: "regular",
        element: "physical",
        granularity: "individual",
        repeat: 2,
        items: [
          {
            itemId: "item:9101:basic-1:attack",
            stat: "attack",
            coefficient: { levelGroup: "basic", base: 2, growth: 0 },
          },
        ],
      },
    ],
  },
  inputs: [],
  limitations: [],
  upstreamSkillId: null,
}

const resolvedAction: ResolvedAgentAction = {
  ok: true,
  resolutionContext: { agentEntityId: AGENT_ENTITY_ID, mindscapeRank: 0 },
  actionId,
  skillCategory: "basic",
  skillTargetIds: [],
  skillTags: [],
  levels: {},
  sourceDamageMultiplier: 2,
  dazeMultiplier: null,
  calculation: {
    kind: "damage",
    segments: [
      {
        segmentId,
        damageKind: "regular",
        element: "physical",
        granularity: "individual",
        repeat: 2,
        damageItems: [
          {
            itemId: "item:9101:basic-1:attack",
            stat: "attack",
            damageMultiplier: 2,
          },
        ],
      },
    ],
  },
  limitations: [],
}

const driveDiscAffixes: SDriveDiscMaxLevelAffixes = {
  schemaVersion: 1,
  rarity: "S",
  enhancement: "maximum",
  mainStatsBySlot: { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
  substatsPerRoll: [],
}

const panelRules: StaticPanelRules = {
  damageElementInheritance: [],
  agents: {
    [AGENT_ENTITY_ID]: { initialConversions: [], deriveSheerForce: false },
  },
  driveDiscSets: [],
  twoPieceOptions: [],
}

/** 全合成同版资料：不装载任何真实游戏数据，目录与效果均为空注册表。 */
const syntheticData: StaticCalculationData = {
  version,
  agents: [
    {
      attributes: {
        schemaVersion: 1,
        entityId: AGENT_ENTITY_ID,
        level: 60,
        baseAttributes,
        coreAttributeBonuses: {
          1: [],
          2: [],
          3: [],
          4: [],
          5: [],
          6: [],
          7: [],
        },
      },
      actions: {
        schemaVersion: 1,
        entityId: AGENT_ENTITY_ID,
        skillLevelBonuses: [],
        actions: [catalogAction],
      },
    },
  ],
  wEngines: [],
  driveDiscAffixes,
  definitions: emptyDefinitions("static-action-tests"),
  catalog: {
    ...emptyCatalog("static-action-tests"),
    entities: [
      {
        catalogEntityId: "agents:9101",
        upstreamId: AGENT_ENTITY_ID,
        name: "Synthetic Agent",
        identity: { kind: "agent", entityId: AGENT_ENTITY_ID },
        status: "mapped",
        profession: null,
        element: null,
      },
    ],
  },
  panelRules,
}

const syntheticActor = {
  entityId: ATTACKER_ID,
  teamId: "team:players" as const,
  agentEntityId: AGENT_ENTITY_ID,
  coreSkillLevel: 1 as const,
  mindscapeRank: 0 as const,
  wEngine: null,
  driveDiscs: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null } as const,
  panel: {
    mode: "out-of-combat" as const,
    stats: {
      attack: { unit: "attack-points" as const, value: 2000 },
      criticalRate: { unit: "ratio" as const, value: 0.25 },
      criticalDamage: { unit: "ratio" as const, value: 0.5 },
      penetrationRatio: { unit: "ratio" as const, value: 0 },
    },
    penetrationValue: 0,
    damageBonuses: { physical: 0.3 },
  },
}

const syntheticTarget = {
  entityId: TARGET_ID,
  teamId: "team:enemies" as const,
  baseDefense: 923,
  resistances: { physical: 0.1 },
  isStunned: false,
  baseStunDamageMultiplier: 1,
}

function ordinaryInput(): StaticActionCalculationInput {
  return {
    data: syntheticData,
    actors: [syntheticActor],
    actorId: ATTACKER_ID,
    action: resolvedAction,
    target: syntheticTarget,
    selections: [],
    requireIndividualHits: true,
  }
}

describe("calculateStaticActionDamage ordinary path validation", () => {
  it("rejects an input without data, actors and selections", () => {
    const result = calculateStaticActionDamage(
      {} as unknown as StaticActionCalculationInput,
    )
    expect(result).toEqual({
      ok: false,
      issues: [
        {
          code: "INVALID_INPUT",
          pointer: "",
          message: "Expected static calculation data, actors and selections",
        },
      ],
    })
  })

  it("rejects current Windswept state declared at the top level", () => {
    const result = calculateStaticActionDamage({
      data: syntheticData,
      actors: [],
      selections: [],
      targetWindswept: { status: "absent" },
    } as unknown as StaticActionCalculationInput)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues).toEqual([
        {
          code: "INVALID_INPUT",
          pointer: "/targetWindswept",
          message:
            "This entry accepts current Windswept state only at target.windswept",
        },
      ])
    }
  })

  it("rejects Windswept state and direct attack declared inside luminize", () => {
    const windswept = calculateStaticActionDamage({
      data: syntheticData,
      actors: [],
      selections: [],
      luminize: { targetWindswept: { status: "absent" } },
    } as unknown as StaticActionCalculationInput)
    expect(windswept.ok).toBe(false)
    if (!windswept.ok) {
      expect(windswept.issues[0]).toMatchObject({
        code: "INVALID_INPUT",
        pointer: "/luminize/targetWindswept",
      })
    }

    const directAttack = calculateStaticActionDamage({
      data: syntheticData,
      actors: [],
      selections: [],
      luminize: { hit: { directAttack: true } },
    } as unknown as StaticActionCalculationInput)
    expect(directAttack.ok).toBe(false)
    if (!directAttack.ok) {
      expect(directAttack.issues[0]).toMatchObject({
        code: "INVALID_INPUT",
        pointer: "/luminize/hit/directAttack",
      })
    }
  })

  it("rejects data from another core release", () => {
    const result = calculateStaticActionDamage({
      data: {
        ...syntheticData,
        version: { ...version, packageVersion: "0.0.0" },
      },
      actors: [syntheticActor],
      actorId: ATTACKER_ID,
      action: resolvedAction,
      target: syntheticTarget,
      selections: [],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues[0]).toMatchObject({
        code: "CONTEXT_MISMATCH",
        pointer: "/data/version/packageVersion",
      })
    }
  })
})

describe("calculateStaticActionDamage end-to-end damage", () => {
  it("computes repeated individual hits from a fully synthetic request", () => {
    const result = calculateStaticActionDamage(ordinaryInput())
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(JSON.stringify(result.issues))
    const value = result.value
    if (value.kind !== "damage") throw new Error("expected a damage result")

    // 手推预期：攻击 2000 × 倍率 2；增伤 1 + 0.3；防御区 794/(923 + 794)
    // （60 级攻击方基数 794、目标基础防御 923、穿透 0）；抗性 1 − 0.1；
    // 暴击率 0.25、暴击伤害 0.5。单段两次独立命中逐次结算后合计。
    const defenseFactor = 794 / (923 + 794)
    const perHit = 2 * 2000 * (1 + 0.3) * defenseFactor * (1 - 0.1)

    expect(value.segments).toHaveLength(2)
    expect(value.segments.map((segment) => segment.repetition)).toEqual([1, 2])
    for (const segment of value.segments) {
      expect(segment.segmentId).toBe(segmentId)
      expect(segment.granularity).toBe("individual")
      expect(segment.damage.nonCritical).toBeCloseTo(perHit, 6)
      expect(segment.damage.factors.nonCritical["baseDamage"]).toBe(4000)
      expect(segment.damage.factors.nonCritical["defense"]).toBeCloseTo(
        defenseFactor,
        9,
      )
    }

    expect(value.totals.nonCritical).toBeCloseTo(2 * perHit, 6)
    expect(value.totals.critical).toBeCloseTo(2 * perHit * 1.5, 6)
    expect(value.totals.expected).toBeCloseTo(2 * perHit * (1 + 0.25 * 0.5), 6)
    // 每次独立命中先向上取整再求和。
    expect(value.totals.displayedNonCritical).toBe(2 * Math.ceil(perHit))
    expect(value.totals.displayedCritical).toBe(2 * Math.ceil(perHit * 1.5))

    // out-of-combat 面板按调用方声明原样结算并回传。
    expect(value.panels).toHaveLength(1)
    expect(value.panels[0]!.entityId).toBe(ATTACKER_ID)
    expect(value.panels[0]!.stats.attack).toEqual({
      unit: "attack-points",
      value: 2000,
    })
    expect(value.panels[0]!.damageBonuses.physical).toBe(0.3)
  })
})

describe("calculateStaticActionDamage named mechanisms", () => {
  it("forwards Astra Yao M4 requests to the catalog entry unchanged", () => {
    const input = astraYaoM4Input()
    const forwarded = calculateStaticActionDamage(input)
    const direct = calculateStaticDamageFromCatalog(input)
    expect(forwarded).toEqual(direct)

    // 具名机制自身可算：固定 3×持有者当前攻击经乘区结算，
    // 暴击率与暴击伤害按调用方声明的条件模型读取。
    expect(forwarded.ok).toBe(true)
    if (!forwarded.ok) throw new Error(JSON.stringify(forwarded.issues))
    const value = forwarded.value
    expect(value.mechanism).toBe("astra-yao-m4-quick-assist-damage")
    expect(value.status).toBe("applied")
    const defenseFactor = 794 / (1000 + 794)
    const nonCritical = 3 * 2400 * defenseFactor
    expect(value.nonCritical).toBeCloseTo(nonCritical, 6)
    expect(value.critical).toBeCloseTo(nonCritical * (1 + 0.6), 6)
    expect(value.expected).toBeCloseTo(
      0.75 * nonCritical + 0.25 * nonCritical * (1 + 0.6),
      6,
    )
  })

  it("forwards Lucy guard boar requests to the catalog entry unchanged", () => {
    const input = lucyGuardBoarInput()
    const forwarded = calculateStaticActionDamage(input)
    const direct = calculateStaticDamageFromCatalog(input)
    expect(forwarded).toEqual(direct)

    // 露西路径按封存的固定规则身份校验；合成定义缺少它们时，
    // 两条调用路径返回同一组机制内诊断，而不是普通路径的校验错误。
    expect(forwarded.ok).toBe(false)
    if (forwarded.ok)
      throw new Error("synthetic definitions cannot satisfy Lucy")
    expect(forwarded.issues[0]).toMatchObject({
      code: "MISSING_REFERENCE",
      pointer: "/definitions/effects",
    })
    expect(forwarded.issues[0]!.message).toContain(
      "agent:1151:nanoka:guard-boar-inheritance:mindscape:0",
    )
  })

  it("rejects an unknown mechanism", () => {
    const result = calculateStaticActionDamage({
      mechanism: "unknown-static-action-mechanism",
    } as unknown as StaticActionCalculationInput)
    expect(result).toEqual({
      ok: false,
      issues: [
        {
          code: "INVALID_INPUT",
          pointer: "/mechanism",
          message: "Unknown static action mechanism",
        },
      ],
    })
  })
})

const componentStat = (baseValue: number) => ({
  baseValue,
  initialPercentage: [],
  initialFixed: [],
  finalPercentage: [],
  finalFixed: [],
})

const M4_EFFECT_ID = "agent:1311:synthetic:m4-quick-assist"
const M4_OPTION_ID = "synthetic:agents:1311:m4-quick-assist"
const M4_ITEM_ID = "astrayao:m4-quick-assist-bonus-damage"
const M4_SKILL_TARGET_ID = "zzz-hp:skill:astrayao-m4-quick-assist-bonus-damage"
const M4_HOLDER_BINDING = "binding:entity:astrayao:agent:1311" as const
const M4_TRIGGER_BINDING = "binding:entity:trigger:agent:9102" as const

/**
 * 全合成耀嘉音 M4 请求：规则、目录元数据、世界与事件都由测试构造，
 * 满足具名机制的固定身份契约（1311、固定 3×ATK、M4 专属技能目标）。
 */
function astraYaoM4Input(): AstraYaoM4CatalogInput {
  const reference = sourceReference(
    "packages/core/test/static-action-damage.test.ts",
  )
  const rule: AstraYaoM4Rule = {
    kind: "contribution" as const,
    effectId: M4_EFFECT_ID,
    source: {
      identity: { kind: "agent" as const, entityId: "1311" },
      section: "synthetic",
      references: [reference],
    },
    config: {
      kind: "all" as const,
      conditions: [
        {
          kind: "compare-number" as const,
          unit: "count" as const,
          operator: "gte" as const,
          left: {
            kind: "configuration-number" as const,
            unit: "count" as const,
            field: "mindscapeRank" as const,
          },
          right: { kind: "literal" as const, unit: "count" as const, value: 4 },
        },
        {
          kind: "compare-number" as const,
          unit: "count" as const,
          operator: "gte" as const,
          left: {
            kind: "configuration-number" as const,
            unit: "count" as const,
            field: "coreSkillLevel" as const,
          },
          right: { kind: "literal" as const, unit: "count" as const, value: 1 },
        },
      ],
    },
    parameters: {},
    activation: {
      kind: "supplied" as const,
      maximumLayers: {
        kind: "literal" as const,
        unit: "count" as const,
        value: 1,
      },
    },
    scope: "hit" as const,
    beneficiary: { kind: "team-except-holder" as const },
    when: { kind: "constant" as const, value: true },
    operation: {
      kind: "astra-yao-m4-quick-assist-damage" as const,
      multiplier: { unit: "multiplier" as const, value: 3 },
    },
  }
  return {
    mechanism: "astra-yao-m4-quick-assist-damage",
    definitions: {
      ...emptyDefinitions("astra-yao-m4-tests"),
      effects: [rule],
    },
    catalog: {
      ...emptyCatalog("astra-yao-m4-tests"),
      entities: [
        {
          catalogEntityId: "agents:1311",
          upstreamId: "1311",
          name: "Astra Yao (synthetic)",
          identity: { kind: "agent", entityId: "1311" },
          status: "mapped",
          profession: null,
          element: null,
        },
        {
          catalogEntityId: "agents:9102",
          upstreamId: "9102",
          name: "Synthetic Trigger",
          identity: { kind: "agent", entityId: "9102" },
          status: "mapped",
          profession: "强攻",
          element: null,
        },
      ],
      options: [
        {
          optionId: M4_OPTION_ID,
          catalogEntityId: "agents:1311",
          name: "M4 quick assist bonus damage (synthetic)",
          conditionDescription: "synthetic",
          target: "team",
          variants: [
            {
              configuration: {
                minimumMindscape: 4,
                coreSkillLevels: [1, 2, 3, 4, 5, 6, 7],
              },
              status: "converted",
              references: [reference],
              effectIds: [M4_EFFECT_ID],
              maximumLayers: 1,
              inputs: [],
              applicability: {},
              differences: [],
              mechanism: {
                kind: "independent-settlement",
                isolateDamageItems: true,
                damageItemRequirements: [
                  {
                    itemId: M4_ITEM_ID,
                    stat: "attack",
                    role: "base",
                    allowedModes: ["direct"],
                    source: "holder-current",
                    requiredDirectMultiplier: 0,
                    requiredSkillCategory: "uncategorized",
                  },
                ],
              },
            },
          ],
        },
      ],
      skillTargets: [
        {
          targetId: M4_SKILL_TARGET_ID,
          upstreamId: "synthetic",
          agentEntityId: "1311",
          category: "uncategorized",
          name: "M4 quick assist bonus damage (synthetic)",
          countsAsFollowUp: false,
        },
      ],
      mechanisms: [
        {
          mechanism: "astra-yao-m4-quick-assist-damage",
          agentEntityId: "1311",
          optionId: M4_OPTION_ID,
          effectId: M4_EFFECT_ID,
          itemId: M4_ITEM_ID,
          skillTargetId: M4_SKILL_TARGET_ID,
          references: [reference],
        },
      ],
    },
    bindings: [
      {
        kind: "agent",
        bindingId: M4_HOLDER_BINDING,
        holderId: "entity:astrayao",
        sourceEntityId: "1311",
        eligible: true,
        configuration: { mindscapeRank: 6, coreSkillLevel: 7 },
      },
      {
        kind: "agent",
        bindingId: M4_TRIGGER_BINDING,
        holderId: "entity:trigger",
        sourceEntityId: "9102",
        eligible: true,
        configuration: { mindscapeRank: 0, coreSkillLevel: 1 },
      },
    ],
    selections: [
      { optionId: M4_OPTION_ID, bindingId: M4_HOLDER_BINDING, layers: 1 },
    ],
    actorSources: [
      { entityId: "entity:astrayao", agentEntityId: "1311", level: 60 },
      { entityId: "entity:trigger", agentEntityId: "9102", level: 60 },
    ],
    world: {
      entities: [
        {
          kind: "actor" as const,
          entityId: "entity:astrayao" as const,
          teamId: "team:players" as const,
          generalStats: { attack: componentStat(2400) },
          directStats: {
            criticalRate: { baseValue: 0.1, additions: [] },
            criticalDamage: { baseValue: 0.6, additions: [] },
            penetrationRatio: { baseValue: 0, additions: [] },
          },
        },
        {
          kind: "actor" as const,
          entityId: "entity:trigger" as const,
          teamId: "team:players" as const,
          generalStats: { attack: componentStat(1000) },
          directStats: {
            criticalRate: { baseValue: 0.25, additions: [] },
            criticalDamage: { baseValue: 0.5, additions: [] },
            penetrationRatio: { baseValue: 0, additions: [] },
          },
        },
        {
          kind: "actor" as const,
          entityId: "entity:enemy" as const,
          teamId: "team:enemies" as const,
          generalStats: {},
          directStats: {},
        },
      ],
      states: [],
      distances: [],
    },
    event: {
      eventId: "event:synthetic:m4-quick-assist",
      sourceBindingId: M4_HOLDER_BINDING,
      triggerActorId: "entity:trigger",
      targetId: "entity:enemy",
      triggerSpecialty: "attack",
      idyllicCadenza: true,
      enteredViaQuickAssist: true,
      nextQuickAssistHeavyHit: true,
    },
    conditionalModel: {
      attackReading: "holder-current",
      factorBeneficiary: "trigger-actor-current",
      criticalRate: { unit: "ratio", value: 0.25 },
      criticalDamageSource: { entityId: "entity:astrayao" },
      penetrationRatioSource: { entityId: "entity:trigger" },
    },
    atSeconds: 10,
    hit: {
      actorId: "entity:trigger",
      targetId: "entity:enemy",
      actionId: "action:synthetic:m4-quick-assist",
      skillCategory: "uncategorized",
      skillTags: [],
      skillTargetIds: [M4_SKILL_TARGET_ID],
      element: "electric",
      damageItems: [
        {
          itemId: M4_ITEM_ID,
          stat: "attack",
          damageMultiplier: 0,
          statSource: { entityId: "entity:astrayao" },
          mode: "direct",
          role: "base",
        },
      ],
    },
    damage: {
      kind: "regular",
      damageBonus: [],
      defense: {
        attackerLevel: 60,
        targetBaseDefense: 1000,
        defensePercentageAdjustments: [],
        penetrationValues: [],
      },
      resistance: {
        targetResistance: 0,
        targetResistanceReductions: [],
        attackerResistanceIgnoreValues: [],
      },
      damageTaken: {
        targetDamageTakenIncreases: [],
        targetDamageTakenReductions: [],
      },
      stunDamage: {
        isTargetStunned: false,
        targetBaseStunDamageMultiplier: 1,
        targetStunDamageMultiplierAdjustments: [],
      },
    },
  }
}

/**
 * 结构完整但定义不含露西封存规则的请求：转发后由露西机制自身报告
 * 缺失来源，两条调用路径的结果必须一致。
 */
function lucyGuardBoarInput(): LucyGuardBoarCatalogInput {
  return {
    mechanism: "lucy-guard-boar",
    definitions: emptyDefinitions("lucy-guard-boar-tests"),
    catalog: emptyCatalog("lucy-guard-boar-tests"),
    bindings: [],
    selections: [],
    actorSources: [],
    world: { entities: [], states: [], distances: [] },
    sourceBindingId: "binding:entity:lucy:agent:1151",
    atSeconds: 0,
    boar: {
      entityId: "entity:boar",
      ownerSource: { entityId: "entity:lucy" },
      ownStats: {
        attack: { unit: "attack-points", value: 500 },
        impact: { unit: "impact-points", value: 58 },
        anomalyProficiency: { unit: "anomaly-proficiency-points", value: 92 },
        criticalRate: { unit: "ratio", value: 0.05 },
        criticalDamage: { unit: "ratio", value: 0.5 },
        penetrationRatio: { unit: "ratio", value: 0 },
      },
    },
    teamCondition: { kind: "not-satisfied" },
    conditionalModel: {
      statComposition: "own-plus-owner-current-without-selected-lucy-cheer",
      otherEffects: "lucy-options-only",
      damageFactors: "explicit-boar-baseline",
      criticalDamage: "resolved-boar",
    },
    settlement: { kind: "attributes" },
  }
}
