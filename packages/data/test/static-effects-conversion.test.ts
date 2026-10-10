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
import {
  SUPPLEMENTS,
  type Supplement,
} from "../scripts/static-effects/supplements.ts"
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
    expect(result.definitions.revision).toBe("17")
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
    expect(result.definitions.revision).toBe("17")
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

/** 合成蕾米埃尔影画 2 块：仅含被修正的忽防记录。 */
const remielData = (): SourceData => ({
  agents: [
    {
      id: "remiel",
      name: "蕾米埃尔",
      profession: "异常",
      mindscapeBuffs: Array.from({ length: 7 }, (_, rank) =>
        rank === 2
          ? {
              effectBlocks: [
                {
                  id: "blk-ms7tkhei-q0ipfu",
                  name: "影画2",
                  note: "队伍中[异常]角色对[幻色]效果下的敌人造成属性异常伤害时，无视目标15%的防御力。",
                  effects: [
                    {
                      id: "eff-ms7tlurw-vhelyf",
                      scope: "general",
                      applyTarget: "team",
                      applySituation: "global",
                      elementFilter: "all",
                      kind: "fixed",
                      stat: "reduceDefense",
                      value: 15,
                      appliesToAnomaly: true,
                    },
                  ],
                },
              ],
            }
          : {},
      ),
    },
  ],
  driveDiscs: [],
  skillSubcategories: [],
  followUpSkillRules: [],
  wengines: [],
})

describe("remielle mindscape 2 attribute anomaly scope revision", () => {
  it("adds the [异常] profession and attribute anomaly damage scope from the reviewed text", () => {
    const result = convertSource(remielData(), functions, [], [])
    expect(result.definitions.revision).toBe("17")
    const option = result.catalog.options.find((o) =>
      o.optionId.includes("eff-ms7tlurw-vhelyf"),
    )!
    const variant = option.variants[0]!
    expect(variant.status).toBe("corrected")
    expect(variant.differences).toEqual([
      "remielle-mindscape2-attribute-anomaly-scope",
    ])
    expect(variant.applicability).toEqual({ beneficiaryProfession: "异常" })
    const rule = result.definitions.effects.find(
      (entry): entry is ContributionRule =>
        entry.kind === "contribution" &&
        entry.effectId.includes("eff-ms7tlurw-vhelyf"),
    )!
    expect(rule.when).toMatchObject({
      kind: "all",
      conditions: [
        { kind: "all", conditions: [] },
        {
          kind: "one-of",
          fact: "hit.damageKind",
          values: [
            "anomaly",
            "anomaly-settlement",
            "vortex",
            "luminize",
            "disorder",
          ],
        },
      ],
    })
    const coverage = result.coverage.records.find((record) =>
      record.pointer.endsWith("/effects/0"),
    )!
    expect(coverage.status).toBe("corrected")
    expect(result.coverage.summary).toMatchObject({
      converted: 0,
      corrected: 1,
      unsupported: 0,
    })
    expect(
      result.catalog.differences.some(
        (d) => d.differenceId === "remielle-mindscape2-attribute-anomaly-scope",
      ),
    ).toBe(true)
  })
  it("rejects a source that already encodes the profession or narrows the target", () => {
    const encoded = remielData()
    encoded.agents[0]!.mindscapeBuffs![2]!.effectBlocks![0]!.effects[0]!.applyProfession =
      "异常"
    expect(() => convertSource(encoded, functions, [], [])).toThrow(
      /already encodes the beneficiary scope/,
    )
    const narrowed = remielData()
    narrowed.agents[0]!.mindscapeBuffs![2]!.effectBlocks![0]!.effects[0]!.applyTarget =
      "self"
    expect(() => convertSource(narrowed, functions, [], [])).toThrow(
      /already encodes the beneficiary scope/,
    )
  })
})

/** 完整状态记录的固定源形状：显式叠层与默认字段，与源 JSON 一致。 */
const remielCompleteStateEffect = (
  id: string,
  stat: string,
  value: number,
  applyTarget: "self" | "team",
): SourceEffect => ({
  id,
  origin: "",
  scope: "general",
  applyTarget,
  applySituation: "global",
  applyProfession: null,
  teamProfession: null,
  teamProfessionValues: null,
  teamProfessionMinCount: null,
  skillSubcategoryId: null,
  elementFilter: "all",
  kind: "fixed",
  stat,
  value,
  stackable: false,
  maxStacks: 1,
  valuePerStack: 0,
  defaultStacks: 1,
  appliesToAnomaly: true,
  enabledDefault: true,
  note: "",
})

/** 合成蕾米埃尔影画 1 块：独立抗穿记录 + 完整状态的两条记录。 */
const remielMindscape1Data = (): SourceData => ({
  agents: [
    {
      id: "remiel",
      name: "蕾米埃尔",
      profession: "异常",
      mindscapeBuffs: Array.from({ length: 7 }, (_, rank) =>
        rank === 1
          ? {
              effectBlocks: [
                {
                  id: "blk-legacy",
                  name: "影画1",
                  note: "进入战场时，蕾米埃尔获得3个特殊[虚曜]，在勘域模式中此效果180秒内最多触发一次；\n蕾米埃尔处于[相变时流]状态下时，队伍中其他角色造成的属性异常伤害提升10%。",
                  effects: [
                    remielCompleteStateEffect(
                      "eff-ms7tin2y-0pja8e",
                      "radianceResPen",
                      50,
                      "self",
                    ),
                    remielCompleteStateEffect(
                      "eff-ms7tjecu-l3ocgm",
                      "anomalyDmgBonus",
                      10,
                      "team",
                    ),
                    remielCompleteStateEffect(
                      "eff-ms7tjyzo-3v31wa",
                      "anomalyDmgBonus",
                      -10,
                      "self",
                    ),
                  ],
                },
              ],
            }
          : {},
      ),
    },
  ],
  driveDiscs: [],
  skillSubcategories: [],
  followUpSkillRules: [],
  wengines: [],
})

describe("remielle mindscape 1 complete anomaly state", () => {
  const optionId =
    "agents:remiel:mindscape:1:phase-transition-flow:other-character-anomaly-damage"
  const positiveOptionId =
    "agents:remiel:mindscape:1:blk-legacy:eff-ms7tjecu-l3ocgm"
  const negativeOptionId =
    "agents:remiel:mindscape:1:blk-legacy:eff-ms7tjyzo-3v31wa"
  it("merges the team and holder records into one corrected complete option", () => {
    const result = convertSource(remielMindscape1Data(), functions, [], [])
    expect(result.definitions.revision).toBe("17")
    const option = result.catalog.options.find((o) => o.optionId === optionId)!
    expect(option.name).toBe("相变时流 · 其他角色属性异常伤害")
    expect(option.conditionDescription).toBe(
      "蕾米埃尔处于[相变时流]状态下时，队伍中其他角色造成的属性异常伤害提升10%。",
    )
    expect(option.target).toBe("team")
    expect(option.variants).toHaveLength(1)
    const variant = option.variants[0]!
    expect(variant.status).toBe("corrected")
    expect(variant.configuration).toEqual({ minimumMindscape: 1 })
    expect(variant.maximumLayers).toBe(1)
    expect(variant.inputs).toEqual([])
    expect(variant.applicability).toEqual({})
    expect(variant.differences).toEqual([
      "remielle-mindscape1-complete-anomaly-state",
    ])
    expect(variant.effectIds).toEqual([
      "agent:1581:zzz-hp:eff-ms7tjecu-l3ocgm:blk-legacy:mindscape:1",
      "agent:1581:zzz-hp:eff-ms7tjyzo-3v31wa:blk-legacy:mindscape:1",
    ])
    for (const migratedOptionId of [positiveOptionId, negativeOptionId]) {
      const variant = result.catalog.options.find(
        (o) => o.optionId === migratedOptionId,
      )!.variants[0]!
      expect(variant.status).toBe("unsupported")
      expect(variant.reason).toBe("semantic-conflict")
      expect(variant.effectIds).toEqual([])
      expect(variant.explanation).toContain(optionId)
    }
    // 独立抗穿选项保持可用，不并入完整状态。
    const resistanceIgnore = result.catalog.options.find(
      (o) =>
        o.optionId ===
        "agents:remiel:mindscape:1:blk-legacy:eff-ms7tin2y-0pja8e",
    )!
    expect(resistanceIgnore.variants[0]!.status).toBe("converted")
    // 两条既有规则保留，数值与落点不变。
    const ruleOf = (effectId: string) =>
      result.definitions.effects.find(
        (entry): entry is ContributionRule =>
          entry.kind === "contribution" && entry.effectId === effectId,
      )!
    expect(
      ruleOf("agent:1581:zzz-hp:eff-ms7tjecu-l3ocgm:blk-legacy:mindscape:1")
        .parameters["amount"],
    ).toMatchObject({ kind: "constant", unit: "ratio", value: 0.1 })
    expect(
      ruleOf("agent:1581:zzz-hp:eff-ms7tjyzo-3v31wa:blk-legacy:mindscape:1")
        .parameters["amount"],
    ).toMatchObject({ kind: "constant", unit: "ratio", value: -0.1 })
    // 两个来源位置保留在覆盖报告中，状态改为带原因的语义冲突。
    for (const pointer of [
      "/agents/0/mindscapeBuffs/1/effectBlocks/0/effects/1",
      "/agents/0/mindscapeBuffs/1/effectBlocks/0/effects/2",
    ]) {
      const record = result.coverage.records.find(
        (entry) => entry.pointer === pointer,
      )!
      expect(record.status).toBe("unsupported")
      expect(record.reason).toBe("semantic-conflict")
      expect(record.effectIds).toEqual([])
    }
    expect(result.coverage.summary).toMatchObject({
      rawEffects: 3,
      converted: 1,
      corrected: 0,
      unsupported: 2,
    })
    expect(
      result.catalog.differences.some(
        (d) => d.differenceId === "remielle-mindscape1-complete-anomaly-state",
      ),
    ).toBe(true)
  })
  it("keeps the stable identities when the source order changes", () => {
    const reordered = remielMindscape1Data()
    reordered.agents[0]!.mindscapeBuffs![1]!.effectBlocks![0]!.effects = [
      ...[
        ...reordered.agents[0]!.mindscapeBuffs![1]!.effectBlocks![0]!.effects,
      ].reverse(),
    ]
    const result = convertSource(reordered, functions, [], [])
    const option = result.catalog.options.find((o) => o.optionId === optionId)!
    expect(option.variants[0]!.effectIds).toEqual([
      "agent:1581:zzz-hp:eff-ms7tjecu-l3ocgm:blk-legacy:mindscape:1",
      "agent:1581:zzz-hp:eff-ms7tjyzo-3v31wa:blk-legacy:mindscape:1",
    ])
    // 记录顺序变化只移动 Pointer，不改变选项身份。
    expect(
      result.coverage.records
        .filter((record) => record.optionId === positiveOptionId)
        .map((record) => record.pointer),
    ).toEqual(["/agents/0/mindscapeBuffs/1/effectBlocks/0/effects/1"])
  })
  it("does not create the complete option when the pair is absent", () => {
    const onlyM2 = convertSource(remielData(), functions, [], [])
    expect(onlyM2.catalog.options.some((o) => o.optionId === optionId)).toBe(
      false,
    )
  })
  it("rejects stale registrations, half pairs and field drift", () => {
    const drift = (mutate: (effects: SourceEffect[]) => void) => {
      const source = remielMindscape1Data()
      mutate(source.agents[0]!.mindscapeBuffs![1]!.effectBlocks![0]!.effects)
      return () => convertSource(source, functions, [], [])
    }
    expect(
      drift((effects) => {
        effects[1]!.value = 20
      }),
    ).toThrow(/field drift/)
    expect(
      drift((effects) => {
        effects[1]!.applyTarget = "self"
      }),
    ).toThrow(/field drift/)
    expect(
      drift((effects) => {
        effects[1]!.stat = "dmgBonus"
      }),
    ).toThrow(/field drift/)
    expect(
      drift((effects) => {
        effects.splice(1, 1)
      }),
    ).toThrow(/expects exactly one source record/)
    expect(
      drift((effects) => {
        effects.push({ ...effects[1]! })
      }),
    ).toThrow(/Duplicate source effect/)
    expect(
      drift((effects) => {
        effects[1]!.applyProfession = "异常"
      }),
    ).toThrow(/field drift/)
    const note = remielMindscape1Data()
    note.agents[0]!.mindscapeBuffs![1]!.effectBlocks![0]!.note =
      "进入战场时，蕾米埃尔获得3个特殊[虚曜]。"
    expect(() => convertSource(note, functions, [], [])).toThrow(
      /block note drift/,
    )
  })
})

/**
 * 青溟笼舍（14137）贯穿增伤按层纠错的合成转换：登记的“固定单次”编码按
 * 每层值与上限 2 编译；编码或数值漂移时拒绝生成。
 */
const qingmingPierceEffect = (
  effectId: string,
  value: number,
  kind: "fixed" | "stacked" = "fixed",
): SourceEffect => ({
  id: effectId,
  scope: "skill",
  applyTarget: "self",
  applySituation: "global",
  skillCategory: "special",
  skillSubcategoryId: "all-special-ms0fcqv7",
  skillTargets: [
    { category: "special", subcategoryId: "all-special-ms0fcqv7" },
    { category: "ultimate", subcategoryId: null },
  ],
  elementFilter: ["以太"],
  kind,
  stat: "pierceDmgBonus",
  value,
  stackable: false,
  maxStacks: 1,
  valuePerStack: 0,
  defaultStacks: 1,
  appliesToAnomaly: true,
  note: "",
})
const qingmingPierceIds = [
  "eff-ms1r9equ-l7imtb",
  "eff-ms1rarze-uhh4r4",
  "eff-ms1rby7h-cnwy4w",
  "eff-ms1rcyzb-2dozs0",
  "eff-ms1rdzo3-dwcqi1",
] as const
const qingmingData = (): SourceData => ({
  agents: [],
  driveDiscs: [],
  skillSubcategories: [],
  followUpSkillRules: [],
  wengines: [
    {
      id: "Qingming_Birdcage",
      name: "青溟笼舍",
      profession: "命破",
      refinementBuffs: [1, 2, 3, 4, 5].map((rank) => ({
        effectBlocks: [
          {
            id: "blk-legacy",
            name: `精${rank}`,
            note: `每层[青溟同行]效果使装备者造成的以太贯穿伤害提升${
              [10, 11.5, 13, 14.5, 16][rank - 1]
            }%，最多叠加2层。`,
            effects: [
              {
                id: "legacy-self-critRate",
                scope: "general",
                applyTarget: "self",
                applySituation: "global",
                elementFilter: "all",
                kind: "fixed",
                stat: "critRate",
                value: [20, 23, 26, 29, 32][rank - 1]!,
                stackable: false,
                maxStacks: 1,
                valuePerStack: 0,
                defaultStacks: 1,
                appliesToAnomaly: true,
                note: "",
              },
              qingmingPierceEffect(
                qingmingPierceIds[rank - 1]!,
                [10, 11.5, 13, 14.5, 16][rank - 1]!,
              ),
            ],
          },
        ],
      })),
    },
  ],
})

describe("qingming birdcage pierce stack correction", () => {
  it("compiles the registered fixed encodings as per-layer contributions with a two-layer cap", () => {
    const result = convertSource(qingmingData(), functions, [], [])
    expect(result.definitions.revision).toBe("17")
    for (const [index, effectId] of qingmingPierceIds.entries()) {
      const option = result.catalog.options.find((o) =>
        o.optionId.includes(effectId),
      )!
      expect(option.variants).toHaveLength(1)
      const variant = option.variants[0]!
      expect(variant.status).toBe("corrected")
      expect(variant.maximumLayers).toBe(2)
      expect(variant.differences).toEqual([
        "qingming-birdcage-pierce-stack-layers",
      ])
      const rule = result.definitions.effects.find(
        (entry): entry is ContributionRule =>
          entry.kind === "contribution" && entry.effectId.includes(effectId),
      )!
      expect(rule.activation).toMatchObject({
        kind: "supplied",
        maximumLayers: { value: 2 },
      })
      expect((rule.parameters.amount as { value: number }).value).toBeCloseTo(
        [0.1, 0.115, 0.13, 0.145, 0.16][index]!,
        12,
      )
    }
    // 同块的固定暴击率条款不按层翻倍。
    const critOption = result.catalog.options.find((o) =>
      o.optionId.includes("legacy-self-critRate"),
    )!
    expect(critOption.variants.every((v) => v.maximumLayers === 1)).toBe(true)
    expect(
      result.catalog.differences.some(
        (d) => d.differenceId === "qingming-birdcage-pierce-stack-layers",
      ),
    ).toBe(true)
  })

  it("rejects drifted encodings instead of silently re-layering them", () => {
    const alreadyStacked = qingmingData()
    alreadyStacked.wengines[0]!.refinementBuffs![0]!.effectBlocks![0]!.effects[1] =
      qingmingPierceEffect(qingmingPierceIds[0]!, 10, "stacked")
    expect(() => convertSource(alreadyStacked, functions, [], [])).toThrowError(
      /registered fixed encoding/,
    )
    const valueDrift = qingmingData()
    valueDrift.wengines[0]!.refinementBuffs![0]!.effectBlocks![0]!.effects[1] =
      qingmingPierceEffect(qingmingPierceIds[0]!, 12)
    expect(() => convertSource(valueDrift, functions, [], [])).toThrowError(
      /registered fixed encoding/,
    )
  })
})

/** 合成四个缺失二件套机器记录的驱动盘实体；note 按需注入。 */
const discSetData = (
  note: string | null = null,
  withMachineRecord = false,
): SourceData => ({
  agents: [],
  skillSubcategories: [],
  followUpSkillRules: [],
  wengines: [],
  driveDiscs: [
    {
      id: "SuitShockstarDisco",
      name: "震星迪斯科",
      twoPieceEffectBlocks:
        note === null
          ? []
          : [
              {
                id: "blk-ms0fmk43-cd0cj9",
                name: "2件套",
                note,
                effects: withMachineRecord
                  ? [
                      {
                        id: "eff-test",
                        scope: "general",
                        applyTarget: "self",
                        applySituation: "global",
                        elementFilter: "all",
                        kind: "fixed",
                        stat: "critRate",
                        value: 6,
                      },
                    ]
                  : [],
              },
            ],
    },
    { id: "SuitSoulRock", name: "灵魂摇滚" },
    { id: "SuitProtoPunk", name: "原始朋克" },
    { id: "SuitKingoftheSummit", name: "山大王" },
  ],
})

const driveDiscSupplements = SUPPLEMENTS.filter((supplement) =>
  supplement.supplementId.startsWith("nanoka:drive-discs:"),
)

describe("drive-disc two-piece supplements and boundaries", () => {
  it("registers the impact and defense rules plus the two out-of-scope declarations", () => {
    const result = convertSource(
      discSetData("冲击力+6%。"),
      functions,
      [],
      driveDiscSupplements,
    )
    const impact = result.catalog.options.find(
      (o) => o.optionId === "nanoka:drive-discs:31200:two-piece-impact-percent",
    )!
    expect(impact.variants[0]!.configuration).toEqual({ minimumSetPieces: 2 })
    expect(impact.variants[0]!.effectIds).toEqual([
      "disc:31200:nanoka:two-piece-impact-percent:setPieces:2",
    ])
    const impactRule = result.definitions.effects.find(
      (entry): entry is ContributionRule =>
        entry.kind === "contribution" &&
        entry.effectId ===
          "disc:31200:nanoka:two-piece-impact-percent:setPieces:2",
    )!
    expect(impactRule.operation).toMatchObject({
      kind: "stat-adjustment",
      stat: "impact",
      stage: "initial-percentage",
    })
    const defense = result.catalog.options.find(
      (o) =>
        o.optionId === "nanoka:drive-discs:31500:two-piece-defense-percent",
    )!
    expect(defense.variants[0]!.effectIds).toEqual([
      "disc:31500:nanoka:two-piece-defense-percent:setPieces:2",
    ])
    for (const optionId of [
      "nanoka:drive-discs:31900:two-piece-shield-value",
      "nanoka:drive-discs:33200:two-piece-daze-value",
    ]) {
      const boundary = result.catalog.options.find(
        (o) => o.optionId === optionId,
      )!
      expect(boundary.variants).toHaveLength(1)
      expect(boundary.variants[0]!.status).toBe("unsupported")
      expect(boundary.variants[0]!.reason).toBe("formula-out-of-scope")
      expect(boundary.variants[0]!.effectIds).toEqual([])
      expect(boundary.variants[0]!.explanation).toContain(
        optionId.includes("31900") ? "护盾值" : "失衡值",
      )
    }
    const outOfScope = result.coverage.supplementalRecords.filter(
      (record) => record.status === "out-of-scope",
    )
    expect(outOfScope.map((record) => record.supplementId)).toContain(
      "nanoka:drive-discs:31900:two-piece-shield-value",
    )
  })

  it("rejects a fixed-source two-piece record colliding with the supplement", () => {
    const withRecord = discSetData("冲击力+6%。", true)
    expect(() =>
      convertSource(withRecord, functions, [], driveDiscSupplements),
    ).toThrowError(/collides with the fixed-source option/)
  })

  it("rejects a drifted two-piece block note", () => {
    const drifted = discSetData("冲击力+7%。")
    expect(() =>
      convertSource(drifted, functions, [], driveDiscSupplements),
    ).toThrowError(/two-piece block note drift/)
  })

  it("rejects a boundary declaration colliding with a fixed-source two-piece record", () => {
    const protoPunkRecord = discSetData()
    protoPunkRecord.driveDiscs[2] = {
      id: "SuitProtoPunk",
      name: "原始朋克",
      twoPieceEffectBlocks: [
        {
          id: "blk-test",
          name: "2件套",
          note: "",
          effects: [
            {
              id: "eff-test",
              scope: "general",
              applyTarget: "self",
              applySituation: "global",
              elementFilter: "all",
              kind: "fixed",
              stat: "critRate",
              value: 6,
            },
          ],
        },
      ],
    }
    expect(() =>
      convertSource(protoPunkRecord, functions, [], driveDiscSupplements),
    ).toThrowError(/collides with the fixed-source option/)
  })
})

/**
 * 增益修复批次 01 的合成转换：C01/C05/C07/C08/C10/C11/T01 的具名登记按登记
 * 语义编译；来源编码或数值漂移时拒绝生成。合成数据使用与固定来源一致的
 * upstream id、blockId 与 effectId，命中生产登记键。
 */
const batch01Base: Pick<
  SourceData,
  "agents" | "driveDiscs" | "skillSubcategories" | "followUpSkillRules"
> = {
  agents: [],
  driveDiscs: [],
  skillSubcategories: [],
  followUpSkillRules: [],
}
const batch01FixedEffect = (
  id: string,
  stat: string,
  value: number,
  extra: Partial<SourceEffect> = {},
): SourceEffect => ({
  id,
  scope: "general",
  applyTarget: "self",
  applySituation: "global",
  elementFilter: "all",
  kind: "fixed",
  stat,
  value,
  stackable: false,
  maxStacks: 1,
  valuePerStack: 0,
  defaultStacks: 1,
  note: "",
  ...extra,
})
const refinementPacks = (
  build: (
    rank: 1 | 2 | 3 | 4 | 5,
  ) => { id: string; name: string; note: string; effects: SourceEffect[] }[],
) => ({
  refinementBuffs: ([1, 2, 3, 4, 5] as const).map((rank) => ({
    effectBlocks: build(rank),
  })),
})

const myriadEclipseData = (
  overrides: {
    critDmgR4?: number
    reduceElement?: "all" | string[]
  } = {},
): SourceData => ({
  ...batch01Base,
  wengines: [
    {
      id: "Myriad_Eclipse",
      name: "千面日陨",
      profession: "强攻",
      ...refinementPacks((rank) => [
        {
          id: "blk-legacy",
          name: `精${rank}`,
          note: `暴击伤害提升${[45, 51.75, 58.5, 65.25, 72][rank - 1]}%；[强化特殊技]、[连携技]、[终结技]造成冰属性伤害时，角色获得[零度处刑宣言]效果，持续3秒；[零度处刑宣言]效果期间，角色命中敌人时无视${[25, 28.75, 32.5, 36.25, 40][rank - 1]}%防御力。`,
          effects: [
            batch01FixedEffect(
              "legacy-self-critDmg",
              "critDmg",
              rank === 4
                ? (overrides.critDmgR4 ?? 62.25)
                : [45, 51.75, 58.5, 65.25, 72][rank - 1]!,
            ),
            batch01FixedEffect(
              "legacy-self-reduceDefense",
              "reduceDefense",
              [25, 28.75, 32.5, 36.25, 40][rank - 1]!,
              {
                elementFilter:
                  rank <= 4 ? (overrides.reduceElement ?? ["冰"]) : "all",
              },
            ),
          ],
        },
      ]),
    },
  ],
})

describe("myriad eclipse batch 01 corrections", () => {
  it("corrects the R4 critical damage value and removes the ice-element restriction on the state ignore-defense", () => {
    const result = convertSource(myriadEclipseData(), functions, [], [])
    const critOption = result.catalog.options.find((o) =>
      o.optionId.endsWith(
        "Myriad_Eclipse:refinement:blk-legacy:legacy-self-critDmg",
      ),
    )!
    expect(critOption.variants.map((v) => v.status)).toEqual([
      "converted",
      "converted",
      "converted",
      "corrected",
      "converted",
    ])
    expect(critOption.variants[3]!.differences).toEqual([
      "myriad-eclipse-r4-critical-damage",
    ])
    const critRule = result.definitions.effects.find(
      (entry): entry is ContributionRule =>
        entry.kind === "contribution" &&
        entry.effectId ===
          "w-engine:14129:zzz-hp:legacy-self-critDmg:blk-legacy:refinement",
    )!
    expect(critRule.parameters.amount).toMatchObject({
      kind: "by-rank",
      values: { 1: 0.45, 2: 0.5175, 3: 0.585, 4: 0.6525, 5: 0.72 },
    })
    const defenseOption = result.catalog.options.find((o) =>
      o.optionId.endsWith(
        "Myriad_Eclipse:refinement:blk-legacy:legacy-self-reduceDefense",
      ),
    )!
    for (const [index, status] of defenseOption.variants
      .map((v) => v.status)
      .entries())
      expect(status).toBe(index <= 3 ? "corrected" : "converted")
    for (const variant of defenseOption.variants.slice(0, 4))
      expect(variant.differences).toEqual([
        "myriad-eclipse-zero-verdict-ignore-defense-scope",
      ])
    // 冰元素条件移除后五档结构一致，合并为一条不带命中筛选的规则。
    const defenseRule = result.definitions.effects.find(
      (entry): entry is ContributionRule =>
        entry.kind === "contribution" &&
        entry.effectId ===
          "w-engine:14129:zzz-hp:legacy-self-reduceDefense:blk-legacy:refinement",
    )!
    expect(defenseRule).toBeDefined()
    expect(defenseRule.when).toEqual({ kind: "all", conditions: [] })
    expect(defenseRule.parameters.amount).toMatchObject({
      kind: "by-rank",
      values: { 1: 0.25, 4: 0.3625, 5: 0.4 },
    })
  })

  it("rejects drifted R4 critical damage values and drifted element encodings", () => {
    expect(() =>
      convertSource(myriadEclipseData({ critDmgR4: 63 }), functions, [], []),
    ).toThrowError(/Value correction expects 62.25/)
    expect(() =>
      convertSource(
        myriadEclipseData({ reduceElement: ["火"] }),
        functions,
        [],
        [],
      ),
    ).toThrowError(/Trigger scope correction expects elementFilter/)
  })
})

const promotionStatsData = (
  overrides: { r1ApplyTarget?: "self" | "team" } = {},
): SourceData => ({
  ...batch01Base,
  wengines: [
    {
      id: "Promotion Stats",
      name: "喵运当头",
      profession: "锋御",
      ...refinementPacks((rank) => [
        {
          id: "blk-mtwn69lr-xfb4n8",
          name: `精${rank}`,
          note: `防御力提升${[8, 9, 10, 11, 12][rank - 1]}%；释放[强化特殊技]时，防御力额外提升${[8, 9, 10, 11, 12][rank - 1]}%，持续40秒，重复触发时刷新持续时间。`,
          effects: [
            {
              id: "eff-mtwn69lr-2h2brm",
              scope: "general",
              applyTarget:
                rank === 1 ? (overrides.r1ApplyTarget ?? "team") : "team",
              applySituation: "global",
              elementFilter: "all",
              kind: "stacked",
              stat: "inCombatDefPercent",
              value: 0,
              stackable: false,
              maxStacks: 2,
              valuePerStack: [8, 9, 10, 11, 12][rank - 1]!,
              defaultStacks: 2,
              note: "",
            },
          ],
        },
      ]),
    },
  ],
})

describe("promotion stats equipper defense correction", () => {
  it("corrects all five refinements to the equipper while keeping the stacked two-layer encoding", () => {
    const result = convertSource(promotionStatsData(), functions, [], [])
    const option = result.catalog.options.find((o) =>
      o.optionId.includes("Promotion%20Stats"),
    )!
    expect(option.target).toBe("self")
    for (const variant of option.variants) {
      expect(variant.status).toBe("corrected")
      expect(variant.differences).toEqual(["promotion-stats-equipper-defense"])
      expect(variant.maximumLayers).toBe(2)
    }
    const rule = result.definitions.effects.find(
      (entry): entry is ContributionRule =>
        entry.kind === "contribution" &&
        entry.effectId ===
          "w-engine:13017:zzz-hp:eff-mtwn69lr-2h2brm:blk-mtwn69lr-xfb4n8:refinement",
    )!
    expect(rule.beneficiary).toEqual({ kind: "holder" })
    expect(rule.activation).toMatchObject({
      kind: "supplied",
      maximumLayers: { value: 2 },
    })
    expect(rule.parameters.amount).toMatchObject({
      kind: "by-rank",
      values: { 1: 0.08, 5: 0.12 },
    })
  })

  it("rejects a source that already encodes the corrected target", () => {
    expect(() =>
      convertSource(
        promotionStatsData({ r1ApplyTarget: "self" }),
        functions,
        [],
        [],
      ),
    ).toThrowError(/Beneficiary target correction expects applyTarget team/)
  })
})

const theVaultData = (
  overrides: { r1ApplyTarget?: "self" | "team"; energyR2Value?: number } = {},
): SourceData => ({
  ...batch01Base,
  wengines: [
    {
      id: "The_Vault",
      name: "聚宝箱",
      profession: "支援",
      ...refinementPacks((rank) => [
        {
          id: "blk-legacy",
          name: `精${rank}`,
          note: `[强化特殊技]、[连携技]或[终结技]造成以太伤害时，所有单位对目标造成的伤害提升${[15, 17.5, 20, 22, 24][rank - 1]}%，装备者的能量自动回复提升${[0.5, 0.58, 0.65, 0.72, 0.8][rank - 1]}点/秒，持续2秒，同名被动效果之间不可叠加。`,
          effects: [
            batch01FixedEffect(
              "legacy-self-dmgBonus",
              "dmgBonus",
              [15, 17.5, 20, 22, 24][rank - 1]!,
              {
                applyTarget:
                  rank === 1 ? (overrides.r1ApplyTarget ?? "self") : "team",
                appliesToAnomaly: true,
              },
            ),
            batch01FixedEffect(
              [
                "eff-ms1zuvli-v2yjaz",
                "eff-ms1zv3lq-wkhzfm",
                "eff-ms1zv8x7-c9st7n",
                "eff-ms1zve66-p2wn3a",
                "eff-ms1zvkfu-7g8a4b",
              ][rank - 1]!,
              "energyRegen",
              rank === 2
                ? (overrides.energyR2Value ?? 58)
                : [50, 58, 65, 72, 80][rank - 1]!,
            ),
          ],
        },
      ]),
    },
  ],
})

describe("the vault team damage bonus and flat energy regen corrections", () => {
  it("corrects R1 to team, merges the five ranks, and compiles flat energy regen", () => {
    const result = convertSource(theVaultData(), functions, [], [])
    const damageOption = result.catalog.options.find((o) =>
      o.optionId.endsWith(
        "The_Vault:refinement:blk-legacy:legacy-self-dmgBonus",
      ),
    )!
    expect(damageOption.target).toBe("team")
    expect(damageOption.variants[0]!.status).toBe("corrected")
    expect(damageOption.variants[0]!.differences).toEqual([
      "the-vault-r1-team-damage-bonus",
    ])
    for (const variant of damageOption.variants.slice(1))
      expect(variant.status).toBe("converted")
    const damageRule = result.definitions.effects.find(
      (entry): entry is ContributionRule =>
        entry.kind === "contribution" &&
        entry.effectId ===
          "w-engine:13103:zzz-hp:legacy-self-dmgBonus:blk-legacy:refinement",
    )!
    expect(damageRule.beneficiary).toEqual({ kind: "team" })
    expect(damageRule.parameters.amount).toMatchObject({
      kind: "by-rank",
      values: { 1: 0.15, 5: 0.24 },
    })
    // 固定回能：energy-per-second 加数，不再乘基础回能。
    const flatEffects = [
      "eff-ms1zuvli-v2yjaz",
      "eff-ms1zv3lq-wkhzfm",
      "eff-ms1zv8x7-c9st7n",
      "eff-ms1zve66-p2wn3a",
      "eff-ms1zvkfu-7g8a4b",
    ] as const
    for (const [index, effectId] of flatEffects.entries()) {
      const rule = result.definitions.effects.find(
        (entry): entry is ContributionRule =>
          entry.kind === "contribution" &&
          entry.effectId ===
            `w-engine:13103:zzz-hp:${effectId}:blk-legacy:refinement:${index + 1}`,
      )!
      expect(rule.operation).toMatchObject({
        kind: "stat-adjustment",
        stat: "energyRegen",
        stage: "final-fixed",
        value: { kind: "parameter", unit: "energy-per-second", name: "amount" },
      })
      expect((rule.parameters.amount as { value: number }).value).toBeCloseTo(
        [0.5, 0.58, 0.65, 0.72, 0.8][index]!,
        12,
      )
      expect(rule.parameters.amount).toMatchObject({
        unit: "energy-per-second",
      })
    }
    const energyOption = result.catalog.options.find((o) =>
      o.optionId.includes("eff-ms1zuvli-v2yjaz"),
    )!
    expect(energyOption.variants[0]!.status).toBe("corrected")
    expect(energyOption.variants[0]!.differences).toEqual([
      "wengine-flat-energy-regen",
    ])
  })

  it("rejects drifted apply targets and drifted flat energy values", () => {
    expect(() =>
      convertSource(theVaultData({ r1ApplyTarget: "team" }), functions, [], []),
    ).toThrowError(/Beneficiary target correction expects applyTarget self/)
    expect(() =>
      convertSource(theVaultData({ energyR2Value: 59 }), functions, [], []),
    ).toThrowError(/Flat energy regen correction/)
  })
})

const bellicoseBlazeData = (
  overrides: { r1PerStack?: number; skillCategory?: string } = {},
): SourceData => ({
  ...batch01Base,
  wengines: [
    {
      id: "Bellicose_Blaze",
      name: "嚣枪喧焰",
      profession: "强攻",
      ...refinementPacks((rank) => [
        {
          id: "blk-legacy",
          name: `精${rank}`,
          note: `暴击率提升${[20, 23, 26, 29, 32][rank - 1]}%；装备者发动[追加攻击]造成火属性伤害时，装备者的攻击对敌人造成的伤害无视${[15, 17.2, 19.5, 21.7, 24][rank - 1]}%防御力，持续8秒，3秒内最多获得1层，最多叠加2层，重复触发时刷新持续时间。`,
          effects: [
            batch01FixedEffect(
              "legacy-self-critRate",
              "critRate",
              [20, 23, 26, 29, 32][rank - 1]!,
            ),
            {
              id: "legacy-self-reduceDefense",
              scope: "skill",
              applyTarget: "self",
              applySituation: "global",
              skillCategory: "follow_up",
              skillSubcategoryId: null,
              skillTargets: [
                {
                  category: overrides.skillCategory ?? "follow_up",
                  subcategoryId: null,
                },
              ],
              elementFilter: ["火"],
              kind: "stacked",
              stat: "reduceDefense",
              value: 0,
              stackable: false,
              maxStacks: 2,
              valuePerStack:
                rank === 1
                  ? (overrides.r1PerStack ?? 16)
                  : [17.2, 19.5, 21.7, 24][rank - 2]!,
              defaultStacks: 2,
              note: "",
            },
          ],
        },
      ]),
    },
  ],
})

describe("bellicose blaze trigger scope and R1 per-stack corrections", () => {
  it("removes the element and follow-up benefit filters and corrects R1 to 15% per stack", () => {
    const result = convertSource(bellicoseBlazeData(), functions, [], [])
    const option = result.catalog.options.find((o) =>
      o.optionId.endsWith(
        "Bellicose_Blaze:refinement:blk-legacy:legacy-self-reduceDefense",
      ),
    )!
    for (const variant of option.variants) {
      expect(variant.status).toBe("corrected")
      expect(variant.differences).toEqual([
        "bellicose-blaze-trigger-scope-ignore-defense",
      ])
      expect(variant.maximumLayers).toBe(2)
    }
    const rule = result.definitions.effects.find(
      (entry): entry is ContributionRule =>
        entry.kind === "contribution" &&
        entry.effectId ===
          "w-engine:14130:zzz-hp:legacy-self-reduceDefense:blk-legacy:refinement",
    )!
    // 受益筛选只剩直伤种类；元素与追加攻击分类条件均已移除。
    expect(rule.when).toEqual({
      kind: "all",
      conditions: [
        {
          kind: "one-of",
          fact: "hit.damageKind",
          values: ["regular", "sheer", "sharpen"],
        },
      ],
    })
    expect(rule.parameters.amount).toMatchObject({
      kind: "by-rank",
      values: { 1: 0.15, 2: 0.172, 5: 0.24 },
    })
    expect(rule.activation).toMatchObject({
      maximumLayers: { value: 2 },
    })
  })

  it("rejects drifted per-stack values and drifted skill target encodings", () => {
    expect(() =>
      convertSource(bellicoseBlazeData({ r1PerStack: 17 }), functions, [], []),
    ).toThrowError(/Value correction expects 16/)
    expect(() =>
      convertSource(
        bellicoseBlazeData({ skillCategory: "basic" }),
        functions,
        [],
        [],
      ),
    ).toThrowError(/Trigger scope correction expects skill target categories/)
  })
})

const bloodCasketData = (overrides: { note?: string } = {}): SourceData => ({
  ...batch01Base,
  wengines: [
    {
      id: "BloodCasket",
      name: "血髓秘匣",
      profession: "锋御",
      ...refinementPacks((rank) => [
        {
          id: "blk-mtsg3tw6-5rsbpt",
          name: "暴击率增伤转模",
          note:
            overrides.note ??
            "局内实时规则\n超出100%暴击率时转模\n1%暴击率 转 0.48% 增伤\n转模增伤上限24%",
          effects: [
            {
              id: "eff-mtsg3tw6-gydnli",
              scope: "general",
              applyTarget: "self",
              applySituation: "global",
              elementFilter: "all",
              kind: "convert",
              stat: "dmgBonus",
              value: 0,
              stackable: false,
              maxStacks: 1,
              valuePerStack: 0,
              defaultStacks: 1,
              convert: {
                from: "critRate",
                panelSource: "final",
                ratioPercent: [48, 56, 64, 72, 80][rank - 1]!,
                cap: [24, 28, 32, 36, 40][rank - 1]!,
                defaultBase: null,
                initialBase: 100,
              },
              note: "",
            },
          ],
        },
      ]),
    },
  ],
})

describe("blood casket refinement-aware description", () => {
  it("overrides the shared R1-only description without changing the correct values", () => {
    const result = convertSource(bloodCasketData(), functions, [], [])
    const option = result.catalog.options.find((o) =>
      o.optionId.endsWith(
        "BloodCasket:refinement:blk-mtsg3tw6-5rsbpt:eff-mtsg3tw6-gydnli",
      ),
    )!
    expect(option.conditionDescription).toBe(
      "局内实时规则\n超出100%暴击率时转模\n1%暴击率 转 0.48/0.56/0.64/0.72/0.8% 增伤（按精炼1—5取值）\n转模增伤上限 24/28/32/36/40%（按精炼1—5取值）",
    )
    for (const variant of option.variants) {
      expect(variant.status).toBe("corrected")
      expect(variant.differences).toEqual([
        "blood-casket-refinement-aware-description",
      ])
    }
    const rule = result.definitions.effects.find(
      (entry): entry is ContributionRule =>
        entry.kind === "contribution" &&
        entry.effectId ===
          "w-engine:13021:zzz-hp:eff-mtsg3tw6-gydnli:blk-mtsg3tw6-5rsbpt:refinement",
    )!
    expect(rule.parameters.rate).toMatchObject({
      kind: "by-rank",
      values: { 1: 0.4799999999999999, 5: 0.8 },
    })
    expect(rule.parameters.cap).toMatchObject({
      kind: "by-rank",
      values: { 1: 0.24, 2: 0.28, 3: 0.32, 4: 0.36, 5: 0.4 },
    })
  })

  it("rejects drifted shared notes and partially covered registrations", () => {
    expect(() =>
      convertSource(
        bloodCasketData({
          note: "局内实时规则\n超出100%暴击率时转模\n1%暴击率 转 0.48% 增伤\n转模增伤上限28%",
        }),
        functions,
        [],
        [],
      ),
    ).toThrowError(/Refinement-value-description block note drift/)
    // 同一选项内登记必须覆盖全部精炼档：临时移除精炼 3 的登记键验证拒绝，
    // 结束后立即恢复，不影响其他用例。
    const partialKey =
      "w-engines/BloodCasket/refinement/3/blk-mtsg3tw6-5rsbpt/eff-mtsg3tw6-gydnli"
    const registrations = SOURCE_SEMANTICS as Record<string, unknown>
    const saved = registrations[partialKey]
    delete registrations[partialKey]
    try {
      expect(() =>
        convertSource(bloodCasketData(), functions, [], []),
      ).toThrowError(
        /Refinement-value-description registration must cover every refinement consistently/,
      )
    } finally {
      registrations[partialKey] = saved
    }
  })
})

describe("housekeeper flat energy regen and swing jazz percentage semantics", () => {
  it("compiles the five housekeeper ranks as flat points per second", () => {
    const source: SourceData = {
      ...batch01Base,
      wengines: [
        {
          id: "Housekeeper",
          name: "家政员",
          profession: "防护",
          ...refinementPacks((rank) => [
            {
              id: "blk-legacy",
              name: `精${rank}`,
              note: `位于后场时，装备者的能量自动回复提升${[0.45, 0.52, 0.58, 0.65, 0.72][rank - 1]}点/秒；[强化特殊技]命中敌人时，装备者造成的物理伤害提升${[3, 3.5, 4, 4.4, 4.8][rank - 1]}%，最多叠加15层，持续1秒，重复触发时刷新持续时间。`,
              effects: [
                batch01FixedEffect(
                  "legacy-self-energyRegen",
                  "energyRegen",
                  [45, 52, 58, 65, 72][rank - 1]!,
                ),
              ],
            },
          ]),
        },
      ],
    }
    const result = convertSource(source, functions, [], [])
    const rule = result.definitions.effects.find(
      (entry): entry is ContributionRule =>
        entry.kind === "contribution" &&
        entry.effectId ===
          "w-engine:13106:zzz-hp:legacy-self-energyRegen:blk-legacy:refinement",
    )!
    expect(rule.operation).toMatchObject({
      kind: "stat-adjustment",
      stat: "energyRegen",
      stage: "final-fixed",
      value: { kind: "parameter", unit: "energy-per-second", name: "amount" },
    })
    expect(rule.parameters.amount).toMatchObject({
      kind: "by-rank",
      unit: "energy-per-second",
      values: { 1: 0.45, 2: 0.52, 3: 0.58, 4: 0.65, 5: 0.72 },
    })
    const option = result.catalog.options.find((o) =>
      o.optionId.endsWith(
        "Housekeeper:refinement:blk-legacy:legacy-self-energyRegen",
      ),
    )!
    for (const variant of option.variants) {
      expect(variant.status).toBe("corrected")
      expect(variant.differences).toEqual(["wengine-flat-energy-regen"])
    }
  })

  it("keeps the genuine percentage energy regen records outside the correction", () => {
    const percentageData: SourceData = {
      ...batch01Base,
      wengines: [],
      driveDiscs: [
        {
          id: "SuitSwingJazz",
          name: "摇摆爵士",
          twoPieceEffectBlocks: [
            {
              id: "blk-ms0fdpvq-2u8wnk",
              name: "2件套",
              note: "能量自动回复+20%。",
              effects: [
                batch01FixedEffect(
                  "legacy-self-energyRegen",
                  "energyRegen",
                  20,
                  {
                    appliesToAnomaly: true,
                  },
                ),
              ],
            },
          ],
        },
      ],
    }
    const result = convertSource(percentageData, functions, [], [])
    const rule = result.definitions.effects.find(
      (entry): entry is ContributionRule =>
        entry.kind === "contribution" &&
        entry.effectId.startsWith("disc:31600:zzz-hp:legacy-self-energyRegen"),
    )!
    // 百分比语义保持：基础回能 × 0.2 的乘法表达式。
    expect(rule.operation).toMatchObject({
      kind: "stat-adjustment",
      stat: "energyRegen",
      stage: "final-fixed",
      value: {
        kind: "multiply",
        value: {
          kind: "stat",
          stat: "energyRegen",
          stage: "base",
        },
        coefficient: { kind: "parameter", unit: "ratio", name: "amount" },
      },
    })
    expect((rule.parameters.amount as { value: number }).value).toBeCloseTo(
      0.2,
      12,
    )
    const variant = result.catalog.options.find(
      (o) => o.catalogEntityId === "drive-discs:SuitSwingJazz",
    )!.variants[0]!
    expect(variant.status).toBe("converted")
    expect(variant.differences).toEqual([])
  })
})

/**
 * 增益修复批次 02 的合成转换：11 件音擎缺失被动按 Nanoka 补充登记编译为
 * 12 个目录选项（索魂影眸拆每层与满层附加两条）；固定来源出现同条款
 * stat 的机器记录时拒绝生成，防止补充与真实记录重复贡献。
 */
const batch02Entities = [
  ["Identity_Base", "「恒等式」-本格", "防护"],
  ["Weapon_S_1141", "拘缚者", "击破"],
  ["Reverb_Mark_I", "「残响」-Ⅰ型", "支援"],
  ["Vortex_Hatchet", "「湍流」-斧型", "击破"],
  ["Steam_Oven", "人为刀俎", "击破"],
  ["Original_Transmorpher", "正版变身器", "防护"],
  ["Hellfire_Gears", "燃狱齿轮", "击破"],
  ["Blazing_Laurel", "焰心桂冠", "击破"],
  ["Ice-Jade_Teapot", "玉壶青冰", "击破"],
  ["Spectral_Gaze", "索魂影眸", "击破"],
  ["Head_Lackey", "首席跟班", "击破"],
] as const

/** 与生产登记键不冲突的合成共存记录：证明既有条款选项与补充并存不重复。 */
const batch02CoexistingRecords: Readonly<
  Record<string, (rank: 1 | 2 | 3 | 4 | 5) => SourceEffect[]>
> = {
  "Original_Transmorpher": (rank) => [
    batch01FixedEffect("eff-coexist-hp", "inCombatHpPercent", 7 + rank),
  ],
  "Hellfire_Gears": () => [
    batch01FixedEffect("eff-coexist-regen", "energyRegen", 60),
  ],
  "Blazing_Laurel": () => [
    batch01FixedEffect("eff-coexist-crit", "critDmg", 1.5, {
      applyTarget: "team",
    }),
  ],
  "Ice-Jade_Teapot": () => [
    batch01FixedEffect("eff-coexist-dmg", "dmgBonus", 20, {
      applyTarget: "team",
    }),
  ],
  "Spectral_Gaze": () => [
    batch01FixedEffect("eff-coexist-reduceDef", "reduceDefense", 25, {
      applyTarget: "team",
    }),
  ],
  "Head_Lackey": () => [
    batch01FixedEffect("eff-coexist-resPen", "resPen", 15, {
      elementFilter: ["火"],
    }),
    {
      ...batch01FixedEffect("eff-coexist-dmg", "dmgBonus", 0, {
        applyTarget: "team",
      }),
      kind: "stacked",
      maxStacks: 2,
      valuePerStack: 12.5,
      defaultStacks: 2,
    },
    batch01FixedEffect("eff-coexist-regen", "energyRegen", 40),
  ],
}

const batch02WengineData = (
  overrides: Readonly<Record<string, SourceEffect[]>> = {},
): SourceData => ({
  ...batch01Base,
  wengines: batch02Entities.map(([id, name, profession]) => ({
    id,
    name,
    profession,
    ...refinementPacks((rank) => [
      {
        id: "blk-batch02",
        name: `精${rank}`,
        note: "",
        effects: [
          ...(batch02CoexistingRecords[id]?.(rank) ?? []).map((effect) => ({
            ...effect,
            // 跨档保持同 id，与真实 legacy 记录一样按精炼合并为单选项。
          })),
          ...(overrides[id] ?? []),
        ],
      },
    ]),
  })),
})

const batch02Supplements = SUPPLEMENTS.filter(
  (supplement): supplement is Extract<Supplement, { kind: "option" }> =>
    supplement.kind === "option" &&
    batch02Entities.some(
      ([id]) => `w-engines:${id}` === supplement.catalogEntityId,
    ),
)

describe("w-engine missing passive supplements (batch 02)", () => {
  it("registers thirteen supplement options beside the preserved fixed-source clauses", () => {
    // 索魂影眸按评审 R01 修复拆为 1/2/3 有效魂锁三个互斥完整档位。
    expect(batch02Supplements).toHaveLength(13)
    const result = convertSource(
      batch02WengineData(),
      functions,
      [],
      batch02Supplements,
    )
    // 六个已有机器记录的实体保留 8 个来源选项（首席跟班 3 条），补充新增 13 个。
    const supplementOptionIds = new Set(
      batch02Supplements.map((supplement) => supplement.optionId),
    )
    expect(
      result.catalog.options.filter((o) => supplementOptionIds.has(o.optionId)),
    ).toHaveLength(13)
    expect(result.coverage.supplementalRecords).toHaveLength(13)
    expect(result.coverage.summary.supplements).toMatchObject({
      records: 13,
      rules: 13,
      options: 13,
      integrated: 13,
    })
    const preservedIds = [
      "w-engines:Original_Transmorpher:refinement:blk-batch02:eff-coexist-hp",
      "w-engines:Hellfire_Gears:refinement:blk-batch02:eff-coexist-regen",
      "w-engines:Blazing_Laurel:refinement:blk-batch02:eff-coexist-crit",
      "w-engines:Ice-Jade_Teapot:refinement:blk-batch02:eff-coexist-dmg",
      "w-engines:Spectral_Gaze:refinement:blk-batch02:eff-coexist-reduceDef",
      "w-engines:Head_Lackey:refinement:blk-batch02:eff-coexist-resPen",
      "w-engines:Head_Lackey:refinement:blk-batch02:eff-coexist-dmg",
      "w-engines:Head_Lackey:refinement:blk-batch02:eff-coexist-regen",
    ]
    for (const optionId of preservedIds)
      expect(
        result.catalog.options.some((o) => o.optionId === optionId),
        optionId,
      ).toBe(true)
    // 无记录实体的来源 pack 保持 no-effect-record，不伪造覆盖。
    for (const pack of result.coverage.packs.filter(
      (entry) => entry.catalogEntityId === "w-engines:Identity_Base",
    ))
      expect(pack.status).toBe("no-effect-record")
  })

  it("compiles each supplement with the frozen refinement values, stages and layers", () => {
    const result = convertSource(
      batch02WengineData(),
      functions,
      [],
      batch02Supplements,
    )
    for (const expected of [
      {
        optionId: "nanoka:w-engines:12013:defense-on-hit",
        effectId: "w-engine:12013:nanoka:defense-on-hit",
        entity: "w-engines:Identity_Base",
        target: "self",
        layers: 1,
        unit: "ratio",
        values: { 1: 0.2, 2: 0.23, 3: 0.26, 4: 0.29, 5: 0.32 },
        operation: {
          kind: "stat-adjustment",
          stat: "defense",
          stage: "final-percentage",
        },
        beneficiary: { kind: "holder" },
      },
      {
        optionId: "nanoka:w-engines:14114:basic-attack-damage-stacks",
        effectId: "w-engine:14114:nanoka:basic-attack-damage-stacks",
        entity: "w-engines:Weapon_S_1141",
        target: "self",
        layers: 5,
        unit: "ratio",
        values: { 1: 0.06, 2: 0.075, 3: 0.09, 4: 0.105, 5: 0.12 },
        operation: { kind: "factor-contribution", channel: "damage-bonus" },
        beneficiary: { kind: "holder" },
      },
      {
        optionId: "nanoka:w-engines:12004:team-impact-after-ex",
        effectId: "w-engine:12004:nanoka:team-impact-after-ex",
        entity: "w-engines:Reverb_Mark_I",
        target: "team",
        layers: 1,
        unit: "ratio",
        values: { 1: 0.08, 2: 0.09, 3: 0.1, 4: 0.11, 5: 0.12 },
        operation: {
          kind: "stat-adjustment",
          stat: "impact",
          stage: "final-percentage",
        },
        beneficiary: { kind: "team" },
      },
      {
        optionId: "nanoka:w-engines:12009:impact-as-active-character",
        effectId: "w-engine:12009:nanoka:impact-as-active-character",
        entity: "w-engines:Vortex_Hatchet",
        target: "self",
        layers: 1,
        unit: "ratio",
        values: { 1: 0.09, 2: 0.1, 3: 0.11, 4: 0.12, 5: 0.13 },
        operation: {
          kind: "stat-adjustment",
          stat: "impact",
          stage: "final-percentage",
        },
        beneficiary: { kind: "holder" },
      },
      {
        optionId: "nanoka:w-engines:13005:impact-per-retained-layer",
        effectId: "w-engine:13005:nanoka:impact-per-retained-layer",
        entity: "w-engines:Steam_Oven",
        target: "self",
        layers: 8,
        unit: "ratio",
        values: { 1: 0.02, 2: 0.023, 3: 0.026, 4: 0.029, 5: 0.032 },
        operation: {
          kind: "stat-adjustment",
          stat: "impact",
          stage: "final-percentage",
        },
        beneficiary: { kind: "holder" },
      },
      {
        optionId: "nanoka:w-engines:13007:impact-on-hit",
        effectId: "w-engine:13007:nanoka:impact-on-hit",
        entity: "w-engines:Original_Transmorpher",
        target: "self",
        layers: 1,
        unit: "ratio",
        values: { 1: 0.1, 2: 0.115, 3: 0.13, 4: 0.145, 5: 0.16 },
        operation: {
          kind: "stat-adjustment",
          stat: "impact",
          stage: "final-percentage",
        },
        beneficiary: { kind: "holder" },
      },
      {
        optionId: "nanoka:w-engines:14110:impact-per-stack-after-ex",
        effectId: "w-engine:14110:nanoka:impact-per-stack-after-ex",
        entity: "w-engines:Hellfire_Gears",
        target: "self",
        layers: 2,
        unit: "ratio",
        values: { 1: 0.1, 2: 0.125, 3: 0.15, 4: 0.175, 5: 0.2 },
        operation: {
          kind: "stat-adjustment",
          stat: "impact",
          stage: "final-percentage",
        },
        beneficiary: { kind: "holder" },
      },
      {
        optionId: "nanoka:w-engines:14116:impact-after-assist",
        effectId: "w-engine:14116:nanoka:impact-after-assist",
        entity: "w-engines:Blazing_Laurel",
        target: "self",
        layers: 1,
        unit: "ratio",
        values: { 1: 0.25, 2: 0.2875, 3: 0.325, 4: 0.3625, 5: 0.4 },
        operation: {
          kind: "stat-adjustment",
          stat: "impact",
          stage: "final-percentage",
        },
        beneficiary: { kind: "holder" },
      },
      {
        optionId: "nanoka:w-engines:14125:impact-per-tea-layer",
        effectId: "w-engine:14125:nanoka:impact-per-tea-layer",
        entity: "w-engines:Ice-Jade_Teapot",
        target: "self",
        layers: 30,
        unit: "ratio",
        values: { 1: 0.007, 2: 0.0088, 3: 0.0105, 4: 0.0122, 5: 0.014 },
        operation: {
          kind: "stat-adjustment",
          stat: "impact",
          stage: "final-percentage",
        },
        beneficiary: { kind: "holder" },
      },
      {
        // 评审 R01 修复：1/2/3 有效魂锁是三个互斥完整档位（每档 0/1 开关），
        // 2 层=每层值×2、3 层=每层值×3+满层附加，一次给出完整加成。
        optionId: "nanoka:w-engines:14136:soul-chain-1-layer",
        effectId: "w-engine:14136:nanoka:soul-chain-1-layer",
        entity: "w-engines:Spectral_Gaze",
        target: "self",
        layers: 1,
        unit: "ratio",
        values: { 1: 0.04, 2: 0.046, 3: 0.052, 4: 0.058, 5: 0.064 },
        operation: {
          kind: "stat-adjustment",
          stat: "impact",
          stage: "final-percentage",
        },
        beneficiary: { kind: "holder" },
      },
      {
        optionId: "nanoka:w-engines:14136:soul-chain-2-layer",
        effectId: "w-engine:14136:nanoka:soul-chain-2-layer",
        entity: "w-engines:Spectral_Gaze",
        target: "self",
        layers: 1,
        unit: "ratio",
        values: { 1: 0.08, 2: 0.092, 3: 0.104, 4: 0.116, 5: 0.128 },
        operation: {
          kind: "stat-adjustment",
          stat: "impact",
          stage: "final-percentage",
        },
        beneficiary: { kind: "holder" },
      },
      {
        optionId: "nanoka:w-engines:14136:soul-chain-3-layer",
        effectId: "w-engine:14136:nanoka:soul-chain-3-layer",
        entity: "w-engines:Spectral_Gaze",
        target: "self",
        layers: 1,
        unit: "ratio",
        values: { 1: 0.2, 2: 0.23, 3: 0.26, 4: 0.29, 5: 0.32 },
        operation: {
          kind: "stat-adjustment",
          stat: "impact",
          stage: "final-percentage",
        },
        beneficiary: { kind: "holder" },
      },
      {
        optionId: "nanoka:w-engines:14157:fixed-impact-points",
        effectId: "w-engine:14157:nanoka:fixed-impact-points",
        entity: "w-engines:Head_Lackey",
        target: "self",
        layers: 1,
        unit: "impact-points",
        values: { 1: 30, 2: 33, 3: 36, 4: 39, 5: 42 },
        operation: {
          kind: "stat-adjustment",
          stat: "impact",
          stage: "final-fixed",
        },
        beneficiary: { kind: "holder" },
      },
    ]) {
      const option = result.catalog.options.find(
        (o) => o.optionId === expected.optionId,
      )!
      expect(option.catalogEntityId, expected.optionId).toBe(expected.entity)
      expect(option.target, expected.optionId).toBe(expected.target)
      expect(option.variants, expected.optionId).toHaveLength(1)
      expect(
        option.variants[0]!.configuration,
        expected.optionId,
      ).toMatchObject({ refinements: [1, 2, 3, 4, 5] })
      expect(option.variants[0]!.maximumLayers, expected.optionId).toBe(
        expected.layers,
      )
      expect(option.variants[0]!.effectIds, expected.optionId).toEqual([
        expected.effectId,
      ])
      const rule = result.definitions.effects.find(
        (entry): entry is ContributionRule =>
          entry.kind === "contribution" && entry.effectId === expected.effectId,
      )!
      expect(rule.operation, expected.optionId).toMatchObject(
        expected.operation,
      )
      expect(rule.beneficiary, expected.optionId).toEqual(expected.beneficiary)
      expect(rule.activation, expected.optionId).toMatchObject({
        kind: "supplied",
      })
      // 索魂三档位：目录选项与规则 supplied 激活同组互斥；其余补充无组。
      if (expected.optionId.startsWith("nanoka:w-engines:14136:soul-chain-")) {
        expect(option.exclusiveGroup, expected.optionId).toBe(
          "spectral-gaze:soul-chain-effective-layers",
        )
        expect(rule.activation, expected.optionId).toMatchObject({
          exclusiveGroup: "spectral-gaze:soul-chain-effective-layers",
        })
      } else {
        expect(option.exclusiveGroup, expected.optionId).toBeUndefined()
        expect(
          (rule.activation as { exclusiveGroup?: string }).exclusiveGroup,
          expected.optionId,
        ).toBeUndefined()
      }
      expect(rule.parameters.amount, expected.optionId).toMatchObject({
        kind: "by-rank",
        rank: "refinement",
        unit: expected.unit,
        values: expected.values,
      })
      expect(rule.source.references, expected.optionId).toEqual(
        ([1, 2, 3, 4, 5] as const).map((tier) => ({
          sourceId: "nanoka-integrated",
          version: "3.2",
          locale: "zh",
          resourcePath: `w-engines/${expected.effectId.split(":")[1]}/details.zh.json`,
          pointer: `/talents/${tier}/desc`,
        })),
      )
    }
    // 拘缚者只作用于普通攻击直伤（评审 R02 修复）：原始 basic 分类，或目录
    // 归一的普攻分类标签（skillTargets 展开的复合普攻身份）。
    const restrainer = result.definitions.effects.find(
      (entry): entry is ContributionRule =>
        entry.kind === "contribution" &&
        entry.effectId === "w-engine:14114:nanoka:basic-attack-damage-stacks",
    )!
    expect(restrainer.when).toEqual({
      kind: "all",
      conditions: [
        {
          kind: "one-of",
          fact: "hit.damageKind",
          values: ["regular", "sheer", "sharpen"],
        },
        {
          kind: "any",
          conditions: [
            { kind: "one-of", fact: "hit.skillCategory", values: ["basic"] },
            {
              kind: "one-of",
              fact: "hit.skillTag",
              values: ["zzz-hp:category:basic"],
            },
          ],
        },
      ],
    })
    // 其余 stat 型补充是实体作用域、无命中条件（受益不以命中元素或分类筛选）。
    for (const effectId of [
      "w-engine:12013:nanoka:defense-on-hit",
      "w-engine:14136:nanoka:soul-chain-3-layer",
    ]) {
      const rule = result.definitions.effects.find(
        (entry): entry is ContributionRule =>
          entry.kind === "contribution" && entry.effectId === effectId,
      )!
      expect(rule.scope).toBe("entity")
      expect(rule.when).toEqual({ kind: "constant", value: true })
    }
    // 旧的半状态拆分 ID 不再生成为目录选项。
    for (const removed of [
      "nanoka:w-engines:14136:impact-per-soul-chain-layer",
      "nanoka:w-engines:14136:soul-chain-full-stack-impact",
    ])
      expect(
        result.catalog.options.some((o) => o.optionId === removed),
        removed,
      ).toBe(false)
  })

  it("rejects fixed-source records that would double a supplemented clause", () => {
    const withDefense = batch02WengineData({
      Identity_Base: [
        batch01FixedEffect("eff-guard-def", "inCombatDefPercent", 20),
      ],
    })
    expect(() =>
      convertSource(withDefense, functions, [], batch02Supplements),
    ).toThrowError(
      /Supplement nanoka:w-engines:12013:defense-on-hit conflicts with the fixed-source record/,
    )
    const withBasicDamage = batch02WengineData({
      Weapon_S_1141: [batch01FixedEffect("eff-guard-dmg", "skillDmgBonus", 6)],
    })
    expect(() =>
      convertSource(withBasicDamage, functions, [], batch02Supplements),
    ).toThrowError(
      /Supplement nanoka:w-engines:14114:basic-attack-damage-stacks conflicts with the fixed-source record/,
    )
    // 重复补充防护按登记 stat 生效：把首席跟班的防护列表换成已有回能记录的
    // stat 后，同实体共存记录即触发拒绝（机制与真实 impact 编码等价）。
    const probe: Supplement = {
      ...batch02Supplements.find(
        (supplement) =>
          supplement.supplementId ===
          "nanoka:w-engines:14157:fixed-impact-points",
      )!,
      conflictingSourceStats: ["energyRegen"],
    }
    const replaced = batch02Supplements.map((supplement) =>
      supplement.supplementId === probe.supplementId ? probe : supplement,
    )
    expect(() =>
      convertSource(batch02WengineData(), functions, [], replaced),
    ).toThrowError(
      /Supplement nanoka:w-engines:14157:fixed-impact-points conflicts with the fixed-source record/,
    )
    // 共存的既有条款 stat 不在防护列表内：正常生成（前一用例已验证）。
    expect(() =>
      convertSource(batch02WengineData(), functions, [], batch02Supplements),
    ).not.toThrow()
  })
})
