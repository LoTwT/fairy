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
import { blazingLaurelR5Block } from "./fixtures/blazing-laurel-source.ts"
import { claretMindscape1Block } from "./fixtures/claret-mindscape1-source.ts"
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
    expect(result.definitions.revision).toBe("46")
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
    expect(result.definitions.revision).toBe("46")
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
    expect(result.definitions.revision).toBe("46")
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
    expect(result.definitions.revision).toBe("46")
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
    expect(result.definitions.revision).toBe("46")
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
    { id: "SuitFreedomBlues", name: "自由蓝调" },
    { id: "SuitProtoPunk", name: "原始朋克" },
    { id: "SuitKingoftheSummit", name: "山大王" },
  ],
})

/** 全部驱动盘越界/补充声明：二件套与本批的四件套按同一机制生成。 */
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
    const protoPunkIndex = protoPunkRecord.driveDiscs.findIndex(
      (disc) => disc.id === "SuitProtoPunk",
    )
    protoPunkRecord.driveDiscs[protoPunkIndex] = {
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
      ...(id === "Blazing_Laurel" && rank === 5
        ? [blazingLaurelR5Block()]
        : []),
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

/**
 * 增益修复批次 03（修订 18）的合成转换回归：C02 比利影画 4 改为命中局部
 * 暴击率显式输入、C13 流光咏叹四件套移除“目标当前失衡”受益条件，以及
 * M01 妮可影画 1、M17 青衣闪络电压、M18 珂蕾妲强化普攻二段三条代理人补充。
 * 防漂移守卫与定向重复补充防护按登记拒绝，不静默套用另一份含义。
 */
const batch03BillyEffect: SourceEffect = {
  id: "eff-ms4ebxf4-pk138x",
  origin: "",
  scope: "skill",
  applyTarget: "self",
  applySituation: "global",
  applyProfession: null,
  teamProfession: null,
  teamProfessionValues: null,
  teamProfessionMinCount: null,
  skillCategory: "special",
  skillSubcategoryId: "all-special-ms0fcqv7",
  skillTargets: [
    { category: "special", subcategoryId: "all-special-ms0fcqv7" },
  ],
  elementFilter: "all",
  kind: "stacked",
  stat: "skillDmgBonus",
  value: 0,
  stackable: false,
  maxStacks: 32,
  valuePerStack: 1,
  defaultStacks: 32,
  enabledDefault: true,
  note: "",
}

const batch03BaseEffect: SourceEffect = {
  id: "legacy-self-dmgBonus",
  origin: "",
  scope: "general",
  applyTarget: "self",
  applySituation: "stagger",
  applyProfession: null,
  teamProfession: null,
  teamProfessionValues: null,
  teamProfessionMinCount: null,
  skillSubcategoryId: null,
  elementFilter: "all",
  kind: "fixed",
  stat: "dmgBonus",
  value: 25,
  stackable: false,
  maxStacks: 1,
  valuePerStack: 0,
  defaultStacks: 1,
  enabledDefault: true,
  note: "",
}

/** C13 的冻结记录形态：额外带 appliesToAnomaly: true。 */
const batch03AriaDamageEffect: SourceEffect = {
  ...batch03BaseEffect,
  appliesToAnomaly: true,
}

const batch03AgentEntity = (
  id: string,
  name: string,
  mindscapeBlocks: Readonly<Record<number, SourceBlock4Test>> = {},
): SourceEntity => ({
  id,
  name,
  mindscapeBuffs: Array.from(
    { length: 7 },
    (_, rank): SourcePack =>
      rank in mindscapeBlocks
        ? {
            effectBlocks: [
              {
                id: mindscapeBlocks[rank]!.id,
                name: `影画${rank}`,
                note: mindscapeBlocks[rank]!.note,
                effects: [...mindscapeBlocks[rank]!.effects],
              },
            ],
          }
        : {},
  ),
})

interface SourceBlock4Test {
  id: string
  note: string
  effects: readonly SourceEffect[]
}

const batch03Data = (
  overrides: {
    billyEffect?: Partial<SourceEffect>
    ariaDamageEffect?: Partial<SourceEffect>
    extraAgentRecords?: Readonly<Record<string, SourceEffect[]>>
    skillSubcategories?: SourceData["skillSubcategories"]
  } = {},
): SourceData => ({
  agents: [
    batch03AgentEntity("billy", "比利", {
      4: {
        id: "blk-ms4ebxf4-o288xu",
        note: "[强化特殊技]命中敌人时，招式的暴击率随自身与目标之间的距离而提升；比利与目标距离越近，提升效果越显著，最高提升32%。",
        effects: [{ ...batch03BillyEffect, ...overrides.billyEffect }],
      },
    }),
    batch03AgentEntity("nicole", "妮可", {
      6: {
        id: "blk-legacy",
        note: "能量场对敌人造成伤害时，所有单位对该目标的暴击率提升1.5%，最多叠加10层，持续12秒，每层效果单独结算持续时间。",
        effects: [
          {
            ...batch03BaseEffect,
            id: "legacy-team-critRate",
            stat: "critRate",
            value: 0,
            kind: "stacked",
            stackable: true,
            maxStacks: 10,
            valuePerStack: 1.5,
            defaultStacks: 10,
            applyTarget: "team",
            applySituation: "global",
          },
        ],
      },
      ...(overrides.extraAgentRecords?.nicole
        ? {
            0: {
              id: "blk-extra",
              note: "",
              effects: overrides.extraAgentRecords.nicole,
            },
          }
        : {}),
    }),
    batch03AgentEntity("qingyi", "青衣", {
      6: {
        id: "blk-legacy",
        note: "[普通攻击：醉花月云转]的打断等级大幅提升，招式的暴击伤害额外提升100%。",
        effects: [
          {
            ...batch03BaseEffect,
            id: "legacy-self-critDmg",
            stat: "critDmg",
            value: 100,
            applySituation: "global",
            scope: "skill",
            skillCategory: "basic",
            skillSubcategoryId: "qingyi-basic-ms4bcr00",
            skillTargets: [
              { category: "basic", subcategoryId: "qingyi-basic-ms4bcr00" },
            ],
          },
        ],
      },
      ...(overrides.extraAgentRecords?.qingyi
        ? {
            0: {
              id: "blk-extra",
              note: "",
              effects: overrides.extraAgentRecords.qingyi,
            },
          }
        : {}),
    }),
    batch03AgentEntity("koleda", "珂蕾妲", {
      0: {
        id: "blk-mttou4li-pfihup",
        note: "消耗[熔炉升温]发动强化普攻时获得，持续40s",
        effects: [
          {
            ...batch03BaseEffect,
            id: "eff-mttou4li-rea0ai",
            stat: "dmgBonus",
            value: 35,
            applyTarget: "team",
            applySituation: "global",
          },
        ],
      },
      ...(overrides.extraAgentRecords?.koleda
        ? {
            4: {
              id: "blk-extra",
              note: "",
              effects: overrides.extraAgentRecords.koleda,
            },
          }
        : {}),
    }),
  ],
  driveDiscs: [
    {
      id: "SuitShiningAria",
      name: "流光咏叹",
      fourPieceBuffs: {
        effectBlocks: [
          {
            id: "blk-legacy",
            name: "4件套",
            note: "装备者发动[普通攻击]命中敌人时，自身异常精通提升36点，持续8秒，重复触发时刷新持续时间；当场上有敌人进入失衡状态时，装备者造成的伤害提升25%，持续18秒，重复触发时刷新持续时间。",
            effects: [
              {
                ...batch03BaseEffect,
                id: "legacy-self-mastery",
                stat: "mastery",
                value: 36,
                applySituation: "global",
              },
              { ...batch03AriaDamageEffect, ...overrides.ariaDamageEffect },
            ],
          },
        ],
      },
    },
  ],
  skillSubcategories: overrides.skillSubcategories ?? [],
  followUpSkillRules: [],
  wengines: [],
})

const batch03Supplements = SUPPLEMENTS.filter(
  (supplement) =>
    supplement.kind === "option" &&
    [
      "nanoka:nicole:mindscape-1-ex-damage",
      "nanoka:qingyi:flash-voltage-consumed-damage",
      "nanoka:koleda:enhanced-basic-second-per-layer",
    ].includes(supplement.supplementId),
)

describe("agent and drive-disc batch 03 corrections and supplements", () => {
  it("corrects Billy's M4 record into a hit-scope critical rate with an explicit clamped input", () => {
    const result = convertSource(batch03Data(), functions, [], [])
    const record = result.coverage.records.find(
      (r) =>
        r.pointer === "/agents/0/mindscapeBuffs/4/effectBlocks/0/effects/0",
    )!
    expect(record.status).toBe("corrected")
    expect(record.effectIds).toEqual([
      "agent:1081:zzz-hp:eff-ms4ebxf4-pk138x:blk-ms4ebxf4-o288xu:mindscape:4",
    ])
    const rule = result.definitions.effects.find(
      (r) =>
        r.effectId ===
        "agent:1081:zzz-hp:eff-ms4ebxf4-pk138x:blk-ms4ebxf4-o288xu:mindscape:4",
    ) as ContributionRule
    expect(rule.scope).toBe("hit")
    expect(rule.beneficiary).toEqual({ kind: "holder" })
    expect(rule.activation).toMatchObject({
      kind: "supplied",
      maximumLayers: { value: 1 },
    })
    expect(rule.parameters).toEqual({})
    expect(rule.operation).toMatchObject({
      kind: "stat-adjustment",
      stat: "criticalRate",
      stage: "direct",
    })
    const value = (rule.operation as { value: { kind: string } }).value
    expect(value.kind).toBe("minimum")
    const option = result.catalog.options.find(
      (o) =>
        o.optionId ===
        "agents:billy:mindscape:4:blk-ms4ebxf4-o288xu:eff-ms4ebxf4-pk138x",
    )!
    expect(option.name).toBe("影画4 · criticalRate")
    expect(option.variants[0]).toMatchObject({
      status: "corrected",
      maximumLayers: 1,
      configuration: { minimumMindscape: 4 },
      differences: ["billy-mindscape4-hit-scope-critical-rate"],
      inputs: [
        {
          name: "agent:1081:zzz-hp:eff-ms4ebxf4-pk138x:blk-ms4ebxf4-o288xu:mindscape:4:source",
          unit: "ratio",
        },
      ],
    })
  })

  it("rejects drifted Billy M4 encodings instead of re-layering another meaning", () => {
    const drifts: readonly Partial<SourceEffect>[] = [
      { maxStacks: 16 },
      { stat: "dmgBonus" },
      { valuePerStack: 2 },
      { skillSubcategoryId: null, skillTargets: [] },
    ]
    for (const drift of drifts)
      expect(
        () =>
          convertSource(batch03Data({ billyEffect: drift }), functions, [], []),
        JSON.stringify(drift),
      ).toThrowError(/Hit-scope direct-stat correction .* field drift/)
  })

  it("removes the Shining Aria stagger condition while keeping the mastery clause intact", () => {
    const result = convertSource(batch03Data(), functions, [], [])
    const ariaRule = result.definitions.effects.find(
      (r) =>
        r.effectId ===
        "disc:33600:zzz-hp:legacy-self-dmgBonus:blk-legacy:setPieces:4",
    ) as ContributionRule
    expect(ariaRule.when).toEqual({ kind: "all", conditions: [] })
    expect(ariaRule.parameters).toMatchObject({
      amount: { kind: "constant", value: 0.25 },
    })
    const ariaOption = result.catalog.options.find(
      (o) =>
        o.optionId ===
        "drive-discs:SuitShiningAria:setPieces:4:blk-legacy:legacy-self-dmgBonus",
    )!
    expect(ariaOption.target).toBe("self")
    expect(ariaOption.variants[0]).toMatchObject({
      status: "corrected",
      maximumLayers: 1,
      differences: ["shining-aria-stagger-entry-triggered-state"],
    })
    // 独立的 +36 异常精通条款保持原样：general 状态、未被修正触碰。
    const masteryRule = result.definitions.effects.find(
      (r) =>
        r.effectId ===
        "disc:33600:zzz-hp:legacy-self-mastery:blk-legacy:setPieces:4",
    ) as ContributionRule
    expect(masteryRule.when).toEqual({ kind: "all", conditions: [] })
    expect(masteryRule.operation).toMatchObject({
      kind: "stat-adjustment",
      stat: "anomalyProficiency",
      stage: "final-fixed",
    })
    const masteryOption = result.catalog.options.find(
      (o) =>
        o.optionId ===
        "drive-discs:SuitShiningAria:setPieces:4:blk-legacy:legacy-self-mastery",
    )!
    expect(masteryOption.variants[0]!.status).toBe("converted")
    expect(masteryOption.variants[0]!.differences).toEqual([])
  })

  it("rejects a Shining Aria record whose stagger encoding drifted", () => {
    const drifts: readonly Partial<SourceEffect>[] = [
      { applySituation: "global" },
      { value: 30 },
      { stat: "skillDmgBonus" },
    ]
    for (const drift of drifts)
      expect(
        () =>
          convertSource(
            batch03Data({ ariaDamageEffect: drift }),
            functions,
            [],
            [],
          ),
        JSON.stringify(drift),
      ).toThrowError(/Triggered-state correction expects/)
  })

  it("registers the three agent supplements with their gates, inputs and named target", () => {
    const result = convertSource(
      batch03Data(),
      functions,
      [],
      batch03Supplements,
    )
    expect(result.coverage.summary.supplements).toMatchObject({
      records: 3,
      rules: 3,
      options: 3,
      integrated: 3,
    })
    const nicole = result.catalog.options.find(
      (o) => o.optionId === "nanoka:agents:nicole:mindscape-1-ex-damage",
    )!
    expect(nicole.target).toBe("self")
    expect(nicole.variants[0]).toMatchObject({
      status: "converted",
      maximumLayers: 1,
      configuration: { minimumMindscape: 1 },
      inputs: [],
    })
    const nicoleRule = result.definitions.effects.find(
      (r) =>
        r.effectId === "agent:1031:nanoka:mindscape-1-ex-damage:mindscape:1",
    ) as ContributionRule
    expect(nicoleRule.config).toMatchObject({
      kind: "compare-number",
      operator: "gte",
      right: { value: 1 },
    })
    expect(
      JSON.stringify(nicoleRule.when).includes("all-special-ms0fcqv7"),
    ).toBe(true)

    const qingyi = result.catalog.options.find(
      (o) =>
        o.optionId === "nanoka:agents:qingyi:flash-voltage-consumed-damage",
    )!
    expect(qingyi.variants[0]!.inputs).toHaveLength(1)
    expect(qingyi.variants[0]!.inputs[0]).toMatchObject({
      unit: "ratio",
    })
    const qingyiRule = result.definitions.effects.find(
      (r) =>
        r.effectId ===
        "agent:1251:nanoka:flash-voltage-consumed-damage:mindscape:0",
    ) as ContributionRule
    expect(qingyiRule.parameters).toMatchObject({
      threshold: { value: -0.75 },
      rate: { value: 1 },
      cap: { value: 0.25 },
    })
    expect(
      JSON.stringify(qingyiRule.when).includes("qingyi-basic-ms4bcr00"),
    ).toBe(true)

    const koleda = result.catalog.options.find(
      (o) =>
        o.optionId === "nanoka:agents:koleda:enhanced-basic-second-per-layer",
    )!
    expect(koleda.variants[0]).toMatchObject({
      maximumLayers: 2,
      configuration: { potentialLevels: [1, 2, 3, 4, 5, 6] },
    })
    const koledaRule = result.definitions.effects.find(
      (r) =>
        r.effectId ===
        "agent:1101:nanoka:enhanced-basic-second-per-layer:mindscape:0",
    ) as ContributionRule
    expect(koledaRule.parameters).toMatchObject({
      amount: { value: 0.1 },
    })
    expect(
      JSON.stringify(koledaRule.when).includes("koleda-enhanced-basic-second"),
    ).toBe(true)
    // 具名目标进入目录：upstreamId 为 null、归属珂蕾妲、basic 分类。
    expect(result.catalog.skillTargets).toContainEqual({
      targetId: "zzz-hp:skill:koleda-enhanced-basic-second",
      upstreamId: null,
      agentEntityId: "1101",
      category: "basic",
      name: "强化普攻第二段",
      countsAsFollowUp: false,
    })
  })

  it("rejects fixed-source records that would double a supplemented clause", () => {
    // 妮可：特殊技锚点上的增伤机器记录会与影画 1 补充重复贡献。
    const nicoleConflict: SourceEffect = {
      ...batch03BaseEffect,
      id: "eff-conflict",
      stat: "skillDmgBonus",
      value: 16,
      scope: "skill",
      applySituation: "global",
      skillCategory: "special",
      skillSubcategoryId: "all-special-ms0fcqv7",
      skillTargets: [
        { category: "special", subcategoryId: "all-special-ms0fcqv7" },
      ],
    }
    expect(() =>
      convertSource(
        batch03Data({ extraAgentRecords: { nicole: [nicoleConflict] } }),
        functions,
        [],
        batch03Supplements,
      ),
    ).toThrowError(
      /Supplement nanoka:nicole:mindscape-1-ex-damage conflicts with the fixed-source record .* on the registered skill targets/,
    )
    // 青衣：醉花月云转锚点上的增伤记录触发定向防护。
    const qingyiConflict: SourceEffect = {
      ...nicoleConflict,
      id: "eff-conflict-qingyi",
      stat: "dmgBonus",
      skillCategory: "basic",
      skillSubcategoryId: "qingyi-basic-ms4bcr00",
      skillTargets: [
        { category: "basic", subcategoryId: "qingyi-basic-ms4bcr00" },
      ],
    }
    expect(() =>
      convertSource(
        batch03Data({ extraAgentRecords: { qingyi: [qingyiConflict] } }),
        functions,
        [],
        batch03Supplements,
      ),
    ).toThrowError(
      /Supplement nanoka:qingyi:flash-voltage-consumed-damage conflicts with the fixed-source record/,
    )
    // 珂蕾妲：basic 锚点上的增伤记录触发定向防护；既有全队 35% 不受影响
    //（general 记录没有技能目标锚点，前一用例已验证可共存）。
    const koledaConflict: SourceEffect = {
      ...nicoleConflict,
      id: "eff-conflict-koleda",
      skillCategory: "basic",
      skillSubcategoryId: null,
      skillTargets: [{ category: "basic", subcategoryId: null }],
    }
    expect(() =>
      convertSource(
        batch03Data({ extraAgentRecords: { koleda: [koledaConflict] } }),
        functions,
        [],
        batch03Supplements,
      ),
    ).toThrowError(
      /Supplement nanoka:koleda:enhanced-basic-second-per-layer conflicts with the fixed-source record/,
    )
  })

  it("rejects a supplement skill target colliding with a fixed-source anchor", () => {
    const withUpstreamTarget = batch03Data({
      skillSubcategories: [
        {
          id: "koleda-enhanced-basic-second",
          agentId: "koleda",
          categoryId: "basic",
          name: "强化普攻第二段",
        },
      ],
    })
    expect(() =>
      convertSource(withUpstreamTarget, functions, [], batch03Supplements),
    ).toThrowError(
      /Supplement skill target zzz-hp:skill:koleda-enhanced-basic-second collides with a fixed-source or declared target/,
    )
  })
})

/**
 * 莱特（1161）[昂扬]完整状态的合成转换：基础记录改写为一条完整贡献
 * （冲击力输入 + 目录层数派生 + 总上限），影画 2 的 120% 由配置修改直接
 * 作用于同一条贡献；被取代的三条部分记录只保留 unsupported 迁移入口，
 * 不再生成可执行贡献。记录按稳定身份定位：agents/blocks/effects 数组
 * 重排只改变 Pointer。固定来源的编码、块 note 或读取字段漂移即拒绝。
 */
const lighterElationBaseBlockNote =
  "队伍中存在[强攻]角色或与自身阵营相同的角色时触发：\n[士气喷发]状态下，莱特第五段[普通攻击]命中敌人时，全队角色获得一层[昂扬]，最多叠加20层，持续30秒，重复触发时刷新持续时间；\n每拥有一层[昂扬]，代理人造成的冰属性伤害和火属性伤害提升1.25%，获得[昂扬]时，若莱特的冲击力高于170点，每超过10点冲击力会使每层[昂扬]提供的增益效果额外提升0.25%；队伍中任意角色发动[连携技]时，会刷新全队角色[昂扬]的持续时间；\n[昂扬]最多使代理人造成的冰属性伤害和火属性伤害提升75%。"

const lighterElationM2BlockNote =
  "通过[核心被动：助燃剂]对敌人施加[溃败]效果时，目标的失衡易伤倍率提升25%；[额外能力：斗志昂扬]中由[昂扬]提供的冰属性伤害和火属性伤害增益效果提升至原本的120%。"

const lighterElationStacked = (rank: 0 | 2): SourceEffect => ({
  id: rank === 0 ? "eff-ms4aoho0-q3wbdv" : "eff-ms4b0whf-x6n1xw",
  scope: "general",
  applyTarget: "team",
  applySituation: "global",
  applyProfession: null,
  teamProfession: null,
  teamProfessionValues: null,
  teamProfessionMinCount: null,
  skillSubcategoryId: null,
  elementFilter: rank === 0 ? ["冰", "火"] : ["火", "冰"],
  kind: "stacked",
  stat: "dmgBonus",
  value: 0,
  stackable: false,
  maxStacks: 20,
  valuePerStack: rank === 0 ? 1.25 : 0.25,
  defaultStacks: 20,
  enabledDefault: true,
  note: "",
})

const lighterElationConversion = (rank: 0 | 2): SourceEffect => ({
  id: rank === 0 ? "eff-ms4atnfh-29yr0r" : "eff-ms4b2g6y-2q6n1w",
  scope: "general",
  applyTarget: "team",
  applySituation: "global",
  applyProfession: null,
  teamProfession: null,
  teamProfessionValues: null,
  teamProfessionMinCount: null,
  skillSubcategoryId: null,
  elementFilter: ["火", "冰"],
  kind: "convert",
  stat: "dmgBonus",
  value: 0,
  stackable: false,
  maxStacks: 1,
  valuePerStack: 0,
  defaultStacks: 1,
  enabledDefault: true,
  note: "",
  convert: {
    from: "impact",
    panelSource: "manual",
    ratioPercent: rank === 0 ? 50 : 10,
    cap: rank === 0 ? 50 : 10,
    defaultBase: 270,
    initialBase: 170,
  },
})

const lighterElationStagger: SourceEffect = {
  id: "legacy-team-staggerVulnerable",
  scope: "general",
  applyTarget: "team",
  applySituation: "global",
  applyProfession: null,
  teamProfession: null,
  teamProfessionValues: null,
  teamProfessionMinCount: null,
  skillSubcategoryId: null,
  elementFilter: "all",
  kind: "fixed",
  stat: "staggerVulnerable",
  value: 25,
  stackable: false,
  maxStacks: 1,
  valuePerStack: 0,
  defaultStacks: 1,
  enabledDefault: true,
  note: "",
}

interface LighterElationOptions {
  readonly extraAgent?: boolean
}

const lighterElationData = (
  options: LighterElationOptions = {},
): SourceData => {
  const lighter: SourceEntity = {
    id: "lighter",
    name: "莱特",
    element: "火",
    profession: "击破",
    mindscapeBuffs: [
      {
        effectBlocks: [
          {
            id: "blk-ms4aoho0-grnxav",
            name: "额外能力：斗志昂扬",
            note: lighterElationBaseBlockNote,
            effects: [lighterElationStacked(0), lighterElationConversion(0)],
          },
        ],
      },
      {},
      {
        effectBlocks: [
          {
            id: "blk-legacy",
            name: "影画2",
            note: lighterElationM2BlockNote,
            effects: [
              lighterElationStagger,
              lighterElationStacked(2),
              lighterElationConversion(2),
            ],
          },
        ],
      },
      {},
      {},
      {},
      {},
    ],
  }
  // 占位的第二实体使用未登记纠错语义的代理人（anby）：星见雅实体自批次 14
  // 起携带 settlement-element-scope 登记身份存在性检查，空 pack 的星见雅占位
  // 会被拒绝；昂扬分组测试的语境只需要一个无关的在场实体。
  const anby: SourceEntity = {
    id: "anby",
    name: "安比",
    element: "电",
    profession: "击破",
    mindscapeBuffs: [{}, {}, {}, {}, {}, {}, {}],
  }
  return {
    agents: options.extraAgent ? [lighter, anby] : [lighter],
    wengines: [],
    driveDiscs: [],
    skillSubcategories: [],
    followUpSkillRules: [],
  }
}

/**
 * 另一实体（安比 1011）的独立记录合法复用莱特基础记录的局部块/效果 ID：
 * 局部 ID 只在实体内部唯一，因此规则查找必须用含实体身份的完整 effectId。
 */
const anbyElationLocalIdReuse = (): SourceEntity => ({
  id: "anby",
  name: "安比",
  element: "电",
  profession: "击破",
  mindscapeBuffs: [
    {
      effectBlocks: [
        {
          id: "blk-ms4aoho0-grnxav",
          name: "额外能力：斗志昂扬",
          note: lighterElationBaseBlockNote,
          effects: [lighterElationStacked(0)],
        },
      ],
    },
    {},
    {},
    {},
    {},
    {},
    {},
  ],
})

const completeStateOptionId =
  "agents:lighter:mindscape:0:elation-complete-state"
const completeStateEffectId =
  "agent:1161:zzz-hp:eff-ms4aoho0-q3wbdv:blk-ms4aoho0-grnxav:mindscape:0"
const scaleModificationId =
  "agent:1161:zzz-hp:complete-state-elation-scale:eff-ms4b0whf-x6n1xw"
const replacedRuleIds = [
  "agent:1161:zzz-hp:eff-ms4atnfh-29yr0r:blk-ms4aoho0-grnxav:mindscape:0",
  "agent:1161:zzz-hp:eff-ms4b0whf-x6n1xw:blk-legacy:mindscape:2",
  "agent:1161:zzz-hp:eff-ms4b2g6y-2q6n1w:blk-legacy:mindscape:2",
] as const
const legacyPartialOptionIds = [
  "agents:lighter:mindscape:0:blk-ms4aoho0-grnxav:eff-ms4aoho0-q3wbdv",
  "agents:lighter:mindscape:0:blk-ms4aoho0-grnxav:eff-ms4atnfh-29yr0r",
  "agents:lighter:mindscape:2:blk-legacy:eff-ms4b0whf-x6n1xw",
  "agents:lighter:mindscape:2:blk-legacy:eff-ms4b2g6y-2q6n1w",
] as const

describe("lighter elation complete state", () => {
  it("compiles one complete contribution and one scale modification", () => {
    const result = convertSource(lighterElationData(), functions, [], [])
    const completeRule = result.definitions.effects.find(
      (entry): entry is ContributionRule =>
        entry.kind === "contribution" &&
        entry.effectId === completeStateEffectId,
    )
    expect(completeRule).toBeDefined()
    expect(completeRule!.operation.kind).toBe("factor-contribution")
    expect(completeRule!.activation).toEqual({
      kind: "supplied",
      maximumLayers: { kind: "literal", unit: "count", value: 1 },
    })
    // 命中元素：冰/火（来源编码）之外显式覆盖烈霜。
    expect(JSON.stringify(completeRule!.when)).toContain("frost")
    // 被取代的三条记录不再生成可执行贡献，M2 不再有第二份完整状态。
    for (const effectId of replacedRuleIds)
      expect(
        result.definitions.effects.some((rule) => rule.effectId === effectId),
        effectId,
      ).toBe(false)
    expect(
      result.definitions.effects.some((rule) =>
        rule.effectId.includes("complete-state-elation-m2"),
      ),
    ).toBe(false)
    const scale = result.definitions.effects.find(
      (rule) => rule.effectId === scaleModificationId,
    )
    expect(scale).toMatchObject({
      kind: "modification",
      phase: "configuration",
      target: { kind: "effect", effectId: completeStateEffectId },
      modifications: [
        {
          field: "output",
          change: { operator: "scale", value: { value: 1.2 } },
        },
      ],
    })
    const option = result.catalog.options.find(
      (candidate) => candidate.optionId === completeStateOptionId,
    )!
    expect(option.target).toBe("team")
    expect(option.variants).toHaveLength(1)
    const variant = option.variants[0]!
    expect(variant.status).toBe("corrected")
    expect(variant.effectIds).toEqual([completeStateEffectId])
    expect(variant.maximumLayers).toBe(20)
    expect(variant.applicability).toEqual({})
    expect(variant.layerCountInputName).toContain(":layers")
    expect(variant.inputs.map((entry) => entry.name)).toEqual([
      expect.stringContaining(":source"),
    ])
    // 完整状态选项在目录中唯一可选；M2 不再有第二个选项。
    const selectable = result.catalog.options.filter((candidate) =>
      candidate.variants.some(
        (entry) =>
          entry.status === "corrected" &&
          entry.effectIds.includes(completeStateEffectId as never),
      ),
    )
    expect(selectable.map((candidate) => candidate.optionId)).toEqual([
      completeStateOptionId,
    ])
    // 四条旧部分选项继续作为语义冲突迁移入口，来源位置保留在覆盖报告。
    for (const optionId of legacyPartialOptionIds) {
      const migrated = result.catalog.options.find(
        (candidate) => candidate.optionId === optionId,
      )!
      expect(migrated.variants[0]!.status, optionId).toBe("unsupported")
      expect(migrated.variants[0]!.reason, optionId).toBe("semantic-conflict")
      expect(migrated.variants[0]!.effectIds, optionId).toEqual([])
      expect(migrated.variants[0]!.explanation, optionId).toContain(
        "昂扬 · 完整状态",
      )
    }
    for (const pointer of [
      "/agents/0/mindscapeBuffs/0/effectBlocks/0/effects/0",
      "/agents/0/mindscapeBuffs/0/effectBlocks/0/effects/1",
      "/agents/0/mindscapeBuffs/2/effectBlocks/0/effects/1",
      "/agents/0/mindscapeBuffs/2/effectBlocks/0/effects/2",
    ]) {
      const record = result.coverage.records.find(
        (entry) => entry.pointer === pointer,
      )!
      expect(record.status, pointer).toBe("unsupported")
      expect(record.reason, pointer).toBe("semantic-conflict")
      expect(record.effectIds, pointer).toEqual([])
    }
    expect(result.coverage.summary).toMatchObject({
      rawEffects: 5,
      unsupported: 4,
    })
    // 独立的影画 2 失衡易伤保持可用。
    const stagger = result.catalog.options.find((candidate) =>
      candidate.optionId.endsWith("legacy-team-staggerVulnerable"),
    )!
    expect(stagger.variants[0]!.status).toBe("converted")
  })

  it("keeps stable identities when agents, blocks and effects are reordered", () => {
    const reordered = lighterElationData({ extraAgent: true })
    reordered.agents = reordered.agents.toReversed()
    const lighter = reordered.agents.find((agent) => agent.id === "lighter")!
    lighter.mindscapeBuffs![0]!.effectBlocks =
      lighter.mindscapeBuffs![0]!.effectBlocks!.toReversed()
    for (const block of lighter.mindscapeBuffs![0]!.effectBlocks!)
      block.effects = block.effects.toReversed()
    for (const block of lighter.mindscapeBuffs![2]!.effectBlocks!)
      block.effects = block.effects.toReversed()
    const baseline = convertSource(lighterElationData(), functions, [], [])
    const result = convertSource(reordered, functions, [], [])
    const option = result.catalog.options.find(
      (candidate) => candidate.optionId === completeStateOptionId,
    )!
    expect(option.variants[0]!.effectIds).toEqual([completeStateEffectId])
    expect(option.variants[0]!.inputs[0]!.name).toBe(
      baseline.catalog.options.find(
        (candidate) => candidate.optionId === completeStateOptionId,
      )!.variants[0]!.inputs[0]!.name,
    )
    expect(
      result.definitions.effects.find(
        (rule) => rule.effectId === scaleModificationId,
      ),
    ).toMatchObject({
      target: { kind: "effect", effectId: completeStateEffectId },
    })
    // 记录顺序变化只移动 Pointer，不改变稳定身份与选项去重。
    const baseRecord = result.coverage.records.find((entry) =>
      entry.optionId.endsWith("eff-ms4aoho0-q3wbdv"),
    )!
    expect(baseRecord.pointer).toBe(
      "/agents/1/mindscapeBuffs/0/effectBlocks/0/effects/1",
    )
    expect(result.coverage.summary.entities).toBe(2)
  })

  it("skips the group when absent and rejects partial or duplicated records", () => {
    // 同上：占位实体用未登记纠错语义的代理人（anby），空 pack 的星见雅
    // 占位会触发批次 14 的登记身份存在性检查。
    const withoutGroup = convertSource(
      {
        agents: [
          {
            id: "anby",
            name: "安比",
            element: "电",
            profession: "击破",
            mindscapeBuffs: [{}, {}, {}, {}, {}, {}, {}],
          },
        ],
        wengines: [],
        driveDiscs: [],
        skillSubcategories: [],
        followUpSkillRules: [],
      },
      functions,
      [],
      [],
    )
    expect(
      withoutGroup.catalog.options.some(
        (candidate) => candidate.optionId === completeStateOptionId,
      ),
    ).toBe(false)
    const missing = lighterElationData()
    missing.agents[0]!.mindscapeBuffs![2]!.effectBlocks![0]!.effects = [
      lighterElationStagger,
      lighterElationStacked(2),
    ]
    expect(() => convertSource(missing, functions, [], [])).toThrow(
      /Complete-state elation lost its source record/,
    )
    const orphan = lighterElationData()
    orphan.agents[0]!.mindscapeBuffs![0] = {}
    expect(() => convertSource(orphan, functions, [], [])).toThrow(
      /Complete-state elation registration lost its base record/,
    )
    const duplicated = lighterElationData()
    duplicated.agents[0]!.mindscapeBuffs![0]!.effectBlocks![0]!.effects = [
      lighterElationStacked(0),
      { ...lighterElationStacked(0) },
    ]
    expect(() => convertSource(duplicated, functions, [], [])).toThrow(
      /Duplicate source effect/,
    )
  })

  it("rejects raw and normalized field drift, including block note changes", () => {
    const drift = (mutate: (effects: SourceEffect[]) => void) => {
      const source = lighterElationData()
      mutate(source.agents[0]!.mindscapeBuffs![0]!.effectBlocks![0]!.effects)
      return () => convertSource(source, functions, [], [])
    }
    // 每层值属于登记的来源编码：改值先触发字段漂移拒绝（逐字段守卫）。
    expect(
      drift((effects) => {
        effects[0]!.valuePerStack = 2
      }),
    ).toThrow(/field drift.*valuePerStack=2/)
    expect(
      drift((effects) => {
        effects[0]!.appliesToAnomaly = false
      }),
    ).toThrow(/field drift/)
    expect(
      drift((effects) => {
        effects[1]!.convert!.panelSource = "final"
      }),
    ).toThrow(/field drift/)
    expect(
      drift((effects) => {
        effects[1]!.convert!.defaultBase = 999
      }),
    ).toThrow(/field drift/)
    const m2Drift = (
      mutate: (effects: SourceEffect[]) => void,
    ): (() => ReturnType<typeof convertSource>) => {
      const source = lighterElationData()
      mutate(source.agents[0]!.mindscapeBuffs![2]!.effectBlocks![0]!.effects)
      return () => convertSource(source, functions, [], [])
    }
    expect(
      m2Drift((effects) => {
        effects[1]!.elementFilter = ["火"]
      }),
    ).toThrow(/field drift/)
    expect(
      m2Drift((effects) => {
        effects[2]!.convert!.panelSource = "final"
      }),
    ).toThrow(/field drift/)
    expect(
      m2Drift((effects) => {
        effects[2]!.convert!.defaultBase = 999
      }),
    ).toThrow(/field drift/)
    const noteDrift = lighterElationData()
    noteDrift.agents[0]!.mindscapeBuffs![0]!.effectBlocks![0]!.note =
      "每层昂扬使代理人造成的冰属性伤害和火属性伤害提升2.5%。"
    expect(() => convertSource(noteDrift, functions, [], [])).toThrow(
      /block note drift/,
    )
    const m2NoteDrift = lighterElationData()
    m2NoteDrift.agents[0]!.mindscapeBuffs![2]!.effectBlocks![0]!.note =
      "通过[核心被动：助燃剂]对敌人施加[溃败]效果时，目标的失衡易伤倍率提升25%。"
    expect(() => convertSource(m2NoteDrift, functions, [], [])).toThrow(
      /block note drift/,
    )
    // 仅规范化副本漂移也必须拒绝：归一化不改变登记语义。
    const normalizedDrift: SourceNormalization = {
      ...functions,
      normalizeAgent: (entity) => {
        const normalized = structuredClone(functions.normalizeAgent(entity))
        const effects =
          normalized.mindscapeBuffs?.[0]?.effectBlocks?.[0]?.effects
        if (effects?.[0]?.id === "eff-ms4aoho0-q3wbdv")
          effects[0]!.valuePerStack = 9
        return normalized
      },
    }
    expect(() =>
      convertSource(lighterElationData(), normalizedDrift, [], []),
    ).toThrow(/normalized field drift/)
  })

  it("resolves the base contribution by full identity when another entity reuses local ids", () => {
    const source = lighterElationData()
    source.agents = [source.agents[0]!, anbyElationLocalIdReuse()]
    const result = convertSource(source, functions, [], [])
    // 昂扬完整状态仍精确指向莱特的完整贡献；局部 ID 相同的另一实体记录
    // 不参与定位。
    const option = result.catalog.options.find(
      (candidate) => candidate.optionId === completeStateOptionId,
    )!
    expect(option.variants[0]!.effectIds).toEqual([completeStateEffectId])
    // 两份实体规则各自保留：安比的记录编译为自己的完整身份规则，
    // 不被莱特的贡献顶替，也不影响莱特规则的形态。
    const reused = result.definitions.effects.find(
      (rule) =>
        rule.effectId ===
        "agent:1011:zzz-hp:eff-ms4aoho0-q3wbdv:blk-ms4aoho0-grnxav:mindscape:0",
    )
    expect(reused).toMatchObject({ kind: "contribution" })
    expect(
      result.definitions.effects.find(
        (rule) => rule.effectId === completeStateEffectId,
      ),
    ).toMatchObject({
      kind: "contribution",
      activation: {
        kind: "supplied",
        maximumLayers: { kind: "literal", unit: "count", value: 1 },
      },
    })
  })

  it("verifies registered elation records before generic degradations", () => {
    // 规范化删除任一被取代记录：必须按具名登记拒绝，不能降级成
    // “上游加载规范化移除了该原始记录”的通用 unsupported。
    const normalizedRemoval = (effectId: string): SourceNormalization => ({
      ...functions,
      normalizeAgent: (entity) => {
        const normalized = structuredClone(functions.normalizeAgent(entity))
        for (const pack of normalized.mindscapeBuffs ?? [])
          for (const block of pack.effectBlocks ?? []) {
            const index = block.effects.findIndex(
              (entry) => entry.id === effectId,
            )
            if (index >= 0) block.effects.splice(index, 1)
          }
        return normalized
      },
    })
    for (const effectId of [
      "eff-ms4atnfh-29yr0r",
      "eff-ms4b0whf-x6n1xw",
      "eff-ms4b2g6y-2q6n1w",
    ])
      expect(
        () =>
          convertSource(
            lighterElationData(),
            normalizedRemoval(effectId),
            [],
            [],
          ),
        effectId,
      ).toThrow(/lost the normalized record/)
    // 编码变义（stat 改为公式超范围的 special）：同样在通用降级前拒绝。
    const statDrift = lighterElationData()
    statDrift.agents[0]!.mindscapeBuffs![2]!.effectBlocks![0]!.effects[2]!.stat =
      "special"
    expect(() => convertSource(statDrift, functions, [], [])).toThrow(
      /field drift.*stat="special"/,
    )
  })

  it("rejects every registered elation note clause the formula depends on", () => {
    const noteDrift = (
      from: string,
      to: string,
    ): (() => ReturnType<typeof convertSource>) => {
      const source = lighterElationData()
      const block = source.agents[0]!.mindscapeBuffs![0]!.effectBlocks![0]!
      block.note = block.note!.replace(from, to)
      return () => convertSource(source, functions, [], [])
    }
    expect(noteDrift("高于170点", "高于180点")).toThrow(/block note drift/)
    expect(noteDrift("最多叠加20层", "最多叠加30层")).toThrow(
      /block note drift/,
    )
    expect(noteDrift("获得[昂扬]时", "每次造成伤害时")).toThrow(
      /block note drift/,
    )
    // 固定正文正例仍然通过。
    expect(
      convertSource(
        lighterElationData(),
        functions,
        [],
        [],
      ).definitions.effects.some(
        (rule) => rule.effectId === completeStateEffectId,
      ),
    ).toBe(true)
  })
})

/**
 * 增益修复批次 06（修订 21）：代理人冲击力与回能六项补充的登记形态、证据
 * rank 映射与具名来源上下文守卫。数值断言来自冻结 Nanoka 3.2 逐档原文
 * （中英文交叉核对），不从生成器反推；证据摘要在生成路径由
 * verifyStaticEffectsEvidence 逐条核对（含被动行 rank 与 data.json level
 * 元数据的映射）。守卫按真实固定源上下文登记：三项核心被动条款锚定各自
 * mindscape rank 0 的 blk-legacy（冻结 note 关键文本），两条影画 4 条款
 * 登记 rank 4 的真实空 pack，凯撒登记 rank 0 无攻防转换编码的真实缺失。
 */
const batch06SupplementIds = [
  "nanoka:agents:caesar:stance-switch-impact",
  "nanoka:agents:lighter:morale-burst-impact",
  "nanoka:agents:jufufu:tigers-roar-impact",
  "nanoka:agents:dialyn:initial-crit-rate-impact",
  "nanoka:agents:lighter:mindscape-4-frontline-energy-regen",
  "nanoka:agents:alexandrina:mindscape-4-deployed-dolls-energy-regen",
] as const

const batch06Supplements = SUPPLEMENTS.filter((supplement) =>
  (batch06SupplementIds as readonly string[]).includes(supplement.supplementId),
)

/**
 * 批次 06 的固定来源上下文夹具：块 id 与 note 均取自冻结 fac62407 的真实
 * 内容（莱特/橘福福/琉音的核心被动 blk-legacy 原文、橘福福影画 4 与琉音
 * 影画 4 的真实记录），守卫按这些真实上下文登记。
 */
const batch06Data = (
  overrides: {
    extraAgentRecords?: Readonly<Record<string, SourceEffect[]>>
    extraPacks?: Readonly<
      Record<string, { rank: number; block: SourceBlock4Test }>
    >
  } = {},
): SourceData => {
  const agent = (
    id: string,
    name: string,
    blocks: Readonly<Record<number, SourceBlock4Test>> = {},
  ) =>
    batch03AgentEntity(
      id,
      name,
      Object.fromEntries(
        Object.entries(blocks).map(([rank, block]) => [
          Number(rank),
          {
            ...block,
            effects: [
              ...block.effects,
              ...(overrides.extraAgentRecords?.[id] ?? []),
            ],
          },
        ]),
      ),
    )
  return {
    agents: [
      agent("caesar", "凯撒", {
        0: {
          id: "blk-legacy",
          note: "[荣光之盾]存在期间，持有者的攻击力提升1000点，[荣光之盾]效果结束后，该增益效果仍然保留，持续5秒。",
          effects: [
            {
              ...batch03BaseEffect,
              id: "legacy-team-atk",
              stat: "atk",
              value: 1000,
              applyTarget: "team",
              applySituation: "global",
            },
          ],
        },
        ...(overrides.extraPacks?.caesar
          ? {
              [overrides.extraPacks.caesar.rank]:
                overrides.extraPacks.caesar.block,
            }
          : {}),
      }),
      agent("lighter", "莱特", {
        0: {
          id: "blk-legacy",
          note: "[士气喷发]状态下，轻拳起攻或刺拳连击命中敌人时，目标的冰属性伤害抗性和火属性伤害抗性降低15%，持续30秒；",
          effects: [
            {
              ...batch03BaseEffect,
              id: "legacy-team-resPen",
              stat: "resPen",
              value: 15,
              applyTarget: "team",
              applySituation: "global",
            },
          ],
        },
        ...(overrides.extraPacks?.lighter
          ? {
              [overrides.extraPacks.lighter.rank]:
                overrides.extraPacks.lighter.block,
            }
          : {}),
      }),
      agent("alexandrina", "丽娜", {
        0: {
          id: "blk-ms46w5pz-zdpplb",
          note: "指派杜苏拉或安娜塔莎进行攻击时，队伍中其他角色的穿透率随丽娜自身的穿透率提升，提升效果等同于丽娜25%穿透率+12%，最高提升30%，杜苏拉和安娜塔莎均返回丽娜身边后，对应增益效果结束。",
          effects: [
            {
              ...batch03BaseEffect,
              id: "eff-ms46w5pz-93ry6b",
              stat: "penRate",
              value: 12,
              applyTarget: "team",
              applySituation: "global",
            },
          ],
        },
        ...(overrides.extraPacks?.alexandrina
          ? {
              [overrides.extraPacks.alexandrina.rank]:
                overrides.extraPacks.alexandrina.block,
            }
          : {}),
      }),
      agent("jufufu", "橘福福", {
        0: {
          id: "blk-legacy",
          note: "「虎威」命中敌人时，若拥有至少100点[威风]且橘福福不为当前操作中角色，橘福福会围绕目标敌人，发动[连携技：虎釜震煞]；\n发动时，全队角色获得[虎啸]效果：暴击伤害提升20%，橘福福的初始攻击力大于等于2800点时，每超过100点攻击力会使暴击伤害额外提升5%，最多额外提升30%；\n[虎啸]状态下，角色的[连携技]/[终结技]造成的伤害提升20%/40%；",
          effects: [
            {
              ...batch03BaseEffect,
              id: "legacy-team-critDmg",
              stat: "critDmg",
              value: 20,
              applyTarget: "team",
              applySituation: "global",
            },
          ],
        },
        4: {
          id: "blk-legacy",
          note: "橘福福处于[虎啸]状态下时，自身的暴击伤害提升35%。",
          effects: [
            {
              ...batch03BaseEffect,
              id: "legacy-self-critDmg",
              stat: "critDmg",
              value: 35,
              applySituation: "global",
            },
          ],
        },
        ...(overrides.extraPacks?.jufufu
          ? {
              [overrides.extraPacks.jufufu.rank]:
                overrides.extraPacks.jufufu.block,
            }
          : {}),
      }),
      agent("dialyn", "琉音", {
        0: {
          id: "blk-legacy",
          note: "[强化特殊技：布！]命中敌人时，敌人获得[恶意投诉]效果，[恶意投诉]效果下敌人进入失衡状态后的失衡持续时间提升2秒，失衡易伤倍率提升30%",
          effects: [
            {
              ...batch03BaseEffect,
              id: "legacy-team-staggerVulnerable",
              stat: "staggerVulnerable",
              value: 30,
              applyTarget: "team",
              applySituation: "global",
            },
          ],
        },
        4: {
          id: "blk-legacy",
          note: "[好评如潮]效果下，琉音攻击力提升500点。",
          effects: [
            {
              ...batch03BaseEffect,
              id: "legacy-self-atk",
              stat: "atk",
              value: 500,
              applySituation: "global",
            },
          ],
        },
        ...(overrides.extraPacks?.dialyn
          ? {
              [overrides.extraPacks.dialyn.rank]:
                overrides.extraPacks.dialyn.block,
            }
          : {}),
      }),
    ],
    driveDiscs: [],
    skillSubcategories: [],
    followUpSkillRules: [],
    wengines: [],
  }
}

describe("agent batch 06 impact and energy regen supplements", () => {
  it("registers the six supplements with their gates, ranks and beneficiaries", () => {
    const result = convertSource(
      batch06Data(),
      functions,
      [],
      batch06Supplements,
    )
    expect(result.coverage.summary.supplements).toMatchObject({
      records: 6,
      rules: 6,
      options: 6,
      integrated: 6,
      outOfScope: 0,
    })
    expect(result.definitions.revision).toBe("46")

    const caesar = result.catalog.options.find(
      (o) => o.optionId === "nanoka:agents:caesar:stance-switch-impact",
    )!
    expect(caesar.target).toBe("self")
    expect(caesar.variants[0]).toMatchObject({
      status: "converted",
      maximumLayers: 1,
      configuration: {
        specialSkillLevels: [
          1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
        ],
      },
      inputs: [],
    })
    const caesarRule = result.definitions.effects.find(
      (r) =>
        r.effectId === "agent:1071:nanoka:stance-switch-impact:mindscape:0",
    ) as ContributionRule
    expect(caesarRule.parameters.amount).toMatchObject({
      kind: "by-rank",
      rank: "specialSkillLevel",
      unit: "ratio",
      values: { 1: 0.09, 12: 0.2, 16: 0.24 },
    })
    expect(caesarRule.operation).toMatchObject({
      kind: "stat-adjustment",
      stat: "impact",
      stage: "final-percentage",
    })
    expect(caesarRule.beneficiary).toEqual({ kind: "holder" })

    const morale = result.catalog.options.find(
      (o) => o.optionId === "nanoka:agents:lighter:morale-burst-impact",
    )!
    expect(morale.variants[0]).toMatchObject({
      maximumLayers: 10,
      configuration: { coreSkillLevels: [1, 2, 3, 4, 5, 6, 7] },
    })
    const moraleRule = result.definitions.effects.find(
      (r) => r.effectId === "agent:1161:nanoka:morale-burst-impact:mindscape:0",
    ) as ContributionRule
    expect(moraleRule.parameters.amount).toMatchObject({
      rank: "coreSkillLevel",
      values: {
        1: 0.01,
        2: 0.0117,
        3: 0.0133,
        4: 0.015,
        5: 0.0167,
        6: 0.0183,
        7: 0.02,
      },
    })

    const roar = result.catalog.options.find(
      (o) => o.optionId === "nanoka:agents:jufufu:tigers-roar-impact",
    )!
    expect(roar.variants[0]).toMatchObject({
      maximumLayers: 1,
      configuration: { coreSkillLevels: [1, 2, 3, 4, 5, 6, 7] },
    })
    const roarRule = result.definitions.effects.find(
      (r) => r.effectId === "agent:1391:nanoka:tigers-roar-impact:mindscape:0",
    ) as ContributionRule
    expect(roarRule.parameters.amount).toMatchObject({
      unit: "impact-points",
      values: { 1: 25, 4: 37.5, 7: 50 },
    })
    expect(roarRule.operation).toMatchObject({
      stat: "impact",
      stage: "final-fixed",
    })

    const dialyn = result.catalog.options.find(
      (o) => o.optionId === "nanoka:agents:dialyn:initial-crit-rate-impact",
    )!
    expect(dialyn.variants[0]!.inputs).toHaveLength(1)
    expect(dialyn.variants[0]!.inputs[0]).toMatchObject({
      unit: "ratio",
      name: "agent:1481:nanoka:initial-crit-rate-impact:mindscape:0:source",
    })
    const dialynRule = result.definitions.effects.find(
      (r) =>
        r.effectId === "agent:1481:nanoka:initial-crit-rate-impact:mindscape:0",
    ) as ContributionRule
    expect(dialynRule.parameters).toMatchObject({
      threshold: { value: -0.5 },
      rate: { rank: "coreSkillLevel", values: { 1: 140, 7: 200 } },
      cap: { unit: "impact-points", value: 100 },
    })
    expect(dialynRule.operation).toMatchObject({
      stat: "impact",
      stage: "final-fixed",
    })

    const frontline = result.catalog.options.find(
      (o) =>
        o.optionId ===
        "nanoka:agents:lighter:mindscape-4-frontline-energy-regen",
    )!
    expect(frontline.target).toBe("team")
    expect(frontline.variants[0]).toMatchObject({
      maximumLayers: 1,
      configuration: { minimumMindscape: 4 },
      declaredTeammateBeneficiary: true,
    })
    const frontlineRule = result.definitions.effects.find(
      (r) =>
        r.effectId ===
        "agent:1161:nanoka:mindscape-4-frontline-energy-regen:mindscape:4",
    ) as ContributionRule
    expect(frontlineRule.beneficiary).toEqual({ kind: "team-except-holder" })
    expect(frontlineRule.parameters.amount).toMatchObject({
      unit: "ratio",
      value: 0.1,
    })
    expect(frontlineRule.operation).toMatchObject({
      kind: "stat-adjustment",
      stat: "energyRegen",
      stage: "final-fixed",
    })
    // 百分比契约：受益者基础回能 × 10%，与摇摆爵士二件套同构。
    expect(JSON.stringify(frontlineRule.operation)).toContain(
      '"role":"beneficiary"',
    )

    const dolls = result.catalog.options.find(
      (o) =>
        o.optionId ===
        "nanoka:agents:alexandrina:mindscape-4-deployed-dolls-energy-regen",
    )!
    expect(dolls.target).toBe("self")
    expect(dolls.variants[0]).toMatchObject({
      maximumLayers: 1,
      configuration: { minimumMindscape: 4 },
    })
    const dollsRule = result.definitions.effects.find(
      (r) =>
        r.effectId ===
        "agent:1211:nanoka:mindscape-4-deployed-dolls-energy-regen:mindscape:4",
    ) as ContributionRule
    expect(dollsRule.parameters.amount).toMatchObject({
      unit: "energy-per-second",
      value: 0.5,
    })
    expect(dollsRule.operation).toMatchObject({
      stat: "energyRegen",
      stage: "final-fixed",
    })
    expect(dollsRule.beneficiary).toEqual({ kind: "holder" })
  })

  it("locks the passive-row rank bindings of the evidence references", () => {
    // 证据引用的 rank 与 /passive/level 行键一一对应；生成路径按 data.json
    // 的 level 元数据核对映射，登记漂移会让生成失败。
    const byId = new Map(batch06Supplements.map((s) => [s.supplementId, s]))
    const morale = byId.get("nanoka:agents:lighter:morale-burst-impact")!
    expect(morale.evidence).toHaveLength(7)
    for (const [index, reference] of morale.evidence.entries())
      expect(reference).toMatchObject({
        path: "agents/1161/details.zh.json",
        pointer: `/passive/level/${1161501 + index}/desc/0`,
        rank: index + 1,
      })
    const roar = byId.get("nanoka:agents:jufufu:tigers-roar-impact")!
    for (const [index, reference] of roar.evidence.entries())
      expect(reference).toMatchObject({
        pointer: `/passive/level/${1391501 + index}/desc/0`,
        rank: index + 1,
      })
    const dialyn = byId.get("nanoka:agents:dialyn:initial-crit-rate-impact")!
    for (const [index, reference] of dialyn.evidence.entries())
      expect(reference).toMatchObject({
        pointer: `/passive/level/${1481049 + index}/desc/0`,
        rank: index + 1,
      })
    const caesar = byId.get("nanoka:agents:caesar:stance-switch-impact")!
    expect(caesar.evidence.map((r) => r.pointer)).toEqual([
      "/skill/special/description/4/desc",
      "/skill/special/description/5/param/0/desc",
    ])
  })

  it("rejects same-clause encodings in the registered contexts, including normalized drift", () => {
    // 影画 4 上下文（真实空 pack）出现回能编码：raw 记录在归一化删除后
    // 也不能绕过（守卫读 raw pack 本身）。
    const m4Record: SourceEffect = {
      ...batch03BaseEffect,
      id: "eff-m4-clause",
      stat: "energyRegen",
      value: 20,
      applySituation: "global",
    }
    const m4Block = (note: string): SourceBlock4Test => ({
      id: "blk-m4-clause",
      note,
      effects: [m4Record],
    })
    const rank4Pack = (agent: string, block: SourceBlock4Test) => ({
      [agent]: { rank: 4, block },
    })
    for (const label of ["lighter", "alexandrina"] as const) {
      expect(
        () =>
          convertSource(
            batch06Data({
              extraPacks: rank4Pack(
                label,
                m4Block("莱特位于后场时，前场角色的能量自动回复效率提升10%。"),
              ),
            }),
            functions,
            [],
            batch06Supplements,
          ),
        `${label} raw energyRegen at rank 4`,
      ).toThrowError(/registered .* mindscape rank 4 as a currently empty pack/)
      const dropping = {
        ...functions,
        collectEffectsFromPack: (pack: SourcePack) =>
          (functions.collectEffectsFromPack(pack) ?? []).filter(
            (effect) => effect.id !== "eff-m4-clause",
          ),
      }
      expect(
        () =>
          convertSource(
            batch06Data({
              extraPacks: rank4Pack(
                label,
                m4Block(
                  "杜苏拉和安娜塔莎均被指派在外时，能量自动回复速度提升0.5点/秒。",
                ),
              ),
            }),
            dropping,
            [],
            batch06Supplements,
          ),
        `${label} normalization dropped the record`,
      ).toThrowError(/registered .* mindscape rank 4 as a currently empty pack/)
    }
    // 归一 stat 变义：raw 记录不是回能 stat，但归一表示被改写为 energyRegen。
    const remeaning = {
      ...functions,
      collectEffectsFromPack: (pack: SourcePack) =>
        (functions.collectEffectsFromPack(pack) ?? []).map((effect) =>
          effect.id === "eff-m4-clause"
            ? { ...effect, stat: "energyRegen" }
            : effect,
        ),
    }
    const disguised: SourceEffect = {
      ...batch03BaseEffect,
      id: "eff-m4-clause",
      stat: "critDmg",
      value: 35,
      applySituation: "global",
    }
    expect(
      () =>
        convertSource(
          {
            ...batch06Data(),
            agents: batch06Data().agents.map((agent) =>
              agent.id === "lighter"
                ? {
                    ...agent,
                    mindscapeBuffs: agent.mindscapeBuffs!.map((pack, rank) =>
                      rank === 4
                        ? {
                            ...pack,
                            effectBlocks: [
                              {
                                id: "blk-m4-clause",
                                name: "影画4",
                                note: "影画4 的独立机制记录。",
                                effects: [disguised],
                              },
                            ],
                          }
                        : pack,
                    ),
                  }
                : agent,
            ),
          },
          remeaning,
          [],
          batch06Supplements,
        ),
      "normalized stat becomes energyRegen",
    ).toThrowError(/registered .* mindscape rank 4 as a currently empty pack/)
    // 核心被动上下文（rank 0 锚块）出现冲击力族编码：raw stat 与归一改写
    // 两种表示都会被拒绝。
    const impactRecord: SourceEffect = {
      ...batch03BaseEffect,
      id: "eff-impact-clause",
      stat: "impact",
      value: 10,
      applySituation: "global",
    }
    // 真实固定源的 normalizeAgent 会把未知 stat（如 impact）归一为
    // dmgBonus（评审探针已证），记录因此可以编译而守卫按 raw 表示拒绝；
    // 合成夹具按同一真实行为包装归一函数后再验证 raw 路径。
    const impactNormalizing: SourceNormalization = {
      ...functions,
      normalizeAgent: (entity) => {
        const normalized = functions.normalizeAgent(entity)
        return {
          ...normalized,
          mindscapeBuffs: (normalized.mindscapeBuffs ?? []).map((pack) => ({
            ...pack,
            effectBlocks: (pack.effectBlocks ?? []).map((block) => ({
              ...block,
              effects: block.effects.map((record) =>
                record.id === "eff-impact-clause" && record.stat === "impact"
                  ? { ...record, stat: "dmgBonus" }
                  : record,
              ),
            })),
          })),
        }
      },
    }
    for (const agent of ["caesar", "lighter", "jufufu", "dialyn"] as const) {
      expect(
        () =>
          convertSource(
            batch06Data({
              extraAgentRecords: {
                [agent]: [impactRecord],
              },
            }),
            impactNormalizing,
            [],
            batch06Supplements,
          ),
        `${agent} raw impact at rank 0`,
      ).toThrowError(
        new RegExp(
          `conflicts with the fixed-source record .* in the registered clause context agents:${agent} mindscape rank 0`,
        ),
      )
    }
    // 冲击力族的归一变义路径（normalized stat 命中守卫名单）只有在冲击力
    // stat 进入字段映射后才可达：当前归一表示为未注册 stat 时记录编译先行
    // 拒绝（Unregistered stat），同样不会进入制品。可达的归一变义由上面的
    // energyRegen 用例覆盖（注册 stat 改写后守卫按 normalized 表示拒绝）。
  })

  it("does not reject independent same-stat records outside the registered contexts", () => {
    // 其他 rank 的独立回能条款（如影画 1）不与影画 4 补充冲突。
    for (const entity of ["lighter", "alexandrina"] as const) {
      expect(
        () =>
          convertSource(
            batch06Data({
              extraPacks: {
                [entity]: {
                  rank: 1,
                  block: {
                    id: "blk-legacy",
                    note: "另一个独立机制：使用终结技后自身能量自动回复效率提升10%。",
                    effects: [
                      {
                        ...batch03BaseEffect,
                        id: "eff-m1-regen",
                        stat: "energyRegen",
                        value: 10,
                        applySituation: "global",
                      },
                    ],
                  },
                },
              },
            }),
            functions,
            [],
            batch06Supplements,
          ),
        entity,
      ).not.toThrow()
    }
    // 橘福福影画 4 暴伤与琉音影画 4 攻击是真实独立条款（夹具内置），
    // 与 rank 0 冲击守卫互不影响；同块的其他 stat 记录也不触发。
    expect(() =>
      convertSource(
        batch06Data({
          extraAgentRecords: {
            lighter: [
              {
                ...batch03BaseEffect,
                id: "eff-ok",
                stat: "skillDmgBonus",
                value: 30,
                applySituation: "global",
              },
            ],
          },
        }),
        functions,
        [],
        batch06Supplements,
      ),
    ).not.toThrow()
  })

  it("rejects anchor notes that keep all original content but append a conflicting impact clause", () => {
    // 保留锚块 note 全部原文、仅在末尾追加与补录条款冲突的新句子时，锚块
    // 上下文已经改变（固定来源出现了同条款的新编码依据），必须拒绝并要求
    // 复核；子串包含检查无法发现这种追加，守卫按完整冻结 note 全文比对。
    const appends: Readonly<Record<string, string>> = {
      jufufu: "橘福福处于[虎啸]效果中，冲击力提升75点。",
      lighter:
        "威力提升后的招式命中敌人时，每消耗10点[士气]，冲击力提升2%，最多提升20%，持续6秒；",
      dialyn: "初始暴击率超过50%时，每超过1%，冲击力提升2点，最多提升100点；",
    }
    for (const [agent, appended] of Object.entries(appends)) {
      const mutated = batch06Data()
      const block = mutated.agents
        .find((candidate) => candidate.id === agent)!
        .mindscapeBuffs![0]!.effectBlocks!.find(
          (candidate) => candidate.id === "blk-legacy",
        )!
      block.note = `${block.note}${appended}`
      expect(
        () => convertSource(mutated, functions, [], batch06Supplements),
        `${agent} appended "${appended}"`,
      ).toThrowError(/anchor block blk-legacy note .* before generating/)
    }
  })

  it("rejects anchor block drift and missing anchors with real context texts", () => {
    // 橘福福核心被动 note 的关键文本漂移（虎啸数值变化）即拒绝。
    const drifted = batch06Data()
    const block = drifted.agents[3]!.mindscapeBuffs![0]!.effectBlocks![0]!
    block.note = block.note!.replace("暴击伤害提升20%", "暴击伤害提升25%")
    expect(() =>
      convertSource(drifted, functions, [], batch06Supplements),
    ).toThrowError(
      /anchor block blk-legacy note drifted .* expected the frozen full note/,
    )
    // 莱特核心被动锚块缺失（被换成其他块 id）即拒绝。
    const missing = batch06Data()
    const lighterBlock =
      missing.agents[1]!.mindscapeBuffs![0]!.effectBlocks![0]!
    lighterBlock.id = "blk-renamed"
    expect(() =>
      convertSource(missing, functions, [], batch06Supplements),
    ).toThrowError(
      /lost its anchor block blk-legacy at agents:lighter mindscape rank 0/,
    )
  })

  it("keeps the guards stable under agent, block and record reordering", () => {
    const reordered = batch06Data()
    reordered.agents.reverse()
    for (const agent of reordered.agents)
      for (const pack of agent.mindscapeBuffs ?? [])
        for (const block of pack.effectBlocks ?? []) block.effects.reverse()
    expect(() =>
      convertSource(reordered, functions, [], batch06Supplements),
    ).not.toThrow()
  })
})

/**
 * 增益修复批次 07（修订 22）：洛克茜初始回能转化与绯月银棺三条补充的登记
 * 形态、逐档字面值、多规则完整状态与防重复守卫。数值断言来自冻结 Nanoka
 * 3.2 逐档原文（中英文交叉核对），不从生成器反推；证据摘要在生成路径由
 * verifyStaticEffectsEvidence 逐条核对（含被动行 rank 与 data.json level
 * 元数据的映射）。两个实体在固定来源 fac62407 都不存在，防重复守卫按
 * catalog ID 与真实身份核对，上游未来出现同实体时拒绝生成。
 */
const batch07SupplementIds = [
  "nanoka:agents:1621:initial-energy-regen-conversion",
  "nanoka:w-engines:14162:crit-rate",
  "nanoka:w-engines:14162:wind-resistance-ignore",
  "nanoka:w-engines:14162:squad-damage-bonus",
] as const

const batch07Supplements = SUPPLEMENTS.filter((supplement) =>
  (batch07SupplementIds as readonly string[]).includes(supplement.supplementId),
)

/** 批次 07 的固定来源夹具：固定来源没有洛克茜与绯月银棺，仅保留一个已映射
 * 代理人（凯撒，identity 1071）供 catalog ID 与身份撞车守卫测试使用。 */
const batch07Data = (): SourceData => ({
  agents: [
    batch03AgentEntity("caesar", "凯撒", {
      0: {
        id: "blk-legacy",
        note: "[荣光之盾]存在期间，持有者的攻击力提升1000点，[荣光之盾]效果结束后，该增益效果仍然保留，持续5秒。",
        effects: [
          {
            ...batch03BaseEffect,
            id: "legacy-team-atk",
            stat: "atk",
            value: 1000,
            applyTarget: "team",
            applySituation: "global",
          },
        ],
      },
    }),
  ],
  driveDiscs: [],
  skillSubcategories: [],
  followUpSkillRules: [],
  wengines: [],
})

describe("batch 07 Roxy and Crimson Moon Casket supplements", () => {
  it("registers the two entities and four options with five rules", () => {
    const result = convertSource(
      batch07Data(),
      functions,
      [],
      batch07Supplements,
    )
    expect(result.coverage.summary.supplements).toMatchObject({
      records: 4,
      rules: 5,
      options: 4,
      entities: 2,
      integrated: 4,
      outOfScope: 0,
    })
    expect(result.definitions.revision).toBe("46")
    const entities = result.catalog.entities.filter((e) =>
      ["nanoka:agents:1621", "nanoka:w-engines:14162"].includes(
        e.catalogEntityId,
      ),
    )
    expect(entities).toHaveLength(2)
    expect(
      entities.find((e) => e.catalogEntityId === "nanoka:agents:1621"),
    ).toMatchObject({
      upstreamId: null,
      name: "洛克茜",
      identity: { kind: "agent", entityId: "1621" },
      status: "mapped",
      profession: "击破",
      element: "wind",
      supplementProvenance: {
        sourceId: "nanoka-integrated",
        version: "3.2",
        resources: [
          { path: "agents/1621/details.zh.json" },
          { path: "agents/1621/data.json" },
        ],
      },
    })
    expect(
      entities.find((e) => e.catalogEntityId === "nanoka:w-engines:14162"),
    ).toMatchObject({
      upstreamId: null,
      name: "绯月银棺",
      identity: { kind: "w-engine", entityId: "14162" },
      profession: "击破",
    })

    // 洛克茜：一个完整状态选项引用两条规则，共用同一显式输入。
    const roxy = result.catalog.options.find(
      (o) =>
        o.optionId === "nanoka:agents:1621:initial-energy-regen-conversion",
    )!
    expect(roxy.target).toBe("self")
    expect(roxy.variants[0]).toMatchObject({
      status: "converted",
      maximumLayers: 1,
      configuration: { coreSkillLevels: [1, 2, 3, 4, 5, 6, 7] },
      effectIds: [
        "agent:1621:nanoka:initial-energy-regen-conversion:attack",
        "agent:1621:nanoka:initial-energy-regen-conversion:impact",
      ],
      inputs: [
        {
          name: "roxy:initial-energy-regen:source",
          unit: "energy-per-second",
        },
      ],
    })
    const attack = result.definitions.effects.find(
      (r) =>
        r.effectId ===
        "agent:1621:nanoka:initial-energy-regen-conversion:attack",
    ) as ContributionRule
    expect(attack.operation).toMatchObject({
      kind: "stat-adjustment",
      stat: "attack",
      stage: "final-fixed",
    })
    expect(attack.parameters.cap).toMatchObject({
      kind: "by-rank",
      rank: "coreSkillLevel",
      unit: "attack-points",
      values: {
        1: 480,
        2: 560,
        3: 640,
        4: 720,
        5: 800,
        6: 880,
        7: 960,
      },
    })
    expect(attack.parameters.rate).toEqual({
      kind: "constant",
      unit: "multiplier",
      value: 500,
    })
    expect(attack.parameters.threshold).toEqual({
      kind: "constant",
      unit: "energy-per-second",
      value: -1.2,
    })
    const impact = result.definitions.effects.find(
      (r) =>
        r.effectId ===
        "agent:1621:nanoka:initial-energy-regen-conversion:impact",
    ) as ContributionRule
    expect(impact.operation).toMatchObject({
      kind: "stat-adjustment",
      stat: "impact",
      stage: "final-fixed",
    })
    expect(impact.parameters.cap).toMatchObject({
      values: { 1: 40, 2: 46, 3: 52, 4: 58, 5: 64, 6: 70, 7: 76.8 },
    })
    expect(impact.parameters.rate).toEqual({
      kind: "constant",
      unit: "multiplier",
      value: 40,
    })
    // 两条规则共用同一输入名。
    const attackInput = JSON.stringify(attack.operation).match(
      /"name":"roxy:initial-energy-regen:source"/,
    )
    const impactInput = JSON.stringify(impact.operation).match(
      /"name":"roxy:initial-energy-regen:source"/,
    )
    expect(attackInput).not.toBeNull()
    expect(impactInput).not.toBeNull()

    // 绯月银棺：三个独立选项，精炼 1—5 逐档字面值；team 选项声明全队唯一。
    const crit = result.catalog.options.find(
      (o) => o.optionId === "nanoka:w-engines:14162:crit-rate",
    )!
    expect(crit.variants[0]).toMatchObject({
      configuration: { refinements: [1, 2, 3, 4, 5] },
      maximumLayers: 1,
    })
    const critRule = result.definitions.effects.find(
      (r) => r.effectId === "w-engine:14162:nanoka:crit-rate",
    ) as ContributionRule
    expect(critRule.operation).toMatchObject({
      kind: "stat-adjustment",
      stat: "criticalRate",
      stage: "direct",
    })
    expect(critRule.parameters.amount).toMatchObject({
      rank: "refinement",
      values: { 1: 0.24, 2: 0.26, 3: 0.28, 4: 0.3, 5: 0.32 },
    })

    const resPen = result.catalog.options.find(
      (o) => o.optionId === "nanoka:w-engines:14162:wind-resistance-ignore",
    )!
    expect(resPen.variants[0]).toMatchObject({
      configuration: { refinements: [1, 2, 3, 4, 5] },
    })
    expect(resPen.variants[0].squadUniqueEffect).toBeUndefined()
    const resPenRule = result.definitions.effects.find(
      (r) => r.effectId === "w-engine:14162:nanoka:wind-resistance-ignore",
    ) as ContributionRule
    expect(resPenRule.operation).toMatchObject({
      kind: "factor-contribution",
      channel: "attacker-resistance-ignore",
    })
    expect(resPenRule.scope).toBe("hit")
    expect(resPenRule.when).toEqual({
      kind: "one-of",
      fact: "hit.element",
      values: ["wind"],
    })
    expect(resPenRule.parameters.amount).toMatchObject({
      values: { 1: 0.15, 2: 0.173, 3: 0.195, 4: 0.218, 5: 0.24 },
    })

    const team = result.catalog.options.find(
      (o) => o.optionId === "nanoka:w-engines:14162:squad-damage-bonus",
    )!
    expect(team.target).toBe("team")
    expect(team.variants[0]).toMatchObject({
      configuration: { refinements: [1, 2, 3, 4, 5] },
      squadUniqueEffect: true,
    })
    const teamRule = result.definitions.effects.find(
      (r) => r.effectId === "w-engine:14162:nanoka:squad-damage-bonus",
    ) as ContributionRule
    expect(teamRule.operation).toMatchObject({
      kind: "factor-contribution",
      channel: "damage-bonus",
    })
    expect(teamRule.beneficiary).toEqual({ kind: "team-except-holder" })
    expect(teamRule.when).toEqual({ kind: "constant", value: true })
    expect(teamRule.parameters.amount).toMatchObject({
      values: { 1: 0.2, 2: 0.23, 3: 0.26, 4: 0.29, 5: 0.32 },
    })
  })

  it("does not depend on the supplement registration order", () => {
    const data = batch07Data()
    const forward = convertSource(data, functions, [], batch07Supplements)
    const reversed = convertSource(
      data,
      functions,
      [],
      [...batch07Supplements].reverse(),
    )
    const byId = (effects: readonly { effectId: string }[]) =>
      effects.map((e) => e.effectId).sort()
    expect(byId(reversed.definitions.effects)).toEqual(
      byId(forward.definitions.effects),
    )
    const optionIds = (options: readonly { optionId: string }[]) =>
      options.map((o) => o.optionId).sort()
    expect(optionIds(reversed.catalog.options)).toEqual(
      optionIds(forward.catalog.options),
    )
    expect(
      reversed.catalog.entities.map((e) => e.catalogEntityId).toSorted(),
    ).toEqual(forward.catalog.entities.map((e) => e.catalogEntityId).toSorted())
  })

  it("rejects catalog-id and identity collisions for supplement entities", () => {
    const entity = (supplement: Extract<Supplement, { kind: "entity" }>) =>
      supplement
    // catalog ID 撞固定来源实体：拒绝。
    const idCollision = batch07Supplements.map((supplement) =>
      supplement.kind === "entity" &&
      supplement.supplementId === "nanoka:w-engines:14162:crit-rate"
        ? entity({
            ...supplement,
            entity: {
              ...supplement.entity,
              catalogEntityId: "agents:caesar",
            },
          })
        : supplement,
    )
    expect(() =>
      convertSource(batch07Data(), functions, [], idCollision),
    ).toThrowError(/collides with a fixed-source catalog entity/)
    // 真实身份撞固定来源实体（上游未来出现同实体的守卫路径）：拒绝。
    const identityCollision = batch07Supplements.map((supplement) =>
      supplement.kind === "entity" &&
      supplement.supplementId === "nanoka:w-engines:14162:crit-rate"
        ? entity({
            ...supplement,
            entity: {
              ...supplement.entity,
              identity: { kind: "agent", entityId: "1071" },
            },
          })
        : supplement,
    )
    expect(() =>
      convertSource(batch07Data(), functions, [], identityCollision),
    ).toThrowError(/repeats the identity agent\/1071/)
    // 两个补充实体互撞（同 catalog ID 或同身份）：拒绝。
    const duplicated = [
      ...batch07Supplements.filter(
        (s) => s.supplementId !== "nanoka:w-engines:14162:crit-rate",
      ),
      ...batch07Supplements
        .filter(
          (s) =>
            s.supplementId ===
            "nanoka:agents:1621:initial-energy-regen-conversion",
        )
        .map((supplement) =>
          supplement.kind === "entity"
            ? entity({
                ...supplement,
                supplementId: "nanoka:agents:1621:duplicate",
                entity: {
                  ...supplement.entity,
                  catalogEntityId: "nanoka:agents:1621",
                },
              })
            : supplement,
        ),
    ]
    expect(() =>
      convertSource(batch07Data(), functions, [], duplicated),
    ).toThrowError(/Duplicate supplement entity/)
  })

  it("rejects option ids that repeat and unknown target entities", () => {
    // 选项 ID 重复（补充实体已创建的 optionId 以 option 类补充再登记一次）：
    // 拒绝，不静默并存。
    const critEntity = batch07Supplements.find(
      (s) => s.supplementId === "nanoka:w-engines:14162:crit-rate",
    ) as Extract<Supplement, { kind: "entity" }>
    const duplicateOptionId = [
      ...batch07Supplements.filter(
        (s) =>
          s.supplementId !== "nanoka:w-engines:14162:wind-resistance-ignore",
      ),
      {
        ...critEntity,
        kind: "option" as const,
        supplementId: "nanoka:w-engines:14162:crit-rate-again",
        catalogEntityId: "nanoka:w-engines:14162",
        optionId: "nanoka:w-engines:14162:crit-rate",
      },
    ]
    expect(() =>
      convertSource(batch07Data(), functions, [], duplicateOptionId),
    ).toThrowError(/repeats the option id nanoka:w-engines:14162:crit-rate/)
    // 指向不存在的实体：拒绝（含未登记的补充实体）。
    const unknownTarget = batch07Supplements.map((supplement) =>
      supplement.kind === "option" &&
      supplement.supplementId ===
        "nanoka:w-engines:14162:wind-resistance-ignore"
        ? { ...supplement, catalogEntityId: "nanoka:w-engines:99999" }
        : supplement,
    )
    expect(() =>
      convertSource(batch07Data(), functions, [], unknownTarget),
    ).toThrowError(/Unknown supplement catalog entity/)
  })

  it("rejects complete-state rules with mismatched layer maxima", () => {
    const mismatched = batch07Supplements.map(
      (supplement): Supplement =>
        supplement.kind === "entity" &&
        supplement.supplementId ===
          "nanoka:agents:1621:initial-energy-regen-conversion"
          ? {
              ...supplement,
              ...(supplement.additionalRules === undefined
                ? {}
                : {
                    additionalRules: supplement.additionalRules.map((rule) => ({
                      ...rule,
                      maximumLayers: 2,
                    })),
                  }),
            }
          : supplement,
    )
    expect(() =>
      convertSource(batch07Data(), functions, [], mismatched),
    ).toThrowError(/mixes layer maxima/)
  })
})

/**
 * 增益修复批次 08（修订 23）：伊芙琳[月辉丝·弦]、零号·安比电磁涡流与琉音
 * 余音三条影画 6 独立追击补充的登记形态、伤害项要求与来源守卫；伊芙琳核心
 * 被动 125% 具名倍率范围修正（exclude-skill-target-scope）的防漂移与既有
 * chain/ultimate 行为保留。数值断言来自冻结 Nanoka 3.2 天赋原文（中英文
 * 交叉核对），不从生成器反推。
 */
const batch08SupplementIds = [
  "nanoka:agents:evelyn:m6-lunalux-garrote-follow-up",
  "nanoka:agents:s0anby:m6-electromagnetic-vortex",
  "nanoka:agents:dialyn:m6-aftertone-echo",
] as const

const batch08Supplements = SUPPLEMENTS.filter((supplement) =>
  (batch08SupplementIds as readonly string[]).includes(supplement.supplementId),
)

/** 伊芙琳影画 6 锚块的冻结完整 note（固定来源 fac62407 的真实块原文）。 */
const batch08EvelynAnchorNote =
  "发动[连携技]或[终结技]时，伊芙琳将获得[弦影绝锋]，持续20秒；[弦影绝锋]期间，伊芙琳发动[普通攻击]、[冲刺攻击]、[特殊技]或[强化特殊技]命中主要攻击目标时，将额外释放一段[月辉丝·弦]进行追击，对范围内敌人造成等同于伊芙琳375%攻击力的火属性伤害，该伤害会被视为[连携技]伤害，最多触发16次，再次获得[弦影绝锋]时刷新可触发次数。"

/** 伊芙琳核心被动（额外能力：潜袭支点）块 note 的关键条款原文。 */
const batch08EvelynPassiveNote =
  "队伍中存在[击破]角色或[支援]角色时触发：\n伊芙琳的[连携技]和[终结技]造成的伤害提升30%；当伊芙琳的暴击率大于等于80%时，[连携技：月辉丝·绊]、[终结技：月辉丝·弦音]和[终结技：月辉丝·弦影]的伤害倍率提升至原本的125%。"

/**
 * 批次 08 的固定来源夹具：伊芙琳 rank 0 携带真实的额外能力两记录（30% 增伤
 * 与 25% 倍率修正）供具名范围修正消费；三实体 rank 6 还原真实上下文（伊芙琳
 * 锚块 note 完整、effects 为空；零号·安比与琉音为空 pack）。
 */
const batch08Data = (
  overrides: {
    extraPacks?: Readonly<
      Record<string, { rank: number; block: SourceBlock4Test }>
    >
  } = {},
): SourceData => {
  const agent = (
    id: string,
    name: string,
    blocks: Readonly<Record<number, SourceBlock4Test>> = {},
  ) =>
    batch03AgentEntity(
      id,
      name,
      Object.fromEntries([
        ...Object.entries(blocks),
        ...Object.entries(byRank(overrides.extraPacks?.[id])),
      ]),
    )
  const byRank = (
    pack: { rank: number; block: SourceBlock4Test } | undefined,
  ): Record<number, SourceBlock4Test> =>
    pack === undefined ? {} : { [pack.rank]: pack.block }
  return {
    agents: [
      agent("evelyn", "伊芙琳", {
        0: {
          id: "blk-ms4j94x5-1mflp4",
          note: batch08EvelynPassiveNote,
          effects: [
            {
              ...batch03BaseEffect,
              id: "eff-ms4j94x5-3elaxq",
              stat: "skillDmgBonus",
              value: 30,
              scope: "skill",
              applySituation: "global",
              skillTargets: [
                { category: "chain", subcategoryId: null },
                { category: "ultimate", subcategoryId: null },
              ],
            },
            {
              ...batch03BaseEffect,
              id: "eff-ms4j9nhd-9ya68m",
              stat: "directDmgMultFactor",
              value: 25,
              scope: "skill",
              applySituation: "global",
              skillTargets: [
                { category: "chain", subcategoryId: null },
                { category: "ultimate", subcategoryId: null },
              ],
            },
          ],
        },
        6: {
          id: "blk-ms4jc3w4-9he24i",
          note: batch08EvelynAnchorNote,
          effects: [],
        },
      }),
      agent("s0anby", "零号·安比", {
        0: {
          id: "blk-legacy",
          note: "零号·安比对拥有[银星]标记的敌人造成的伤害提升25%。",
          effects: [
            {
              ...batch03BaseEffect,
              id: "eff-ms4je0ab-hnmslw",
              stat: "dmgBonus",
              value: 25,
              applySituation: "global",
            },
          ],
        },
      }),
      agent("dialyn", "琉音", {
        2: {
          id: "blk-legacy",
          note: "琉音的[连携技]造成的伤害提升15%。",
          effects: [
            {
              ...batch03BaseEffect,
              id: "legacy-team-dmgBonus",
              stat: "dmgBonus",
              value: 15,
              applyTarget: "team",
              applySituation: "global",
            },
          ],
        },
      }),
    ],
    driveDiscs: [],
    skillSubcategories: [],
    followUpSkillRules: [],
    wengines: [],
  }
}

describe("batch 08 M6 independent follow-up supplements", () => {
  it("registers the three options, rules, targets, and requirements", () => {
    const result = convertSource(
      batch08Data(),
      functions,
      [],
      batch08Supplements,
    )
    expect(result.coverage.summary.supplements).toMatchObject({
      records: 3,
      rules: 3,
      options: 3,
      entities: 0,
      integrated: 3,
      outOfScope: 0,
    })
    expect(result.definitions.revision).toBe("46")
    const expected: readonly (readonly [
      optionId: string,
      effectId: string,
      itemId: string,
      targetId: string,
      category: string,
      countsAsFollowUp: boolean,
      multiplier: number,
      element: string,
      requiredCategory: string,
    ])[] = [
      [
        "nanoka:agents:evelyn:m6-lunalux-garrote-follow-up",
        "agent:1321:nanoka:m6-lunalux-garrote-follow-up:mindscape:6",
        "evelyn:lunalux-garrote",
        "zzz-hp:skill:evelyn-lunalux-garrote",
        "chain",
        false,
        3.75,
        "fire",
        "chain",
      ],
      [
        "nanoka:agents:s0anby:m6-electromagnetic-vortex",
        "agent:1381:nanoka:m6-electromagnetic-vortex:mindscape:6",
        "s0anby:electromagnetic-vortex",
        "zzz-hp:skill:s0anby-electromagnetic-vortex",
        "follow-up",
        true,
        10,
        "electric",
        "follow-up",
      ],
      [
        "nanoka:agents:dialyn:m6-aftertone-echo",
        "agent:1481:nanoka:m6-aftertone-echo:mindscape:6",
        "dialyn:aftertone-echo",
        "zzz-hp:skill:dialyn-aftertone-echo",
        "special",
        false,
        4.8,
        "physical",
        "enhanced-special",
      ],
    ]
    for (const [
      optionId,
      effectId,
      itemId,
      targetId,
      category,
      countsAsFollowUp,
      multiplier,
      element,
      requiredCategory,
    ] of expected) {
      const option = result.catalog.options.find(
        (o) => o.optionId === optionId,
      )!
      expect(option.target, optionId).toBe("self")
      const variant = option.variants[0]!
      expect(variant, optionId).toMatchObject({
        status: "converted",
        maximumLayers: 1,
        configuration: { minimumMindscape: 6 },
        inputs: [],
        effectIds: [effectId],
      })
      expect(variant.damageItemRequirements, optionId).toEqual([
        {
          itemId,
          stat: "attack",
          role: "base",
          allowedModes: ["direct"],
          source: "holder-current",
          requiredDirectMultiplier: 0,
          requiredSkillCategory: requiredCategory,
        },
      ])
      const target = result.catalog.skillTargets.find(
        (t) => t.targetId === targetId,
      )!
      expect(target, optionId).toMatchObject({
        upstreamId: null,
        agentEntityId: optionId.includes("evelyn")
          ? "1321"
          : optionId.includes("s0anby")
            ? "1381"
            : "1481",
        category,
        countsAsFollowUp,
      })
      const rule = result.definitions.effects.find(
        (r) => r.effectId === effectId,
      ) as ContributionRule
      expect(rule.operation, optionId).toEqual({
        kind: "hit-adjustment",
        field: "damageMultiplier",
        operator: "add",
        itemIds: [itemId],
        value: { kind: "parameter", unit: "multiplier", name: "amount" },
      })
      expect(rule.parameters, optionId).toEqual({
        amount: { kind: "constant", unit: "multiplier", value: multiplier },
      })
      expect(rule.when, optionId).toEqual({
        kind: "all",
        conditions: [
          { kind: "one-of", fact: "hit.damageKind", values: ["regular"] },
          { kind: "one-of", fact: "hit.element", values: [element] },
          { kind: "one-of", fact: "hit.skillTag", values: [targetId] },
        ],
      })
      expect(rule.scope, optionId).toBe("hit")
      expect(rule.beneficiary, optionId).toEqual({ kind: "holder" })
    }
  })

  it("excludes the Evelyn M6 target from the named-skill 125% rule only", () => {
    const result = convertSource(
      batch08Data(),
      functions,
      [],
      batch08Supplements,
    )
    // 125% 记录：保留稳定 ID 与 chain/ultimate 大类条件，追加对新独立目标
    // 的排除；variant 记 corrected 与具名差异。
    const multiplierRule = result.definitions.effects.find(
      (r) =>
        r.effectId ===
        "agent:1321:zzz-hp:eff-ms4j9nhd-9ya68m:blk-ms4j94x5-1mflp4:mindscape:0",
    ) as ContributionRule
    expect(multiplierRule.operation).toMatchObject({
      channel: "base-multiplier-increase",
    })
    // when 追加对独立目标的排除；原大类筛选（chain/ultimate）原样保留。
    expect(multiplierRule.when!.kind).toBe("all")
    const whenConditions = (
      multiplierRule.when as unknown as {
        conditions: readonly unknown[]
      }
    ).conditions
    expect(whenConditions).toHaveLength(2)
    expect(whenConditions[0]).toMatchObject({ kind: "all" })
    expect(JSON.stringify(whenConditions[0])).toContain("zzz-hp:category:chain")
    expect(JSON.stringify(whenConditions[0])).toContain(
      "zzz-hp:category:ultimate",
    )
    expect(whenConditions[1]).toEqual({
      kind: "not",
      condition: {
        kind: "one-of",
        fact: "hit.skillTag",
        values: ["zzz-hp:skill:evelyn-lunalux-garrote"],
      },
    })
    const option = result.catalog.options.find(
      (o) =>
        o.optionId ===
        "agents:evelyn:mindscape:0:blk-ms4j94x5-1mflp4:eff-ms4j9nhd-9ya68m",
    )!
    const variant = option.variants[0]!
    expect(variant.status).toBe("corrected")
    expect(variant.differences).toContain("evelyn-lunalux-multiplier-scope")
    // 差异说明登记进目录。
    expect(
      result.catalog.differences.some(
        (d) => d.differenceId === "evelyn-lunalux-multiplier-scope",
      ),
    ).toBe(true)
    // 同块一般连携/终结增伤（+30%）保持原行为：converted、无排除条件。
    const bonusRule = result.definitions.effects.find(
      (r) =>
        r.effectId ===
        "agent:1321:zzz-hp:eff-ms4j94x5-3elaxq:blk-ms4j94x5-1mflp4:mindscape:0",
    ) as ContributionRule
    expect(JSON.stringify(bonusRule.when)).not.toContain(
      "zzz-hp:skill:evelyn-lunalux-garrote",
    )
    const bonusOption = result.catalog.options.find(
      (o) =>
        o.optionId ===
        "agents:evelyn:mindscape:0:blk-ms4j94x5-1mflp4:eff-ms4j94x5-3elaxq",
    )!
    expect(bonusOption.variants[0]!.status).toBe("converted")
    expect(bonusOption.variants[0]!.differences).toEqual([])
  })

  it("rejects encoding drift of the corrected 125% record in both representations", () => {
    for (const [label, mutation] of [
      ["stat", (e: SourceEffect) => ({ ...e, stat: "directDmgMult" })],
      ["value", (e: SourceEffect) => ({ ...e, value: 30 })],
      ["scope", (e: SourceEffect) => ({ ...e, scope: "general" })],
      [
        "targets",
        (e: SourceEffect) => ({ ...e, skillTargets: [{ category: "chain" }] }),
      ],
    ] as const) {
      const mutated = batch08Data()
      const block = mutated.agents[0]!.mindscapeBuffs![0]!.effectBlocks![0]!
      block.effects = block.effects.map((e) =>
        e.id === "eff-ms4j9nhd-9ya68m" ? mutation(e) : e,
      )
      expect(
        () => convertSource(mutated, functions, [], batch08Supplements),
        label,
      ).toThrowError(/Named-skill scope correction expects/)
    }
  })

  it("locks the evidence pointers of the three supplements", () => {
    const byId = new Map(batch08Supplements.map((s) => [s.supplementId, s]))
    const evelyn = byId.get(
      "nanoka:agents:evelyn:m6-lunalux-garrote-follow-up",
    )!
    // 天赋 Pointer + 核心被动七行第二句（rank 与 /passive/level 行键一一对应，
    // 生成路径按 data.json level 元数据核对映射）。
    expect(evelyn.evidence).toHaveLength(8)
    expect(evelyn.evidence[0]).toMatchObject({
      path: "agents/1321/details.zh.json",
      pointer: "/talent/6/desc",
    })
    for (const [index, reference] of evelyn.evidence.slice(1).entries())
      expect(reference).toMatchObject({
        pointer: `/passive/level/${1321501 + index}/desc/1`,
        rank: index + 1,
      })
    for (const [entityId, supplementId] of [
      ["1381", "nanoka:agents:s0anby:m6-electromagnetic-vortex"],
      ["1481", "nanoka:agents:dialyn:m6-aftertone-echo"],
    ] as const) {
      const supplement = byId.get(supplementId)!
      expect(supplement.evidence).toHaveLength(1)
      expect(supplement.evidence[0]).toMatchObject({
        path: `agents/${entityId}/details.zh.json`,
        pointer: "/talent/6/desc",
      })
    }
  })

  it("rejects same-clause multiplier encodings in the registered M6 contexts", () => {
    // 伊芙琳 rank 6 锚块内出现直接倍率编码：同条款上下文拒绝。
    const anchorRecord: SourceEffect = {
      ...batch03BaseEffect,
      id: "eff-m6-clause",
      stat: "directDmgMultFactor",
      value: 25,
      applySituation: "global",
    }
    expect(() =>
      convertSource(
        batch08Data({
          extraPacks: {
            evelyn: {
              rank: 6,
              block: {
                id: "blk-ms4jc3w4-9he24i",
                note: batch08EvelynAnchorNote,
                effects: [anchorRecord],
              },
            },
          },
        }),
        functions,
        [],
        batch08Supplements,
      ),
    ).toThrowError(
      /conflicts with the fixed-source record .* in the registered clause context agents:evelyn mindscape rank 6/,
    )
    // 归一删除后 raw pack 仍有锚块内容：锚块要求 effects 为空的真实上下文。
    const dropping = {
      ...functions,
      collectEffectsFromPack: (pack: SourcePack) =>
        (functions.collectEffectsFromPack(pack) ?? []).filter(
          (effect) => effect.id !== "eff-m6-clause",
        ),
    }
    expect(() =>
      convertSource(
        batch08Data({
          extraPacks: {
            evelyn: {
              rank: 6,
              block: {
                id: "blk-ms4jc3w4-9he24i",
                note: batch08EvelynAnchorNote,
                effects: [anchorRecord],
              },
            },
          },
        }),
        dropping,
        [],
        batch08Supplements,
      ),
    ).toThrowError(/conflicts with the fixed-source record/)
    // 零号·安比与琉音的 rank 6 是真实空 pack：任何新编码（无论 stat）拒绝。
    const anyRecord: SourceEffect = {
      ...batch03BaseEffect,
      id: "eff-m6-anything",
      stat: "dmgBonus",
      value: 10,
      applySituation: "global",
    }
    for (const agent of ["s0anby", "dialyn"] as const) {
      expect(
        () =>
          convertSource(
            batch08Data({
              extraPacks: {
                [agent]: {
                  rank: 6,
                  block: {
                    id: "blk-m6-new",
                    note: "上游未来补编码的影画 6 块。",
                    effects: [anyRecord],
                  },
                },
              },
            }),
            functions,
            [],
            batch08Supplements,
          ),
        agent,
      ).toThrowError(
        new RegExp(
          `registered agents:${agent} mindscape rank 6 as a currently empty pack`,
        ),
      )
    }
  })

  it("rejects anchor note drift, appended clauses, and missing anchors", () => {
    // 保留全部原文、末尾追加冲突句：完整冻结 note 逐字比对拒绝。
    const appended = batch08Data()
    const block = appended.agents[0]!.mindscapeBuffs![6]!.effectBlocks![0]!
    block.note = `${batch08EvelynAnchorNote}月辉丝·弦的伤害倍率提升至原本的125%。`
    expect(() =>
      convertSource(appended, functions, [], batch08Supplements),
    ).toThrowError(/anchor block blk-ms4jc3w4-9he24i note .* before generating/)
    // 关键数值漂移（375% → 400%）同样拒绝。
    const drifted = batch08Data()
    const driftedBlock =
      drifted.agents[0]!.mindscapeBuffs![6]!.effectBlocks![0]!
    driftedBlock.note = batch08EvelynAnchorNote.replace("375%", "400%")
    expect(() =>
      convertSource(drifted, functions, [], batch08Supplements),
    ).toThrowError(
      /anchor block blk-ms4jc3w4-9he24i note drifted .* expected the frozen full note/,
    )
    // 锚块被换成其他块 id：拒绝。
    const missing = batch08Data()
    const missingBlock =
      missing.agents[0]!.mindscapeBuffs![6]!.effectBlocks![0]!
    missingBlock.id = "blk-renamed"
    expect(() =>
      convertSource(missing, functions, [], batch08Supplements),
    ).toThrowError(
      /lost its anchor block blk-ms4jc3w4-9he24i at agents:evelyn mindscape rank 6/,
    )
  })

  it("does not reject independent records outside the registered contexts", () => {
    // 伊芙琳 rank 0 的 25% 记录（夹具内置）与 rank 2 的独立倍率条款不受
    // rank 6 守卫影响；rank 1 出现的直接倍率记录也不触发。
    expect(() =>
      convertSource(
        batch08Data({
          extraPacks: {
            evelyn: {
              rank: 1,
              block: {
                id: "blk-legacy",
                note: "另一个独立机制：连携技伤害倍率提升25%。",
                effects: [
                  {
                    ...batch03BaseEffect,
                    id: "eff-m1-independence",
                    stat: "directDmgMultFactor",
                    value: 25,
                    scope: "skill",
                    applySituation: "global",
                    skillTargets: [{ category: "chain", subcategoryId: null }],
                  },
                ],
              },
            },
          },
        }),
        functions,
        [],
        batch08Supplements,
      ),
    ).not.toThrow()
    // 琉音 rank 2 的真实连携增伤（夹具内置）与零号·安比 rank 0 记录正常编译。
    const result = convertSource(
      batch08Data(),
      functions,
      [],
      batch08Supplements,
    )
    expect(
      result.catalog.options.some(
        (o) =>
          o.optionId ===
          "agents:dialyn:mindscape:2:blk-legacy:legacy-team-dmgBonus",
      ),
    ).toBe(true)
  })

  it("rejects damage item requirements without matching hit-adjustment rules", () => {
    const mismatched = batch08Supplements.map(
      (supplement): Supplement =>
        supplement.kind === "option" &&
        supplement.supplementId ===
          "nanoka:agents:s0anby:m6-electromagnetic-vortex"
          ? {
              ...supplement,
              variant: {
                ...supplement.variant,
                damageItemRequirements: [
                  {
                    ...supplement.variant.damageItemRequirements![0]!,
                    itemId: "s0anby:unknown-item",
                  },
                ],
              },
            }
          : supplement,
    )
    expect(() =>
      convertSource(batch08Data(), functions, [], mismatched),
    ).toThrowError(
      /adjusts undeclared damage item s0anby:electromagnetic-vortex|declares damage item requirement s0anby:unknown-item/,
    )
  })

  it("rejects colliding declared skill targets", () => {
    // 同 ID 目标重复登记：拒绝。
    const duplicated = [
      ...batch08Supplements,
      {
        ...batch08Supplements[0]!,
        supplementId: "nanoka:agents:evelyn:duplicate-target",
        optionId: "nanoka:agents:evelyn:duplicate-target",
      },
    ]
    expect(() =>
      convertSource(batch08Data(), functions, [], duplicated),
    ).toThrowError(
      /repeats the declared skill target zzz-hp:skill:evelyn-lunalux-garrote/,
    )
    // 固定来源出现同 ID 技能子分类：上游补了编码，拒绝并要求重新核对。
    const upstreamData = (): SourceData => ({
      ...batch08Data(),
      skillSubcategories: [
        {
          id: "evelyn-lunalux-garrote",
          agentId: "evelyn",
          categoryId: "chain",
          name: "月辉丝·弦",
        },
      ],
    })
    expect(() =>
      convertSource(upstreamData(), functions, [], batch08Supplements),
    ).toThrowError(
      /Supplement skill target zzz-hp:skill:evelyn-lunalux-garrote collides with a fixed-source or declared target/,
    )
  })

  it("keeps the guards stable under agent, block and record reordering", () => {
    const reordered = batch08Data()
    reordered.agents.reverse()
    for (const agent of reordered.agents)
      for (const pack of agent.mindscapeBuffs ?? [])
        for (const block of pack.effectBlocks ?? []) block.effects.reverse()
    expect(() =>
      convertSource(reordered, functions, [], batch08Supplements),
    ).not.toThrow()
  })

  /**
   * 伊芙琳旧倍率共存守卫：完整身份存在性（上游改名/移除原核心块或记录
   * 即拒绝）、normalized 删除不降级为通用 unsupported、完整 skillTargets
   * 元组与核心块冻结完整 note 的双份核对；数值与 when 契约不变。
   */
  it("rejects the loss of the registered Evelyn multiplier identity when the M6 supplement participates", () => {
    // 原核心块改名：语义键落空，旧 25% 继续编译却不再排除 M6 → 拒绝生成。
    const renamed = batch08Data()
    renamed.agents[0]!.mindscapeBuffs![0]!.effectBlocks![0]!.id =
      "blk-renamed-upstream"
    expect(() =>
      convertSource(renamed, functions, [], batch08Supplements),
    ).toThrowError(
      /lost its registered source record .*evelyn.*m6-lunalux-garrote/,
    )
    // 旧倍率记录被上游移除：同样拒绝。
    const removed = batch08Data()
    const removedBlock =
      removed.agents[0]!.mindscapeBuffs![0]!.effectBlocks![0]!
    removedBlock.effects = removedBlock.effects.filter(
      (e) => e.id !== "eff-ms4j9nhd-9ya68m",
    )
    expect(() =>
      convertSource(removed, functions, [], batch08Supplements),
    ).toThrowError(/lost its registered source record/)
  })

  it("does not require the identity when the dependent supplement is absent", () => {
    // 依赖的 M6 补充不参与本次转换时，局部夹具的块改名不被无条件检查误拒。
    const renamed = batch08Data()
    renamed.agents[0]!.mindscapeBuffs![0]!.effectBlocks![0]!.id =
      "blk-renamed-upstream"
    const withoutEvelyn = batch08Supplements.filter(
      (s) =>
        s.supplementId !== "nanoka:agents:evelyn:m6-lunalux-garrote-follow-up",
    )
    expect(() =>
      convertSource(renamed, functions, [], withoutEvelyn),
    ).not.toThrow()
  })

  it("rejects normalized removal of the registered multiplier record instead of degrading to unsupported", () => {
    // normalized 删除不再走通用 unsupported 降级：登记校验先行拒绝。
    const dropping: SourceNormalization = {
      ...functions,
      collectEffectsFromPack: (pack: SourcePack) =>
        (functions.collectEffectsFromPack(pack) ?? []).filter(
          (effect) => effect.id !== "eff-ms4j9nhd-9ya68m",
        ),
    }
    expect(() =>
      convertSource(batch08Data(), dropping, [], batch08Supplements),
    ).toThrowError(/Named-skill scope correction lost the normalized record/)
  })

  it("rejects full skill-target drift beyond categories", () => {
    // 仅 subcategoryId 漂移（category 列表不变）：完整元组校验拒绝，
    // 不再让普通连携对照从 2500 漂移到 2000。
    const drifted = batch08Data()
    const block = drifted.agents[0]!.mindscapeBuffs![0]!.effectBlocks![0]!
    block.effects = block.effects.map((e) =>
      e.id === "eff-ms4j9nhd-9ya68m"
        ? {
            ...e,
            skillTargets: [
              {
                category: "chain",
                subcategoryId: "evelyn-lunalux-garrote",
              },
              { category: "ultimate", subcategoryId: null },
            ],
          }
        : e,
    )
    expect(() =>
      convertSource(drifted, functions, [], batch08Supplements),
    ).toThrowError(
      /Named-skill scope correction expects .*found directDmgMultFactor 25 on skill .*evelyn-lunalux-garrote/,
    )
  })

  it("rejects appended or replaced block notes in both raw and normalized representations", () => {
    // raw 侧核心块 note 追加冲突句：冻结完整 note 逐字比对拒绝。
    const appended = batch08Data()
    const block = appended.agents[0]!.mindscapeBuffs![0]!.effectBlocks![0]!
    block.note = `${batch08EvelynPassiveNote}月辉丝·弦的伤害倍率提升至原本的125%。`
    expect(() =>
      convertSource(appended, functions, [], batch08Supplements),
    ).toThrowError(
      /Named-skill scope correction expects the registered block note/,
    )
    // 仅 normalized 侧块 note 被改写（raw 保持原文）：同样拒绝。
    const normalizedNote: SourceNormalization = {
      ...functions,
      normalizeAgent: (entity) => {
        const normalized = functions.normalizeAgent(entity)
        return {
          ...normalized,
          mindscapeBuffs: (normalized.mindscapeBuffs ?? []).map((pack) => ({
            ...pack,
            effectBlocks: (pack.effectBlocks ?? []).map((candidate) =>
              candidate.id === "blk-ms4j94x5-1mflp4"
                ? {
                    ...candidate,
                    note: `${candidate.note ?? ""}月辉丝·弦的伤害倍率提升至原本的125%。`,
                  }
                : candidate,
            ),
          })),
        }
      },
    }
    expect(() =>
      convertSource(batch08Data(), normalizedNote, [], batch08Supplements),
    ).toThrowError(
      /Named-skill scope correction expects the registered block note/,
    )
  })

  /**
   * 独立伤害补充的 requirement/itemIds 必须完整双向对应——额外规则目标
   * 会让未声明项也收到倍率贡献，缺失/空要求让消费端无从发现独立项
   * （预填倍率失去零值校验）。
   */
  it("requires the independent damage item contract to be bidirectional and complete", () => {
    type VortexOption = Extract<Supplement, { kind: "option" }>
    const vortexOnly = (
      transform: (supplement: VortexOption) => VortexOption,
    ): Supplement[] =>
      batch08Supplements.map((supplement) =>
        supplement.kind === "option" &&
        supplement.supplementId ===
          "nanoka:agents:s0anby:m6-electromagnetic-vortex"
          ? transform(supplement)
          : supplement,
      )
    // 规则追加未声明的额外目标：ATK1000 独立项 0 + 其他项 2 会从 12000
    // 变 22000（额外项也收到 +10），生成期拒绝。
    const extraTarget = vortexOnly((supplement) => ({
      ...supplement,
      rule: {
        ...supplement.rule,
        operation: {
          ...supplement.rule.operation,
          itemIds: ["s0anby:electromagnetic-vortex", "s0anby:unrelated-event"],
        },
      },
    }))
    expect(() =>
      convertSource(batch08Data(), functions, [], extraTarget),
    ).toThrowError(/adjusts undeclared damage item s0anby:unrelated-event/)
    // 缺失 requirements：消费端无从发现独立项，预填倍率失去零值校验。
    const withoutRequirements = vortexOnly((supplement) => {
      const { damageItemRequirements: _omitted, ...variant } =
        supplement.variant
      return { ...supplement, variant }
    })
    expect(() =>
      convertSource(batch08Data(), functions, [], withoutRequirements),
    ).toThrowError(/without declared damageItemRequirements/)
    // 空数组同样拒绝。
    const emptyRequirements = vortexOnly((supplement) => ({
      ...supplement,
      variant: { ...supplement.variant, damageItemRequirements: [] },
    }))
    expect(() =>
      convertSource(batch08Data(), functions, [], emptyRequirements),
    ).toThrowError(/without declared damageItemRequirements/)
  })

  it("rejects supplements whose hit-adjustment rules omit precise itemIds", () => {
    type VortexOption = Extract<Supplement, { kind: "option" }>
    const vortexOnly = (
      transform: (supplement: VortexOption) => VortexOption,
    ): Supplement[] =>
      batch08Supplements.map((supplement) =>
        supplement.kind === "option" &&
        supplement.supplementId ===
          "nanoka:agents:s0anby:m6-electromagnetic-vortex"
          ? transform(supplement)
          : supplement,
      )
    // 双遗漏：规则省略 itemIds 且变体省略伤害项要求。省略 itemIds 的
    // hit-adjustment 会退化为调整全部基础伤害项——独立项 0 + 其他项 2
    // 的 ATK1000 请求会从 12000 变 22000，预填 10 的独立项变 20/20000；
    // 内部补充边界只支持精确非空目标，两字段同时缺失不能视作“无独立项”。
    const omitItemIds = (operation: VortexOption["rule"]["operation"]) => {
      const { itemIds: _omitted, ...rest } = operation as {
        itemIds?: unknown
      } & Record<string, unknown>
      return rest as VortexOption["rule"]["operation"]
    }
    const bothOmitted = vortexOnly((supplement) => {
      const { damageItemRequirements: _omitted, ...variant } =
        supplement.variant
      return {
        ...supplement,
        rule: {
          ...supplement.rule,
          operation: omitItemIds(supplement.rule.operation),
        },
        variant,
      }
    })
    expect(() =>
      convertSource(batch08Data(), functions, [], bothOmitted),
    ).toThrowError(/hit-adjustment rule without precise non-empty itemIds/)
    // 合法主规则搭配省略 itemIds 的附加 hit-adjustment：合并集合非空不能
    // 掩盖附加规则的全项退化，逐条核验同样拒绝。
    const additionalWildcard = vortexOnly((supplement) => ({
      ...supplement,
      additionalRules: [
        {
          ...supplement.rule,
          effectId: "agent:1381:nanoka:m6-electromagnetic-vortex:extra",
          operation: omitItemIds(supplement.rule.operation),
        },
      ],
    }))
    expect(() =>
      convertSource(batch08Data(), functions, [], additionalWildcard),
    ).toThrowError(/hit-adjustment rule without precise non-empty itemIds/)
  })
})

/**
 * 增益修复批次 09（修订 24）：南宫羽影画 6[颤音：改]两个元素分组完整状态
 * 补充的登记形态、层数桥接透传与来源守卫；四条普通颤音规则（M0 五元素
 * 基础 450%、M0 物理 449%、M0 每层 +25%、M2 每层 +10%）的[颤音：改]共存
 * 排除与防漂移。数值断言来自冻结 Nanoka 3.2 天赋原文与固定提交
 * publicAnomalySkills.ts 系数表（中英文交叉核对），不从生成器反推。
 */
const batch09SupplementIds = [
  "nanoka:agents:nangongyu:m6-vibrato-modified-nonphysical",
  "nanoka:agents:nangongyu:m6-vibrato-modified-physical",
] as const

const batch09Supplements = SUPPLEMENTS.filter((supplement) =>
  (batch09SupplementIds as readonly string[]).includes(supplement.supplementId),
)

/** 南宫羽核心被动块的冻结完整 note（三条普通颤音记录所在块）。 */
const batch09NangongyuCorePassiveNote =
  "南宫羽的异常精通提升120点；\n敌人处于失衡状态时，任意角色对其造成一次[异放]伤害、[紊乱]伤害、使其进入一次属性异常状态时会为其累计1层[颤音]；\n同一敌人最多可被叠加4层[颤音]；\n若[颤音]叠加到最大层数且敌人处于以太异常状态、电属性异常状态、火属性异常状态、物理属性异常状态、冰属性异常状态、风属性异常状态下时或当敌人持有[颤音]并从失衡状态恢复时，所有[颤音]会被清除；\n[颤音]被清除时，若敌人处于上述属性异常状态下，南宫羽会对目标造成一次[异放]伤害：额外结算一次属性异常伤害，相对于原属性异常伤害的比例为720%/360%/900%/63%/90%/36%，敌人身上每有1层[颤音]，该次[异放]的伤害比例额外提升25%，同一次失衡期间，若[颤音]已被清除，则敌人无法再被施加[颤音]；\n南宫羽的[普通攻击：可爱地雷飞天撞]或[强化特殊技：相当沉重的爱意]命中敌人时，会使自身的属性异常积蓄效率提升35%，造成的失衡值提升20%，使全队造成的伤害提升25%，持续30秒，重复触发时刷新持续时间；"

/** 南宫羽影画 2 块的冻结完整 note（M2 每层 +10% 记录所在块）。 */
const batch09NangongyuMindscape2Note =
  "每层[颤音]使[核心被动：天才偶像]中[异放]的伤害比例额外提升10%；\n[额外能力：天使队长]提供的失衡易伤倍率额外提升30%；\n操作中的角色[连携技]重击命中同时处于属性异常和失衡状态下的敌人时，会对敌人触发[极性紊乱]，对目标造成原本[紊乱]效果25%的伤害，敌人在同一失衡期间仅能触发一次该效果。"

/** 南宫羽影画 6 锚块的冻结完整 note（实际空块：note 完整、effects 为空）。 */
const batch09NangongyuMindscape6Note =
  "当敌人进入失衡状态时，[颤音：改]会被全部清除，[颤音：改]被清除时，若敌人处于以太异常状态、电属性异常状态、火属性异常状态、物理属性异常状态、冰属性异常状态、风属性异常状态下，南宫羽会对目标造成一次[异放]伤害：额外结算一次属性异常伤害，相对于原属性异常伤害的比例为800%/400%/1000%/70%/100%/40%，敌人身上每有1层[颤音：改]，该次[异放]的伤害比例额外提升25%；[颤音：改]与[颤音]无法相互叠加。"

const batch09VibratoEffect = (
  id: string,
  overrides: Partial<SourceEffect>,
): SourceEffect => ({
  ...batch03BaseEffect,
  id,
  scope: "anomalyRelease",
  ...overrides,
})

/**
 * 批次 09 的固定来源夹具：南宫羽 rank 0 携带核心被动真实五记录（精通、
 * 五元素基础 450%、物理基础 449%、每层 +25%、团队增伤），rank 2 携带
 * 影画 2 真实三记录（每层 +10%、失衡易伤、极性紊乱），rank 6 还原实际
 * 空块（锚块 note 完整、effects 为空）。
 */
const batch09Data = (
  overrides: {
    extraPacks?: Readonly<
      Record<string, { rank: number; block: SourceBlock4Test }>
    >
  } = {},
): SourceData => {
  const agent = (
    id: string,
    name: string,
    blocks: Readonly<Record<number, SourceBlock4Test>> = {},
  ) =>
    batch03AgentEntity(
      id,
      name,
      Object.fromEntries([
        ...Object.entries(blocks),
        ...Object.entries(
          Object.fromEntries(
            [overrides.extraPacks?.[id]]
              .filter((p) => p !== undefined)
              .map((p) => [String(p!.rank), p!.block] as const),
          ),
        ),
      ]),
    )
  return {
    agents: [
      agent("nangongyu", "南宫羽", {
        0: {
          id: "blk-ms4cegmd-bwnttd",
          note: batch09NangongyuCorePassiveNote,
          effects: [
            batch09VibratoEffect("eff-ms4cegmd-ob1826", {
              stat: "mastery",
              value: 120,
              scope: "general",
              applySituation: "global",
            }),
            batch09VibratoEffect("eff-ms4cey14-kzw7xx", {
              stat: "anomalyReleaseMult",
              value: 450,
              applySituation: "stagger",
              elementFilter: ["以太", "电", "火", "冰", "风"],
            }),
            batch09VibratoEffect("eff-ms4clm2r-e6xquw", {
              stat: "anomalyReleaseMult",
              value: 449,
              applySituation: "stagger",
              elementFilter: ["物理"],
            }),
            batch09VibratoEffect("eff-ms4cm9a5-wou1p2", {
              stat: "anomalyReleaseMultFactor",
              value: 0,
              applySituation: "stagger",
              kind: "stacked",
              maxStacks: 4,
              valuePerStack: 25,
              defaultStacks: 4,
            }),
            batch09VibratoEffect("eff-ms4cyc74-h4xcin", {
              stat: "dmgBonus",
              value: 25,
              scope: "general",
              applyTarget: "team",
              applySituation: "global",
            }),
          ],
        },
        2: {
          id: "blk-legacy",
          note: batch09NangongyuMindscape2Note,
          effects: [
            batch09VibratoEffect("legacy-team-anomalyReleaseMultFactor", {
              stat: "anomalyReleaseMultFactor",
              value: 0,
              applySituation: "stagger",
              kind: "stacked",
              maxStacks: 4,
              valuePerStack: 10,
              defaultStacks: 4,
            }),
            batch09VibratoEffect("eff-ms4dpmaw-3wtd1m", {
              stat: "staggerVulnerable",
              value: 30,
              scope: "general",
              applyTarget: "team",
              applySituation: "global",
            }),
            batch09VibratoEffect("eff-ms4dq0l7-5lfpti", {
              stat: "disorderBaseMultFactor",
              value: -75,
              scope: "skill",
              applySituation: "stagger",
            }),
          ],
        },
        6: {
          id: "blk-ms4dtzxa-touyxm",
          note: batch09NangongyuMindscape6Note,
          effects: [],
        },
      }),
    ],
    driveDiscs: [],
    skillSubcategories: [],
    followUpSkillRules: [],
    wengines: [],
  }
}

describe("batch 09 Nangongyu M6 vibrato-modified supplements", () => {
  it("registers the two complete-state options with bridged layer counts", () => {
    const result = convertSource(
      batch09Data(),
      functions,
      [],
      batch09Supplements,
    )
    expect(result.definitions.revision).toBe("46")
    expect(result.coverage.summary.supplements).toMatchObject({
      records: 2,
      rules: 2,
      options: 2,
      entities: 0,
      integrated: 2,
      outOfScope: 0,
    })
    for (const [group, optionId, effectId, layerInput, base, elements] of [
      [
        "nonphysical",
        "nanoka:agents:nangongyu:m6-vibrato-modified-nonphysical",
        "agent:1511:nanoka:m6-vibrato-modified-nonphysical:mindscape:6",
        "nanoka:agents:nangongyu:m6-vibrato-modified-nonphysical:layers",
        5,
        ["ether", "electric", "fire", "ice", "wind"],
      ],
      [
        "physical",
        "nanoka:agents:nangongyu:m6-vibrato-modified-physical",
        "agent:1511:nanoka:m6-vibrato-modified-physical:mindscape:6",
        "nanoka:agents:nangongyu:m6-vibrato-modified-physical:layers",
        4.991,
        ["physical"],
      ],
    ] as const) {
      const option = result.catalog.options.find(
        (o) => o.optionId === optionId,
      )!
      expect(option.target, group).toBe("self")
      const variant = option.variants[0]!
      expect(variant, group).toMatchObject({
        status: "converted",
        maximumLayers: 4,
        layerCountInputName: layerInput,
        configuration: { minimumMindscape: 6 },
        inputs: [],
        effectIds: [effectId],
      })
      expect(variant.damageItemRequirements, group).toEqual([
        {
          itemId: "nangongyu:vibrato-modified",
          stat: "attack",
          role: "base",
          allowedModes: ["direct"],
          source: "anomaly-source",
          requiredDirectMultiplier: 0,
          // round1 修复 R01：独立结算分类契约——复用既有最终有效分类守卫，
          // 借用普通/连携/追加攻击分类或混入其他真实目标的命中按冲突拒绝。
          requiredSkillCategory: "uncategorized",
        },
      ])
      const rule = result.definitions.effects.find(
        (r) => r.effectId === effectId,
      ) as ContributionRule
      expect(rule.scope, group).toBe("hit")
      expect(rule.beneficiary, group).toEqual({ kind: "holder" })
      // 完整倍率表达式：归一基础 × (1 + 0.25 × 层数)，count 输入由目录桥接
      // 派生；规则单实例（maximumLayers 1），不把逻辑层数展开成多次结算。
      expect(rule.activation).toEqual({
        kind: "supplied",
        maximumLayers: { kind: "literal", unit: "count", value: 1 },
      })
      expect(rule.operation, group).toEqual({
        kind: "hit-adjustment",
        field: "damageMultiplier",
        operator: "add",
        itemIds: ["nangongyu:vibrato-modified"],
        value: {
          kind: "multiply",
          unit: "multiplier",
          value: { kind: "literal", unit: "multiplier", value: base },
          coefficient: {
            kind: "add",
            unit: "ratio",
            operands: [
              { kind: "literal", unit: "ratio", value: 1 },
              {
                kind: "convert",
                unit: "ratio",
                input: { kind: "input", unit: "count", name: layerInput },
                rate: { kind: "literal", unit: "multiplier", value: 0.25 },
              },
            ],
          },
        },
      })
      expect(rule.when, group).toEqual({
        kind: "all",
        conditions: [
          {
            kind: "one-of",
            fact: "hit.damageKind",
            values: ["anomaly-settlement"],
          },
          { kind: "one-of", fact: "hit.element", values: [...elements] },
          {
            kind: "one-of",
            fact: "hit.skillTag",
            values: ["zzz-hp:skill:nangongyu-vibrato-modified"],
          },
        ],
      })
    }
    // 独立目标只登记一次，两分组共用；uncategorized 分类不冒充游戏技能分类。
    const targets = result.catalog.skillTargets.filter((t) =>
      t.targetId.startsWith("zzz-hp:skill:nangongyu-vibrato-modified"),
    )
    expect(targets).toHaveLength(1)
    expect(targets[0]).toMatchObject({
      upstreamId: null,
      agentEntityId: "1511",
      category: "uncategorized",
      countsAsFollowUp: false,
    })
    // 差异说明登记进目录。
    expect(
      result.catalog.differences.some(
        (d) => d.differenceId === "nangongyu-vibrato-modified-exclusivity",
      ),
    ).toBe(true)
  })

  it("appends the vibrato-modified exclusion to the four normal-vibrato rules only", () => {
    const result = convertSource(
      batch09Data(),
      functions,
      [],
      batch09Supplements,
    )
    const excludedEffectIds = [
      "agent:1511:zzz-hp:eff-ms4cey14-kzw7xx:blk-ms4cegmd-bwnttd:mindscape:0",
      "agent:1511:zzz-hp:eff-ms4clm2r-e6xquw:blk-ms4cegmd-bwnttd:mindscape:0",
      "agent:1511:zzz-hp:eff-ms4cm9a5-wou1p2:blk-ms4cegmd-bwnttd:mindscape:0",
      "agent:1511:zzz-hp:legacy-team-anomalyReleaseMultFactor:blk-legacy:mindscape:2",
    ]
    for (const effectId of excludedEffectIds) {
      const rule = result.definitions.effects.find(
        (r) => r.effectId === effectId,
      ) as ContributionRule
      expect(rule.when!.kind).toBe("all")
      const conditions = (
        rule.when as unknown as { conditions: readonly unknown[] }
      ).conditions
      expect(conditions.length, effectId).toBeGreaterThanOrEqual(2)
      expect(JSON.stringify(conditions.at(-1))).toEqual(
        JSON.stringify({
          kind: "not",
          condition: {
            kind: "one-of",
            fact: "hit.skillTag",
            values: ["zzz-hp:skill:nangongyu-vibrato-modified"],
          },
        }),
      )
      // 数值与既有条件保持：M0 基础 4.5/4.49、每层 0.25、M2 每层 0.1 与
      // 失衡内条件都原样保留。
      expect(JSON.stringify(rule.when)).toContain("anomaly-settlement")
      if (effectId.includes("ms4cey14"))
        expect(rule.parameters).toMatchObject({
          amount: { kind: "constant", unit: "multiplier", value: 4.5 },
        })
      if (effectId.includes("ms4clm2r"))
        expect(rule.parameters).toMatchObject({
          amount: { kind: "constant", unit: "multiplier", value: 4.49 },
        })
      if (effectId.includes("ms4cm9a5"))
        expect(rule.parameters).toMatchObject({
          amount: { kind: "constant", unit: "ratio", value: 0.25 },
        })
      if (effectId.includes("legacy-team"))
        expect(rule.parameters).toMatchObject({
          amount: { kind: "constant", unit: "ratio", value: 0.1 },
        })
      // M2 保留失衡内条件（既有行为），M0 三条不因排除恢复该条件。
      const hasStunned = JSON.stringify(rule.when).includes('"stunned"')
      expect(hasStunned, effectId).toBe(effectId.includes("legacy-team"))
    }
    for (const effectId of excludedEffectIds) {
      const option = result.catalog.options.find((o) =>
        o.variants.some((v) => v.effectIds.includes(effectId as never)),
      )!
      const variant = option.variants.find((v) =>
        v.effectIds.includes(effectId as never),
      )!
      expect(variant.status, effectId).toBe("corrected")
      expect(variant.differences, effectId).toContain(
        "nangongyu-vibrato-modified-exclusivity",
      )
      if (!effectId.includes("legacy-team"))
        expect(variant.differences, effectId).toContain(
          "stagger-recovery-settlement",
        )
    }
    // 同块独立条款不受排除影响：精通/团队增伤/失衡易伤/极性紊乱保持
    // 原状态，无排除条件。
    for (const untouched of [
      "agent:1511:zzz-hp:eff-ms4cegmd-ob1826:blk-ms4cegmd-bwnttd:mindscape:0",
      "agent:1511:zzz-hp:eff-ms4cyc74-h4xcin:blk-ms4cegmd-bwnttd:mindscape:0",
      "agent:1511:zzz-hp:eff-ms4dpmaw-3wtd1m:blk-legacy:mindscape:2",
      "agent:1511:zzz-hp:eff-ms4dq0l7-5lfpti:blk-legacy:mindscape:2",
    ]) {
      const rule = result.definitions.effects.find(
        (r) => r.effectId === untouched,
      ) as ContributionRule
      expect(JSON.stringify(rule.when), untouched).not.toContain(
        "zzz-hp:skill:nangongyu-vibrato-modified",
      )
    }
  })

  it("rejects encoding drift of the four excluded records in both representations", () => {
    const fixedMutations = [
      ["value", (e: SourceEffect) => ({ ...e, value: 455 })],
      ["stackable", (e: SourceEffect) => ({ ...e, stackable: true })],
      [
        "elementFilter",
        (e: SourceEffect) => ({ ...e, elementFilter: "all" as const }),
      ],
      ["scope", (e: SourceEffect) => ({ ...e, scope: "general" })],
    ] as const
    const stackedMutations = [
      ["value", (e: SourceEffect) => ({ ...e, value: 25 })],
      ["kind", (e: SourceEffect) => ({ ...e, kind: "fixed" as const })],
      ["maxStacks", (e: SourceEffect) => ({ ...e, maxStacks: 5 })],
      ["valuePerStack", (e: SourceEffect) => ({ ...e, valuePerStack: 30 })],
      ["scope", (e: SourceEffect) => ({ ...e, scope: "general" })],
    ] as const
    const targets = [
      {
        rank: 0,
        id: "eff-ms4cey14-kzw7xx",
        label: "m0-nonphysical",
        mutations: fixedMutations,
      },
      {
        rank: 0,
        id: "eff-ms4clm2r-e6xquw",
        label: "m0-physical",
        mutations: fixedMutations,
      },
      {
        rank: 0,
        id: "eff-ms4cm9a5-wou1p2",
        label: "m0-layers",
        mutations: stackedMutations,
      },
      {
        rank: 2,
        id: "legacy-team-anomalyReleaseMultFactor",
        label: "m2-layers",
        mutations: stackedMutations,
      },
    ]
    for (const target of targets)
      for (const [label, mutation] of target.mutations) {
        const mutated = batch09Data()
        const block =
          mutated.agents[0]!.mindscapeBuffs![target.rank]!.effectBlocks![0]!
        block.effects = block.effects.map((e) =>
          e.id === target.id ? mutation(e) : e,
        )
        expect(
          () => convertSource(mutated, functions, [], batch09Supplements),
          `${target.label}:${label}`,
        ).toThrowError(/Settlement-target exclusion .* field drift/)
      }
  })

  it("rejects block note drift, appended clauses and normalized removal for the excluded records", () => {
    // 保留全部原文、末尾追加冲突句：完整冻结 note 逐字比对拒绝。
    for (const [rank, note, label] of [
      [0, batch09NangongyuCorePassiveNote, "core"],
      [2, batch09NangongyuMindscape2Note, "m2"],
    ] as const) {
      const appended = batch09Data()
      appended.agents[0]!.mindscapeBuffs![rank]!.effectBlocks![0]!.note =
        `${note}颤音：改的比例额外提升50%。`
      expect(
        () => convertSource(appended, functions, [], batch09Supplements),
        label,
      ).toThrowError(
        /Settlement-target exclusion .* expects the registered block note/,
      )
    }
    // 关键数值漂移（450% → 460%）同样拒绝。
    const drifted = batch09Data()
    drifted.agents[0]!.mindscapeBuffs![0]!.effectBlocks![0]!.note =
      batch09NangongyuCorePassiveNote.replace("720%", "730%")
    expect(() =>
      convertSource(drifted, functions, [], batch09Supplements),
    ).toThrowError(
      /Settlement-target exclusion .* expects the registered block note/,
    )
    // normalized 删除不再走通用 unsupported 降级：登记校验先行拒绝。
    const dropping: SourceNormalization = {
      ...functions,
      collectEffectsFromPack: (pack: SourcePack) =>
        (functions.collectEffectsFromPack(pack) ?? []).filter(
          (effect) => effect.id !== "legacy-team-anomalyReleaseMultFactor",
        ),
    }
    expect(() =>
      convertSource(batch09Data(), dropping, [], batch09Supplements),
    ).toThrowError(/Settlement-target exclusion .* lost the normalized record/)
    // 仅 normalized 侧块 note 被改写（raw 保持原文）：同样拒绝。
    const normalizedNote: SourceNormalization = {
      ...functions,
      normalizeAgent: (entity) => {
        const normalized = functions.normalizeAgent(entity)
        return {
          ...normalized,
          mindscapeBuffs: (normalized.mindscapeBuffs ?? []).map((pack) => ({
            ...pack,
            effectBlocks: (pack.effectBlocks ?? []).map((candidate) =>
              candidate.id === "blk-ms4cegmd-bwnttd"
                ? {
                    ...candidate,
                    note: `${candidate.note ?? ""}颤音：改的比例额外提升50%。`,
                  }
                : candidate,
            ),
          })),
        }
      },
    }
    expect(() =>
      convertSource(batch09Data(), normalizedNote, [], batch09Supplements),
    ).toThrowError(
      /Settlement-target exclusion .* expects the registered block note/,
    )
  })

  it("rejects the loss of any excluded identity when an M6 supplement participates", () => {
    // 上游移除 M2 每层记录：语义键落空，旧贡献不再排除 → 拒绝生成。
    const removed = batch09Data()
    const m2Block = removed.agents[0]!.mindscapeBuffs![2]!.effectBlocks![0]!
    m2Block.effects = m2Block.effects.filter(
      (e) => e.id !== "legacy-team-anomalyReleaseMultFactor",
    )
    expect(() =>
      convertSource(removed, functions, [], batch09Supplements),
    ).toThrowError(
      /settlement-target exclusion .* lost its registered source record .*nangongyu.*m6-vibrato-modified/,
    )
    // 核心被动块改名：三条 M0 记录语义键同时落空 → 同样拒绝。
    const renamed = batch09Data()
    renamed.agents[0]!.mindscapeBuffs![0]!.effectBlocks![0]!.id =
      "blk-renamed-upstream"
    expect(() =>
      convertSource(renamed, functions, [], batch09Supplements),
    ).toThrowError(/lost its registered source record/)
  })

  it("does not require the identities when the dependent supplements are absent", () => {
    const renamed = batch09Data()
    renamed.agents[0]!.mindscapeBuffs![0]!.effectBlocks![0]!.id =
      "blk-renamed-upstream"
    expect(() => convertSource(renamed, functions, [], [])).not.toThrow()
  })

  it("rejects machine encodings in the registered M6 clause context and anchor drift", () => {
    // 影画 6 锚块内出现异放乘区编码：同条款上下文拒绝。
    const anchorRecord: SourceEffect = batch09VibratoEffect("eff-m6-clause", {
      stat: "anomalyReleaseMult",
      value: 800,
    })
    expect(() =>
      convertSource(
        batch09Data({
          extraPacks: {
            nangongyu: {
              rank: 6,
              block: {
                id: "blk-ms4dtzxa-touyxm",
                note: batch09NangongyuMindscape6Note,
                effects: [anchorRecord],
              },
            },
          },
        }),
        functions,
        [],
        batch09Supplements,
      ),
    ).toThrowError(
      /conflicts with the fixed-source record .* in the registered clause context agents:nangongyu mindscape rank 6/,
    )
    // 归一删除后 raw pack 仍有锚块内容：raw/normalized 双份核对拒绝。
    const dropping = {
      ...functions,
      collectEffectsFromPack: (pack: SourcePack) =>
        (functions.collectEffectsFromPack(pack) ?? []).filter(
          (effect) => effect.id !== "eff-m6-clause",
        ),
    }
    expect(() =>
      convertSource(
        batch09Data({
          extraPacks: {
            nangongyu: {
              rank: 6,
              block: {
                id: "blk-ms4dtzxa-touyxm",
                note: batch09NangongyuMindscape6Note,
                effects: [anchorRecord],
              },
            },
          },
        }),
        dropping,
        [],
        batch09Supplements,
      ),
    ).toThrowError(/conflicts with the fixed-source record/)
    // 锚块 note 追加冲突句（保留原文）与关键数值漂移都拒绝。
    for (const note of [
      `${batch09NangongyuMindscape6Note}颤音：改额外提升50%。`,
      batch09NangongyuMindscape6Note.replace("800%", "900%"),
    ]) {
      const drifted = batch09Data()
      drifted.agents[0]!.mindscapeBuffs![6]!.effectBlocks![0]!.note = note
      expect(() =>
        convertSource(drifted, functions, [], batch09Supplements),
      ).toThrowError(
        /anchor block blk-ms4dtzxa-touyxm note .* re-review the clause context/,
      )
    }
    // 锚块被换成其他块 id：拒绝。
    const missing = batch09Data()
    missing.agents[0]!.mindscapeBuffs![6]!.effectBlocks![0]!.id = "blk-renamed"
    expect(() =>
      convertSource(missing, functions, [], batch09Supplements),
    ).toThrowError(
      /lost its anchor block blk-ms4dtzxa-touyxm at agents:nangongyu mindscape rank 6/,
    )
  })

  it("does not reject independent records of other ranks and stays stable under reordering", () => {
    // 其他 rank 的独立异放乘区条款不受 rank 6 守卫影响。
    const independent: SourceEffect = batch09VibratoEffect(
      "eff-m4-independence",
      { stat: "anomalyReleaseMult", value: 300 },
    )
    expect(() =>
      convertSource(
        batch09Data({
          extraPacks: {
            nangongyu: {
              rank: 4,
              block: {
                id: "blk-legacy",
                note: "另一个独立机制：异放伤害比例提升300%。",
                effects: [independent],
              },
            },
          },
        }),
        functions,
        [],
        batch09Supplements,
      ),
    ).not.toThrow()
    // 数组重排：代理、块内记录顺序变化不改变稳定身份与守卫。
    const reordered = batch09Data()
    reordered.agents.reverse()
    for (const pack of reordered.agents[0]!.mindscapeBuffs ?? [])
      for (const block of pack.effectBlocks ?? []) block.effects.reverse()
    expect(() =>
      convertSource(reordered, functions, [], batch09Supplements),
    ).not.toThrow()
  })

  it("locks the evidence pointers of the two supplements", () => {
    for (const supplement of batch09Supplements) {
      expect(supplement.evidence).toHaveLength(1)
      expect(supplement.evidence[0]).toMatchObject({
        path: "agents/1511/details.zh.json",
        pointer: "/talent/6/desc",
        sha256:
          "623a202f3d6b33c5c32d2ef6958595d02f0649cd76e57679858108b753a262b8",
      })
    }
  })

  it("guards the layer-count bridge against incomplete or incompatible declarations", () => {
    type VibratoOption = Extract<Supplement, { kind: "option" }>
    const nonphysicalOnly = (
      transform: (supplement: VibratoOption) => VibratoOption,
    ): Supplement[] =>
      batch09Supplements.map((supplement) =>
        supplement.kind === "option" &&
        supplement.supplementId ===
          "nanoka:agents:nangongyu:m6-vibrato-modified-nonphysical"
          ? transform(supplement)
          : supplement,
      )
    // 只声明逻辑层数上限、不声明桥接名：拒绝。
    const nameless = nonphysicalOnly((supplement) => {
      const { layerCountInputName: _omitted, ...variant } = supplement.variant
      return { ...supplement, variant }
    })
    expect(() =>
      convertSource(batch09Data(), functions, [], nameless),
    ).toThrowError(
      /must declare layerCountInputName and layerCountMaximumLayers together/,
    )
    // 只声明桥接名、不声明逻辑层数上限：拒绝。
    const boundless = nonphysicalOnly((supplement) => {
      const { layerCountMaximumLayers: _omitted, ...variant } =
        supplement.variant
      return { ...supplement, variant }
    })
    expect(() =>
      convertSource(batch09Data(), functions, [], boundless),
    ).toThrowError(
      /must declare layerCountInputName and layerCountMaximumLayers together/,
    )
    // 桥接选项叠加 additionalRules：目录只允许一条消费 count 的贡献，拒绝。
    const withAdditional = nonphysicalOnly((supplement) => ({
      ...supplement,
      additionalRules: [
        {
          ...supplement.rule,
          effectId: "agent:1511:nanoka:m6-extra:mindscape:6",
        },
      ],
    }))
    expect(() =>
      convertSource(batch09Data(), functions, [], withAdditional),
    ).toThrowError(/cannot combine the layer-count bridge with additionalRules/)
    // 桥接规则的实例层数上限不是 1：逻辑层数会被展开成多次完整结算，拒绝。
    const stacked = nonphysicalOnly((supplement) => ({
      ...supplement,
      rule: { ...supplement.rule, maximumLayers: 4 },
      variant: { ...supplement.variant, layerCountMaximumLayers: 4 },
    }))
    expect(() =>
      convertSource(batch09Data(), functions, [], stacked),
    ).toThrowError(/must expand a single complete instance \(maximumLayers 1\)/)
    // 非法逻辑层数上限：拒绝。
    const invalid = nonphysicalOnly((supplement) => ({
      ...supplement,
      variant: {
        ...supplement.variant,
        layerCountMaximumLayers: 1.5,
      },
    }))
    expect(() =>
      convertSource(batch09Data(), functions, [], invalid),
    ).toThrowError(/declares an invalid logical layer maximum/)
  })
})

/**
 * 批次 10（PR10）越界覆盖登记：不可选声明只登记、不创建规则，生成期
 * 守卫按实体类型核对声明本身（实体映射、配置域与取值、选项身份、驱动盘
 * 件数 note/冲突、音擎五档真实缺失状态、代理人真实空 pack/锚块、同词表
 * 已有记录冲突），并对真实错误输入给出具名拒绝。
 */
const batch10SupplementIds = [
  "nanoka:drive-discs:31200:four-piece-daze-value",
  "nanoka:drive-discs:31300:four-piece-anomaly-buildup-resistance",
  "nanoka:drive-discs:31500:four-piece-damage-taken-reduction",
  "nanoka:w-engines:12003:ex-energy-recovery",
  "nanoka:w-engines:12012:anomaly-triggered-energy-recovery",
  "nanoka:w-engines:13002:decibel-and-energy-generation",
  "nanoka:w-engines:13011:damage-taken-and-energy-generation-rate",
  "nanoka:w-engines:13016:damage-taken-and-miasma-contamination",
  "nanoka:w-engines:12008:daze-on-main-target",
  "nanoka:w-engines:12007:ex-daze",
  "nanoka:w-engines:14003:charge-consumed-daze",
  "nanoka:w-engines:13006:target-hp-daze",
  "nanoka:w-engines:14114:basic-attack-daze",
  "nanoka:agents:nicole:mindscape-1-anomaly-buildup-and-field-duration",
  "nanoka:agents:qingyi:flash-voltage-daze",
  "nanoka:agents:koleda:enhanced-basic-second-daze",
  "nanoka:agents:lighter:mindscape-4-morale-burst-energy",
  "nanoka:w-engines:14162:daze-value",
  "nanoka:agents:nangongyu:m6-vibrato-daze",
  "nanoka:agents:1621:wind-energy-acquisition",
  "nanoka:agents:yuzuha:extra-ability-anomaly-buildup-efficiency",
  "nanoka:agents:yuzuha:mindscape-1-entry-energy",
  // 12014 由 coverage-only boundary 迁移的单份目录可发现声明。
  "nanoka:w-engines:12014:attacker-damage-reduction",
  // 前批已修/已补提供者同一被动段的确定缺口。
  "nanoka:w-engines:13127:ex-and-assist-anomaly-buildup",
  "nanoka:w-engines:14148:ex-physical-daze-stacks",
  "nanoka:agents:lighter:morale-acquisition",
  "nanoka:agents:lighter:collapse-stun-duration",
  "nanoka:agents:dialyn:positive-reviews-and-complaints",
  "nanoka:agents:dialyn:malicious-complaint-stun-duration",
  "nanoka:agents:nangongyu:core-buildup-and-daze",
  "nanoka:agents:nangongyu:downbeat-acquisition",
] as const

const batch10Supplements = SUPPLEMENTS.filter((supplement) =>
  (batch10SupplementIds as readonly string[]).includes(supplement.supplementId),
)

/** 声明所依赖的既有补充（补充实体与同提供者既有选项）也参与本次转换。 */
const batch10SupportingIds = [
  "nanoka:w-engines:14162:crit-rate",
  "nanoka:w-engines:14162:wind-resistance-ignore",
  "nanoka:w-engines:14162:squad-damage-bonus",
  "nanoka:agents:1621:initial-energy-regen-conversion",
] as const

/** 柚叶固定来源记录（与真实来源逐字段一致的编码；applyTarget 固定 team）。 */
const batch10YuzuhaRecord = (
  id: string,
  stat: string,
  value: number,
  overrides: {
    readonly convert?: { readonly ratioPercent: number; readonly cap: number }
    readonly appliesToAnomaly?: boolean
  },
): SourceEffect => ({
  ...batch03BaseEffect,
  id,
  stat,
  value,
  applyTarget: "team",
  applySituation: "global",
  kind: overrides.convert ? "convert" : "fixed",
  ...(overrides.convert
    ? {
        convert: {
          from: "anomalyControl",
          panelSource: "manual",
          ratioPercent: overrides.convert.ratioPercent,
          cap: overrides.convert.cap,
          defaultBase: 201,
          initialBase: 0,
        },
      }
    : {}),
  ...(overrides.appliesToAnomaly === true ? { appliesToAnomaly: true } : {}),
})

/** 柚叶额外能力整句的冻结 note（固定来源 blk-ms38y9v7-07td4j 原文）。 */
const batch10YuzuhaAbilityNote =
  "队伍中存在[异常]角色或与自身阵营相同的角色时触发：\n若柚叶的异常掌控大于100点，每超过1点异常掌控会使拥有[狸之愿]效果的角色的属性异常积蓄效率提升0.2%，最多提升20%，还会使其所有属性异常伤害和[紊乱]伤害提升0.2%，最多提升20%，当柚叶的异常掌控达到200点时，上述增益效果达到最大值。"

/** 南宫羽核心被动块的冻结 note（固定来源 blk-ms4cegmd-bwnttd 原文）。 */
const batch10NangongyuCoreNote =
  "南宫羽的异常精通提升120点；\n敌人处于失衡状态时，任意角色对其造成一次[异放]伤害、[紊乱]伤害、使其进入一次属性异常状态时会为其累计1层[颤音]；\n同一敌人最多可被叠加4层[颤音]；\n若[颤音]叠加到最大层数且敌人处于以太异常状态、电属性异常状态、火属性异常状态、物理属性异常状态、冰属性异常状态、风属性异常状态下时或当敌人持有[颤音]并从失衡状态恢复时，所有[颤音]会被清除；\n[颤音]被清除时，若敌人处于上述属性异常状态下，南宫羽会对目标造成一次[异放]伤害：额外结算一次属性异常伤害，相对于原属性异常伤害的比例为720%/360%/900%/63%/90%/36%，敌人身上每有1层[颤音]，该次[异放]的伤害比例额外提升25%，同一次失衡期间，若[颤音]已被清除，则敌人无法再被施加[颤音]；\n南宫羽的[普通攻击：可爱地雷飞天撞]或[强化特殊技：相当沉重的爱意]命中敌人时，会使自身的属性异常积蓄效率提升35%，造成的失衡值提升20%，使全队造成的伤害提升25%，持续30秒，重复触发时刷新持续时间；"

/** 琉音影画 0 块（blk-legacy）的冻结 note（恶意投诉失衡时长 + 易伤原文）。 */
const batch10DialynComplaintNote =
  "[强化特殊技：布！]命中敌人时，敌人获得[恶意投诉]效果，[恶意投诉]效果下敌人进入失衡状态后的失衡持续时间提升2秒，失衡易伤倍率提升30%"

/** 柚叶影画 1 块的冻结 note（固定来源 blk-legacy 原文，不含瞬时能量句）。 */
const batch10YuzuhaMindscape1Note =
  "处于[甜蜜惊吓]状态下的敌人全属性伤害抗性降低10%；[额外能力]中属性异常伤害和[紊乱]伤害增益效果提升至原本的130%。"

const batch10SupplementsWithSupport = SUPPLEMENTS.filter((supplement) =>
  [
    ...(batch10SupplementIds as readonly string[]),
    ...(batch10SupportingIds as readonly string[]),
  ].includes(supplement.supplementId),
)

/** 九件音擎与拘缚者在批内核对时的真实状态：五档块只有 note、effects 为空。 */
const batch10NoteOnlyRefinements = (
  overrides: {
    readonly records?: readonly SourceEffect[]
    readonly dropNoteTier?: number
  } = {},
): SourcePack[] =>
  [1, 2, 3, 4, 5].map(
    (tier): SourcePack => ({
      effectBlocks: [
        {
          id: `blk-note-${tier}`,
          name: `精炼${tier}`,
          note:
            overrides.dropNoteTier === tier
              ? ""
              : `固定来源只有 note 的越界条款（第 ${tier} 档）。`,
          effects: [],
        },
      ],
      effects: tier === 1 ? [...(overrides.records ?? [])] : [],
    }),
  )

const batch10Wengine = (
  id: string,
  name: string,
  overrides: {
    readonly records?: readonly SourceEffect[]
    readonly dropNoteTier?: number
    readonly refinementBuffs?: readonly SourcePack[]
  } = {},
): SourceEntity => ({
  id,
  name,
  fixedBuffs: { effectBlocks: [], effects: [] },
  refinementBuffs: [
    ...(overrides.refinementBuffs ??
      batch10NoteOnlyRefinements({
        ...(overrides.records ? { records: overrides.records } : {}),
        ...(overrides.dropNoteTier === undefined
          ? {}
          : { dropNoteTier: overrides.dropNoteTier }),
      })),
  ],
})

/** 批次 10 夹具的四件套块（note 与 effects 可控）。 */
const batch10Disc = (
  id: string,
  name: string,
  fourPieceNote: string,
  fourPieceEffects: readonly SourceEffect[] = [],
): SourceEntity => ({
  id,
  name,
  fourPieceBuffs: {
    effectBlocks: [
      {
        id: "blk-four",
        name: "4件套",
        note: fourPieceNote,
        effects: [...fourPieceEffects],
      },
    ],
    effects: [],
  },
})

/** 批次 10 的固定来源夹具：真实块 id/note（南宫羽锚块）与真实缺失状态。 */
const batch10Data = (
  overrides: {
    readonly driveDiscFourPieceNote?: Readonly<Record<string, string>>
    readonly wengineRecords?: Readonly<Record<string, readonly SourceEffect[]>>
    readonly wengineDropNoteTier?: Readonly<Record<string, number>>
    readonly driveDiscFourPieceRecords?: Readonly<
      Record<string, SourceEffect[]>
    >
    readonly agentRecords?: Readonly<
      Record<
        string,
        { readonly rank: number; readonly effects: readonly SourceEffect[] }
      >
    >
    readonly underminesAnchorNote?: string
    readonly yuzuhaAbilityNote?: string
    readonly yuzuhaMindscape1Note?: string
    readonly nangongyuCoreNote?: string
    readonly dialynComplaintNote?: string
    readonly refinementOverrides?: Readonly<
      Record<string, readonly SourcePack[]>
    >
  } = {},
): SourceData => {
  const discNotes = overrides.driveDiscFourPieceNote ?? {}
  const agent = (
    id: string,
    name: string,
    blocks: Readonly<Record<number, SourceBlock4Test>> = {},
  ) => {
    if (id === "yuzuha") {
      // 柚叶：与真实固定来源逐字段一致的记录（额外能力四记录 + 影画 1 的
      // 抗性与四条 130% 记录；applyTarget team、appliesToAnomaly 与 convert
      // 参数按来源原值），影画 1 块按需追加注入记录（energyRegen 冲突负例）。
      const records: Readonly<Record<number, readonly SourceEffect[]>> = {
        0: [
          batch10YuzuhaRecord("eff-ms38y9v7-2ded3l", "anomalyDmgBonus", 0, {
            convert: { ratioPercent: 20, cap: 40 },
            appliesToAnomaly: true,
          }),
          batch10YuzuhaRecord("eff-ms3969fx-lmmkyw", "disorderDmgBonus", 0, {
            convert: { ratioPercent: 20, cap: 40 },
          }),
          batch10YuzuhaRecord("eff-ms396xt1-3qbf2a", "anomalyDmgBonus", -20, {
            appliesToAnomaly: true,
          }),
          batch10YuzuhaRecord("eff-ms39auzc-mtr7ac", "disorderDmgBonus", -20, {
            appliesToAnomaly: true,
          }),
        ],
        1: [
          batch10YuzuhaRecord("legacy-team-resPen", "resPen", 10, {
            appliesToAnomaly: true,
          }),
          batch10YuzuhaRecord("eff-ms44bnmi-zp616x", "anomalyDmgBonus", 0, {
            convert: { ratioPercent: 6, cap: 12 },
            appliesToAnomaly: true,
          }),
          batch10YuzuhaRecord("eff-ms44dh8h-xb20mu", "disorderDmgBonus", 0, {
            convert: { ratioPercent: 6, cap: 12 },
            appliesToAnomaly: true,
          }),
          batch10YuzuhaRecord("eff-ms44eue1-n53aou", "anomalyDmgBonus", -6, {
            appliesToAnomaly: true,
          }),
          batch10YuzuhaRecord("eff-ms44fa80-f595zx", "disorderDmgBonus", -6, {
            appliesToAnomaly: true,
          }),
          ...(overrides.agentRecords?.yuzuha?.effects ?? []),
        ],
      }
      return batch03AgentEntity("yuzuha", "柚叶", {
        0: {
          id: "blk-ms38y9v7-07td4j",
          note: overrides.yuzuhaAbilityNote ?? batch10YuzuhaAbilityNote,
          effects: records[0]!,
        },
        1: {
          id: "blk-legacy",
          note: overrides.yuzuhaMindscape1Note ?? batch10YuzuhaMindscape1Note,
          effects: records[1]!,
        },
      })
    }
    const base = batch03AgentEntity(id, name, blocks)
    const injected = overrides.agentRecords?.[id]
    if (!injected) return base
    return {
      ...base,
      mindscapeBuffs: base.mindscapeBuffs!.map((pack, rank) =>
        rank === injected.rank
          ? {
              effectBlocks: [
                {
                  id: `blk-extra-${id}`,
                  name: "登记位置新编码",
                  note: "",
                  effects: [...injected.effects],
                },
              ],
            }
          : pack,
      ),
    }
  }
  return {
    agents: [
      agent("nicole", "妮可"),
      agent("qingyi", "青衣"),
      agent("koleda", "珂蕾妲"),
      agent("lighter", "莱特"),
      agent("yuzuha", "柚叶"),
      agent("dialyn", "琉音", {
        0: {
          id: "blk-legacy",
          note: overrides.dialynComplaintNote ?? batch10DialynComplaintNote,
          effects: [],
        },
      }),
      agent("nangongyu", "南宫羽", {
        0: {
          id: "blk-ms4cegmd-bwnttd",
          note: overrides.nangongyuCoreNote ?? batch10NangongyuCoreNote,
          effects: [],
        },
        6: {
          id: "blk-ms4dtzxa-touyxm",
          note:
            overrides.underminesAnchorNote ?? batch09NangongyuMindscape6Note,
          effects: [],
        },
      }),
    ],
    wengines: [
      ["Lunar_Noviluna", "「月相」-朔"],
      ["Magnetic_Storm_Charlie", "「电磁暴」-叁式"],
      ["Slice_Of_Time", "时光切片"],
      ["Spring_Embrace", "春日融融"],
      ["Reel_Projector", "光影刻刀"],
      ["Vortex_Arrow", "「湍流」-矢型"],
      ["Vortex_Revolver", "「湍流」-铳型"],
      ["Six_Shooter", "左轮转子"],
      ["Precious_Fossilized_Core", "贵重骨核"],
      ["Weapon_S_1141", "拘缚者"],
      ["Peacekeeper_Specialized", "维序者-特化型"],
      ["Yesterday_Calls", "昨夜来电"],
    ].map(([id, name]) =>
      batch10Wengine(id!, name!, {
        ...(overrides.wengineRecords?.[id!]
          ? { records: overrides.wengineRecords[id!]! }
          : id === "Peacekeeper_Specialized" || id === "Yesterday_Calls"
            ? {
                // 这两件来源已有真实机器记录（回能等）：新声明不得因实体
                // 存在已支持记录而被误拒，也不套用 note-only 空实体守卫。
                records: [
                  {
                    ...batch03BaseEffect,
                    id: `existing-${id}-record`,
                    stat: "energyRegen",
                    value: 1,
                  },
                ],
              }
            : {}),
        ...(overrides.wengineDropNoteTier?.[id!] === undefined
          ? {}
          : { dropNoteTier: overrides.wengineDropNoteTier[id!]! }),
        ...(overrides.refinementOverrides?.[id!]
          ? { refinementBuffs: overrides.refinementOverrides[id!]! }
          : {}),
      }),
    ),
    driveDiscs: [
      batch10Disc(
        "SuitShockstarDisco",
        "震星迪斯科",
        discNotes.SuitShockstarDisco ??
          "[普通攻击]、[冲刺攻击]、[闪避反击]对主要攻击目标造成的失衡值提升20%。",
        overrides.driveDiscFourPieceRecords?.SuitShockstarDisco ?? [],
      ),
      batch10Disc(
        "SuitFreedomBlues",
        "自由蓝调",
        discNotes.SuitFreedomBlues ??
          "[强化特殊技]命中敌人时，根据装备者的属性类型，使目标对应属性异常积蓄抗性降低20%，持续8秒，相同属性类型的效果不可叠加。",
        overrides.driveDiscFourPieceRecords?.SuitFreedomBlues ?? [],
      ),
      batch10Disc(
        "SuitSoulRock",
        "灵魂摇滚",
        discNotes.SuitSoulRock ?? "",
        overrides.driveDiscFourPieceRecords?.SuitSoulRock ?? [],
      ),
    ],
    skillSubcategories: [],
    followUpSkillRules: [],
  }
}

const batch10Options = (supplements: readonly Supplement[]) =>
  convertSource(
    batch10Data(),
    functions,
    [],
    supplements,
  ).catalog.options.filter((option) =>
    (batch10SupplementIds as readonly string[]).includes(option.optionId),
  )

describe("batch 10 unsupported clause declarations", () => {
  it("registers the thirty-one declarations as unsupported variants without new rules", () => {
    const baseline = convertSource(
      batch10Data(),
      functions,
      [],
      batch10SupplementsWithSupport.filter(
        (supplement) =>
          !(batch10SupplementIds as readonly string[]).includes(
            supplement.supplementId,
          ),
      ),
    )
    const result = convertSource(
      batch10Data(),
      functions,
      [],
      batch10SupplementsWithSupport,
    )
    expect(batch10Supplements).toHaveLength(31)
    const options = result.catalog.options.filter((option) =>
      (batch10SupplementIds as readonly string[]).includes(option.optionId),
    )
    expect(options).toHaveLength(31)
    // 不可选登记不创建规则：与只含既有补充的基线逐条相同。
    expect(result.definitions.effects).toEqual(baseline.definitions.effects)
    for (const option of options) {
      expect(option.variants, option.optionId).toHaveLength(1)
      const variant = option.variants[0]!
      expect(variant.status, option.optionId).toBe("unsupported")
      expect(variant.reason, option.optionId).toBe("formula-out-of-scope")
      expect(variant.effectIds, option.optionId).toEqual([])
      expect(variant.maximumLayers, option.optionId).toBe(1)
      expect(variant.inputs, option.optionId).toEqual([])
      expect(variant.explanation?.length ?? 0, option.optionId).toBeGreaterThan(
        20,
      )
      for (const reference of variant.references)
        expect(reference, option.optionId).toMatchObject({
          sourceId: "nanoka-integrated",
          version: "3.2",
        })
    }
    const configurationOf = (optionId: string) =>
      options.find((option) => option.optionId === optionId)!.variants[0]!
        .configuration
    expect(
      configurationOf("nanoka:drive-discs:31200:four-piece-daze-value"),
    ).toEqual({ minimumSetPieces: 4 })
    expect(
      configurationOf("nanoka:w-engines:12003:ex-energy-recovery"),
    ).toEqual({
      refinements: [1, 2, 3, 4, 5],
    })
    expect(configurationOf("nanoka:agents:qingyi:flash-voltage-daze")).toEqual(
      {},
    )
    expect(
      configurationOf("nanoka:agents:koleda:enhanced-basic-second-daze"),
    ).toEqual({
      potentialLevels: [1, 2, 3, 4, 5, 6],
    })
    expect(configurationOf("nanoka:agents:nangongyu:m6-vibrato-daze")).toEqual({
      minimumMindscape: 6,
    })
    const records = result.coverage.supplementalRecords.filter((record) =>
      (batch10SupplementIds as readonly string[]).includes(record.supplementId),
    )
    expect(records).toHaveLength(31)
    for (const record of records) {
      expect(record, record.supplementId).toMatchObject({
        kind: "unsupported-option",
        status: "out-of-scope",
      })
      expect(record.optionId, record.supplementId).toBe(record.supplementId)
      expect(record.reason?.length ?? 0).toBeGreaterThan(20)
    }
  })

  it("rejects unmapped entities, wrong configuration domains and duplicate ids", () => {
    const override = (
      supplementId: string,
      patch: Partial<Supplement>,
    ): readonly Supplement[] =>
      batch10SupplementsWithSupport.map((supplement) =>
        supplement.supplementId === supplementId
          ? ({ ...supplement, ...patch } as Supplement)
          : supplement,
      )
    // 未知实体：登记必须挂到既有目录实体。
    expect(() =>
      convertSource(
        batch10Data(),
        functions,
        [],
        override("nanoka:w-engines:12003:ex-energy-recovery", {
          catalogEntityId: "w-engines:Missing",
        } as Partial<Supplement>),
      ),
    ).toThrowError(/Unknown unsupported-option catalog entity/)
    // 未映射实体（身份映射为 null 的占位实体）：拒绝。
    expect(() =>
      convertSource(
        {
          ...batch10Data(),
          wengines: [
            ...batch10Data().wengines,
            {
              id: "none",
              name: "未选择",
              fixedBuffs: { effectBlocks: [], effects: [] },
            },
          ],
        },
        functions,
        [],
        override("nanoka:w-engines:12003:ex-energy-recovery", {
          catalogEntityId: "w-engines:none",
        } as Partial<Supplement>),
      ),
    ).toThrowError(/expects a mapped catalog entity/)
    // 配置域不符：套装门槛不能挂到代理人身上。
    expect(() =>
      convertSource(
        batch10Data(),
        functions,
        [],
        override("nanoka:agents:qingyi:flash-voltage-daze", {
          configuration: { minimumSetPieces: 4 },
        } as Partial<Supplement>),
      ),
    ).toThrowError(
      /declares the configuration key minimumSetPieces for a agent entity/,
    )
    // 取值不真实：空精炼档/非法件数。
    expect(() =>
      convertSource(
        batch10Data(),
        functions,
        [],
        override("nanoka:w-engines:12003:ex-energy-recovery", {
          configuration: { refinements: [] },
        } as Partial<Supplement>),
      ),
    ).toThrowError(/must declare the verified refinements/)
    expect(() =>
      convertSource(
        batch10Data(),
        functions,
        [],
        override("nanoka:drive-discs:31200:four-piece-daze-value", {
          configuration: { minimumSetPieces: 3 },
        } as unknown as Partial<Supplement>),
      ),
    ).toThrowError(/must declare the verified set-piece threshold/)
    // 选项 ID 撞车：与既有声明重复。
    expect(() =>
      convertSource(
        batch10Data(),
        functions,
        [],
        override("nanoka:agents:qingyi:flash-voltage-daze", {
          optionId: "nanoka:agents:lighter:mindscape-4-morale-burst-energy",
        } as Partial<Supplement>),
      ),
    ).toThrowError(/repeats the option id/)
  })

  it("rejects four-piece note drift and duplicate four-piece declarations", () => {
    expect(() =>
      convertSource(
        batch10Data({
          driveDiscFourPieceNote: { SuitShockstarDisco: "失衡值提升21%。" },
        }),
        functions,
        [],
        batch10SupplementsWithSupport,
      ),
    ).toThrowError(/four-piece block note drift/)
    // 固定来源补出同件数记录（会生成同件数选项）即拒绝并存。
    expect(() =>
      convertSource(
        batch10Data({
          driveDiscFourPieceRecords: {
            SuitFreedomBlues: [
              {
                ...batch03BaseEffect,
                id: "legacy-four-piece",
                stat: "mastery",
                value: 20,
              },
            ],
          },
        }),
        functions,
        [],
        batch10SupplementsWithSupport,
      ),
    ).toThrowError(
      /four-piece supplement collides with the fixed-source option/,
    )
  })

  it("rejects w-engine declarations once the source stops looking unencoded", () => {
    expect(() =>
      convertSource(
        batch10Data({
          wengineRecords: {
            Lunar_Noviluna: [
              {
                ...batch03BaseEffect,
                id: "new-energy-record",
                stat: "energyRegen",
                value: 20,
              },
            ],
          },
        }),
        functions,
        [],
        batch10SupplementsWithSupport,
      ),
    ).toThrowError(/refinement tiers as currently unencoded/)
    expect(() =>
      convertSource(
        batch10Data({ wengineDropNoteTier: { Vortex_Arrow: 4 } }),
        functions,
        [],
        batch10SupplementsWithSupport,
      ),
    ).toThrowError(/lost the clause note/)
    // 已有 stat 词表可编码的条款（春日融融的能量获得效率）出现记录即拒绝。
    expect(() =>
      convertSource(
        batch10Data({
          wengineRecords: {
            Spring_Embrace: [
              {
                ...batch03BaseEffect,
                id: "upstream-energyRegen",
                stat: "energyRegen",
                value: 10,
              },
            ],
          },
        }),
        functions,
        [],
        batch10SupplementsWithSupport,
      ),
    ).toThrowError(
      /refinement tiers as currently unencoded|conflicts with the fixed-source record/,
    )
  })

  it("rejects agent declarations when the registered location gains records or drifts", () => {
    for (const [agentId, rank, supplementId, pattern] of [
      [
        "nicole",
        1,
        "nanoka:agents:nicole:mindscape-1-anomaly-buildup-and-field-duration",
        /currently empty pack/,
      ],
      [
        "lighter",
        4,
        "nanoka:agents:lighter:mindscape-4-morale-burst-energy",
        /currently empty pack/,
      ],
    ] as const) {
      expect(() =>
        convertSource(
          batch10Data({
            agentRecords: {
              [agentId]: {
                rank,
                effects: [
                  {
                    ...batch03BaseEffect,
                    id: `new-${agentId}-record`,
                    stat: "dmgBonus",
                    value: 10,
                  },
                ],
              },
            },
          }),
          functions,
          [],
          batch10SupplementsWithSupport,
        ),
      ).toThrowError(pattern)
      // 合法对照：登记位置没有新编码时正常生成。
      const option = batch10Options(batch10SupplementsWithSupport).find(
        (candidate) => candidate.optionId === supplementId,
      )
      expect(option, supplementId).toBeDefined()
    }
    expect(() =>
      convertSource(
        batch10Data({
          underminesAnchorNote: "南宫羽攻击造成的失衡值提升50%。",
        }),
        functions,
        [],
        batch10SupplementsWithSupport,
      ),
    ).toThrowError(/anchor block .* note drifted/)
    // 柚叶额外能力锚块 note 漂移（保留原文再追加）即拒绝。
    expect(() =>
      convertSource(
        batch10Data({
          yuzuhaAbilityNote: `${batch10YuzuhaAbilityNote}（追加句）`,
        }),
        functions,
        [],
        batch10SupplementsWithSupport,
      ),
    ).toThrowError(/blk-ms38y9v7-07td4j note drifted/)
    // 柚叶影画 1 块 note 漂移即拒绝；合法对照（原 note）正常生成。
    expect(() =>
      convertSource(
        batch10Data({
          yuzuhaMindscape1Note: batch10YuzuhaMindscape1Note.replace(
            "130%",
            "120%",
          ),
        }),
        functions,
        [],
        batch10SupplementsWithSupport,
      ),
    ).toThrowError(
      /blk-legacy note drifted|Complete-state tanuki-wish block note drift/,
    )
    expect(
      batch10Options(batch10SupplementsWithSupport).find(
        (option) =>
          option.optionId === "nanoka:agents:yuzuha:mindscape-1-entry-energy",
      ),
    ).toBeDefined()
    // 影画 1 出现 energyRegen 机器记录（该条款类别的唯一可编码量）即拒绝重核。
    expect(() =>
      convertSource(
        batch10Data({
          agentRecords: {
            yuzuha: {
              rank: 1,
              effects: [
                {
                  ...batch03BaseEffect,
                  id: "upstream-entry-energy",
                  stat: "energyRegen",
                  value: 30,
                },
              ],
            },
          },
        }),
        functions,
        [],
        batch10SupplementsWithSupport,
      ),
    ).toThrowError(/conflicts with the fixed-source record .* energyRegen/)
  })

  it("carries the real 12014 entity for the migrated boundary clause", () => {
    const withoutCarriedClause = batch10SupplementsWithSupport.filter(
      (supplement) =>
        supplement.supplementId !==
        "nanoka:w-engines:12014:attacker-damage-reduction",
    )
    const baseline = convertSource(
      batch10Data(),
      functions,
      [],
      withoutCarriedClause,
    )
    const result = convertSource(
      batch10Data(),
      functions,
      [],
      batch10SupplementsWithSupport,
    )
    const entity = result.catalog.entities.find(
      (candidate) => candidate.catalogEntityId === "nanoka:w-engines:12014",
    )
    expect(entity).toMatchObject({
      upstreamId: null,
      name: "「恒等式」-变格",
      identity: { kind: "w-engine", entityId: "12014" },
      status: "mapped",
      profession: "防护",
      element: null,
    })
    // 真实元数据溯源（integrated 中英文与 data.json 摘要）。
    expect(
      entity!.supplementProvenance?.resources.map((resource) => resource.path),
    ).toEqual(["w-engines/12014/details.zh.json", "w-engines/12014/data.json"])
    // 补充实体不进入固定来源分母：实体总数与不含该声明的基线相同。
    expect(result.coverage.summary.entities).toBe(
      baseline.coverage.summary.entities,
    )
    expect(result.coverage.summary.supplements.entities).toBe(
      baseline.coverage.summary.supplements.entities + 1,
    )
    // 同一条款只有一份可发现声明：旧 boundary 记录不再并存。
    expect(
      result.catalog.options
        .filter((option) => option.catalogEntityId === "nanoka:w-engines:12014")
        .map((option) => option.optionId),
    ).toEqual(["nanoka:w-engines:12014:attacker-damage-reduction"])
    const records = result.coverage.supplementalRecords.filter((record) =>
      record.supplementId.includes("12014"),
    )
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      source: "nanoka-integrated@3.2 w-engines/12014 /talents/1—5/desc",
      kind: "unsupported-option",
      optionId: "nanoka:w-engines:12014:attacker-damage-reduction",
      status: "out-of-scope",
    })
    expect(records[0]!.reason?.length ?? 0).toBeGreaterThan(20)
  })

  it("rejects colliding carried entities and protects the registered clause context", () => {
    const carried = batch10SupplementsWithSupport.find(
      (supplement) =>
        supplement.supplementId ===
        "nanoka:w-engines:12014:attacker-damage-reduction",
    )!
    if (carried.kind !== "unsupported-option" || !carried.entity)
      throw new Error("carried entity fixture missing")
    // 目录 ID 撞车：第二个补充实体使用同一 catalogEntityId 即拒绝。
    expect(() =>
      convertSource(
        batch10Data(),
        functions,
        [],
        [
          ...batch10SupplementsWithSupport,
          {
            ...carried,
            supplementId: "nanoka:w-engines:12014:duplicate-catalog-id",
            optionId: "nanoka:w-engines:12014:duplicate-catalog-id",
          } as Supplement,
        ],
      ),
    ).toThrowError(/Duplicate supplement entity: nanoka:w-engines:12014/)
    // 身份撞车：另一个补充实体声明同一 w-engine/12014 身份即拒绝。
    expect(() =>
      convertSource(
        batch10Data(),
        functions,
        [],
        [
          ...batch10SupplementsWithSupport,
          {
            ...carried,
            supplementId: "nanoka:w-engines:12014-duplicate-identity",
            optionId: "nanoka:w-engines:12014-duplicate-identity",
            catalogEntityId: "nanoka:w-engines:12014-duplicate-identity",
            entity: {
              ...carried.entity,
              catalogEntityId: "nanoka:w-engines:12014-duplicate-identity",
            },
          } as Supplement,
        ],
      ),
    ).toThrowError(/repeats the identity w-engine\/12014/)
    // 该条款的配置守卫仍生效：空精炼档拒绝；合法对照正常生成。
    expect(() =>
      convertSource(
        batch10Data(),
        functions,
        [],
        batch10SupplementsWithSupport.map((supplement) =>
          supplement.supplementId ===
          "nanoka:w-engines:12014:attacker-damage-reduction"
            ? ({
                ...supplement,
                configuration: { refinements: [] },
              } as Supplement)
            : supplement,
        ),
      ),
    ).toThrowError(/must declare the verified refinements/)
    expect(
      batch10Options(batch10SupplementsWithSupport).find(
        (option) =>
          option.optionId ===
          "nanoka:w-engines:12014:attacker-damage-reduction",
      ),
    ).toBeDefined()
    // 南宫羽核心锚块与琉音 blk-legacy 锚块 note 漂移即拒绝；合法对照正常。
    expect(() =>
      convertSource(
        batch10Data({
          nangongyuCoreNote: batch10NangongyuCoreNote.replace("35%", "34%"),
        }),
        functions,
        [],
        batch10SupplementsWithSupport,
      ),
    ).toThrowError(/blk-ms4cegmd-bwnttd note drifted/)
    expect(() =>
      convertSource(
        batch10Data({ dialynComplaintNote: "恶意投诉：失衡持续时间提升2秒。" }),
        functions,
        [],
        batch10SupplementsWithSupport,
      ),
    ).toThrowError(/blk-legacy note drifted/)
    for (const optionId of [
      "nanoka:agents:nangongyu:core-buildup-and-daze",
      "nanoka:agents:dialyn:malicious-complaint-stun-duration",
      "nanoka:agents:lighter:morale-acquisition",
      "nanoka:w-engines:13127:ex-and-assist-anomaly-buildup",
      "nanoka:w-engines:14148:ex-physical-daze-stacks",
    ])
      expect(
        batch10Options(batch10SupplementsWithSupport).find(
          (option) => option.optionId === optionId,
        ),
        optionId,
      ).toBeDefined()
  })

  it("is stable under supplement reordering", () => {
    const byId = (options: readonly { optionId: string }[]) =>
      options.toSorted((a, b) => a.optionId.localeCompare(b.optionId))
    const ordered = byId(batch10Options(batch10SupplementsWithSupport))
    const shuffled = byId(
      batch10Options(batch10SupplementsWithSupport.toReversed()),
    )
    expect(shuffled).toEqual(ordered)
    // 其他实体或无关 rank 的机器记录不影响本批声明（不误拒）。
    const unrelated = convertSource(
      batch10Data({
        agentRecords: {},
        wengineRecords: {},
      }),
      functions,
      [],
      batch10SupplementsWithSupport,
    )
    expect(
      unrelated.catalog.options.filter((option) =>
        (batch10SupplementIds as readonly string[]).includes(option.optionId),
      ),
    ).toHaveLength(31)
  })
})

/**
 * 修订 45：克拉蕾影画一的"触发[毁伤]造成的伤害倍率提升至原本的 130%"
 * 由固定来源的 skillDmgBonus +30（增伤区）纠正为倍率乘区
 * base-multiplier-increase +0.3；数值、培养门槛、作用对象与毁伤专项目标不变。
 */
describe("claret mindscape 1 multiplier encoding correction", () => {
  const optionId =
    "agents:claret:mindscape:1:blk-mtrkovf7-dqmjh3:eff-mtse9xm8-q641yp"
  const effectId =
    "agent:1611:zzz-hp:eff-mtse9xm8-q641yp:blk-mtrkovf7-dqmjh3:mindscape:1"
  const claretData = (block = claretMindscape1Block()): SourceData => ({
    agents: [
      {
        id: "claret",
        name: "克拉蕾",
        profession: "锋御",
        mindscapeBuffs: Array.from({ length: 7 }, (_, rank) =>
          rank === 1 ? { effectBlocks: [block] } : {},
        ),
      },
    ],
    driveDiscs: [],
    skillSubcategories: [],
    followUpSkillRules: [],
    wengines: [],
  })

  it("compiles the frozen record as a base multiplier increase while preserving its identity and scope", () => {
    const input = claretData()
    const before = structuredClone(input)
    const result = convertSource(input, functions, [], [])
    expect(input).toEqual(before)
    expect(result.definitions.revision).toBe("46")
    const rule = result.definitions.effects.find(
      (entry): entry is ContributionRule =>
        entry.kind === "contribution" && entry.effectId === effectId,
    )!
    expect(rule).toMatchObject({
      scope: "hit",
      beneficiary: { kind: "holder" },
      parameters: { amount: { unit: "ratio", value: 0.3 } },
      activation: { kind: "supplied", maximumLayers: { value: 1 } },
      operation: {
        kind: "factor-contribution",
        channel: "base-multiplier-increase",
      },
    })
    // 作用范围保持仅毁伤：直伤种类与[特殊技]大类下的具名毁伤目标同时要求，
    // 不引入元素或其他命中条件。
    expect(rule.when).toMatchObject({
      kind: "all",
      conditions: expect.arrayContaining([
        {
          kind: "one-of",
          fact: "hit.damageKind",
          values: ["regular", "sheer", "sharpen"],
        },
        {
          kind: "any",
          conditions: [
            {
              kind: "all",
              conditions: [
                {
                  kind: "one-of",
                  fact: "hit.skillTag",
                  values: ["zzz-hp:category:special"],
                },
                {
                  kind: "one-of",
                  fact: "hit.skillTag",
                  values: ["zzz-hp:skill:claret-special-mtsecz30"],
                },
              ],
            },
          ],
        },
      ]),
    })
    expect(JSON.stringify(rule.when)).not.toContain('"hit.element"')
    expect(result.catalog.options).toMatchObject([
      {
        optionId,
        name: "影画1 · directDmgMultFactor",
        target: "self",
        variants: [
          {
            status: "corrected",
            configuration: { minimumMindscape: 1 },
            effectIds: [effectId],
            maximumLayers: 1,
            differences: ["claret-mindscape1-multiplier-encoding"],
          },
        ],
      },
    ])
    expect(result.catalog.options[0]!.conditionDescription).toBe(
      "克拉蕾攻击命中敌人并造成锐暴时，残痕积蓄效率提升20%；克拉蕾触发[毁伤]造成的伤害倍率提升至原本的130%。",
    )
    expect(result.catalog.options[0]!.variants[0]!.references).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceId: "zzz-hp",
          // 合成夹具的实体下标是数组位置；块与效果身份与真实来源一致。
          pointer: expect.stringContaining(
            "/mindscapeBuffs/1/effectBlocks/0/effects/0",
          ),
        }),
        expect.objectContaining({
          locale: "zh",
          resourcePath: "agents/1611/details.zh.json",
          pointer: "/talent/1/desc",
        }),
        expect.objectContaining({
          locale: "en",
          resourcePath: "agents/1611/details.en.json",
          pointer: "/talent/1/desc",
        }),
      ]),
    )
    expect(result.coverage.records).toMatchObject([
      {
        stat: "skillDmgBonus",
        status: "corrected",
        optionId,
        effectIds: [effectId],
        normalizationChanges: [],
      },
    ])
    expect(result.coverage.summary).toMatchObject({
      converted: 0,
      corrected: 1,
      unsupported: 0,
    })
  })

  it("rejects a drifted encoding or block note instead of silently re-scoping", () => {
    const driftedValue = claretData()
    driftedValue.agents[0]!.mindscapeBuffs![1]!.effectBlocks![0]!.effects[0]!.value = 25
    expect(() => convertSource(driftedValue, functions, [], [])).toThrow(
      /field drift/,
    )
    const driftedStat = claretData()
    driftedStat.agents[0]!.mindscapeBuffs![1]!.effectBlocks![0]!.effects[0]!.stat =
      "dmgBonus"
    expect(() => convertSource(driftedStat, functions, [], [])).toThrow(
      /field drift/,
    )
    const driftedScope = claretData()
    driftedScope.agents[0]!.mindscapeBuffs![1]!.effectBlocks![0]!.effects[0]!.skillSubcategoryId =
      null
    expect(() => convertSource(driftedScope, functions, [], [])).toThrow(
      /field drift/,
    )
    const driftedNote = claretData()
    driftedNote.agents[0]!.mindscapeBuffs![1]!.effectBlocks![0]!.note =
      "克拉蕾触发[毁伤]造成的伤害倍率提升至原本的140%。"
    expect(() => convertSource(driftedNote, functions, [], [])).toThrow(
      /block note drift/,
    )
  })
})

describe("3.2.5 conditions.damageTypes and optional scope", () => {
  const damageRule = (
    effectOverride: Partial<Omit<SourceEffect, "scope">> & {
      scope?: string | string[] | undefined
    },
  ) => {
    const source = data()
    const base = effect("first", 10)
    delete base.scope
    const { scope, ...rest } = effectOverride
    source.wengines[0]!.refinementBuffs = [
      {
        effectBlocks: [
          {
            id: "block",
            name: "Rank 1",
            effects: [
              {
                ...base,
                ...rest,
                ...(scope === undefined ? {} : { scope }),
              },
            ],
          },
        ],
      },
    ]
    const result = convertSource(source, functions, [], [])
    return result.definitions.effects.find(
      (rule): rule is ContributionRule => rule.kind === "contribution",
    )!
  }

  it("maps conditions.damageTypes onto the hit damage-kind condition", () => {
    const rule = damageRule({
      stat: "resPen",
      scope: undefined,
      conditions: {
        damageTypes: [
          "anomalyRelease",
          "radiance",
          "turbulence",
          "disorder",
          "anomaly",
        ],
      },
    })
    expect(rule.when).toEqual({
      kind: "all",
      conditions: [
        {
          kind: "one-of",
          fact: "hit.damageKind",
          values: [
            "anomaly-settlement",
            "luminize",
            "vortex",
            "disorder",
            "anomaly",
          ],
        },
      ],
    })
  })

  it("maps direct damage types and mutation onto their damage kinds", () => {
    const rule = damageRule({
      stat: "resPen",
      scope: undefined,
      conditions: {
        damageTypes: ["normal", "pierce", "sharpen", "mutation"],
      },
    })
    expect(rule.when).toEqual({
      kind: "all",
      conditions: [
        {
          kind: "one-of",
          fact: "hit.damageKind",
          values: [
            "regular",
            "sheer",
            "sharpen",
            "anomaly",
            "disorder",
            "vortex",
            "anomaly-settlement",
            "luminize",
          ],
        },
      ],
    })
  })

  it("unions multiple scopes", () => {
    const rule = damageRule({
      stat: "resPen",
      scope: ["anomaly", "disorder"],
    })
    expect(rule.when).toEqual({
      kind: "all",
      conditions: [
        {
          kind: "one-of",
          fact: "hit.damageKind",
          values: ["anomaly", "disorder"],
        },
      ],
    })
  })

  it("treats a missing scope as general and keeps the conditions scope", () => {
    const rule = damageRule({
      stat: "resPen",
      scope: undefined,
      groupId: "upstream-group",
      conditions: {
        damageTypes: ["turbulence"],
        note: "ignored upstream field",
      },
    })
    expect(rule.when).toEqual({
      kind: "all",
      conditions: [
        { kind: "one-of", fact: "hit.damageKind", values: ["vortex"] },
      ],
    })
  })

  it("treats a missing scope without skillTargets as general", () => {
    const rule = damageRule({ stat: "resPen", scope: undefined })
    expect(rule.when).toEqual({ kind: "all", conditions: [] })
  })

  it("derives skill scope from skillTargets when scope is omitted", () => {
    const rule = damageRule({
      stat: "resPen",
      scope: undefined,
      skillTargets: [
        { category: "chain", subcategoryId: null },
        { category: "ultimate", subcategoryId: null },
      ],
    })
    expect(rule.when).toEqual({
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
            {
              kind: "all",
              conditions: [
                {
                  kind: "one-of",
                  fact: "hit.skillTag",
                  values: ["zzz-hp:category:chain"],
                },
              ],
            },
            {
              kind: "all",
              conditions: [
                {
                  kind: "one-of",
                  fact: "hit.skillTag",
                  values: ["zzz-hp:category:ultimate"],
                },
              ],
            },
          ],
        },
      ],
    })
  })

  it("keeps explicit general scope general even with skillTargets", () => {
    const rule = damageRule({
      stat: "resPen",
      scope: "general",
      skillTargets: [{ category: "chain", subcategoryId: null }],
    })
    expect(rule.when).toEqual({ kind: "all", conditions: [] })
  })

  it("accepts the 3.2.5 Evelyn record with omitted scope and skillTargets", () => {
    const source = batch08Data()
    const block = source.agents[0]!.mindscapeBuffs![0]!.effectBlocks![0]!
    block.effects = block.effects.map((candidate) => {
      if (
        !["eff-ms4j94x5-3elaxq", "eff-ms4j9nhd-9ya68m"].includes(candidate.id)
      )
        return candidate
      const withoutScope = { ...candidate }
      delete withoutScope.scope
      return withoutScope
    })
    const result = convertSource(source, functions, [], batch08Supplements)
    for (const effectId of [
      "agent:1321:zzz-hp:eff-ms4j94x5-3elaxq:blk-ms4j94x5-1mflp4:mindscape:0",
      "agent:1321:zzz-hp:eff-ms4j9nhd-9ya68m:blk-ms4j94x5-1mflp4:mindscape:0",
    ]) {
      const rule = result.definitions.effects.find(
        (candidate) => candidate.effectId === effectId,
      ) as ContributionRule
      expect(JSON.stringify(rule.when)).toContain("zzz-hp:category:chain")
      expect(JSON.stringify(rule.when)).toContain("zzz-hp:category:ultimate")
    }
  })

  it("treats empty conditions.damageTypes as all damage types", () => {
    const rule = damageRule({
      stat: "resPen",
      scope: undefined,
      conditions: { damageTypes: [] },
    })
    expect(rule.when).toEqual({ kind: "all", conditions: [] })
  })

  it("lets empty conditions.damageTypes override a legacy scope", () => {
    const rule = damageRule({
      stat: "resPen",
      scope: "anomaly",
      conditions: { damageTypes: [] },
    })
    expect(rule.when).toEqual({ kind: "all", conditions: [] })
  })

  it("rejects a scope that conflicts with conditions.damageTypes", () => {
    expect(() =>
      damageRule({
        stat: "resPen",
        scope: "anomaly",
        conditions: { damageTypes: ["disorder"] },
      }),
    ).toThrow(
      /Conflicting scope and conditions\.damageTypes at w-engines\/Identity_Base\/refinement\/1\/block\/first/,
    )
  })

  it("rejects unknown damage types with the source identity", () => {
    expect(() =>
      damageRule({
        stat: "resPen",
        scope: undefined,
        conditions: { damageTypes: ["void"] },
      }),
    ).toThrow(
      /Unknown damage type: void at w-engines\/Identity_Base\/refinement\/1\/block\/first/,
    )
  })

  it("keeps fixed-source string scopes and general stat scope unchanged", () => {
    const anomalyRule = damageRule({ stat: "resPen", scope: "anomaly" })
    expect(anomalyRule.when).toEqual({
      kind: "all",
      conditions: [
        { kind: "one-of", fact: "hit.damageKind", values: ["anomaly"] },
      ],
    })
    const generalRule = damageRule({ stat: "critRate", scope: "general" })
    expect(generalRule.scope).toBe("entity")
    expect(generalRule.when).toEqual({ kind: "all", conditions: [] })
  })
})
