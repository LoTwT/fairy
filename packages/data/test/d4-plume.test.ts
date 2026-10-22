import { describe, expect, it } from "vitest"
import { convertSource } from "../scripts/static-effects/convert.ts"
import {
  D4_325_SOURCE,
  d4BasePanels,
  d4EntityData,
} from "../scripts/static-effects/d4-325.ts"
import { mergeSupplementalSource } from "../scripts/static-effects/d4-merge.ts"
import type {
  SourceData,
  SourceEntity,
  SourceNormalization,
  SourcePack,
} from "../scripts/static-effects/source.ts"

/**
 * D4-2：涅槃初翎（14164）五档精炼。固定 3.2.5 块的两条记录分别编译为
 * 常驻异常精通与条件火伤；条件火伤由调用方选中选项声明触发状态。
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
const emptySource: SourceData = {
  agents: [],
  wengines: [],
  driveDiscs: [],
  skillSubcategories: [],
  followUpSkillRules: [],
}

const conversion = () =>
  convertSource(
    d4EntityData(["Plume_of_Rebirth"]),
    functions,
    [],
    [],
    undefined,
    {
      supplemental: true,
    },
  )

const optionFor = (result: ReturnType<typeof conversion>, fragment: string) => {
  const found = result.catalog.options.find((candidate) =>
    candidate.variants.some((variant) =>
      variant.effectIds.some((effectId) => effectId.includes(fragment)),
    ),
  )
  if (!found) throw new Error(`missing option ${fragment}`)
  return found
}

const ruleFor = (result: ReturnType<typeof conversion>, fragment: string) => {
  const found = result.definitions.effects.find((candidate) =>
    candidate.effectId.includes(fragment),
  )
  if (!found || found.kind !== "contribution")
    throw new Error(`missing rule ${fragment}`)
  return found
}

const tiers = [
  { rank: 1, mastery: 90, fire: 0.4, even: "eff-0", odd: "eff-1" },
  { rank: 2, mastery: 99, fire: 0.44, even: "eff-2", odd: "eff-3" },
  { rank: 3, mastery: 108, fire: 0.48, even: "eff-4", odd: "eff-5" },
  { rank: 4, mastery: 117, fire: 0.52, even: "eff-6", odd: "eff-7" },
  { rank: 5, mastery: 126, fire: 0.56, even: "eff-8", odd: "eff-9" },
] as const

describe("D4 Plume of Rebirth refinement passive", () => {
  it("compiles five mastery and five fire-damage options", () => {
    const result = conversion()
    const plumeOptions = result.catalog.options.filter(
      (candidate) => candidate.catalogEntityId === "w-engines:Plume_of_Rebirth",
    )
    expect(plumeOptions).toHaveLength(10)
    for (const tier of tiers) {
      const mastery = optionFor(result, `${tier.even}:`)
      expect(mastery.variants).toHaveLength(1)
      expect(mastery.variants[0]!.configuration).toEqual({
        refinements: [tier.rank],
      })
      const masteryRule = ruleFor(result, `${tier.even}:`)
      expect(masteryRule.operation).toMatchObject({
        kind: "stat-adjustment",
        stat: "anomalyProficiency",
        stage: "final-fixed",
      })
      expect(
        (masteryRule as unknown as { parameters: { amount: unknown } })
          .parameters.amount,
      ).toMatchObject({
        kind: "constant",
        unit: "anomaly-proficiency-points",
        value: tier.mastery,
      })

      const fire = optionFor(result, `${tier.odd}:`)
      expect(fire.variants[0]!.configuration).toEqual({
        refinements: [tier.rank],
      })
      const fireRule = ruleFor(result, `${tier.odd}:`)
      expect(fireRule.when).toEqual({
        kind: "all",
        conditions: [{ kind: "one-of", fact: "hit.element", values: ["fire"] }],
      })
      expect(fireRule.operation).toMatchObject({
        kind: "factor-contribution",
        channel: "damage-bonus",
      })
      expect(
        (fireRule as unknown as { parameters: { amount: unknown } }).parameters
          .amount,
      ).toMatchObject({
        kind: "constant",
        unit: "ratio",
        value: tier.fire,
      })
    }
  })

  it("keeps the supplemental entity provenance and base panel inventory", () => {
    const main = convertSource(emptySource, functions, [], [])
    const supplemental = conversion()
    const merged = mergeSupplementalSource(
      main,
      supplemental,
      D4_325_SOURCE,
      { skills: [], basePanels: d4BasePanels(["Plume_of_Rebirth"]), gaps: [] },
      "test",
    )
    const plume = merged.catalog.entities.find(
      (entity) => entity.catalogEntityId === "w-engines:Plume_of_Rebirth",
    )
    expect(plume?.supplementProvenance).toEqual({
      sourceId: "zzz-hp",
      version: D4_325_SOURCE.commit,
      resources: [
        {
          path: D4_325_SOURCE.resourcePath,
          sha256: D4_325_SOURCE.sha256,
        },
      ],
    })
    expect(d4BasePanels(["Plume_of_Rebirth"])).toEqual([
      {
        catalogEntityId: "w-engines:Plume_of_Rebirth",
        identity: "w-engine/14164",
        values: {
          baseAtk: 713,
          baseDef: 0,
          advancedStats: expect.objectContaining({
            anomalyControlPercent: 30,
          }),
        },
      },
    ])
  })
})
