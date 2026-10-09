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
import { SUPPLEMENTS } from "../scripts/static-effects/supplements.ts"
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
    expect(result.definitions.revision).toBe("15")
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
    expect(result.definitions.revision).toBe("15")
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
    expect(result.definitions.revision).toBe("15")
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
    expect(result.definitions.revision).toBe("15")
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
    expect(result.definitions.revision).toBe("15")
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
