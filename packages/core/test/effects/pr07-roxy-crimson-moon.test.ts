import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../../src/effects/index.ts"
import type {
  CoreSkillLevel,
  EntityId,
  RefinementRank,
  StaticCatalogDamageInput,
  StaticCatalogDamageItem,
  StaticDamageResult,
  StaticEffectCatalog,
} from "../../src/effects/index.ts"
import { validateStaticCatalog } from "../../src/effects/internal/static-catalog.ts"
import { general, inputFor } from "./static-fixtures.ts"

/**
 * 增益修复批次 07（修订 22）：洛克茜初始回能转攻击/冲击与绯月银棺三条
 * 增益的具名回归。期望值全部来自冻结 Nanoka 3.2 逐档原文（中英文交叉
 * 核对）与独立算式，不从生成器反推；触发状态、50 秒持续与刷新由选择
 * 显式声明，不模拟时间线；“伤害提升效果全队唯一”由目录选择阶段的窄
 * 跨绑定约束（squadUniqueEffect）强制，不经数值引擎。
 */
const read = (path: string) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"))
const parsed = parseEffectRuleSet(
  read("../../../data/definitions/effects/static.json"),
)
if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues))
const definitions = parsed.value
const catalog = read(
  "../../../data/definitions/effects/static-catalog.json",
) as StaticEffectCatalog

function calculateCatalogResult(
  input: StaticCatalogDamageInput,
): StaticDamageResult {
  const result = calculateStaticDamageFromCatalog(input)
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value
}

const effectContribution = (
  result: StaticDamageResult,
  effectId: string,
): Map<string, number> => {
  const byBeneficiary = new Map<string, number>()
  for (const entry of [
    ...result.evaluation.contributions,
    ...(result.preparations ?? []).flatMap((p) => p.contributions),
  ])
    if (entry.origin.effectId === effectId)
      byBeneficiary.set(
        entry.origin.beneficiaryId,
        (byBeneficiary.get(entry.origin.beneficiaryId) ?? 0) +
          entry.value.value,
      )
  return byBeneficiary
}

const currentStat = (
  result: StaticDamageResult,
  entity: string,
  stat: string,
): number => {
  const attribute = result.evaluation.attributes.find(
    (a) => a.stat === stat && a.entityId === entity && a.stage === "current",
  )
  if (!attribute) throw new Error(`missing current ${stat} for ${entity}`)
  return attribute.value.value
}

const ROXY_OPTION = "nanoka:agents:1621:initial-energy-regen-conversion"
const ROXY_INPUT = "roxy:initial-energy-regen:source"
const ROXY_ATK = "agent:1621:nanoka:initial-energy-regen-conversion:attack"
const ROXY_IMPACT = "agent:1621:nanoka:initial-energy-regen-conversion:impact"
/** 核心 1—7 的两个独立封顶点（逐档字面值）。 */
const ROXY_CAPS = [
  [480, 40],
  [560, 46],
  [640, 52],
  [720, 58],
  [800, 64],
  [880, 70],
  [960, 76.8],
] as const

/** 洛克茜单绑定探针：显式输入初始能量自动回复，按核心档求值两条转化。
 * 探针伤害项按需消费 attack/impact/energyRegen，使对应贡献出现在求值里。 */
const roxyProbe = (
  coreSkillLevel: CoreSkillLevel,
  energyRegen: number,
  overrides: {
    layers?: number
    probeStats?: readonly ("attack" | "impact" | "energyRegen")[]
    world?: StaticCatalogDamageInput["world"]
    inputs?: StaticCatalogDamageInput["inputs"]
    bindings?: StaticCatalogDamageInput["bindings"]
    actorSources?: StaticCatalogDamageInput["actorSources"]
    selections?: StaticCatalogDamageInput["selections"]
  } = {},
): StaticCatalogDamageInput => {
  const base = inputFor()
  const probeStats = overrides.probeStats ?? ["attack", "impact"]
  return {
    ...base,
    definitions,
    catalog,
    world: overrides.world ?? base.world,
    bindings: overrides.bindings ?? [
      {
        bindingId: "binding:static",
        kind: "agent",
        holderId: "entity:attacker",
        sourceEntityId: "1621",
        eligible: true,
        configuration: { mindscapeRank: 0, coreSkillLevel },
      },
    ],
    actorSources: overrides.actorSources ?? [
      { entityId: "entity:attacker", agentEntityId: "1621" },
    ],
    selections: overrides.selections ?? [
      {
        optionId: ROXY_OPTION,
        bindingId: "binding:static",
        layers: overrides.layers ?? 1,
      },
    ],
    inputs: overrides.inputs ?? [
      {
        bindingId: "binding:static",
        name: ROXY_INPUT,
        value: { unit: "energy-per-second", value: energyRegen },
      },
    ],
    hit: {
      ...base.hit,
      damageItems: probeStats.map((stat, index) => ({
        mode: "direct" as const,
        role: "base" as const,
        itemId: `probe-${stat}-${index}`,
        stat,
        statSource: { entityId: "entity:attacker" as EntityId },
        damageMultiplier: 1,
      })) as [StaticCatalogDamageItem, ...StaticCatalogDamageItem[]],
    },
    damage: base.damage as Extract<
      StaticCatalogDamageInput["damage"],
      { kind: "regular" }
    >,
  }
}

describe("batch 07 Roxy initial energy regen conversion", () => {
  it("applies both channels as one complete state across all core ranks", () => {
    // 未封顶读数（E=1.22 → 超出 0.02）：攻击 +10、冲击 +0.8，两条规则同时生效。
    for (const [index] of ROXY_CAPS.entries()) {
      const result = calculateCatalogResult(
        roxyProbe((index + 1) as CoreSkillLevel, 1.22),
      )
      expect(
        effectContribution(result, ROXY_ATK).get("entity:attacker"),
        `core ${index + 1} attack`,
      ).toBeCloseTo(10, 12)
      expect(
        effectContribution(result, ROXY_IMPACT).get("entity:attacker"),
        `core ${index + 1} impact`,
      ).toBeCloseTo(0.8, 12)
    }
    // 超上限读数（E=3.12 → 超出 1.92）：两个独立封顶逐档取字面值。
    for (const [index, [capA, capI]] of ROXY_CAPS.entries()) {
      const result = calculateCatalogResult(
        roxyProbe((index + 1) as CoreSkillLevel, 3.12),
      )
      expect(
        effectContribution(result, ROXY_ATK).get("entity:attacker"),
        `core ${index + 1} attack cap`,
      ).toBeCloseTo(capA, 12)
      expect(
        effectContribution(result, ROXY_IMPACT).get("entity:attacker"),
        `core ${index + 1} impact cap`,
      ).toBeCloseTo(capI, 12)
    }
    // 中间读数（E=2.2 → 超出 1.0）：原始值 500/40 与各档封顶独立取小。
    for (const [index, [capA, capI]] of ROXY_CAPS.entries()) {
      const result = calculateCatalogResult(
        roxyProbe((index + 1) as CoreSkillLevel, 2.2),
      )
      expect(
        effectContribution(result, ROXY_ATK).get("entity:attacker"),
        `core ${index + 1} mid attack`,
      ).toBeCloseTo(Math.min(capA, 500), 12)
      expect(
        effectContribution(result, ROXY_IMPACT).get("entity:attacker"),
        `core ${index + 1} mid impact`,
      ).toBeCloseTo(Math.min(capI, 40), 12)
    }
    // 锚点：核心 1 下 2.2 → 480/40；核心 7 下 2.2 → 500/40、3.12 → 960/76.8。
    const core1 = calculateCatalogResult(roxyProbe(1, 2.2))
    expect(
      effectContribution(core1, ROXY_ATK).get("entity:attacker"),
    ).toBeCloseTo(480, 12)
    expect(
      effectContribution(core1, ROXY_IMPACT).get("entity:attacker"),
    ).toBeCloseTo(40, 12)
    const core7Mid = calculateCatalogResult(roxyProbe(7, 2.2))
    expect(
      effectContribution(core7Mid, ROXY_ATK).get("entity:attacker"),
    ).toBeCloseTo(500, 12)
    expect(
      effectContribution(core7Mid, ROXY_IMPACT).get("entity:attacker"),
    ).toBeCloseTo(40, 12)
    const core7Cap = calculateCatalogResult(roxyProbe(7, 3.12))
    expect(
      effectContribution(core7Cap, ROXY_ATK).get("entity:attacker"),
    ).toBeCloseTo(960, 12)
    expect(
      effectContribution(core7Cap, ROXY_IMPACT).get("entity:attacker"),
    ).toBeCloseTo(76.8, 12)
  })

  it("keeps the two caps independent instead of sharing one cap ratio", () => {
    // 核心 1：攻击封顶点在超出 0.96（E=2.16）、冲击在超出 1.0（E=2.2）。
    // E=2.18 → 攻击已封顶 480，冲击未封顶 39.2。
    const core1 = calculateCatalogResult(roxyProbe(1, 2.18))
    expect(
      effectContribution(core1, ROXY_ATK).get("entity:attacker"),
    ).toBeCloseTo(480, 12)
    expect(
      effectContribution(core1, ROXY_IMPACT).get("entity:attacker"),
    ).toBeCloseTo(39.2, 12)
    // 核心 6：攻击封顶点在超出 1.76（E=2.96）、冲击在超出 1.75（E=2.95）。
    // E=2.955 → 冲击已封顶 70，攻击未封顶 877.5。
    const core6 = calculateCatalogResult(roxyProbe(6, 2.955))
    expect(
      effectContribution(core6, ROXY_ATK).get("entity:attacker"),
    ).toBeCloseTo(877.5, 12)
    expect(
      effectContribution(core6, ROXY_IMPACT).get("entity:attacker"),
    ).toBeCloseTo(70, 12)
  })

  it("clamps at the 1.2 threshold and rejects missing or wrong-unit input", () => {
    // 大于 1.2 才转化：1.2 与更低读数为 0，1.21 → 超出 0.01 → 5/0.4。
    for (const [regen, attack, impact] of [
      [1.0, 0, 0],
      [1.2, 0, 0],
      [1.21, 5, 0.4],
    ] as const) {
      const result = calculateCatalogResult(roxyProbe(7, regen))
      expect(
        effectContribution(result, ROXY_ATK).get("entity:attacker"),
        `E=${regen}`,
      ).toBeCloseTo(attack, 12)
      expect(
        effectContribution(result, ROXY_IMPACT).get("entity:attacker"),
        `E=${regen}`,
      ).toBeCloseTo(impact, 12)
    }
    // 0 层同时关闭两条；2 层超过单次完整状态上限被拒绝。
    const off = calculateCatalogResult(roxyProbe(7, 1.4, { layers: 0 }))
    expect(effectContribution(off, ROXY_ATK).size).toBe(0)
    expect(effectContribution(off, ROXY_IMPACT).size).toBe(0)
    const over = calculateStaticDamageFromCatalog(
      roxyProbe(7, 1.4, { layers: 2 }),
    )
    expect(over.ok).toBe(false)
    if (!over.ok)
      expect(over.issues.some((issue) => issue.code === "INVALID_INPUT")).toBe(
        true,
      )
    // 缺输入与错误单位按既有输入契约拒绝。
    const missing = calculateStaticDamageFromCatalog({
      ...roxyProbe(7, 1.4),
      inputs: [],
    })
    expect(missing.ok).toBe(false)
    if (!missing.ok)
      expect(
        missing.issues.some((issue) => issue.code === "MISSING_FACT"),
      ).toBe(true)
    const wrongUnit = calculateStaticDamageFromCatalog({
      ...roxyProbe(7, 1.4),
      inputs: [
        {
          bindingId: "binding:static",
          name: ROXY_INPUT,
          value: { unit: "count", value: 1.4 },
        },
      ],
    })
    expect(wrongUnit.ok).toBe(false)
    if (!wrongUnit.ok)
      expect(
        wrongUnit.issues.some((issue) => issue.code === "UNIT_MISMATCH"),
      ).toBe(true)
  })

  it("reads only the explicit initial regen input, not the world regen", () => {
    const base = inputFor()
    const attacker = base.world.entities[0]!
    if (attacker.kind !== "actor") throw new Error("fixture")
    // 世界当前回能 2.4 与输入 1.4 不同：转化按输入读数（超出 0.2 → 100/8），
    // 不读当前值、也不写回世界回能。
    const withWorldRegen = calculateCatalogResult(
      roxyProbe(7, 1.4, {
        probeStats: ["attack", "impact", "energyRegen"],
        world: {
          ...base.world,
          entities: base.world.entities.map((entity) =>
            entity.kind === "actor" && entity.entityId === "entity:attacker"
              ? {
                  ...entity,
                  generalStats: {
                    ...entity.generalStats,
                    energyRegen: general(2.4),
                  },
                }
              : entity,
          ),
        },
      }),
    )
    expect(
      effectContribution(withWorldRegen, ROXY_ATK).get("entity:attacker"),
    ).toBeCloseTo(100, 12)
    expect(
      effectContribution(withWorldRegen, ROXY_IMPACT).get("entity:attacker"),
    ).toBeCloseTo(8, 12)
    expect(
      currentStat(withWorldRegen, "entity:attacker", "energyRegen"),
    ).toBeCloseTo(2.4, 12)
    // 额外回能同时开启（莱特影画 4 百分比回能以声明受益者指向洛克茜，
    // 基础 2.4 × 10% = +0.24）：转化快照仍按输入 1.4，不被额外回能改写。
    const withExtraRegen = calculateCatalogResult(
      roxyProbe(7, 1.4, {
        probeStats: ["attack", "impact", "energyRegen"],
        world: {
          ...base.world,
          entities: [
            ...base.world.entities.map((entity) =>
              entity.kind === "actor" && entity.entityId === "entity:attacker"
                ? {
                    ...entity,
                    generalStats: {
                      ...entity.generalStats,
                      energyRegen: general(2.4),
                    },
                  }
                : entity,
            ),
            {
              kind: "actor",
              entityId: "entity:lighter",
              teamId: "team:players",
              generalStats: {
                attack: general(1000),
                health: general(24000),
                impact: general(170),
                sheerForce: general(500),
                anomalyProficiency: general(300),
                energyRegen: general(1.2),
              },
              directStats: {
                criticalRate: { baseValue: 0.25, additions: [] },
                criticalDamage: { baseValue: 0.5, additions: [] },
                penetrationRatio: { baseValue: 0.1, additions: [] },
              },
            },
          ],
        },
        bindings: [
          {
            bindingId: "binding:static",
            kind: "agent",
            holderId: "entity:attacker",
            sourceEntityId: "1621",
            eligible: true,
            configuration: { mindscapeRank: 0, coreSkillLevel: 7 },
          },
          {
            bindingId: "binding:lighter",
            kind: "agent",
            holderId: "entity:lighter",
            sourceEntityId: "1161",
            eligible: true,
            configuration: { mindscapeRank: 4, coreSkillLevel: 7 },
          },
        ],
        actorSources: [
          { entityId: "entity:attacker", agentEntityId: "1621" },
          { entityId: "entity:lighter", agentEntityId: "1161" },
        ],
        selections: [
          { optionId: ROXY_OPTION, bindingId: "binding:static", layers: 1 },
          {
            optionId:
              "nanoka:agents:lighter:mindscape-4-frontline-energy-regen",
            bindingId: "binding:lighter",
            layers: 1,
            beneficiaryActorId: "entity:attacker",
          },
        ],
      }),
    )
    expect(
      effectContribution(withExtraRegen, ROXY_ATK).get("entity:attacker"),
    ).toBeCloseTo(100, 12)
    expect(
      effectContribution(withExtraRegen, ROXY_IMPACT).get("entity:attacker"),
    ).toBeCloseTo(8, 12)
    expect(
      currentStat(withExtraRegen, "entity:attacker", "energyRegen"),
    ).toBeCloseTo(2.64, 12)
  })

  it("isolates the input between two bindings", () => {
    const base = inputFor()
    const attacker = base.world.entities[0]!
    if (attacker.kind !== "actor") throw new Error("fixture")
    const clone = {
      ...structuredClone(attacker),
      entityId: "entity:roxy-b" as EntityId,
    }
    const probe = roxyProbe(7, 1.4, {
      world: {
        ...base.world,
        entities: [...base.world.entities, clone],
      },
      bindings: [
        {
          bindingId: "binding:roxy-a",
          kind: "agent",
          holderId: "entity:attacker",
          sourceEntityId: "1621",
          eligible: true,
          configuration: { mindscapeRank: 0, coreSkillLevel: 7 },
        },
        {
          bindingId: "binding:roxy-b",
          kind: "agent",
          holderId: "entity:roxy-b",
          sourceEntityId: "1621",
          eligible: true,
          configuration: { mindscapeRank: 0, coreSkillLevel: 7 },
        },
      ],
      actorSources: [
        { entityId: "entity:attacker", agentEntityId: "1621" },
        { entityId: "entity:roxy-b", agentEntityId: "1621" },
      ],
      selections: [
        { optionId: ROXY_OPTION, bindingId: "binding:roxy-a", layers: 1 },
        { optionId: ROXY_OPTION, bindingId: "binding:roxy-b", layers: 1 },
      ],
      inputs: [
        {
          bindingId: "binding:roxy-a",
          name: ROXY_INPUT,
          value: { unit: "energy-per-second", value: 1.4 },
        },
        {
          bindingId: "binding:roxy-b",
          name: ROXY_INPUT,
          value: { unit: "energy-per-second", value: 1.3 },
        },
      ],
    })
    // 两个实体的 attack/impact 都要有消费地址，各自的贡献才会进入求值。
    const result = calculateCatalogResult({
      ...probe,
      hit: {
        ...probe.hit,
        damageItems: [
          ...probe.hit.damageItems,
          ...probe.hit.damageItems.map((item, index) => ({
            ...item,
            itemId: `probe-b-${item.stat}-${index}`,
            statSource: { entityId: "entity:roxy-b" as EntityId },
          })),
        ],
      },
    })
    // E=1.4 → 100/8；E=1.3 → 50/4；两个绑定互不串扰。
    expect(
      effectContribution(result, ROXY_ATK).get("entity:attacker"),
    ).toBeCloseTo(100, 12)
    expect(
      effectContribution(result, ROXY_IMPACT).get("entity:attacker"),
    ).toBeCloseTo(8, 12)
    expect(
      effectContribution(result, ROXY_ATK).get("entity:roxy-b"),
    ).toBeCloseTo(50, 12)
    expect(
      effectContribution(result, ROXY_IMPACT).get("entity:roxy-b"),
    ).toBeCloseTo(4, 12)
  })

  it("feeds the converted attack into real damage and impact stat reads", () => {
    // 真实属性读取：当前攻击 = 基础 1000 + 转化 100、冲击 = 170 + 8。
    const withOption = calculateCatalogResult(roxyProbe(7, 1.4))
    expect(currentStat(withOption, "entity:attacker", "attack")).toBeCloseTo(
      1100,
      9,
    )
    expect(currentStat(withOption, "entity:attacker", "impact")).toBeCloseTo(
      178,
      9,
    )
    // 真实伤害消费：仅以 attack 为基数的单探针项，关/开选项的期望伤害按
    // 攻击线性放大 1100/1000。
    const withAttackOnly = calculateCatalogResult(
      roxyProbe(7, 1.4, { probeStats: ["attack"] }),
    )
    const withoutOption = calculateCatalogResult(
      roxyProbe(7, 1.4, { probeStats: ["attack"], selections: [] }),
    )
    expect(withoutOption.expected).toBeGreaterThan(0)
    expect(withAttackOnly.expected / withoutOption.expected).toBeCloseTo(1.1, 9)
  })
})

const CMC_CRIT_OPTION = "nanoka:w-engines:14162:crit-rate"
const CMC_RESPEN_OPTION = "nanoka:w-engines:14162:wind-resistance-ignore"
const CMC_TEAM_OPTION = "nanoka:w-engines:14162:squad-damage-bonus"
const CMC_CRIT = "w-engine:14162:nanoka:crit-rate"
const CMC_RESPEN = "w-engine:14162:nanoka:wind-resistance-ignore"
const CMC_TEAM = "w-engine:14162:nanoka:squad-damage-bonus"
const CMC_CRIT_VALUES = [0.24, 0.26, 0.28, 0.3, 0.32] as const
const CMC_RESPEN_VALUES = [0.15, 0.173, 0.195, 0.218, 0.24] as const
const CMC_TEAM_VALUES = [0.2, 0.23, 0.26, 0.29, 0.32] as const

/** 绯月银棺多角色场景：持有者 + 同队队友 + 异队角色 + 敌人。 */
const cmcInput = (configuration: {
  refinement?: RefinementRank
  /** 持有者的目录代理人；默认洛克茜（1621，击破/风）。 */
  holderAgent?: string
  /** 队友的目录代理人；默认青衣（1251，击破/电）。 */
  teammateAgent?: string
  selections?: readonly {
    optionId: string
    layers: number
    bindingId?: `binding:${string}`
  }[]
  hitActor?: EntityId
  element?: StaticCatalogDamageInput["hit"]["element"]
  skillCategory?: StaticCatalogDamageInput["hit"]["skillCategory"]
  targetResistance?: number
  bindings?: StaticCatalogDamageInput["bindings"]
  actorSources?: StaticCatalogDamageInput["actorSources"]
  holderEntity?: EntityId
  /** 异队额外成员（team:others）使用的目录代理人；提供时加入世界。 */
  othersMateAgent?: string
}): StaticCatalogDamageInput => {
  const base = inputFor()
  const holderEntity = configuration.holderEntity ?? "entity:holder"
  const stats = () => ({
    attack: general(1000),
    health: general(24000),
    impact: general(170),
    sheerForce: general(500),
    anomalyProficiency: general(300),
  })
  const direct = (critRate: number) => ({
    criticalRate: { baseValue: critRate, additions: [] },
    criticalDamage: { baseValue: 0.5, additions: [] },
    penetrationRatio: { baseValue: 0.1, additions: [] },
  })
  const world: StaticCatalogDamageInput["world"] = {
    ...base.world,
    entities: [
      {
        kind: "actor",
        entityId: holderEntity,
        teamId: "team:players",
        generalStats: stats(),
        directStats: direct(0.25),
      },
      {
        kind: "actor",
        entityId: "entity:teammate",
        teamId: "team:players",
        generalStats: stats(),
        directStats: direct(0.4),
      },
      {
        kind: "actor",
        entityId: "entity:stranger",
        teamId: "team:others",
        generalStats: stats(),
        directStats: direct(0.3),
      },
      ...(configuration.othersMateAgent === undefined
        ? []
        : [
            {
              kind: "actor" as const,
              entityId: "entity:others-mate" as EntityId,
              teamId: "team:others" as const,
              generalStats: stats(),
              directStats: direct(0.3),
            },
          ]),
      {
        kind: "actor",
        entityId: "entity:enemy",
        teamId: "team:enemies",
        generalStats: {},
        directStats: {},
      },
    ],
    states: [],
    distances: [],
  }
  const hitActor = configuration.hitActor ?? "entity:teammate"
  return {
    ...base,
    definitions,
    catalog,
    world,
    bindings: configuration.bindings ?? [
      {
        bindingId: "binding:casket",
        kind: "w-engine",
        holderId: holderEntity,
        sourceEntityId: "14162",
        eligible: true,
        configuration: { refinement: configuration.refinement ?? 1 },
      },
    ],
    actorSources: configuration.actorSources ?? [
      {
        entityId: holderEntity,
        agentEntityId: configuration.holderAgent ?? "1621",
      },
      {
        entityId: "entity:teammate",
        agentEntityId: configuration.teammateAgent ?? "1251",
      },
      { entityId: "entity:stranger", agentEntityId: "1031" },
    ],
    selections:
      configuration.selections?.map((selection) => ({
        optionId: selection.optionId,
        bindingId: selection.bindingId ?? "binding:casket",
        layers: selection.layers,
      })) ?? [],
    hit: {
      ...base.hit,
      actorId: hitActor,
      element: configuration.element ?? "electric",
      skillCategory: configuration.skillCategory ?? "basic",
      damageItems: [
        {
          mode: "direct" as const,
          role: "base" as const,
          itemId: "probe",
          stat: "attack",
          statSource: { entityId: hitActor },
          damageMultiplier: 1,
        },
      ],
    },
    damage: {
      ...(base.damage as Extract<
        StaticCatalogDamageInput["damage"],
        { kind: "regular" }
      >),
      resistance: {
        targetResistance: configuration.targetResistance ?? 0,
        targetResistanceReductions: [],
        attackerResistanceIgnoreValues: [],
      },
    },
  }
}

describe("batch 07 Crimson Moon Casket clauses", () => {
  it("applies the holder crit rate at every refinement", () => {
    for (const [index, value] of CMC_CRIT_VALUES.entries()) {
      const result = calculateCatalogResult(
        cmcInput({
          refinement: (index + 1) as RefinementRank,
          hitActor: "entity:holder",
          element: "wind",
          selections: [{ optionId: CMC_CRIT_OPTION, layers: 1 }],
        }),
      )
      expect(
        effectContribution(result, CMC_CRIT).get("entity:holder"),
        `refinement ${index + 1}`,
      ).toBeCloseTo(value, 12)
      // 暴击率是持有者收益：队友与异队角色不受这条影响。
      expect(effectContribution(result, CMC_CRIT).has("entity:teammate")).toBe(
        false,
      )
    }
    // 真实暴击消费：期望伤害按暴击率线性放大
    // (1+(0.25+0.24)×0.5)/(1+0.25×0.5) = 1.245/1.125。
    const withCrit = calculateCatalogResult(
      cmcInput({
        hitActor: "entity:holder",
        element: "wind",
        selections: [{ optionId: CMC_CRIT_OPTION, layers: 1 }],
      }),
    )
    const without = calculateCatalogResult(
      cmcInput({ hitActor: "entity:holder", element: "wind" }),
    )
    expect(withCrit.expected / without.expected).toBeCloseTo(1.245 / 1.125, 9)
  })

  it("applies the wind resistance ignore to the holder's wind hits only", () => {
    for (const [index, value] of CMC_RESPEN_VALUES.entries()) {
      const result = calculateCatalogResult(
        cmcInput({
          refinement: (index + 1) as RefinementRank,
          hitActor: "entity:holder",
          element: "wind",
          targetResistance: 0.3,
          selections: [{ optionId: CMC_RESPEN_OPTION, layers: 1 }],
        }),
      )
      expect(
        effectContribution(result, CMC_RESPEN).get("entity:holder"),
        `refinement ${index + 1}`,
      ).toBeCloseTo(value, 12)
    }
    // 非风命中不受益；队友的风命中也不受益（持有者条款）。
    for (const [label, setup] of [
      ["non-wind holder hit", { hitActor: "entity:holder", element: "fire" }],
      ["teammate wind hit", { hitActor: "entity:teammate", element: "wind" }],
    ] as const) {
      const result = calculateCatalogResult(
        cmcInput({
          hitActor: setup.hitActor,
          element: setup.element,
          targetResistance: 0.3,
          selections: [{ optionId: CMC_RESPEN_OPTION, layers: 1 }],
        }),
      )
      expect(effectContribution(result, CMC_RESPEN).size, label).toBe(0)
    }
    // 常驻条款不挂 EX 触发：普通攻击与强化特殊技的风命中同样受益。
    for (const category of ["basic", "enhanced-special"] as const) {
      const result = calculateCatalogResult(
        cmcInput({
          hitActor: "entity:holder",
          element: "wind",
          skillCategory: category,
          targetResistance: 0.3,
          selections: [{ optionId: CMC_RESPEN_OPTION, layers: 1 }],
        }),
      )
      expect(
        effectContribution(result, CMC_RESPEN).get("entity:holder"),
        category,
      ).toBeCloseTo(0.15, 12)
    }
    // 真实消费：风抗 30% 下，精 1 的 15% 无视使抗性乘数 0.7 → 0.85。
    const withIgnore = calculateCatalogResult(
      cmcInput({
        hitActor: "entity:holder",
        element: "wind",
        targetResistance: 0.3,
        selections: [{ optionId: CMC_RESPEN_OPTION, layers: 1 }],
      }),
    )
    const without = calculateCatalogResult(
      cmcInput({
        hitActor: "entity:holder",
        element: "wind",
        targetResistance: 0.3,
      }),
    )
    expect(withIgnore.expected / without.expected).toBeCloseTo(0.85 / 0.7, 9)
  })

  it("gates every clause on the stun profession of the equipper", () => {
    // 三条条款分别用其真实受益场景验证职业门槛：常驻两条（暴击率、风抗
    // 无视）是持有者收益，用持有者自己的命中（风抗用 wind）；触发全队增伤
    // 的受益者是同队其他角色，用队友命中。每个不适配场景都有同配置、仅
    // 持有者职业身份换成合法击破（青衣）的正例对照，锁定非零贡献 0.24 /
    // 0.15 / 0.20，证明零结果来自职业门槛而不是受益场景本身。
    const scenarios: readonly {
      label: string
      option: string
      effect: string
      hitActor: EntityId
      element: StaticCatalogDamageInput["hit"]["element"]
      targetResistance?: number
      beneficiary: EntityId
      expected: number
    }[] = [
      {
        label: "crit rate",
        option: CMC_CRIT_OPTION,
        effect: CMC_CRIT,
        hitActor: "entity:holder",
        element: "wind",
        beneficiary: "entity:holder",
        expected: 0.24,
      },
      {
        label: "wind resistance ignore",
        option: CMC_RESPEN_OPTION,
        effect: CMC_RESPEN,
        hitActor: "entity:holder",
        element: "wind",
        targetResistance: 0.3,
        beneficiary: "entity:holder",
        expected: 0.15,
      },
      {
        label: "squad damage bonus",
        option: CMC_TEAM_OPTION,
        effect: CMC_TEAM,
        hitActor: "entity:teammate",
        element: "electric",
        beneficiary: "entity:teammate",
        expected: 0.2,
      },
    ]
    for (const scenario of scenarios) {
      // 职业不适配（妮可，支援装备绯月银棺）：合法受益场景下仍零贡献、
      // 不报错，保持既有的零贡献契约。
      const rejected = calculateCatalogResult(
        cmcInput({
          holderAgent: "1031",
          hitActor: scenario.hitActor,
          element: scenario.element,
          ...(scenario.targetResistance === undefined
            ? {}
            : { targetResistance: scenario.targetResistance }),
          selections: [{ optionId: scenario.option, layers: 1 }],
        }),
      )
      expect(
        effectContribution(rejected, scenario.effect).size,
        `${scenario.label}: profession mismatch`,
      ).toBe(0)
      // 同配置、仅持有者职业身份改为合法击破（青衣）的正例对照。
      const admitted = calculateCatalogResult(
        cmcInput({
          holderAgent: "1251",
          hitActor: scenario.hitActor,
          element: scenario.element,
          ...(scenario.targetResistance === undefined
            ? {}
            : { targetResistance: scenario.targetResistance }),
          selections: [{ optionId: scenario.option, layers: 1 }],
        }),
      )
      expect(
        effectContribution(admitted, scenario.effect).get(scenario.beneficiary),
        `${scenario.label}: legal stun profession control`,
      ).toBeCloseTo(scenario.expected, 12)
    }
  })

  it("applies the wind resistance ignore and team buff to anomaly damage paths", () => {
    // 异常伤害路径：风抗忽视按命中元素筛选，对持有者的风属性异常伤害同样
    // 生效（无直伤限制）；团队增伤进入通用增伤乘区，对队友的异常伤害同样
    // 生效（取得条件不筛选受益者当前伤害）。
    const anomalyInput = (configuration: {
      hitActor: EntityId
      element: StaticCatalogDamageInput["hit"]["element"]
      selections: readonly { optionId: string; layers: number }[]
      targetResistance?: number
    }): StaticCatalogDamageInput => {
      const base = cmcInput(configuration)
      return {
        ...base,
        damage: {
          kind: "anomaly",
          damageBonus: [],
          anomalySource: { entityId: configuration.hitActor, level: 60 },
          defense: {
            targetBaseDefense: 0,
            defensePercentageAdjustments: [],
            penetrationValues: [],
          },
          resistance: base.damage.resistance,
          damageTaken: base.damage.damageTaken,
          stunDamage: base.damage.stunDamage,
          anomalyDamageBonus: [],
          refringe: { mode: "settled", multiplier: 1 },
          anomalyCriticalRate: 0,
          anomalyCriticalDamage: [],
        } as unknown as StaticCatalogDamageInput["damage"],
      }
    }
    // 持有者的风属性异常命中（目标风抗 30%）：精 1 无视 15%，抗性乘数
    // 0.7 → 0.85。
    const withIgnore = calculateCatalogResult(
      anomalyInput({
        hitActor: "entity:holder",
        element: "wind",
        targetResistance: 0.3,
        selections: [{ optionId: CMC_RESPEN_OPTION, layers: 1 }],
      }),
    )
    expect(
      effectContribution(withIgnore, CMC_RESPEN).get("entity:holder"),
    ).toBeCloseTo(0.15, 12)
    const withoutIgnore = calculateCatalogResult(
      anomalyInput({
        hitActor: "entity:holder",
        element: "wind",
        targetResistance: 0.3,
        selections: [],
      }),
    )
    expect(withIgnore.expected / withoutIgnore.expected).toBeCloseTo(
      0.85 / 0.7,
      9,
    )
    // 队友的电属性异常命中：精 1 团队增伤 ×1.2。
    const withBuff = calculateCatalogResult(
      anomalyInput({
        hitActor: "entity:teammate",
        element: "electric",
        selections: [{ optionId: CMC_TEAM_OPTION, layers: 1 }],
      }),
    )
    expect(
      effectContribution(withBuff, CMC_TEAM).get("entity:teammate"),
    ).toBeCloseTo(0.2, 12)
    const withoutBuff = calculateCatalogResult(
      anomalyInput({
        hitActor: "entity:teammate",
        element: "electric",
        selections: [],
      }),
    )
    expect(withBuff.expected / withoutBuff.expected).toBeCloseTo(1.2, 9)
  })

  it("applies the triggered squad damage only to other same-team members", () => {
    for (const [index, value] of CMC_TEAM_VALUES.entries()) {
      const result = calculateCatalogResult(
        cmcInput({
          refinement: (index + 1) as RefinementRank,
          hitActor: "entity:teammate",
          selections: [{ optionId: CMC_TEAM_OPTION, layers: 1 }],
        }),
      )
      expect(
        effectContribution(result, CMC_TEAM).get("entity:teammate"),
        `refinement ${index + 1}`,
      ).toBeCloseTo(value, 12)
    }
    // 持有者本人与异队角色不受益；受益者的电属性普攻与 EX 命中同样享受
    // （取得条件不筛选受益者当前的伤害元素或技能）。
    for (const [label, setup] of [
      ["holder himself", { hitActor: "entity:holder" as EntityId }],
      ["other team", { hitActor: "entity:stranger" as EntityId }],
      [
        "teammate EX hit",
        { hitActor: "entity:teammate", category: "enhanced-special" },
      ],
      ["teammate wind hit", { hitActor: "entity:teammate", element: "wind" }],
    ] as const) {
      const result = calculateCatalogResult(
        cmcInput({
          hitActor: setup.hitActor,
          element: "element" in setup ? setup.element : "electric",
          skillCategory: "category" in setup ? setup.category : "basic",
          selections: [{ optionId: CMC_TEAM_OPTION, layers: 1 }],
        }),
      )
      if (label.startsWith("teammate")) {
        expect(
          effectContribution(result, CMC_TEAM).get("entity:teammate"),
          label,
        ).toBeCloseTo(0.2, 12)
      } else {
        expect(effectContribution(result, CMC_TEAM).size, label).toBe(0)
      }
    }
    // 0 层关闭；团队状态关闭时两项常驻条款仍可用（相互独立）。
    const off = calculateCatalogResult(
      cmcInput({
        hitActor: "entity:teammate",
        selections: [{ optionId: CMC_TEAM_OPTION, layers: 0 }],
      }),
    )
    expect(effectContribution(off, CMC_TEAM).size).toBe(0)
    const independent = calculateCatalogResult(
      cmcInput({
        hitActor: "entity:holder",
        element: "wind",
        targetResistance: 0.3,
        selections: [
          { optionId: CMC_CRIT_OPTION, layers: 1 },
          { optionId: CMC_RESPEN_OPTION, layers: 1 },
        ],
      }),
    )
    expect(
      effectContribution(independent, CMC_CRIT).get("entity:holder"),
    ).toBeCloseTo(0.24, 12)
    expect(
      effectContribution(independent, CMC_RESPEN).get("entity:holder"),
    ).toBeCloseTo(0.15, 12)
    expect(effectContribution(independent, CMC_TEAM).size).toBe(0)
    // 真实消费：精 1 队友期望伤害 ×1.2。
    const withTeam = calculateCatalogResult(
      cmcInput({
        hitActor: "entity:teammate",
        selections: [{ optionId: CMC_TEAM_OPTION, layers: 1 }],
      }),
    )
    const without = calculateCatalogResult(cmcInput({}))
    expect(withTeam.expected / without.expected).toBeCloseTo(1.2, 9)
  })

  it("enforces the squad-unique effect across bindings at selection time", () => {
    const secondCasketBinding = (
      holder: EntityId,
    ): StaticCatalogDamageInput["bindings"] => [
      {
        bindingId: "binding:casket",
        kind: "w-engine",
        holderId: "entity:holder",
        sourceEntityId: "14162",
        eligible: true,
        configuration: { refinement: 1 },
      },
      {
        bindingId: "binding:casket-b",
        kind: "w-engine",
        holderId: holder,
        sourceEntityId: "14162",
        eligible: true,
        configuration: { refinement: 5 },
      },
    ]
    const bothEnabled = calculateStaticDamageFromCatalog(
      cmcInput({
        hitActor: "entity:teammate",
        bindings: secondCasketBinding("entity:teammate"),
        selections: [
          { optionId: CMC_TEAM_OPTION, layers: 1, bindingId: "binding:casket" },
          {
            optionId: CMC_TEAM_OPTION,
            layers: 1,
            bindingId: "binding:casket-b",
          },
        ],
      }),
    )
    expect(bothEnabled.ok).toBe(false)
    if (!bothEnabled.ok)
      expect(
        bothEnabled.issues.some(
          (issue) =>
            issue.code === "CONTEXT_MISMATCH" &&
            issue.message.includes("squad-unique"),
        ),
      ).toBe(true)
    // 一名启用、另一名 0 层关闭：合法，只有启用的来源贡献（精 1 → +0.2）。
    const oneOff = calculateCatalogResult(
      cmcInput({
        hitActor: "entity:teammate",
        bindings: secondCasketBinding("entity:teammate"),
        selections: [
          { optionId: CMC_TEAM_OPTION, layers: 1, bindingId: "binding:casket" },
          {
            optionId: CMC_TEAM_OPTION,
            layers: 0,
            bindingId: "binding:casket-b",
          },
        ],
      }),
    )
    expect(
      effectContribution(oneOff, CMC_TEAM).get("entity:teammate"),
    ).toBeCloseTo(0.2, 12)
    // 异队各持一份且都启用：互不冲突，各自队友受益（持有者 B 的精 5 对其
    // 同队的命中角色 +0.32；持有者 A 的增益不跨队）。
    const otherTeam = calculateCatalogResult(
      cmcInput({
        hitActor: "entity:others-mate",
        othersMateAgent: "1251",
        bindings: secondCasketBinding("entity:stranger"),
        actorSources: [
          { entityId: "entity:holder", agentEntityId: "1621" },
          { entityId: "entity:teammate", agentEntityId: "1251" },
          { entityId: "entity:stranger", agentEntityId: "1251" },
          { entityId: "entity:others-mate", agentEntityId: "1251" },
        ],
        selections: [
          { optionId: CMC_TEAM_OPTION, layers: 1, bindingId: "binding:casket" },
          {
            optionId: CMC_TEAM_OPTION,
            layers: 1,
            bindingId: "binding:casket-b",
          },
        ],
      }),
    )
    expect(
      effectContribution(otherTeam, CMC_TEAM).get("entity:others-mate"),
    ).toBeCloseTo(0.32, 12)
    // 同队第二名持有者职业不适配（妮可，支援）：既有零贡献契约，不占用
    // 队伍名额，不与合法启用来源冲突；命中角色为该同队不适配持有者本人，
    // 合法来源（洛克茜的精 1）仍单份生效。
    const professionIneligible = calculateCatalogResult(
      cmcInput({
        hitActor: "entity:teammate",
        teammateAgent: "1031",
        bindings: secondCasketBinding("entity:teammate"),
        selections: [
          { optionId: CMC_TEAM_OPTION, layers: 1, bindingId: "binding:casket" },
          {
            optionId: CMC_TEAM_OPTION,
            layers: 1,
            bindingId: "binding:casket-b",
          },
        ],
      }),
    )
    expect(
      effectContribution(professionIneligible, CMC_TEAM).get("entity:teammate"),
    ).toBeCloseTo(0.2, 12)
    // 同队第二名持有者 eligible: false（青衣装备但绑定不合法）：同样零贡献
    // 不占名额，合法来源单份生效。
    const bindingIneligible = calculateCatalogResult(
      cmcInput({
        hitActor: "entity:teammate",
        bindings: [
          {
            bindingId: "binding:casket",
            kind: "w-engine",
            holderId: "entity:holder",
            sourceEntityId: "14162",
            eligible: true,
            configuration: { refinement: 1 },
          },
          {
            bindingId: "binding:casket-b",
            kind: "w-engine",
            holderId: "entity:teammate",
            sourceEntityId: "14162",
            eligible: false,
            configuration: { refinement: 5 },
          },
        ],
        selections: [
          { optionId: CMC_TEAM_OPTION, layers: 1, bindingId: "binding:casket" },
          {
            optionId: CMC_TEAM_OPTION,
            layers: 1,
            bindingId: "binding:casket-b",
          },
        ],
      }),
    )
    expect(
      effectContribution(bindingIneligible, CMC_TEAM).get("entity:teammate"),
    ).toBeCloseTo(0.2, 12)
    // 层数上限：2 层拒绝。
    const over = calculateStaticDamageFromCatalog(
      cmcInput({
        selections: [{ optionId: CMC_TEAM_OPTION, layers: 2 }],
      }),
    )
    expect(over.ok).toBe(false)
    if (!over.ok)
      expect(over.issues.some((issue) => issue.code === "INVALID_INPUT")).toBe(
        true,
      )
  })
})

describe("batch 07 squad-unique catalog boundary", () => {
  const mutatedCatalog = (
    mutate: (catalog: StaticEffectCatalog) => void,
  ): StaticEffectCatalog => {
    const clone = structuredClone(catalog)
    mutate(clone)
    return clone
  }

  it("accepts the shipped catalog with the squad-unique field", () => {
    const validated = validateStaticCatalog(catalog, definitions)
    expect(validated.ok, JSON.stringify(validated)).toBe(true)
  })

  it("rejects a squad-unique arm with an unrelated field", () => {
    const mutated = mutatedCatalog((clone) => {
      const option = clone.options.find((o) => o.optionId === CMC_TEAM_OPTION)!
      ;(option.variants[0] as { mechanism?: unknown }).mechanism = {
        kind: "squad-unique",
        squadUniqueEffect: true,
      }
    })
    const validated = validateStaticCatalog(mutated, definitions)
    expect(validated.ok).toBe(false)
    if (!validated.ok)
      expect(
        validated.issues.some(
          (issue) =>
            issue.code === "INVALID_DEFINITION" &&
            issue.pointer.endsWith("/mechanism/squadUniqueEffect"),
        ),
      ).toBe(true)
  })
})
