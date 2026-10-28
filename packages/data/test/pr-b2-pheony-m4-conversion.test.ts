import { describe, expect, it } from "vitest"
import type { ContributionRule } from "@randomplay/shared"
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

describe("Pheony M4 six-element independent settlement conversion", () => {
  it("generates six converted independent-settlement options with stable identities", () => {
    const output = convert()
    expect(output.definitions.revision).toBe("58")
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
      for (const other of elements)
        if (other.element !== element)
          expect(
            output.catalog.options.some(
              (option) => option.optionId === optionId(other.element),
            ),
            `${element} -> ${other.element}`,
          ).toBe(true)
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
