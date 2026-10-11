import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../../src/effects/index.ts"
import type {
  CoreSkillLevel,
  EntityId,
  MindscapeRank,
  StaticCatalogDamageInput,
  StaticDamageResult,
  StaticEffectCatalog,
} from "../../src/effects/index.ts"
import type { SpecialSkillLevel } from "@randomplay/shared"
import { validateStaticCatalog } from "../../src/effects/internal/static-catalog.ts"
import { general, inputFor } from "./static-fixtures.ts"

/**
 * 增益修复批次 06（修订 21）：代理人冲击力与回能补充的具名回归。
 * 期望值全部来自冻结 Nanoka 3.2 逐档原文（中英文交叉核对）与独立算式，
 * 不从生成器反推；触发状态、持续与前后场事实由选择显式声明，不模拟
 * 时间线。凯撒冲击按特殊技最终等级查表，琉音读显式初始暴击率输入，
 * 莱特 M4 的前场受益者由 beneficiaryActorId 显式声明。
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

const statProbeInput = (
  agentEntityId: string,
  options: readonly {
    optionId: string
    layers: number
    beneficiaryActorId?: EntityId
  }[],
  configuration: {
    mindscapeRank?: MindscapeRank
    coreSkillLevel?: CoreSkillLevel
    specialSkillLevel?: SpecialSkillLevel
  },
  overrides: {
    probeStat?: "impact" | "energyRegen"
    probeValue?: number
    probeEntity?: EntityId
    inputs?: StaticCatalogDamageInput["inputs"]
    world?: StaticCatalogDamageInput["world"]
    actorSources?: StaticCatalogDamageInput["actorSources"]
    bindings?: StaticCatalogDamageInput["bindings"]
  } = {},
): StaticCatalogDamageInput => {
  const base = inputFor()
  const attacker = base.world.entities[0]!
  if (attacker.kind !== "actor") throw new Error("fixture")
  const probeStat = overrides.probeStat ?? "impact"
  const probeEntity = overrides.probeEntity ?? "entity:attacker"
  const probeValue =
    overrides.probeValue ?? (probeStat === "impact" ? 170 : 1.2)
  const world = overrides.world ?? {
    ...base.world,
    entities: base.world.entities.map((entity) =>
      entity.kind === "actor" && entity.entityId === "entity:attacker"
        ? {
            ...entity,
            generalStats: {
              ...entity.generalStats,
              [probeStat]: general(probeValue),
            },
          }
        : entity,
    ),
  }
  return {
    ...base,
    definitions,
    catalog,
    world,
    bindings: overrides.bindings ?? [
      {
        bindingId: "binding:static",
        kind: "agent",
        holderId: "entity:attacker",
        sourceEntityId: agentEntityId,
        eligible: true,
        configuration: {
          mindscapeRank: configuration.mindscapeRank ?? 0,
          coreSkillLevel: configuration.coreSkillLevel ?? 7,
          ...(configuration.specialSkillLevel === undefined
            ? {}
            : { specialSkillLevel: configuration.specialSkillLevel }),
        } as Extract<
          StaticCatalogDamageInput["bindings"][number],
          { kind: "agent" }
        >["configuration"],
      },
    ],
    actorSources: overrides.actorSources ?? [
      { entityId: "entity:attacker", agentEntityId },
    ],
    selections: options.map((option) => ({
      optionId: option.optionId,
      bindingId: "binding:static",
      layers: option.layers,
      ...(option.beneficiaryActorId === undefined
        ? {}
        : { beneficiaryActorId: option.beneficiaryActorId }),
    })),
    ...(overrides.inputs === undefined ? {} : { inputs: overrides.inputs }),
    hit: {
      ...base.hit,
      damageItems: [
        {
          mode: "direct" as const,
          role: "base" as const,
          itemId: "probe",
          stat: probeStat,
          statSource: { entityId: probeEntity },
          damageMultiplier: 1,
        },
      ],
    },
    damage: base.damage as Extract<
      StaticCatalogDamageInput["damage"],
      { kind: "regular" }
    >,
  }
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

describe("batch 06 agent impact supplements", () => {
  it("applies Caesar's stance switch impact by the final special skill level", () => {
    const effectId = "agent:1071:nanoka:stance-switch-impact:mindscape:0"
    for (const [level, expected] of [
      [1, 0.09],
      [12, 0.2],
      [16, 0.24],
    ] as const) {
      const result = calculateCatalogResult(
        statProbeInput(
          "1071",
          [
            {
              optionId: "nanoka:agents:caesar:stance-switch-impact",
              layers: 1,
            },
          ],
          { specialSkillLevel: level },
        ),
      )
      expect(
        effectContribution(result, effectId).get("entity:attacker"),
        `level ${level}`,
      ).toBeCloseTo(expected, 12)
      // 冲击力按 final-percentage 进入当前值：170 × (1+比例)。
      expect(currentStat(result, "entity:attacker", "impact")).toBeCloseTo(
        170 * (1 + expected),
        9,
      )
    }
    // 影画等级提升只改变调用方提供的最终等级，选项自身不重复加级：
    // M3 与 M5 下同一最终等级 12 的贡献保持 0.20，恰好一次。
    const mindscape = calculateCatalogResult(
      statProbeInput(
        "1071",
        [{ optionId: "nanoka:agents:caesar:stance-switch-impact", layers: 1 }],
        { specialSkillLevel: 12, mindscapeRank: 5 },
      ),
    )
    expect(
      effectContribution(mindscape, effectId).get("entity:attacker"),
    ).toBeCloseTo(0.2, 12)
    // 关闭（0 层）不贡献；依赖等级的选项缺少特殊技最终等级输入即拒绝。
    expect(
      effectContribution(
        calculateCatalogResult(
          statProbeInput(
            "1071",
            [
              {
                optionId: "nanoka:agents:caesar:stance-switch-impact",
                layers: 0,
              },
            ],
            { specialSkillLevel: 12 },
          ),
        ),
        effectId,
      ).size,
    ).toBe(0)
    const missing = calculateStaticDamageFromCatalog(
      statProbeInput(
        "1071",
        [{ optionId: "nanoka:agents:caesar:stance-switch-impact", layers: 1 }],
        {},
      ),
    )
    expect(missing.ok).toBe(false)
    if (!missing.ok)
      expect(
        missing.issues.some((issue) => issue.code === "MISSING_RANK"),
      ).toBe(true)
  })

  it("applies Lighter's morale burst impact per consumed stack across all core ranks", () => {
    const effectId = "agent:1161:nanoka:morale-burst-impact:mindscape:0"
    // 每层值随核心 1—7 逐档取字面值；10 层即来源上限。
    const perLayer = [0.01, 0.0117, 0.0133, 0.015, 0.0167, 0.0183, 0.02]
    for (const [index, value] of perLayer.entries()) {
      const result = calculateCatalogResult(
        statProbeInput(
          "1161",
          [
            {
              optionId: "nanoka:agents:lighter:morale-burst-impact",
              layers: 10,
            },
          ],
          { coreSkillLevel: (index + 1) as CoreSkillLevel },
        ),
      )
      expect(
        effectContribution(result, effectId).get("entity:attacker"),
        `core ${index + 1} × 10 layers`,
      ).toBeCloseTo(value * 10, 12)
    }
    // 中间层数与关闭：核心 7 的 5 层为 0.10，0 层关闭。
    for (const [layers, expected] of [
      [5, 0.1],
      [0, 0],
    ] as const) {
      const result = calculateCatalogResult(
        statProbeInput(
          "1161",
          [
            {
              optionId: "nanoka:agents:lighter:morale-burst-impact",
              layers,
            },
          ],
          {},
        ),
      )
      expect(
        effectContribution(result, effectId).get("entity:attacker") ?? 0,
        `layers ${layers}`,
      ).toBeCloseTo(expected, 12)
    }
    // 满层进入当前冲击力：核心 7 × 10 层 = +20%。
    const consumed = calculateCatalogResult(
      statProbeInput(
        "1161",
        [
          {
            optionId: "nanoka:agents:lighter:morale-burst-impact",
            layers: 10,
          },
        ],
        {},
      ),
    )
    expect(currentStat(consumed, "entity:attacker", "impact")).toBeCloseTo(
      204,
      9,
    )
    // 超过上限层数（11）按既有层数契约拒绝。
    const invalid = calculateStaticDamageFromCatalog(
      statProbeInput(
        "1161",
        [
          {
            optionId: "nanoka:agents:lighter:morale-burst-impact",
            layers: 11,
          },
        ],
        {},
      ),
    )
    expect(invalid.ok).toBe(false)
    if (!invalid.ok)
      expect(
        invalid.issues.some(
          (issue) =>
            issue.code === "INVALID_INPUT" &&
            issue.pointer === "/selections/0/layers",
        ),
      ).toBe(true)
  })

  it("applies Ju Fufu's tiger roar fixed impact at all core ranks with a constant delta", () => {
    const effectId = "agent:1391:nanoka:tigers-roar-impact:mindscape:0"
    const points = [25, 29.2, 33.3, 37.5, 41.7, 45.8, 50]
    for (const [index, value] of points.entries()) {
      const result = calculateCatalogResult(
        statProbeInput(
          "1391",
          [{ optionId: "nanoka:agents:jufufu:tigers-roar-impact", layers: 1 }],
          { coreSkillLevel: (index + 1) as CoreSkillLevel },
        ),
      )
      expect(
        effectContribution(result, effectId).get("entity:attacker"),
        `core ${index + 1}`,
      ).toBeCloseTo(value, 12)
    }
    // 固定点数不随基础冲击力缩放：基础 170 与 1000 下核心 7 的增量同为 50。
    for (const [base, expected] of [
      [170, 220],
      [1000, 1050],
    ] as const) {
      const result = calculateCatalogResult(
        statProbeInput(
          "1391",
          [{ optionId: "nanoka:agents:jufufu:tigers-roar-impact", layers: 1 }],
          {},
          { probeValue: base },
        ),
      )
      expect(currentStat(result, "entity:attacker", "impact")).toBeCloseTo(
        expected,
        9,
      )
    }
    // 关闭与既有[虎啸]条款共存：暴伤选项与冲击点数各自贡献一次。
    const coexist = calculateCatalogResult(
      statProbeInput(
        "1391",
        [
          { optionId: "nanoka:agents:jufufu:tigers-roar-impact", layers: 1 },
          {
            optionId:
              "agents:jufufu:mindscape:0:blk-legacy:legacy-team-critDmg",
            layers: 1,
          },
        ],
        {},
        { probeValue: 170 },
      ),
    )
    expect(
      effectContribution(coexist, effectId).get("entity:attacker"),
    ).toBeCloseTo(50, 12)
    const critEffect =
      "agent:1391:zzz-hp:legacy-team-critDmg:blk-legacy:mindscape:0"
    expect(
      effectContribution(coexist, critEffect).get("entity:attacker"),
    ).toBeCloseTo(0.2, 12)
  })

  it("converts Dialyn's initial crit rate over 50% into capped impact points", () => {
    const effectId = "agent:1481:nanoka:initial-crit-rate-impact:mindscape:0"
    const option = "nanoka:agents:dialyn:initial-crit-rate-impact"
    const inputName =
      "agent:1481:nanoka:initial-crit-rate-impact:mindscape:0:source"
    const withRate = (critRate: number) => [
      {
        bindingId: "binding:static" as const,
        name: inputName,
        value: { unit: "ratio" as const, value: critRate },
      },
    ]
    // 核心 7 锚点：49%/50% → 0、51% → 2、75% → 50、100% → 100、150% 封顶 100。
    for (const [critRate, expected] of [
      [0.49, 0],
      [0.5, 0],
      [0.51, 2],
      [0.75, 50],
      [1, 100],
      [1.5, 100],
    ] as const) {
      const result = calculateCatalogResult(
        statProbeInput(
          "1481",
          [{ optionId: option, layers: 1 }],
          {},
          { inputs: withRate(critRate) },
        ),
      )
      expect(
        effectContribution(result, effectId).get("entity:attacker"),
        `crit rate ${critRate}`,
      ).toBeCloseTo(expected, 12)
    }
    // 核心 1 的每百分点换算 1.4 点：75% → 35、51% → 1.4。
    for (const [critRate, expected] of [
      [0.75, 35],
      [0.51, 1.4],
    ] as const) {
      const result = calculateCatalogResult(
        statProbeInput(
          "1481",
          [{ optionId: option, layers: 1 }],
          { coreSkillLevel: 1 },
          { inputs: withRate(critRate) },
        ),
      )
      expect(
        effectContribution(result, effectId).get("entity:attacker"),
        `core 1 crit rate ${critRate}`,
      ).toBeCloseTo(expected, 12)
    }
    // 初始/当前分离：贡献只读显式输入，不读世界中的当前暴击率（夹具为 0.25）。
    const separated = calculateCatalogResult(
      statProbeInput(
        "1481",
        [{ optionId: option, layers: 1 }],
        {},
        { inputs: withRate(0.75) },
      ),
    )
    expect(currentStat(separated, "entity:attacker", "impact")).toBeCloseTo(
      220,
      9,
    )
    // 缺输入与错误单位按既有输入契约拒绝。
    const missing = calculateStaticDamageFromCatalog(
      statProbeInput("1481", [{ optionId: option, layers: 1 }], {}),
    )
    expect(missing.ok).toBe(false)
    if (!missing.ok)
      expect(
        missing.issues.some((issue) => issue.code === "MISSING_FACT"),
      ).toBe(true)
    const wrongUnit = calculateStaticDamageFromCatalog(
      statProbeInput(
        "1481",
        [{ optionId: option, layers: 1 }],
        {},
        {
          inputs: [
            {
              bindingId: "binding:static",
              name: inputName,
              value: { unit: "count", value: 75 },
            },
          ],
        },
      ),
    )
    expect(wrongUnit.ok).toBe(false)
    if (!wrongUnit.ok)
      expect(
        wrongUnit.issues.some((issue) => issue.code === "UNIT_MISMATCH"),
      ).toBe(true)
  })
})

describe("batch 06 mindscape 4 energy regen supplements", () => {
  const teamInput = (configuration: {
    mindscapeRank?: MindscapeRank
    energyRegenBase?: number
    selections: readonly {
      optionId: string
      layers: number
      beneficiaryActorId?: EntityId
    }[]
    probeEntity?: EntityId
    /** 前场/后场队友的目录实体；默认青衣（击破/电）与妮可（支援/以太）。 */
    frontAgent?: string
    benchAgent?: string
    /** 覆盖正式目录（用于适用性交集的内存变体）。 */
    catalog?: StaticEffectCatalog
    bindings?: StaticCatalogDamageInput["bindings"]
    actorSources?: StaticCatalogDamageInput["actorSources"]
  }): StaticCatalogDamageInput => {
    const base = inputFor()
    const energyRegenBase = configuration.energyRegenBase ?? 1.2
    const playerStats = () => ({
      attack: general(1000),
      health: general(24000),
      impact: general(170),
      sheerForce: general(500),
      anomalyProficiency: general(300),
      energyRegen: general(energyRegenBase),
    })
    const world: StaticCatalogDamageInput["world"] = {
      ...base.world,
      entities: [
        {
          kind: "actor",
          entityId: "entity:lighter",
          teamId: "team:players",
          generalStats: playerStats(),
          directStats: {
            criticalRate: { baseValue: 0.25, additions: [] },
            criticalDamage: { baseValue: 0.5, additions: [] },
            penetrationRatio: { baseValue: 0.1, additions: [] },
          },
        },
        {
          kind: "actor",
          entityId: "entity:front",
          teamId: "team:players",
          generalStats: playerStats(),
          directStats: {
            criticalRate: { baseValue: 0.4, additions: [] },
            criticalDamage: { baseValue: 0.5, additions: [] },
            penetrationRatio: { baseValue: 0.1, additions: [] },
          },
        },
        {
          kind: "actor",
          entityId: "entity:bench",
          teamId: "team:players",
          generalStats: playerStats(),
          directStats: {
            criticalRate: { baseValue: 0.3, additions: [] },
            criticalDamage: { baseValue: 0.5, additions: [] },
            penetrationRatio: { baseValue: 0.1, additions: [] },
          },
        },
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
    return {
      ...base,
      definitions,
      catalog: configuration.catalog ?? catalog,
      world,
      bindings: configuration.bindings ?? [
        {
          bindingId: "binding:static",
          kind: "agent",
          holderId: "entity:lighter",
          sourceEntityId: "1161",
          eligible: true,
          configuration: {
            mindscapeRank: configuration.mindscapeRank ?? 4,
            coreSkillLevel: 7,
          } as Extract<
            StaticCatalogDamageInput["bindings"][number],
            { kind: "agent" }
          >["configuration"],
        },
      ],
      actorSources: configuration.actorSources ?? [
        { entityId: "entity:lighter", agentEntityId: "1161" },
        {
          entityId: "entity:front",
          agentEntityId: configuration.frontAgent ?? "1251",
        },
        {
          entityId: "entity:bench",
          agentEntityId: configuration.benchAgent ?? "1031",
        },
      ],
      selections: configuration.selections.map((selection) => ({
        optionId: selection.optionId,
        bindingId: "binding:static",
        layers: selection.layers,
        ...(selection.beneficiaryActorId === undefined
          ? {}
          : { beneficiaryActorId: selection.beneficiaryActorId }),
      })),
      hit: {
        ...base.hit,
        actorId: "entity:front",
        damageItems: [
          {
            mode: "direct" as const,
            role: "base" as const,
            itemId: "probe",
            stat: "energyRegen",
            statSource: {
              entityId: configuration.probeEntity ?? "entity:front",
            },
            damageMultiplier: 1,
          },
        ],
      },
      damage: base.damage as Extract<
        StaticCatalogDamageInput["damage"],
        { kind: "regular" }
      >,
    }
  }

  it("applies Lighter's M4 regen only to the declared front-line teammate", () => {
    const effectId =
      "agent:1161:nanoka:mindscape-4-frontline-energy-regen:mindscape:4"
    const option = "nanoka:agents:lighter:mindscape-4-frontline-energy-regen"
    // 百分比契约：基础回能 1.2 → +0.12、5.0 → +0.5，只给声明的前场角色。
    for (const [base, expected] of [
      [1.2, 0.12],
      [5, 0.5],
    ] as const) {
      const result = calculateCatalogResult(
        teamInput({
          energyRegenBase: base,
          selections: [
            { optionId: option, layers: 1, beneficiaryActorId: "entity:front" },
          ],
        }),
      )
      const contributions = effectContribution(result, effectId)
      expect(contributions.get("entity:front"), `base ${base}`).toBeCloseTo(
        expected,
        12,
      )
      // 莱特本人与另一名后场队友都不受益，全队不同时受益。
      expect(contributions.has("entity:lighter")).toBe(false)
      expect(contributions.has("entity:bench")).toBe(false)
      expect(currentStat(result, "entity:front", "energyRegen")).toBeCloseTo(
        base + expected,
        12,
      )
    }
    // 关闭（0 层）不需要声明也不贡献。
    const off = calculateCatalogResult(
      teamInput({
        selections: [{ optionId: option, layers: 0 }],
      }),
    )
    expect(effectContribution(off, effectId).size).toBe(0)
    // 启用选择缺声明、声明为持有者本人、声明为敌方或未观察实体都被拒绝。
    for (const [label, selection] of [
      ["missing declaration", { optionId: option, layers: 1 }],
      [
        "holder himself",
        {
          optionId: option,
          layers: 1,
          beneficiaryActorId: "entity:lighter",
        },
      ],
      [
        "enemy actor",
        { optionId: option, layers: 1, beneficiaryActorId: "entity:enemy" },
      ],
      [
        "unobserved actor",
        {
          optionId: option,
          layers: 1,
          beneficiaryActorId: "entity:missing",
        },
      ],
    ] as const) {
      const rejected = calculateStaticDamageFromCatalog(
        teamInput({ selections: [selection] }),
      )
      expect(rejected.ok, label).toBe(false)
      if (!rejected.ok) {
        expect(
          rejected.issues.some((issue) =>
            ["MISSING_FACT", "CONTEXT_MISMATCH"].includes(issue.code),
          ),
          `${label}: ${JSON.stringify(rejected.issues)}`,
        ).toBe(true)
        expect(
          rejected.issues.every((issue) => issue.code !== "MISSING_RANK"),
        ).toBe(true)
      }
    }
    // 未声明该字段的选项不接受 beneficiaryActorId。
    const unexpected = calculateStaticDamageFromCatalog(
      statProbeInput(
        "1391",
        [
          {
            optionId: "nanoka:agents:jufufu:tigers-roar-impact",
            layers: 1,
            beneficiaryActorId: "entity:front",
          },
        ],
        {},
        { probeStat: "impact" },
      ),
    )
    expect(unexpected.ok).toBe(false)
    if (!unexpected.ok)
      expect(
        unexpected.issues.some((issue) => issue.code === "CONTEXT_MISMATCH"),
      ).toBe(true)
    // 影画门槛：M3 未解锁被拒绝。
    const locked = calculateStaticDamageFromCatalog(
      teamInput({
        mindscapeRank: 3,
        selections: [
          { optionId: option, layers: 1, beneficiaryActorId: "entity:front" },
        ],
      }),
    )
    expect(locked.ok).toBe(false)
    if (!locked.ok)
      expect(
        locked.issues.some((issue) => issue.code === "CONTEXT_MISMATCH"),
      ).toBe(true)
  })

  it("applies Alexandrina's M4 fixed regen for both deployed dolls at any base", () => {
    const effectId =
      "agent:1211:nanoka:mindscape-4-deployed-dolls-energy-regen:mindscape:4"
    const option =
      "nanoka:agents:alexandrina:mindscape-4-deployed-dolls-energy-regen"
    for (const base of [1.2, 5] as const) {
      const result = calculateCatalogResult(
        statProbeInput(
          "1211",
          [{ optionId: option, layers: 1 }],
          { mindscapeRank: 4 },
          { probeStat: "energyRegen", probeValue: base },
        ),
      )
      expect(
        effectContribution(result, effectId).get("entity:attacker"),
        `base ${base}`,
      ).toBeCloseTo(0.5, 12)
      expect(currentStat(result, "entity:attacker", "energyRegen")).toBeCloseTo(
        base + 0.5,
        12,
      )
    }
    // 关闭为 0；M0—M3 未解锁被拒绝。
    expect(
      effectContribution(
        calculateCatalogResult(
          statProbeInput(
            "1211",
            [{ optionId: option, layers: 0 }],
            { mindscapeRank: 4 },
            { probeStat: "energyRegen", probeValue: 1.2 },
          ),
        ),
        effectId,
      ).size,
    ).toBe(0)
    for (const rank of [0, 1, 2, 3] as const) {
      const rejected = calculateStaticDamageFromCatalog(
        statProbeInput(
          "1211",
          [{ optionId: option, layers: 1 }],
          { mindscapeRank: rank },
          { probeStat: "energyRegen", probeValue: 1.2 },
        ),
      )
      expect(rejected.ok, `mindscape ${rank}`).toBe(false)
      if (!rejected.ok)
        expect(
          rejected.issues.some((issue) => issue.code === "CONTEXT_MISMATCH"),
        ).toBe(true)
    }
  })

  /**
   * PR06 修复回归：声明式同队受益者必须与原受益集合（同队/职业/元素/队伍
   * 职业人数筛选后的合法候选）取交集，而不是替换该集合。声明实体落在筛选
   * 之外时保持既有的零贡献契约（不新增报错）；身份类输入错误校验保持。
   * 内存目录变体仅给 M4 选项补充适用性，其余与正式目录一致。
   */
  describe("batch 06 declared beneficiary intersects the applicability filters", () => {
    const OPTION = "nanoka:agents:lighter:mindscape-4-frontline-energy-regen"
    const EFFECT =
      "agent:1161:nanoka:mindscape-4-frontline-energy-regen:mindscape:4"

    const catalogWith = (applicability: unknown): StaticEffectCatalog => {
      const mutated = structuredClone(catalog)
      const option = mutated.options.find((o) => o.optionId === OPTION)!
      ;(
        option.variants[0] as unknown as {
          applicability: Record<string, unknown>
        }
      ).applicability = applicability as Record<string, unknown>
      return mutated
    }

    const contribution = (result: StaticDamageResult): Map<string, number> => {
      const byBeneficiary = new Map<string, number>()
      for (const entry of [
        ...result.evaluation.contributions,
        ...(result.preparations ?? []).flatMap((p) => p.contributions),
      ])
        if (entry.origin.effectId === EFFECT)
          byBeneficiary.set(
            entry.origin.beneficiaryId,
            (byBeneficiary.get(entry.origin.beneficiaryId) ?? 0) +
              entry.value.value,
          )
      return byBeneficiary
    }

    it("intersects the declaration with the beneficiary profession filter", () => {
      const professionCatalog = catalogWith({
        beneficiaryProfession: "支援",
      })
      // 妮可是支援：声明她时正常受益。
      const support = calculateCatalogResult(
        teamInput({
          catalog: professionCatalog,
          selections: [
            { optionId: OPTION, layers: 1, beneficiaryActorId: "entity:bench" },
          ],
          probeEntity: "entity:bench",
        }),
      )
      expect(contribution(support).get("entity:bench")).toBeCloseTo(0.12, 12)
      // 青衣是击破：声明她时不在合法受益集合内，保持零贡献而非报错。
      const excluded = calculateCatalogResult(
        teamInput({
          catalog: professionCatalog,
          selections: [
            { optionId: OPTION, layers: 1, beneficiaryActorId: "entity:front" },
          ],
        }),
      )
      expect(contribution(excluded).size).toBe(0)
    })

    it("intersects the declaration with the beneficiary element filter", () => {
      const elementCatalog = catalogWith({ beneficiaryElements: ["fire"] })
      // 橘福福是火属性：声明她时正常受益。
      const fire = calculateCatalogResult(
        teamInput({
          catalog: elementCatalog,
          frontAgent: "1391",
          selections: [
            { optionId: OPTION, layers: 1, beneficiaryActorId: "entity:front" },
          ],
        }),
      )
      expect(contribution(fire).get("entity:front")).toBeCloseTo(0.12, 12)
      // 青衣是电属性：声明她时为零贡献。
      const electric = calculateCatalogResult(
        teamInput({
          catalog: elementCatalog,
          selections: [
            { optionId: OPTION, layers: 1, beneficiaryActorId: "entity:front" },
          ],
        }),
      )
      expect(contribution(electric).size).toBe(0)
    })

    it("intersects the declaration with the team profession count gate", () => {
      // 队伍恰好 1 名支援（妮可）：满足 counts [1]，声明合法受益者正常贡献。
      const satisfied = calculateCatalogResult(
        teamInput({
          catalog: catalogWith({
            teamProfession: { profession: "支援", counts: [1] },
          }),
          selections: [
            { optionId: OPTION, layers: 1, beneficiaryActorId: "entity:front" },
          ],
        }),
      )
      expect(contribution(satisfied).get("entity:front")).toBeCloseTo(0.12, 12)
      // 队伍只有 1 名支援而不满足 counts [2]：合法受益集合为空，声明任何
      // 同队实体都是零贡献，不新增报错。
      const unsatisfied = calculateCatalogResult(
        teamInput({
          catalog: catalogWith({
            teamProfession: { profession: "支援", counts: [2] },
          }),
          selections: [
            { optionId: OPTION, layers: 1, beneficiaryActorId: "entity:front" },
          ],
        }),
      )
      expect(contribution(unsatisfied).size).toBe(0)
    })

    it("keeps two bindings with different declarations isolated", () => {
      // 两份莱特来源绑定分别由不同运行实体持有（同一实体不能重复绑定同源）。
      const single = teamInput({ selections: [] })
      const lighterActor = single.world.entities.find(
        (entity) =>
          entity.kind === "actor" && entity.entityId === "entity:lighter",
      )!
      const secondLighter = {
        ...structuredClone(lighterActor),
        entityId: "entity:lighter-b" as EntityId,
      }
      const input: StaticCatalogDamageInput = {
        ...single,
        world: {
          ...single.world,
          entities: [...single.world.entities, secondLighter],
        },
        bindings: [
          {
            bindingId: "binding:lighter-a",
            kind: "agent",
            holderId: "entity:lighter",
            sourceEntityId: "1161",
            eligible: true,
            configuration: {
              mindscapeRank: 4,
              coreSkillLevel: 7,
            } as Extract<
              StaticCatalogDamageInput["bindings"][number],
              { kind: "agent" }
            >["configuration"],
          },
          {
            bindingId: "binding:lighter-b",
            kind: "agent",
            holderId: "entity:lighter-b",
            sourceEntityId: "1161",
            eligible: true,
            configuration: {
              mindscapeRank: 4,
              coreSkillLevel: 7,
            } as Extract<
              StaticCatalogDamageInput["bindings"][number],
              { kind: "agent" }
            >["configuration"],
          },
        ],
        actorSources: [
          ...single.actorSources,
          { entityId: "entity:lighter-b", agentEntityId: "1161" },
        ],
      }
      const result = calculateCatalogResult({
        ...input,
        // 两个声明受益者的回能都要被读取，贡献才会各自落位。
        hit: {
          ...input.hit,
          damageItems: [
            ...input.hit.damageItems,
            {
              mode: "direct" as const,
              role: "base" as const,
              itemId: "probe-bench",
              stat: "energyRegen",
              statSource: { entityId: "entity:bench" },
              damageMultiplier: 1,
            },
          ],
        },
        selections: [
          {
            optionId: OPTION,
            bindingId: "binding:lighter-a",
            layers: 1,
            beneficiaryActorId: "entity:front",
          },
          {
            optionId: OPTION,
            bindingId: "binding:lighter-b",
            layers: 1,
            beneficiaryActorId: "entity:bench",
          },
        ],
      })
      const contributions = contribution(result)
      // 每个声明各自落一次：前场只有 A 的贡献，后场只有 B 的贡献。
      expect(contributions.get("entity:front")).toBeCloseTo(0.12, 12)
      expect(contributions.get("entity:bench")).toBeCloseTo(0.12, 12)
      expect(contributions.has("entity:lighter")).toBe(false)
    })
  })
})

describe("batch 06 declared teammate beneficiary catalog boundary", () => {
  /** 变更后目录的深拷贝；用于单独核对定义边界拒绝行为。 */
  const mutatedCatalog = (
    mutate: (catalog: StaticEffectCatalog) => void,
  ): StaticEffectCatalog => {
    const clone = structuredClone(catalog)
    mutate(clone)
    return clone
  }

  it("accepts the shipped catalog with the declared teammate beneficiary field", () => {
    const validated = validateStaticCatalog(catalog, definitions)
    expect(validated.ok, JSON.stringify(validated)).toBe(true)
  })

  it("rejects a declared teammate beneficiary on a self-target variant", () => {
    const mutated = mutatedCatalog((clone) => {
      const option = clone.options.find(
        (o) =>
          o.optionId ===
          "nanoka:agents:lighter:mindscape-4-frontline-energy-regen",
      )!
      // 变体的显式 target 覆盖选项 target；改为 self 后有效 target 不再是 team。
      ;(option.variants[0] as { target?: "self" | "team" }).target = "self"
    })
    const validated = validateStaticCatalog(mutated, definitions)
    expect(validated.ok).toBe(false)
    if (!validated.ok)
      expect(
        validated.issues.some((issue) => issue.code === "INVALID_DEFINITION"),
      ).toBe(true)
  })

  it("rejects a non-literal declared teammate beneficiary value", () => {
    const mutated = mutatedCatalog((clone) => {
      const option = clone.options.find(
        (o) =>
          o.optionId ===
          "nanoka:agents:lighter:mindscape-4-frontline-energy-regen",
      )!
      ;(
        option.variants[0] as { declaredTeammateBeneficiary?: unknown }
      ).declaredTeammateBeneficiary = "yes"
    })
    const validated = validateStaticCatalog(mutated, definitions)
    expect(validated.ok).toBe(false)
    if (!validated.ok)
      expect(
        validated.issues.some((issue) => issue.code === "INVALID_INPUT"),
      ).toBe(true)
  })
})
