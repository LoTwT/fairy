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
import { generateStaticEffects } from "../scripts/generate-static-effects.ts"
import {
  convertSource,
  resolveCoreRankParameters,
  type RankEvidence,
} from "../scripts/static-effects/convert.ts"
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
    expect(result.definitions.revision).toBe("10")
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
