import { describe, expect, it } from "vitest"
import { convertSource } from "../scripts/static-effects/convert.ts"
import {
  d4BasePanels,
  d4EntityData,
  d4SkillInventory,
} from "../scripts/static-effects/d4-325.ts"
import {
  D4_PHEONY_M4_SUPPLEMENTS,
  D4_PHEONY_UNSUPPORTED_SUPPLEMENTS,
} from "../scripts/static-effects/d4-pheony.ts"
import type {
  SourceEntity,
  SourceNormalization,
  SourcePack,
} from "../scripts/static-effects/source.ts"

/**
 * D4-1b：菲欧妮影画 4 的六元素异放结算。M4 固定 600% 倍率按原异常系数
 * 归一为物理 42.78 / 火 3 / 冰 30 / 电 7.5 / 以太 3.75 / 风 75；该次异放
 * 暴击时额外暴伤 40% 只进入 anomaly-settlement 通道。测试使用已提交的
 * 冻结实体夹具与恒等归一化，真实 fac62407 归一化由生成入口和正式制品
 * 回归覆盖。
 */

const collect = (pack: SourcePack) => {
  const blocks = (pack.effectBlocks ?? []).flatMap((block) => block.effects)
  return blocks.length ? blocks : (pack.effects ?? [])
}
const normalize = (entity: SourceEntity): SourceEntity => ({
  ...entity,
  mindscapeBuffs: Array.from(
    { length: 7 },
    (_, index) => entity.mindscapeBuffs?.[index] ?? {},
  ),
  refinementBuffs: Array.from(
    { length: 5 },
    (_, index) => entity.refinementBuffs?.[index] ?? {},
  ),
})
const functions: SourceNormalization = {
  normalizeAgent: normalize,
  normalizeWengine: normalize,
  normalizeDriveDisc: normalize,
  collectEffectsFromPack: collect,
  applyAnomalyFlagsToPack: (pack) => pack,
}
const conversion = () =>
  convertSource(
    d4EntityData(["pheony"]),
    functions,
    [],
    [...D4_PHEONY_UNSUPPORTED_SUPPLEMENTS, ...D4_PHEONY_M4_SUPPLEMENTS],
    undefined,
    { supplemental: true },
  )

const elements = [
  ["physical", 42.78],
  ["fire", 3],
  ["ice", 30],
  ["electric", 7.5],
  ["ether", 3.75],
  ["wind", 75],
] as const

const option = (result: ReturnType<typeof conversion>, optionId: string) => {
  const found = result.catalog.options.find(
    (candidate) => candidate.optionId === optionId,
  )
  if (!found) throw new Error(`missing option ${optionId}`)
  return found
}

const rule = (result: ReturnType<typeof conversion>, effectId: string) => {
  const found = result.definitions.effects.find(
    (candidate) => candidate.effectId === effectId,
  )
  if (!found || found.kind !== "contribution")
    throw new Error(`missing contribution rule ${effectId}`)
  return found
}

describe("D4 Pheony M4 anomaly settlement", () => {
  it("registers six element options with the normalized 600% multipliers", () => {
    const result = conversion()
    for (const [element, multiplier] of elements) {
      const optionId = `nanoka:agents:1641:m4-anomaly-settlement-${element}`
      const entry = option(result, optionId)
      expect(entry.target).toBe("self")
      expect(entry.variants).toHaveLength(1)
      const variant = entry.variants[0]!
      expect(variant.status).toBe("converted")
      expect(variant.configuration).toEqual({ minimumMindscape: 4 })
      expect(variant.effectIds).toEqual([
        `agent:1641:nanoka:m4-anomaly-settlement-${element}:mindscape:4`,
        `agent:1641:nanoka:m4-anomaly-settlement-${element}:mindscape:4-crit-damage`,
      ])
      expect(variant.references).toEqual([
        expect.objectContaining({
          sourceId: "nanoka-raw",
          version: "3.3.12+19634983",
          locale: "zh",
          pointer: "/zh/character/1641/talent/4/desc",
        }),
        expect.objectContaining({
          sourceId: "nanoka-raw",
          version: "3.3.12+19634983",
          locale: "en",
          pointer: "/en/character/1641/talent/4/desc",
        }),
      ])
      expect(variant.damageItemRequirements).toEqual([
        {
          itemId: "pheony:m4-anomaly-settlement",
          stat: "attack",
          role: "base",
          allowedModes: ["direct"],
          source: "anomaly-source",
          requiredDirectMultiplier: 0,
          requiredSkillCategory: "uncategorized",
        },
      ])

      const settlement = rule(
        result,
        `agent:1641:nanoka:m4-anomaly-settlement-${element}:mindscape:4`,
      )
      expect(settlement.operation).toMatchObject({
        kind: "hit-adjustment",
        field: "damageMultiplier",
        operator: "add",
        itemIds: ["pheony:m4-anomaly-settlement"],
        value: { kind: "literal", unit: "multiplier", value: multiplier },
      })
      expect(settlement.when).toMatchObject({
        kind: "all",
        conditions: expect.arrayContaining([
          expect.objectContaining({
            fact: "hit.damageKind",
            values: ["anomaly-settlement"],
          }),
          expect.objectContaining({
            fact: "hit.element",
            values: [element],
          }),
          expect.objectContaining({
            fact: "hit.skillTag",
            values: ["zzz-hp:skill:pheony-m4-anomaly-settlement"],
          }),
        ]),
      })

      const crit = rule(
        result,
        `agent:1641:nanoka:m4-anomaly-settlement-${element}:mindscape:4-crit-damage`,
      )
      expect(crit.operation).toMatchObject({
        kind: "factor-contribution",
        channel: "anomaly-settlement-critical-damage",
        value: { kind: "literal", unit: "ratio", value: 0.4 },
      })
      expect(crit.when).toEqual(settlement.when)
    }
  })

  it("registers the independent target once and keeps the old 40% record unsupported", () => {
    const result = conversion()
    const targets = result.catalog.skillTargets.filter(
      (target) =>
        target.targetId === "zzz-hp:skill:pheony-m4-anomaly-settlement",
    )
    expect(targets).toEqual([
      expect.objectContaining({
        targetId: "zzz-hp:skill:pheony-m4-anomaly-settlement",
        agentEntityId: "1641",
        category: "uncategorized",
      }),
    ])
    const old = option(
      result,
      "agents:pheony:mindscape:0:blk-mindscapeBuffs-0-1:eff-9",
    )
    expect(old.variants[0]!.status).toBe("unsupported")
    expect(old.variants[0]!.reason).toBe("semantic-conflict")
  })

  it("keeps the M4 evidence reference and inventory on the supplemental layer", () => {
    const result = conversion()
    const physical = result.catalog.options.find(
      (candidate) =>
        candidate.optionId ===
        "nanoka:agents:1641:m4-anomaly-settlement-physical",
    )!
    expect(physical.variants[0]!.references[0]).toMatchObject({
      sourceId: "nanoka-raw",
      version: "3.3.12+19634983",
      resourcePath:
        "scripts/static-effects/evidence/nanoka-3312-pheony-m4.json",
    })
    expect(d4SkillInventory(["pheony"]).length).toBeGreaterThan(0)
    expect(d4BasePanels(["pheony"])).toHaveLength(1)
  })
})
