import { describe, expect, it } from "vitest"
import type { ContributionRule } from "@randomplay/shared"
import {
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../../core/src/effects/index.ts"
import type {
  StaticCatalogDamageInput,
  StaticEffectCatalog,
} from "../../core/src/effects/index.ts"
import { convertSource } from "../scripts/static-effects/convert.ts"
import {
  PHEONY_M4_SUPPLEMENTS,
  verifyPheonyM4Registrations,
} from "../scripts/static-effects/pheony-m4.ts"
import {
  SUPPLEMENTS,
  type Supplement,
} from "../scripts/static-effects/supplements.ts"
import type {
  SourceData,
  SourceEntity,
  SourceNormalization,
} from "../scripts/static-effects/source.ts"
import fixture from "./fixtures/pheony-m4-source.json" with { type: "json" }

/**
 * PR-B2：菲欧妮（1641）影画 4[生命尽头与冷酷仙境]的六元素独立异放。
 *
 * Nanoka `/talent/4/desc` 中英文同文证明：[烬火追魂]或[普通攻击：焚罪]
 * 终结一击命中处于异常状态的敌人时，额外触发一次[异放]，固定结算 600%
 * 倍率的对应属性异常伤害。ZZZ-HP 的 `anomalyBaseExpected` 不含原异常系数，
 * 因此最终倍率等于原异常系数 × 6。六条补充选项复用既有稳定 optionId /
 * effectId / 独立目标 / 伤害项，改用当前 `independent-settlement` 变体机制；
 * 固定源常驻 40% 旧位置（rank0 eff-9）继续是 semantic-conflict 迁移入口。
 */
const elements = [
  { element: "physical", label: "物理", multiplier: 42.78 },
  { element: "fire", label: "火", multiplier: 3 },
  { element: "ice", label: "冰", multiplier: 30 },
  { element: "electric", label: "电", multiplier: 7.5 },
  { element: "ether", label: "以太", multiplier: 3.75 },
  { element: "wind", label: "风", multiplier: 75 },
] as const

const optionId = (element: string) =>
  `nanoka:agents:1641:m4-anomaly-settlement-${element}`
const effectId = (element: string) =>
  `agent:1641:nanoka:m4-anomaly-settlement-${element}:mindscape:4`
const critEffectId = (element: string) => `${effectId(element)}-crit-damage`
const targetId = "zzz-hp:skill:pheony-m4-anomaly-settlement"
const itemId = "pheony:m4-anomaly-settlement"

const nanokaReference = (locale: "zh" | "en", pointer: string) => ({
  sourceId: "nanoka-integrated",
  version: "3.3.12+19634983",
  locale,
  resourcePath: `agents/1641/details.${locale}.json`,
  pointer,
})

const functions: SourceNormalization = {
  normalizeAgent: (entity) => ({
    ...entity,
    mindscapeBuffs: Array.from(
      { length: 7 },
      (_, index) => entity.mindscapeBuffs?.[index] ?? {},
    ),
  }),
  normalizeWengine: (entity) => entity,
  normalizeDriveDisc: (entity) => entity,
  collectEffectsFromPack: (pack) =>
    pack.effectBlocks?.flatMap((block) => block.effects) ?? pack.effects ?? [],
  applyAnomalyFlagsToPack: (pack) => pack,
}

const cloneAgent = (): SourceEntity =>
  structuredClone(fixture.agent) as SourceEntity

const m4Supplements = () =>
  SUPPLEMENTS.filter((supplement) =>
    "optionId" in supplement
      ? supplement.optionId.startsWith(
          "nanoka:agents:1641:m4-anomaly-settlement-",
        )
      : false,
  )

const convert = (
  agent: SourceEntity = cloneAgent(),
  supplements: readonly Supplement[] = m4Supplements(),
) =>
  convertSource(
    {
      agents: [agent],
      wengines: [],
      driveDiscs: [],
      skillSubcategories: [],
      followUpSkillRules: [],
    } satisfies SourceData,
    functions,
    [],
    supplements,
  )

const optionFor = (output: ReturnType<typeof convert>, element: string) => {
  const option = output.catalog.options.find(
    (entry) => entry.optionId === optionId(element),
  )
  if (!option) throw new Error(`missing generated option ${optionId(element)}`)
  return option
}

const ruleFor = (output: ReturnType<typeof convert>, id: string) => {
  const rule = output.definitions.effects.find((entry) => entry.effectId === id)
  if (!rule) throw new Error(`missing generated rule ${id}`)
  return rule as ContributionRule
}

const general = (baseValue: number) => ({
  baseValue,
  initialPercentage: [],
  initialFixed: [],
  finalPercentage: [],
  finalFixed: [],
})

const settleConverted = (
  output: ReturnType<typeof convert>,
  element: string,
  multiplier: number,
) => {
  const parsed = parseEffectRuleSet(output.definitions)
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues))
  // 本合成输入只包含菲欧妮实体；converter 仍会携带其他固定来源机制目录
  // 条目，其代理人不在此夹具中。结算时移除这些无关机制，只验证 M4 选项
  // 与共享目标本身。
  const catalog = {
    ...(output.catalog as unknown as StaticEffectCatalog),
    mechanisms: [],
  } as StaticEffectCatalog
  const input: StaticCatalogDamageInput = {
    definitions: parsed.value,
    catalog,
    bindings: [
      {
        bindingId: "binding:pheony",
        kind: "agent",
        holderId: "entity:pheony",
        sourceEntityId: "1641",
        eligible: true,
        configuration: { mindscapeRank: 4, coreSkillLevel: 7 },
      },
    ],
    actorSources: [{ entityId: "entity:pheony", agentEntityId: "1641" }],
    selections: [
      { optionId: optionId(element), bindingId: "binding:pheony", layers: 1 },
    ],
    world: {
      entities: [
        {
          kind: "actor",
          entityId: "entity:pheony",
          teamId: "team:players",
          generalStats: {
            attack: general(1000),
            anomalyProficiency: general(115),
            anomalyMastery: general(200),
          },
          directStats: {
            criticalRate: { baseValue: 0.28, additions: [] },
            criticalDamage: { baseValue: 1.2, additions: [] },
            penetrationRatio: { baseValue: 0.42, additions: [] },
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
    },
    hit: {
      actorId: "entity:pheony",
      targetId: "entity:enemy",
      actionId: "action:m4-subset",
      skillCategory: "uncategorized",
      element: element as StaticCatalogDamageInput["hit"]["element"],
      skillTargetIds: [targetId],
      skillTags: [],
      damageItems: [
        {
          mode: "direct",
          role: "base",
          itemId,
          stat: "attack",
          statSource: { entityId: "entity:pheony" },
          damageMultiplier: 0,
        },
      ],
    },
    damage: {
      kind: "anomaly-settlement",
      damageBonus: { settledMultiplier: 1 },
      anomalySource: { entityId: "entity:pheony", level: 60 },
      defense: {
        attackerLevel: 60,
        targetBaseDefense: 0,
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
      anomalyDamageBonus: [],
      refringe: { mode: "settled", multiplier: 1 },
      anomalyCriticalRate: 0,
      anomalyCriticalDamage: [],
      anomalySettlementCriticalRate: 0,
      anomalySettlementCriticalDamage: [],
    } as unknown as StaticCatalogDamageInput["damage"],
  }
  const result = calculateStaticDamageFromCatalog(input)
  expect(result.ok, `${element}: ${JSON.stringify(result)}`).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  expect(result.value.factors.nonCritical.baseDamage, element).toBeCloseTo(
    multiplier * 1000,
    6,
  )
}

describe("Pheony M4 six-element independent settlement conversion", () => {
  it("generates six converted independent-settlement options with stable identities", () => {
    const output = convert()
    expect(output.definitions.revision).toBe("59")
    expect(
      output.catalog.skillTargets.filter(
        (target) => target.targetId === targetId,
      ),
    ).toHaveLength(1)
    expect(
      output.catalog.skillTargets.find(
        (target) => target.targetId === targetId,
      ),
    ).toMatchObject({
      upstreamId: null,
      agentEntityId: "1641",
      category: "uncategorized",
    })
    for (const { element } of elements) {
      const option = optionFor(output, element)
      expect(option.variants, element).toHaveLength(1)
      const [variant] = option.variants
      expect(variant!.status, element).toBe("converted")
      expect(variant!.configuration, element).toEqual({ minimumMindscape: 4 })
      expect(variant!.maximumLayers, element).toBe(1)
      expect(variant!.effectIds, element).toEqual([
        effectId(element),
        critEffectId(element),
      ])
      expect(variant!.mechanism, element).toEqual({
        kind: "independent-settlement",
        isolateDamageItems: true,
        damageItemRequirements: [
          {
            itemId,
            stat: "attack",
            role: "base",
            allowedModes: ["direct"],
            source: "anomaly-source",
            requiredDirectMultiplier: 0,
            requiredSkillCategory: "uncategorized",
          },
        ],
      })
    }
  })

  it.each(elements)(
    "compiles the $element multiplier and same-target 40% crit rule",
    ({ element, multiplier }) => {
      const output = convert()
      const main = ruleFor(output, effectId(element))
      expect(main.operation).toMatchObject({
        kind: "hit-adjustment",
        field: "damageMultiplier",
        operator: "add",
        itemIds: [itemId],
        value: { kind: "literal", unit: "multiplier", value: multiplier },
      })
      expect(main.when).toEqual({
        kind: "all",
        conditions: [
          {
            kind: "one-of",
            fact: "hit.damageKind",
            values: ["anomaly-settlement"],
          },
          { kind: "one-of", fact: "hit.element", values: [element] },
          {
            kind: "one-of",
            fact: "hit.skillTag",
            values: [targetId],
          },
        ],
      })
      const crit = ruleFor(output, critEffectId(element))
      expect(crit.operation).toMatchObject({
        kind: "factor-contribution",
        channel: "anomaly-settlement-critical-damage",
        value: { kind: "literal", unit: "ratio", value: 0.4 },
      })
      expect(crit.when).toEqual(main.when)
    },
  )

  it("binds the 600% multiplier and the 40% crit damage to their own references", () => {
    const output = convert()
    const main = ruleFor(output, effectId("fire"))
    const crit = ruleFor(output, critEffectId("fire"))
    expect(main.source.references).toEqual([
      nanokaReference("zh", "/talent/4/desc"),
      nanokaReference("en", "/talent/4/desc"),
    ])
    expect(crit.source.references).toEqual([
      nanokaReference("zh", "/skill/basic/description/1/desc"),
      nanokaReference("en", "/skill/basic/description/1/desc"),
      nanokaReference("zh", "/skill/chain/description/2/desc"),
      nanokaReference("en", "/skill/chain/description/2/desc"),
      {
        sourceId: "zzz-hp",
        version: "991bb0ef2a00387f8a1fa18293bbda17256d7270",
        locale: "zh",
        resourcePath:
          "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
        pointer: "/agents/52/mindscapeBuffs/0/effectBlocks/0/effects/17",
      },
    ])
    for (const reference of crit.source.references)
      expect(
        reference.pointer,
        "40% must not cite the 600% talent clause",
      ).not.toBe("/talent/4/desc")
  })

  it("keeps the fixed-source permanent 40% record as a semantic-conflict entry", () => {
    const output = convert()
    const migration = output.catalog.options.find(
      (entry) =>
        entry.optionId ===
        "agents:pheony:mindscape:0:blk-mindscapeBuffs-0-1:eff-9",
    )
    expect(migration).toBeDefined()
    expect(migration!.variants[0]).toMatchObject({
      status: "unsupported",
      reason: "semantic-conflict",
      effectIds: [],
    })
    expect(
      output.definitions.effects.some((rule) =>
        rule.effectId.includes(":eff-9:"),
      ),
    ).toBe(false)
  })

  it("rejects a future fixed-source encoding at the M4 empty pack", () => {
    const agent = cloneAgent()
    agent.mindscapeBuffs![4] = {
      effectBlocks: [
        {
          id: "blk-future-m4",
          name: "影画4",
          effects: [
            {
              id: "eff-future",
              applyTarget: "self",
              elementFilter: "all",
              kind: "fixed",
              stat: "anomalyReleaseMult",
              value: 600,
            },
          ],
        },
      ],
      effects: [],
    }
    expect(() => convert(agent)).toThrow(/mindscape rank 4/)
  })

  it("keeps the other five element capabilities when one element is removed (ablation)", () => {
    const testSupplements = m4Supplements()
    expect(testSupplements).toHaveLength(6)
    for (const { element } of elements) {
      const removed = testSupplements.find(
        (supplement) =>
          "optionId" in supplement && supplement.optionId === optionId(element),
      )
      expect(removed, element).toBeDefined()
      const output = convert(
        cloneAgent(),
        testSupplements.filter((supplement) => supplement !== removed),
      )
      expect(
        output.catalog.options.some(
          (option) => option.optionId === optionId(element),
        ),
        element,
      ).toBe(false)
      expect(
        output.catalog.skillTargets.filter(
          (target) => target.targetId === targetId,
        ),
        element,
      ).toHaveLength(1)
      for (const other of elements)
        if (other.element !== element) {
          expect(
            output.catalog.options.some(
              (option) => option.optionId === optionId(other.element),
            ),
            `${element} -> ${other.element}`,
          ).toBe(true)
          settleConverted(output, other.element, other.multiplier)
        }
    }
  })

  it("rejects registration multipliers, option structure and evidence drift", () => {
    const base = PHEONY_M4_SUPPLEMENTS.find(
      (supplement) => supplement.optionId === optionId("physical"),
    )!
    const multiplierDrift = {
      ...base,
      rule: {
        ...base.rule,
        operation: {
          ...base.rule.operation,
          value: { kind: "literal", unit: "multiplier", value: 42.79 },
        },
      },
    } as unknown as Supplement
    expect(() => verifyPheonyM4Registrations([multiplierDrift])).toThrow(
      /Pheony M4 registration drift/,
    )

    const mechanism = base.variant.mechanism
    if (mechanism?.kind !== "independent-settlement")
      throw new Error("expected independent-settlement mechanism")
    const structureDrift = {
      ...base,
      variant: {
        ...base.variant,
        mechanism: {
          kind: "independent-settlement",
          damageItemRequirements: [
            {
              ...mechanism.damageItemRequirements[0]!,
              itemId: "pheony:m4-other",
            },
          ],
        },
      },
    } as unknown as Supplement
    expect(() => verifyPheonyM4Registrations([structureDrift])).toThrow(
      /Pheony M4 registration drift/,
    )
  })
})
