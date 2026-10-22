import { describe, expect, it } from "vitest"
import { convertSource } from "../scripts/static-effects/convert.ts"
import {
  D4_325_BASE_COMMIT,
  D4_325_SOURCE,
  assertD4OverlayBase,
  d4BasePanels,
  d4EntityData,
  d4SkillInventory,
} from "../scripts/static-effects/d4-325.ts"
import { mergeSupplementalSource } from "../scripts/static-effects/d4-merge.ts"
import { D4_PHEONY_UNSUPPORTED_SUPPLEMENTS } from "../scripts/static-effects/d4-pheony.ts"
import type {
  SourceData,
  SourceEntity,
  SourceNormalization,
  SourcePack,
} from "../scripts/static-effects/source.ts"

/**
 * D4-1a：菲欧妮固定 3.2.5 记录经补充来源层接入，[灼蚀]核心/M1/M2 分别
 * 登记为按影画门槛独立的完整状态选项；额外能力同队 15%、M4 40%、M2 灼烧
 * 时长与资源/动作条款逐条登记为 unsupported。测试使用已提交的冻结实体夹具
 * 与恒等归一化，真实 fac62407 归一化下的 stat 降级由生成入口和正式制品回归
 * 覆盖。
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
    d4EntityData(["pheony"]),
    functions,
    [],
    D4_PHEONY_UNSUPPORTED_SUPPLEMENTS,
    undefined,
    { supplemental: true },
  )

const option = (result: ReturnType<typeof conversion>, optionId: string) => {
  const found = result.catalog.options.find(
    (candidate) => candidate.optionId === optionId,
  )
  if (!found) throw new Error(`missing option ${optionId}`)
  return found
}

const rule = (result: ReturnType<typeof conversion>, fragment: string) => {
  const found = result.definitions.effects.find((candidate) =>
    candidate.effectId.includes(fragment),
  )
  if (!found || found.kind !== "contribution")
    throw new Error(`missing contribution rule ${fragment}`)
  return found
}

const unsupportedOldOptions = [
  "eff-1",
  "eff-2",
  "eff-3",
  "eff-6",
  "eff-7",
  "eff-8",
  "eff-13",
  "eff-14",
  "eff-15",
  "eff-16",
  "eff-17",
  "eff-18",
].map(
  (effectId) => `agents:pheony:mindscape:0:blk-mindscapeBuffs-0-1:${effectId}`,
)

describe("D4 Pheony abrasion complete state", () => {
  it("builds mutually exclusive cumulative complete-state tiers", () => {
    const result = conversion()
    const expected = [
      ["agents:pheony:mindscape:0:abrasion-core-state", 0, 12],
      ["agents:pheony:mindscape:1:abrasion-mindscape-1-state", 1, 16],
      ["agents:pheony:mindscape:2:abrasion-mindscape-2-state", 2, 17],
    ] as const
    for (const [optionId, rank, count] of expected) {
      const abrasion = option(result, optionId)
      expect(abrasion.target).toBe("team")
      expect(abrasion.exclusiveGroup).toBe("pheony:abrasion-complete-state")
      expect(abrasion.variants).toHaveLength(1)
      expect(abrasion.variants[0]!.configuration).toEqual({
        minimumMindscape: rank,
      })
      expect(abrasion.variants[0]!.status).toBe("corrected")
      expect(abrasion.variants[0]!.effectIds).toHaveLength(count)
      expect(
        new Set(abrasion.variants[0]!.effectIds.map((id) => id.split(":")[1])),
      ).toEqual(new Set(["1641"]))
    }

    for (const optionId of [
      ...unsupportedOldOptions,
      "agents:pheony:mindscape:1:blk-mindscapeBuffs-1-1:eff-5",
      "agents:pheony:mindscape:1:blk-mindscapeBuffs-1-1:eff-19",
      "agents:pheony:mindscape:1:blk-mindscapeBuffs-1-1:eff-20",
      "agents:pheony:mindscape:1:blk-mindscapeBuffs-1-1:eff-21",
      "agents:pheony:mindscape:2:blk-mindscapeBuffs-2-1:eff-6",
    ]) {
      const migrated = option(result, optionId)
      expect(migrated.variants).toHaveLength(1)
      expect(migrated.variants[0]!.status).toBe("unsupported")
      expect(migrated.variants[0]!.reason).toBe("semantic-conflict")
      expect(migrated.variants[0]!.effectIds).toEqual([])
    }
  })

  it("keeps mastery 85 and M6 independent and unconditional", () => {
    const result = conversion()
    const mastery = option(
      result,
      "agents:pheony:mindscape:0:blk-mindscapeBuffs-0-1:eff-0",
    )
    expect(mastery.variants[0]!.status).toBe("converted")
    expect(mastery.variants[0]!.effectIds).toHaveLength(1)

    for (const effectId of ["eff-7", "eff-8"]) {
      const m6 = option(
        result,
        `agents:pheony:mindscape:6:blk-mindscapeBuffs-6-1:${effectId}`,
      )
      expect(m6.variants[0]!.status).toBe("converted")
      expect(m6.variants[0]!.configuration).toEqual({ minimumMindscape: 6 })
    }
    expect(
      rule(result, "eff-7:blk-mindscapeBuffs-6-1").operation,
    ).toMatchObject({
      kind: "factor-contribution",
      channel: "attacker-resistance-ignore",
    })
    expect(
      rule(result, "eff-8:blk-mindscapeBuffs-6-1").operation,
    ).toMatchObject({
      kind: "factor-contribution",
      channel: "target-defense-adjustment",
    })
  })

  it("keeps the four anomaly channels and their rank gates", () => {
    const result = conversion()
    const expectRule = (
      fragment: string,
      config: number | undefined,
      beneficiary: "holder" | "team",
      channel: string,
    ) => {
      const value = rule(result, fragment)
      expect(value.beneficiary).toEqual({ kind: beneficiary })
      if (config === undefined) {
        expect(value.config).toEqual({ kind: "constant", value: true })
      } else {
        expect(value.config).toMatchObject({
          kind: "compare-number",
          left: { field: "mindscapeRank" },
          right: { value: config },
        })
      }
      expect(value.operation).toMatchObject({
        kind: "factor-contribution",
        channel,
      })
    }
    expectRule(
      "eff-1:blk-mindscapeBuffs-0-1",
      0,
      "team",
      "anomaly-critical-rate",
    )
    expectRule(
      "eff-2:blk-mindscapeBuffs-0-1",
      0,
      "team",
      "anomaly-critical-damage",
    )
    expectRule(
      "eff-6:blk-mindscapeBuffs-0-1",
      0,
      "team",
      "anomaly-settlement-critical-damage",
    )
    expectRule(
      "eff-7:blk-mindscapeBuffs-0-1",
      0,
      "team",
      "turbulence-critical-damage",
    )
    expectRule(
      "eff-8:blk-mindscapeBuffs-0-1",
      0,
      "team",
      "luminize-critical-damage",
    )
    expectRule(
      "eff-13:blk-mindscapeBuffs-0-1",
      0,
      "team",
      "anomaly-settlement-critical-rate",
    )
    expectRule(
      "eff-14:blk-mindscapeBuffs-0-1",
      0,
      "team",
      "turbulence-critical-rate",
    )
    expectRule(
      "eff-15:blk-mindscapeBuffs-0-1",
      0,
      "team",
      "luminize-critical-rate",
    )
    expectRule(
      "eff-5:blk-mindscapeBuffs-1-1",
      1,
      "team",
      "anomaly-critical-damage",
    )
    expectRule(
      "eff-19:blk-mindscapeBuffs-1-1",
      1,
      "team",
      "anomaly-settlement-critical-damage",
    )
    expectRule(
      "eff-20:blk-mindscapeBuffs-1-1",
      1,
      "team",
      "turbulence-critical-damage",
    )
    expectRule(
      "eff-21:blk-mindscapeBuffs-1-1",
      1,
      "team",
      "luminize-critical-damage",
    )
    expectRule("eff-6:blk-mindscapeBuffs-2-1", 2, "holder", "damage-bonus")
  })

  it("registers every unsupported clause with an explicit destination", () => {
    const result = conversion()
    for (const effectId of ["eff-4", "eff-9", "eff-10", "eff-11", "eff-12"]) {
      const record = option(
        result,
        `agents:pheony:mindscape:0:blk-mindscapeBuffs-0-1:${effectId}`,
      )
      expect(record.variants[0]!.status).toBe("unsupported")
      expect(record.variants[0]!.reason).toBe("semantic-conflict")
    }
    const burn = option(
      result,
      "agents:pheony:mindscape:2:blk-mindscapeBuffs-2-1:eff-mvdz21so-s2au9j",
    )
    expect(burn.variants[0]!.status).toBe("unsupported")
    expect(burn.variants[0]!.reason).toBe("semantic-conflict")

    for (const slug of [
      "rising-change",
      "flame-resource",
      "withering-state",
      "rebirth",
      "abrasion-periodic-fire",
      "skill-replacement",
      "burn-attack-interrupt",
    ]) {
      const gap = option(result, `nanoka:agents:1641:${slug}`)
      expect(gap.variants[0]!.status).toBe("unsupported")
      expect(gap.variants[0]!.reason).toBe("formula-out-of-scope")
      expect(gap.variants[0]!.effectIds).toEqual([])
    }

    // 缺口不能以零值或近似通道冒充：没有对应的可执行规则。
    for (const fragment of [
      "eff-4:blk-mindscapeBuffs-0-1",
      "eff-9:blk-mindscapeBuffs-0-1",
      "eff-10:blk-mindscapeBuffs-0-1",
      "eff-11:blk-mindscapeBuffs-0-1",
      "eff-12:blk-mindscapeBuffs-0-1",
      "eff-mvdz21so-s2au9j",
    ])
      expect(
        result.definitions.effects.some((candidate) =>
          candidate.effectId.includes(fragment),
        ),
      ).toBe(false)
  })

  it("merges the supplemental source with explicit provenance", () => {
    const main = convertSource(emptySource, functions, [], [])
    const supplemental = conversion()
    const merged = mergeSupplementalSource(
      main,
      supplemental,
      D4_325_SOURCE,
      {
        skills: d4SkillInventory(["pheony"]),
        basePanels: d4BasePanels(["pheony"]),
        gaps: [],
      },
      "test",
    )
    const pheony = merged.catalog.entities.find(
      (entity) => entity.catalogEntityId === "agents:pheony",
    )
    expect(pheony?.supplementProvenance).toEqual({
      sourceId: "zzz-hp",
      version: D4_325_SOURCE.commit,
      resources: [
        {
          path: D4_325_SOURCE.resourcePath,
          sha256: D4_325_SOURCE.sha256,
        },
      ],
    })
    const abrasion = merged.catalog.options.find(
      (candidate) =>
        candidate.optionId === "agents:pheony:mindscape:0:abrasion-core-state",
    )!
    expect(
      new Set(
        abrasion.variants[0]!.references.map((reference) => reference.version),
      ),
    ).toEqual(new Set([D4_325_SOURCE.commit]))
    expect(
      (
        merged.coverage.summary as unknown as {
          supplementalSource: unknown
        }
      ).supplementalSource,
    ).toMatchObject({
      entities: 1,
      rules: 20,
      options: 36,
    })
    expect(merged.coverage.summary.rules).toBe(20)
    expect(merged.coverage.summary.options).toBe(36)
    expect(
      merged.coverage.supplementalSource.consumptionBoundary,
    ).toMatchObject({ status: "catalog-only-until-d5" })
  })

  it("guards the D5 rebaseline and lists the overlay removal set", () => {
    expect(() =>
      assertD4OverlayBase(D4_325_BASE_COMMIT, ["agents:anby"]),
    ).not.toThrow()
    for (const [commit, entityIds] of [
      ["2628b32cece086e371bafa05518a9a12650d9f74", ["agents:anby"]],
      [D4_325_BASE_COMMIT, ["agents:pheony"]],
    ] as const) {
      expect(() => assertD4OverlayBase(commit, entityIds)).toThrow(
        /d4-325\.ts.*d4-merge\.ts.*d4-pheony\.ts.*d4-severian\.ts/,
      )
    }
  })

  it("rejects supplemental states and actions instead of dropping them", () => {
    const main = convertSource(emptySource, functions, [], [])
    const supplemental = conversion()
    expect(() =>
      mergeSupplementalSource(
        main,
        {
          ...supplemental,
          definitions: {
            ...supplemental.definitions,
            states: [{} as never],
          },
        },
        D4_325_SOURCE,
        { skills: [], basePanels: [], gaps: [] },
        "test",
      ),
    ).toThrow(/states\/actions/)
  })
})
