import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
  readdir,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import type { ContributionRule } from "@randomplay/shared"
import { generateStaticEffects } from "../scripts/generate-static-effects.ts"
import {
  convertSource,
  resolveCoreRankParameters,
  type RankEvidence,
} from "../scripts/static-effects/convert.ts"
import {
  developerRevisionEntries,
  verifyDeveloperRevisionExport,
  type DeveloperRevisionEntry,
} from "../scripts/static-effects/developer-revision.ts"
import evidence from "../scripts/static-effects/rank-evidence.json" with { type: "json" }
import { SOURCE_SEMANTICS } from "../scripts/static-effects/semantics.ts"
import type {
  SourceData,
  SourceEffect,
  SourceEntity,
  SourceNormalization,
  SourcePack,
} from "../scripts/static-effects/source.ts"

const collect = (pack: SourcePack) => {
  const blocks = pack.effectBlocks?.flatMap((b) => b.effects) ?? []
  return blocks.length ? blocks : (pack.effects ?? [])
}
const normalize = (e: SourceEntity): SourceEntity => ({
  ...e,
  mindscapeBuffs: Array.from(
    { length: 7 },
    (_, i) => e.mindscapeBuffs?.[i] ?? {},
  ),
  refinementBuffs: Array.from(
    { length: 5 },
    (_, i) => e.refinementBuffs?.[i] ?? {},
  ),
})
const functions: SourceNormalization = {
  normalizeAgent: normalize,
  normalizeWengine: normalize,
  normalizeDriveDisc: normalize,
  collectEffectsFromPack: collect,
  applyAnomalyFlagsToPack: (p: SourcePack) => p,
}
const effect = (id: string, value: number): SourceEffect => ({
  id,
  scope: "general",
  applyTarget: "self",
  kind: "fixed",
  stat: "critRate",
  value,
})
const data = (): SourceData => ({
  agents: [],
  driveDiscs: [],
  skillSubcategories: [],
  followUpSkillRules: [],
  wengines: [
    {
      id: "Identity_Base",
      name: "Test weapon",
      profession: "防护",
      refinementBuffs: Array.from({ length: 5 }, (_, i) => ({
        effectBlocks: [
          {
            id: "block",
            name: `Rank ${i + 1}`,
            effects: [
              effect("first", 10 + i * 5),
              effect("second", 20 + i * 10),
            ],
          },
        ],
      })),
    },
  ],
})

describe("static data conversion", () => {
  it("compiles four core-dependent records without widening their block or changing ids on reorder", () => {
    const source: SourceData = {
      ...data(),
      wengines: [],
      agents: [
        {
          id: "caesar",
          name: "凯撒",
          mindscapeBuffs: Array.from({ length: 7 }, (_, rank) => ({
            effectBlocks: [
              {
                id: "blk-legacy",
                name: rank === 0 ? "核心被动：坚韧之壁" : `影画${rank}`,
                effects:
                  rank === 0 || rank === 2
                    ? [
                        {
                          ...effect("legacy-team-atk", rank === 0 ? 1000 : 500),
                          stat: "atk",
                          applyTarget: "team",
                        },
                        ...(rank === 0
                          ? [
                              {
                                ...effect("unverified-same-block", 5),
                                stat: "atk",
                              },
                            ]
                          : []),
                      ]
                    : [],
              },
            ],
          })),
        },
        {
          id: "panyinhu",
          name: "潘引壶",
          mindscapeBuffs: Array.from({ length: 7 }, (_, rank) => ({
            effectBlocks: [
              {
                id: "blk-legacy",
                name: rank === 0 ? "核心被动：脉中乾坤" : `影画${rank}`,
                effects:
                  rank === 0 || rank === 6
                    ? [
                        {
                          ...effect("legacy-team-pierce", 0),
                          kind: "convert",
                          stat: "pierce",
                          applyTarget: "team",
                          convert: {
                            from: "atk",
                            panelSource: "manual",
                            ratioPercent: rank === 0 ? 18 : 6,
                            cap: rank === 0 ? 540 : 180,
                            defaultBase: 3000,
                          },
                        },
                      ]
                    : [],
              },
            ],
          })),
        },
      ],
    }
    const result = convertSource(source, functions, [], [])
    expect(result.definitions.revision).toBe("11")
    for (const option of result.catalog.options) {
      const variant = option.variants[0]!
      const sameBlock = option.optionId.endsWith("unverified-same-block")
      expect(variant.configuration.coreSkillLevels).toEqual(
        sameBlock ? [7] : [1, 2, 3, 4, 5, 6, 7],
      )
      expect(variant.status).toBe(sameBlock ? "converted" : "corrected")
      expect(variant.effectIds).toHaveLength(1)
    }
    const increment = result.definitions.effects.find(
      (rule) =>
        rule.effectId ===
        "agent:1421:zzz-hp:legacy-team-pierce:blk-legacy:mindscape:6",
    )!
    expect(increment).toMatchObject({
      kind: "contribution",
      operation: {
        kind: "stat-adjustment",
        stage: "final-fixed",
        value: { kind: "add" },
      },
    })
    expect(increment.parameters["rate"]).toMatchObject({
      kind: "by-rank",
      rank: "coreSkillLevel",
      values: { 1: 0.09, 6: 0.165, 7: 0.18 },
    })
    source.agents.reverse()
    source.agents[1]!.mindscapeBuffs![0]!.effectBlocks![0]!.effects.reverse()
    const reordered = convertSource(source, functions, [], [])
    expect(reordered.definitions.effects.map((rule) => rule.effectId)).toEqual(
      result.definitions.effects.map((rule) => rule.effectId),
    )
    expect(reordered.catalog.options.map((option) => option.optionId)).toEqual(
      result.catalog.options.map((option) => option.optionId),
    )
    expect(
      reordered.coverage.records.map((record) => record.pointer),
    ).not.toEqual(result.coverage.records.map((record) => record.pointer))
  })

  it("intersects required parameter rows, evidence rows and declared ranks while preserving confirmed zero", () => {
    const semantics =
      SOURCE_SEMANTICS[
        "agents/panyinhu/mindscape/6/blk-legacy/legacy-team-pierce"
      ]!
    if (semantics.kind !== "core-skill-level") throw new Error("fixture")
    const records: RankEvidence = structuredClone(evidence)
    const base = records[semantics.baseEvidenceKey]!
    delete base.parameters!["cap"]!.values!["2"]
    base.evidence = base.evidence.filter((ref) => ref.rank !== 3)
    records["panyinhu:blk-legacy:mindscape:6:legacy-team-pierce"]!.levels = [
      1, 2, 3, 5, 6, 7,
    ]
    base.parameters!["rate"]!.values!["1"] = 0
    const result = resolveCoreRankParameters(
      semantics,
      "sheer-force-points",
      records,
    )
    expect(result.levels).toEqual([1, 5, 6, 7])
    expect(result.parameters["rate"]).toMatchObject({ values: { 1: 0 } })
    for (const parameter of Object.values(result.parameters))
      if (parameter.kind === "by-rank")
        expect(Object.keys(parameter.values)).toEqual(["1", "5", "6", "7"])
  })

  it("rejects missing, nonfinite, out-of-domain and unit-conflicting core parameter evidence", () => {
    const semantics =
      SOURCE_SEMANTICS["agents/caesar/mindscape/0/blk-legacy/legacy-team-atk"]!
    if (semantics.kind !== "core-skill-level") throw new Error("fixture")
    const changes: ((records: RankEvidence) => void)[] = [
      (records) => {
        delete records[semantics.baseEvidenceKey]!.parameters!["amount"]
      },
      (records) => {
        records[semantics.baseEvidenceKey]!.parameters!["amount"]!.unit =
          "ratio"
      },
      (records) => {
        records[semantics.baseEvidenceKey]!.parameters!["amount"]!.values![
          "8"
        ] = 1
      },
      (records) => {
        records[semantics.baseEvidenceKey]!.parameters!["amount"]!.values![
          "2"
        ] = NaN
      },
      (records) => {
        records[semantics.baseEvidenceKey]!.levels = [1, 1]
      },
    ]
    for (const change of changes) {
      const records: RankEvidence = structuredClone(evidence)
      change(records)
      expect(() =>
        resolveCoreRankParameters(semantics, "attack-points", records),
      ).toThrow(/core parameter|Core parameter|core rank/)
    }
  })
  it("merges only structurally identical refinements and preserves stable ids across array reorder", () => {
    const original = convertSource(data(), functions, [], [])
    expect(original.definitions.effects).toHaveLength(2)
    const rule = original.definitions.effects[0]!
    expect(rule.parameters["amount"]).toMatchObject({
      kind: "by-rank",
      rank: "refinement",
      values: { 1: 0.1, 5: 0.3 },
    })
    const reordered = data()
    for (const p of reordered.wengines[0]!.refinementBuffs!)
      p.effectBlocks![0]!.effects.reverse()
    const second = convertSource(reordered, functions, [], [])
    expect(second.definitions.effects.map((e) => e.effectId)).toEqual(
      original.definitions.effects.map((e) => e.effectId),
    )
    expect(second.catalog.options.map((o) => o.optionId)).toEqual(
      original.catalog.options.map((o) => o.optionId),
    )
    expect(second.coverage.records.map((r) => r.pointer)).not.toEqual(
      original.coverage.records.map((r) => r.pointer),
    )
  })
  it("keeps structural refinement changes behind exact rank configuration", () => {
    const source = data()
    source.wengines[0]!.refinementBuffs![4]!.effectBlocks![0]!.effects[0]!.applyTarget =
      "team"
    const result = convertSource(source, functions, [], [])
    expect(result.definitions.effects).toHaveLength(6)
    expect(result.catalog.options[0]!.variants[4]!.target).toBe("team")
  })
  it("rejects duplicate local identities instead of overwriting a source position", () => {
    const source = data()
    source.wengines[0]!.refinementBuffs![0]!.effectBlocks![0]!.effects.push(
      effect("first", 99),
    )
    expect(() => convertSource(source, functions, [], [])).toThrow(
      "Duplicate source effect",
    )
  })
  it("retains empty packs in the coverage denominator", () => {
    const result = convertSource(data(), functions, [], [])
    expect(result.coverage.summary).toMatchObject({
      entities: 1,
      packs: 6,
      emptyPacks: 1,
      rawEffects: 10,
    })
  })
  it("rejects bad source bytes before creating candidate output", async () => {
    const root = await mkdtemp(join(tmpdir(), "fairy-static-invalid-"))
    try {
      await mkdir(join(root, "zzz-hp-backend/scripts/data"), {
        recursive: true,
      })
      await writeFile(
        join(root, "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json"),
        "{}",
      )
      await expect(
        generateStaticEffects(root, join(root, "candidate")),
      ).rejects.toThrow("checksum mismatch")
      expect(await readdir(root)).toEqual(["zzz-hp-backend"])
      await mkdir(join(root, "existing"))
      await writeFile(join(root, "existing/keep"), "user data")
      await expect(
        generateStaticEffects(root, join(root, "existing")),
      ).rejects.toThrow("already exists")
      expect(await readFile(join(root, "existing/keep"), "utf8")).toBe(
        "user data",
      )
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
  it("records the actual eleven normalization changes and explicit coverage outcomes", async () => {
    const report = JSON.parse(
      await readFile(
        new URL("../definitions/effects/static-coverage.json", import.meta.url),
        "utf8",
      ),
    )
    expect(report.summary).toMatchObject({
      entities: 187,
      rawEffects: 1290,
      packs: 1061,
      emptyPacks: 366,
    })
    const changed = report.records.filter(
      (r: { normalizationChanges: string[] }) => r.normalizationChanges.length,
    )
    expect(
      changed.filter((r: { normalizationChanges: string[] }) =>
        r.normalizationChanges.includes("skillTargets"),
      ),
    ).toHaveLength(9)
    expect(
      changed.filter((r: { normalizationChanges: string[] }) =>
        r.normalizationChanges.includes("appliesToAnomaly"),
      ),
    ).toHaveLength(2)
    expect(
      report.records.every(
        (r: { status: string; reason?: string; effectIds: string[] }) =>
          r.status === "unsupported" ? !!r.reason : r.effectIds.length > 0,
      ),
    ).toBe(true)
  })
})

/** 复刻固定来源壳中之灵精炼 pack 的形状：四条有效记录，R1 为 anomalyDmgBonus。 */
const angelEffect = (
  id: string,
  stat: string,
  value: number,
  appliesToAnomaly?: boolean,
): SourceEffect => ({
  id,
  scope: "general",
  applyTarget: "self",
  kind: "fixed",
  stat,
  value,
  elementFilter: "all",
  stackable: false,
  maxStacks: 1,
  ...(appliesToAnomaly === undefined ? {} : { appliesToAnomaly }),
})
const angelRefinementValues = {
  dmgBonus: [20, 23, 26, 29, 32],
  mastery: [90, 103, 117, 130, 144],
  special: [0, 11.5, 13, 14.5, 16],
  disorderDmgBonus: [10, 11.5, 13, 14.5, 16],
} as const
const angelData = (): SourceData => ({
  agents: [],
  driveDiscs: [],
  skillSubcategories: [],
  followUpSkillRules: [],
  wengines: [
    {
      id: "Angel_In_The_Shell",
      name: "壳中之灵",
      refinementBuffs: [1, 2, 3, 4, 5].map((rank) => ({
        effectBlocks: [
          {
            id: "blk-legacy",
            name: `精${rank}`,
            note: "",
            effects: [
              angelEffect(
                "legacy-self-dmgBonus",
                "dmgBonus",
                angelRefinementValues.dmgBonus[rank - 1]!,
                true,
              ),
              angelEffect(
                "legacy-self-mastery",
                "mastery",
                angelRefinementValues.mastery[rank - 1]!,
                true,
              ),
              rank === 1
                ? angelEffect(
                    "legacy-self-anomalyDmgBonus",
                    "anomalyDmgBonus",
                    10,
                    true,
                  )
                : angelEffect(
                    "legacy-self-special",
                    "special",
                    angelRefinementValues.special[rank - 1]!,
                  ),
              angelEffect(
                "legacy-self-disorderDmgBonus",
                "disorderDmgBonus",
                angelRefinementValues.disorderDmgBonus[rank - 1]!,
                true,
              ),
            ],
          },
        ],
      })),
    },
  ],
})

describe("developer stat revision", () => {
  it("maps the four registered records through the anomaly bonus channel", () => {
    const result = convertSource(angelData(), functions, [], [])
    expect(result.definitions.revision).toBe("11")
    const option = result.catalog.options.find(
      (o) =>
        o.optionId ===
        "w-engines:Angel_In_The_Shell:refinement:blk-legacy:legacy-self-special",
    )!
    expect(option.name).toBe("精2 · anomalyDmgBonus")
    expect(option.variants.map((v) => v.configuration.refinements)).toEqual([
      [2],
      [3],
      [4],
      [5],
    ])
    const mergedEffectId =
      "w-engine:14150:zzz-hp:legacy-self-special:blk-legacy:refinement"
    for (const [index, variant] of option.variants.entries()) {
      expect(variant.status).toBe("corrected")
      expect(variant.differences).toContain(
        "angel-in-the-shell-anomaly-stat-revision",
      )
      expect(variant.effectIds).toEqual([mergedEffectId])
      // 固定源原值与 Pointer 保留追溯；修订证据独立成来源。
      expect(variant.references[0]).toMatchObject({
        sourceId: "zzz-hp",
        pointer: `/wengines/0/refinementBuffs/${index + 1}/effectBlocks/0/effects/2`,
      })
      expect(
        variant.references.find(
          (r) => r.sourceId === "zzz-hp-developer-revision",
        ),
      ).toMatchObject({
        version: "2026-10-05T13:34:25.341Z",
        resourcePath:
          "raw/zzz-hp/developer-revisions/zzz-hp-wengines-picked-1-2026-10-05.json",
        pointer: `/wengines/0/refinementBuffs/${index + 1}/effectBlocks/0/effects/2`,
      })
    }
    const merged = result.definitions.effects.find(
      (effect): effect is ContributionRule =>
        effect.kind === "contribution" && effect.effectId === mergedEffectId,
    )!
    expect(merged.parameters["amount"]).toMatchObject({
      kind: "by-rank",
      rank: "refinement",
      values: { 2: 0.115, 3: 0.13, 4: 0.145, 5: 0.16 },
    })
    expect(merged.operation).toMatchObject({
      kind: "factor-contribution",
      channel: "anomaly-damage-bonus",
    })
    // 跨精炼异常标记等价：修正后的条件与 R1（appliesToAnomaly=true）一致。
    const refinementOne = result.definitions.effects.find(
      (effect): effect is ContributionRule =>
        effect.kind === "contribution" &&
        effect.effectId ===
          "w-engine:14150:zzz-hp:legacy-self-anomalyDmgBonus:blk-legacy:refinement:1",
    )!
    expect(merged.when).toEqual(refinementOne.when)
    // 覆盖报告保留原始 stat 与原值；伴随选项不受影响。
    const revisedCoverage = result.coverage.records.filter(
      (r) => r.stat === "special",
    )
    expect(revisedCoverage.map((r) => r.rawValue)).toEqual([11.5, 13, 14.5, 16])
    expect(revisedCoverage.every((r) => r.status === "corrected")).toBe(true)
    expect(
      result.coverage.records
        .filter((r) => r.stat !== "special")
        .every((r) => r.status === "converted"),
    ).toBe(true)
    expect(result.coverage.summary).toMatchObject({
      rawEffects: 20,
      converted: 16,
      corrected: 4,
      unsupported: 0,
    })
  })
  it("rejects stale registrations and leaves unregistered special records unsupported", () => {
    const valueChanged = angelData()
    valueChanged.wengines[0]!.refinementBuffs![2]!.effectBlocks![0]!.effects[2]!.value = 99
    expect(() => convertSource(valueChanged, functions, [], [])).toThrow(
      /Developer revision value mismatch/,
    )
    const alreadyRevised = angelData()
    alreadyRevised.wengines[0]!.refinementBuffs![2]!.effectBlocks![0]!.effects[2]!.stat =
      "anomalyDmgBonus"
    expect(() => convertSource(alreadyRevised, functions, [], [])).toThrow(
      /Developer revision expects stat special/,
    )
    // 未登记的其他来源 special 记录不因本修正被映射，仍按通用拒绝登记。
    const unrelated = data()
    unrelated.wengines[0]!.refinementBuffs![0]!.effectBlocks![0]!.effects[0]!.stat =
      "special"
    const result = convertSource(unrelated, functions, [], [])
    expect(result.coverage.records.filter((r) => r.stat === "special")).toEqual(
      [
        expect.objectContaining({
          status: "unsupported",
          reason: "formula-out-of-scope",
          effectIds: [],
        }),
      ],
    )
  })
  it("registers exactly the four frozen export pointers with digest metadata", () => {
    const entries = developerRevisionEntries(SOURCE_SEMANTICS)
    expect(entries.map((entry) => entry.key).toSorted()).toEqual(
      [2, 3, 4, 5]
        .map(
          (rank) =>
            `w-engines/Angel_In_The_Shell/refinement/${rank}/blk-legacy/legacy-self-special`,
        )
        .toSorted(),
    )
    for (const entry of entries) {
      const rank = Number(entry.key.split("/")[3])
      expect(entry).toMatchObject({
        category: "w-engines",
        entityId: "Angel_In_The_Shell",
        effectId: "legacy-self-special",
        originalStat: "special",
        revisedStat: "anomalyDmgBonus",
        revisedValue: angelRefinementValues.special[rank - 1]!,
        pointer: `/wengines/0/refinementBuffs/${rank - 1}/effectBlocks/0/effects/2`,
      })
      const semantics = SOURCE_SEMANTICS[entry.key]!
      if (semantics.kind !== "developer-revised-stat")
        throw new Error("fixture")
      expect(semantics.evidence[0]).toMatchObject({
        path: "raw/zzz-hp/developer-revisions/zzz-hp-wengines-picked-1-2026-10-05.json",
        sha256:
          "37bd836a70ec91e095133dc7de70599f6aa0bce073f090f3f5fc00da7d70345c",
        exportedAt: "2026-10-05T13:34:25.341Z",
      })
    }
  })
  const syntheticRevisionPair = () => {
    const pack = (revised: boolean, value: number) => {
      const effects = [
        {
          id: "legacy-self-dmgBonus",
          scope: "general",
          applyTarget: "self",
          kind: "fixed",
          stat: "dmgBonus",
          value: 20 + value / 10,
        },
        {
          id: "legacy-self-special",
          scope: "general",
          applyTarget: "self",
          kind: "fixed",
          stat: revised ? "anomalyDmgBonus" : "special",
          value,
        },
      ]
      return {
        effectBlocks: [
          {
            id: "blk-legacy",
            name: "精",
            note: "",
            effects: structuredClone(effects),
          },
        ],
        effects: structuredClone(effects),
        selfMods: revised
          ? { special: 0, anomalyDmgBonus: value }
          : { special: value, anomalyDmgBonus: 0 },
      }
    }
    const values = [0, 11.5, 13, 14.5, 16]
    const fixed = {
      id: "Angel_In_The_Shell",
      refinementBuffs: values.map((value) => pack(false, value)),
    }
    const exported = {
      id: "Angel_In_The_Shell",
      refinementBuffs: values.map((value) => pack(value > 0, value)),
    }
    const entries = [2, 3, 4, 5].map(
      (rank): DeveloperRevisionEntry => ({
        key: `w-engines/Angel_In_The_Shell/refinement/${rank}/blk-legacy/legacy-self-special`,
        category: "w-engines",
        entityId: "Angel_In_The_Shell",
        effectId: "legacy-self-special",
        originalStat: "special",
        revisedStat: "anomalyDmgBonus",
        revisedValue: values[rank - 1]!,
        pointer: `/wengines/0/refinementBuffs/${rank - 1}/effectBlocks/0/effects/1`,
      }),
    )
    return { fixed, exported, entries, extraEntities: [] as unknown[] }
  }
  it("accepts a frozen export that differs only in the registered revisions", () => {
    const { fixed, exported, entries } = syntheticRevisionPair()
    expect(() =>
      verifyDeveloperRevisionExport([fixed], { wengines: [exported] }, entries),
    ).not.toThrow()
  })
  it("rejects unregistered differences and invalid pointer targets", () => {
    const mutations: ((
      pair: ReturnType<typeof syntheticRevisionPair>,
    ) => void)[] = [
      // 未登记差异：导出还改了 dmgBonus 数值。
      (pair) => {
        pair.exported.refinementBuffs[1]!.effectBlocks[0]!.effects[0]!.value = 99
      },
      // 登记差异未逐字出现：扁平 effects 表示未同步改名。
      (pair) => {
        pair.exported.refinementBuffs[4]!.effects[1]!.stat = "special"
      },
      // 指针目标字段未修订。
      (pair) => {
        pair.exported.refinementBuffs[2]!.effectBlocks[0]!.effects[1]!.stat =
          "special"
      },
      // 指针目标数值与登记不符。
      (pair) => {
        pair.exported.refinementBuffs[2]!.effectBlocks[0]!.effects[1]!.value = 15
      },
      // 附件不得自带原始异常标记（继承是上游归并行为）。
      (pair) => {
        ;(
          pair.exported.refinementBuffs[2]!.effectBlocks[0]!
            .effects[1] as unknown as Record<string, unknown>
        ).appliesToAnomaly = true
      },
      // 同名实体必须唯一。
      (pair) => {
        pair.extraEntities.push(structuredClone(pair.exported))
      },
    ]
    for (const mutation of mutations) {
      const pair = syntheticRevisionPair()
      mutation(pair)
      expect(
        () =>
          verifyDeveloperRevisionExport(
            [pair.fixed],
            { wengines: [pair.exported, ...pair.extraEntities] },
            pair.entries,
          ),
        "mutation should be rejected",
      ).toThrow(/Developer revision|未登记差异|登记差异未逐字出现|exactly one/)
    }
  })
})
