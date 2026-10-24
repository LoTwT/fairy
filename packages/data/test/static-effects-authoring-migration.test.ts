import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, describe, expect, it } from "vitest"
import {
  applyStaticEffectsAuthoring,
  resolveAuthoringMode,
  type StaticEffectsGenerationOptions,
} from "../scripts/generate-static-effects.ts"
import {
  compareStaticArtifacts,
  stableStringify,
} from "../scripts/static-effects/authoring/canonical.ts"
import {
  compileAuthoringPilot,
  compileAuthoringRecords,
  readStaticArtifacts,
} from "../scripts/static-effects/authoring/compile.ts"
import { PILOT_AUTHORING_RECORDS } from "../scripts/static-effects/authoring/pilot-records.ts"
import { MIGRATED_AUTHORING_RECORDS } from "../scripts/static-effects/authoring/records.ts"
import { verifyFormalAuthoring } from "../scripts/static-effects/authoring/run-migration.ts"
import type {
  EffectAuthoringRecord,
  EffectAuthoringRuleRecord,
} from "../scripts/static-effects/authoring/types.ts"
import { validateAuthoringRecords } from "../scripts/static-effects/authoring/validation.ts"

const BASELINE_DIRECTORY = fileURLToPath(
  new URL("../definitions/effects", import.meta.url),
)
const temporaryDirectories: string[] = []

function temporaryDirectory(prefix: string): string {
  const directory = mkdtempSync(join(tmpdir(), prefix))
  temporaryDirectories.push(directory)
  return directory
}

afterAll(() => {
  for (const directory of temporaryDirectories)
    rmSync(directory, { recursive: true, force: true })
})

function cloneRecords(): EffectAuthoringRecord[] {
  return structuredClone(MIGRATED_AUTHORING_RECORDS) as EffectAuthoringRecord[]
}

function ruleRecord(record: EffectAuthoringRecord): EffectAuthoringRuleRecord {
  if (record.mechanism.kind === "unsupported")
    throw new Error(`Expected a rule record: ${record.key}`)
  return record as EffectAuthoringRuleRecord
}

function recordByKey(key: string): EffectAuthoringRuleRecord {
  const record = MIGRATED_AUTHORING_RECORDS.find(
    (candidate) => candidate.key === key,
  )
  if (!record) throw new Error(`Missing migrated record: ${key}`)
  return ruleRecord(record)
}

function coverageKey(record: {
  readonly pointer: string
  readonly catalogEntityId: string
}): string {
  return `${record.pointer}|${record.catalogEntityId}`
}

describe("static effects authoring migration records", () => {
  it("accepts the 19 migrated records and their mechanism mix", () => {
    const result = validateAuthoringRecords(MIGRATED_AUTHORING_RECORDS)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.records).toHaveLength(19)
    expect(new Set(result.records.map((record) => record.key)).size).toBe(19)

    const mechanisms = result.records.map((record) => record.mechanism.kind)
    expect(mechanisms.filter((kind) => kind === "single-rule")).toHaveLength(14)
    expect(mechanisms.filter((kind) => kind === "complete-state")).toHaveLength(
      2,
    )
    expect(
      mechanisms.filter((kind) => kind === "independent-settlement"),
    ).toHaveLength(3)
    expect(mechanisms.filter((kind) => kind === "unsupported")).toHaveLength(0)

    const statuses = result.records.map((record) => record.coverage.status)
    expect(statuses.filter((status) => status === "corrected")).toHaveLength(16)
    expect(statuses.filter((status) => status === "converted")).toHaveLength(3)
    for (const record of result.records) {
      if (record.mechanism.kind === "independent-settlement")
        expect(record.coverage.status).toBe("converted")
      const rule = ruleRecord(record)
      expect(rule.activation.kind).toBe("supplied")
      expect(["entity", "hit"]).toContain(rule.scope)
    }
  })

  it("selects 17 option groups with 15 fixed-source coverage positions", () => {
    const baseline = readStaticArtifacts(BASELINE_DIRECTORY)
    const selectedOptionIds = new Set(
      MIGRATED_AUTHORING_RECORDS.map((record) => record.ids.optionId),
    )
    expect(selectedOptionIds.size).toBe(17)
    const selectedCoverage = baseline.coverage.records.filter((record) =>
      selectedOptionIds.has(record.optionId),
    )
    expect(selectedCoverage).toHaveLength(15)
    expect(
      selectedCoverage.filter((record) => record.status === "corrected"),
    ).toHaveLength(14)
    expect(
      selectedCoverage.filter((record) => record.status === "converted"),
    ).toHaveLength(1)
    expect(
      baseline.coverage.records.filter(
        (record) => record.status === "corrected",
      ),
    ).toHaveLength(116)
    expect(
      baseline.coverage.records.filter(
        (record) => record.status === "converted",
      ),
    ).toHaveLength(1167)
    expect(
      baseline.coverage.supplementalRecords.filter(
        (record) =>
          record.optionId !== undefined &&
          selectedOptionIds.has(record.optionId),
      ),
    ).toEqual([
      expect.objectContaining({
        supplementId: "nanoka:agents:miyabi:frostburn-break-damage",
        optionId: "nanoka:agents:miyabi:frostburn-break-damage",
        status: "integrated",
      }),
    ])

    for (const record of MIGRATED_AUTHORING_RECORDS) {
      const baselineRows = baseline.coverage.records.filter(
        (row) => row.optionId === record.ids.optionId,
      )
      expect(baselineRows).toHaveLength(record.coverage.positions.length)
      for (const position of record.coverage.positions) {
        const baselineRow = baselineRows.find(
          (row) => row.pointer === position.pointer,
        )
        expect(baselineRow?.catalogEntityId).toBe(record.entity.catalogEntityId)
        expect(baselineRow?.status).toBe(record.coverage.status)
        expect(baselineRow?.effectIds).toEqual([record.ids.effectId])
      }
    }
  })

  it("projects 19 records to 19 rules, 17 options and 2 skill targets", () => {
    const baseline = readStaticArtifacts(BASELINE_DIRECTORY)
    const compilation = compileAuthoringRecords(
      MIGRATED_AUTHORING_RECORDS,
      baseline,
    )
    expect(compilation.ruleIds).toHaveLength(19)
    expect(compilation.optionIds).toHaveLength(17)
    expect(compilation.coverageKeys).toHaveLength(15)
    expect(compilation.supplementalRecordIds).toEqual([
      "nanoka:agents:miyabi:frostburn-break-damage",
    ])
    expect(compilation.skillTargetIds).toHaveLength(2)

    const groups = new Map<string, EffectAuthoringRuleRecord[]>()
    for (const record of MIGRATED_AUTHORING_RECORDS) {
      const group = groups.get(record.ids.optionId) ?? []
      group.push(ruleRecord(record))
      groups.set(record.ids.optionId, group)
    }

    for (const [optionId, records] of groups) {
      const [first] = records
      if (!first) throw new Error(`Empty record group: ${optionId}`)
      const option = compilation.artifacts.catalog.options.find(
        (candidate) => candidate.optionId === optionId,
      )
      expect(option?.catalogEntityId).toBe(first.entity.catalogEntityId)
      expect(option?.variants).toHaveLength(1)
      const variant = option?.variants[0]
      expect(variant?.status).toBe(first.coverage.status)
      expect(variant?.effectIds).toEqual(
        records.map((record) => record.ids.effectId),
      )
      expect(variant?.differences).toEqual([
        ...new Set(records.flatMap((record) => record.coverage.differenceIds)),
      ])
      expect(variant?.references).toEqual(first.option.variants[0]?.references)
      expect(variant?.configuration).toEqual(
        first.option.variants[0]?.configuration,
      )
      expect(variant?.maximumLayers).toBe(
        first.option.variants[0]?.maximumLayers,
      )

      for (const authoring of records) {
        const rule = compilation.artifacts.definitions.effects.find(
          (candidate) => candidate.effectId === authoring.ids.effectId,
        )
        expect(rule?.kind).toBe("contribution")
        if (rule?.kind === "contribution") {
          expect(rule.source.identity).toEqual(authoring.entity.identity)
          expect(rule.source.section).toBe(authoring.section)
          expect(rule.source.references).toEqual(authoring.references)
          expect(rule.config).toEqual(authoring.config)
          expect(rule.activation).toEqual(authoring.activation)
          expect(rule.beneficiary).toEqual(authoring.beneficiary)
          expect(rule.scope).toBe(authoring.scope)
          expect(rule.when).toEqual(authoring.when)
          expect(rule.operation).toEqual(authoring.operation)
          expect(rule.parameters).toEqual(authoring.parameters)
        }

        for (const position of authoring.coverage.positions) {
          const coverage = compilation.artifacts.coverage.records.find(
            (candidate) =>
              candidate.optionId === authoring.ids.optionId &&
              candidate.pointer === position.pointer,
          )
          expect(coverage?.status).toBe(authoring.coverage.status)
          expect(coverage?.effectIds).toEqual([authoring.ids.effectId])
          expect(coverage?.normalizationChanges).toEqual(
            position.normalizationChanges,
          )
          expect(coverage?.rawValue).toBe(position.rawValue)
          expect(coverage?.normalizedValue).toBe(position.normalizedValue)
        }
      }
    }
  })

  it("keeps the complete-state option as one team/holder pair", () => {
    const compilation = compileAuthoringRecords(
      MIGRATED_AUTHORING_RECORDS,
      readStaticArtifacts(BASELINE_DIRECTORY),
    )
    const optionId =
      "agents:remiel:mindscape:1:phase-transition-flow:other-character-anomaly-damage"
    const option = compilation.artifacts.catalog.options.find(
      (candidate) => candidate.optionId === optionId,
    )
    expect(option?.name).toBe("相变时流 · 其他角色属性异常伤害")
    expect(option?.target).toBe("team")
    expect(option?.variants).toHaveLength(1)
    expect(option?.variants[0]?.status).toBe("corrected")
    expect(option?.variants[0]?.effectIds).toEqual([
      "agent:1581:zzz-hp:eff-ms7tjecu-l3ocgm:blk-legacy:mindscape:1",
      "agent:1581:zzz-hp:eff-ms7tjyzo-3v31wa:blk-legacy:mindscape:1",
    ])
    expect(option?.variants[0]?.differences).toEqual([
      "remielle-mindscape1-complete-anomaly-state",
    ])
    expect(
      compilation.artifacts.coverage.records.filter(
        (record) => record.optionId === optionId,
      ),
    ).toEqual([])

    const team = recordByKey("remiel-m1-team-anomaly-damage")
    const holder = recordByKey("remiel-m1-holder-anomaly-damage")
    expect(team.beneficiary).toEqual({ kind: "team" })
    expect(holder.beneficiary).toEqual({ kind: "holder" })
    expect(ruleRecord(team).parameters).toEqual({
      amount: { kind: "constant", unit: "ratio", value: 0.1 },
    })
    expect(ruleRecord(holder).parameters).toEqual({
      amount: { kind: "constant", unit: "ratio", value: -0.1 },
    })
  })

  it("projects the three independent settlements as converted", () => {
    const compilation = compileAuthoringRecords(
      MIGRATED_AUTHORING_RECORDS,
      readStaticArtifacts(BASELINE_DIRECTORY),
    )
    const expected = [
      {
        optionId: "agents:nekomata:mindscape:0:blk-legacy:eff-ms4f47p3-p1s9yz",
        targetId: "zzz-hp:skill:nekomata-claw-mark",
        itemId: "nekomata:claw-mark",
        exclusive: false,
      },
      {
        optionId: "nanoka:agents:miyabi:frostburn-break-damage",
        targetId: "zzz-hp:skill:miyabi-frostburn-break-damage",
        itemId: "miyabi:frostburn-break-damage",
        exclusive: true,
      },
    ]
    for (const entry of expected) {
      const option = compilation.artifacts.catalog.options.find(
        (candidate) => candidate.optionId === entry.optionId,
      )
      expect(option?.variants[0]?.status).toBe("converted")
      const mechanism = option?.variants[0]?.mechanism
      if (mechanism?.kind !== "independent-settlement")
        throw new Error(`test fixture: ${entry.optionId} is not a settlement`)
      expect(mechanism.damageItemRequirements).toEqual([
        expect.objectContaining({ itemId: entry.itemId }),
      ])
      expect(mechanism.isolateDamageItems).toBe(
        entry.exclusive ? true : undefined,
      )
      expect(
        compilation.skillTargetIds.filter((id) => id === entry.targetId),
      ).toEqual([entry.targetId])
    }
    expect(
      compilation.artifacts.coverage.records.filter(
        (record) =>
          record.optionId ===
          "agents:nekomata:mindscape:0:blk-legacy:eff-ms4f47p3-p1s9yz",
      ),
    ).toHaveLength(1)
    expect(
      compilation.artifacts.coverage.records.filter(
        (record) =>
          record.optionId === "nanoka:agents:miyabi:frostburn-break-damage",
      ),
    ).toEqual([])
    expect(recordByKey("miyabi-frostburn-m4").coverage.status).toBe("converted")
  })

  it("transcribes the new corrected single-rule records from catalog metadata", () => {
    const caesar = recordByKey("caesar-m2-team-attack")
    expect(caesar.ids.optionId).toBe(
      "agents:caesar:mindscape:2:blk-legacy:legacy-team-atk",
    )
    expect(caesar.coverage.positions[0]).toEqual({
      pointer: "/agents/7/mindscapeBuffs/2/effectBlocks/0/effects/0",
      rank: 2,
      rankKind: "mindscape",
      stat: "atk",
      normalizationChanges: [],
      rawValue: 500,
      normalizedValue: 500,
    })
    expect(caesar.coverage.differenceIds).toEqual([
      "core-skill-level-parameters",
      "core-enhancement-independent-increment",
    ])
    expect(caesar.parameters).toEqual({
      amount: {
        kind: "by-rank",
        rank: "coreSkillLevel",
        unit: "attack-points",
        values: {
          "1": 40,
          "2": 135,
          "3": 240,
          "4": 400,
          "5": 650,
          "6": 900,
          "7": 1000,
        },
      },
      incrementCoefficient: {
        kind: "constant",
        unit: "multiplier",
        value: 0.5,
      },
    })
    expect(caesar.option.variants[0]?.configuration).toEqual({
      minimumMindscape: 2,
      coreSkillLevels: [1, 2, 3, 4, 5, 6, 7],
    })

    const lycaon = recordByKey("lycaon-core-team-damage-bonus")
    expect(lycaon.ids.optionId).toBe(
      "agents:lycaon:mindscape:0:blk-legacy:legacy-team-dmgBonus",
    )
    expect(lycaon.coverage.positions[0]).toEqual({
      pointer: "/agents/50/mindscapeBuffs/0/effectBlocks/0/effects/1",
      rank: 0,
      rankKind: "mindscape",
      stat: "dmgBonus",
      normalizationChanges: [],
      rawValue: 30,
      normalizedValue: 30,
    })
    expect(lycaon.coverage.differenceIds).toEqual(["potential-branch-gate"])
    expect(lycaon.beneficiary).toEqual({ kind: "team" })
    expect(lycaon.parameters).toEqual({
      amount: { kind: "constant", unit: "ratio", value: 0.3 },
    })
    expect(lycaon.option.variants[0]?.applicability).toEqual({
      beneficiaryElements: ["wind", "fire", "electric", "physical", "ether"],
    })

    const ellenCriticalDamage = recordByKey("ellen-potential-critical-damage")
    expect(ellenCriticalDamage.ids.optionId).toBe(
      "agents:ellen:mindscape:0:blk-ms4fuyir-dotq6c:eff-ms4fuyir-e3fuww",
    )
    expect(ellenCriticalDamage.coverage.positions[0]?.rawValue).toBe(0)
    expect(ellenCriticalDamage.coverage.positions[0]?.normalizedValue).toBe(0)
    expect(ellenCriticalDamage.activation).toEqual({
      kind: "supplied",
      maximumLayers: { kind: "literal", unit: "count", value: 10 },
    })
    expect(ellenCriticalDamage.parameters).toEqual({
      amount: {
        kind: "by-rank",
        rank: "potentialLevel",
        unit: "ratio",
        values: {
          "2": 0.016,
          "3": 0.024,
          "4": 0.032,
          "5": 0.04,
          "6": 0.048,
        },
      },
    })

    const ellenResistanceIgnore = recordByKey(
      "ellen-potential-resistance-ignore",
    )
    expect(ellenResistanceIgnore.ids.optionId).toBe(
      "agents:ellen:mindscape:0:blk-ms4fuyir-dotq6c:eff-ms4fvlsz-x4x1hj",
    )
    expect(ellenResistanceIgnore.coverage.positions[0]?.rawValue).toBe(10)
    expect(ellenResistanceIgnore.coverage.positions[0]?.normalizedValue).toBe(
      10,
    )
    expect(ellenResistanceIgnore.when).toEqual({
      kind: "all",
      conditions: [{ kind: "one-of", fact: "hit.element", values: ["ice"] }],
    })
    expect(ellenResistanceIgnore.parameters).toEqual({
      amount: {
        kind: "by-rank",
        rank: "potentialLevel",
        unit: "ratio",
        values: {
          "2": 0.033,
          "3": 0.05,
          "4": 0.067,
          "5": 0.083,
          "6": 0.1,
        },
      },
    })
  })

  it("leaves every unselected entry unchanged", () => {
    const baseline = readStaticArtifacts(BASELINE_DIRECTORY)
    const compilation = compileAuthoringRecords(
      MIGRATED_AUTHORING_RECORDS,
      baseline,
    )
    const selectedEffectIds = new Set(
      MIGRATED_AUTHORING_RECORDS.map((record) => record.ids.effectId),
    )
    const selectedOptionIds = new Set(
      MIGRATED_AUTHORING_RECORDS.map((record) => record.ids.optionId),
    )
    const selectedCoverageKeys = new Set(
      MIGRATED_AUTHORING_RECORDS.flatMap((record) =>
        record.coverage.positions.map((position) =>
          coverageKey({
            pointer: position.pointer,
            catalogEntityId: record.entity.catalogEntityId,
          }),
        ),
      ),
    )
    const selectedSupplementIds = new Set(
      MIGRATED_AUTHORING_RECORDS.flatMap((record) =>
        (record.supplementalRecords ?? []).map(
          (supplement) => supplement.supplementId,
        ),
      ),
    )

    for (const rule of baseline.definitions.effects) {
      if (selectedEffectIds.has(rule.effectId)) continue
      const candidate = compilation.artifacts.definitions.effects.find(
        (entry) => entry.effectId === rule.effectId,
      )
      expect(stableStringify(candidate)).toBe(stableStringify(rule))
    }
    for (const option of baseline.catalog.options) {
      if (selectedOptionIds.has(option.optionId)) continue
      const candidate = compilation.artifacts.catalog.options.find(
        (entry) => entry.optionId === option.optionId,
      )
      expect(stableStringify(candidate)).toBe(stableStringify(option))
    }
    for (const record of baseline.coverage.records) {
      if (selectedCoverageKeys.has(coverageKey(record))) continue
      const candidate = compilation.artifacts.coverage.records.find(
        (entry) =>
          entry.pointer === record.pointer &&
          entry.catalogEntityId === record.catalogEntityId,
      )
      expect(stableStringify(candidate)).toBe(stableStringify(record))
    }
    expect(compilation.artifacts.definitions.effects).toHaveLength(
      baseline.definitions.effects.length,
    )
    expect(compilation.artifacts.catalog.options).toHaveLength(
      baseline.catalog.options.length,
    )
    expect(compilation.artifacts.coverage.records).toHaveLength(
      baseline.coverage.records.length,
    )
    expect(
      compilation.artifacts.coverage.supplementalRecords.filter(
        (record) => !selectedSupplementIds.has(record.supplementId),
      ),
    ).toEqual(
      baseline.coverage.supplementalRecords.filter(
        (record) => !selectedSupplementIds.has(record.supplementId),
      ),
    )
    expect(compareStaticArtifacts(baseline, compilation.artifacts)).toEqual({
      equivalent: true,
      differences: [],
    })
  })

  it("uses authoring values instead of selected baseline semantics", () => {
    const baseline = readStaticArtifacts(BASELINE_DIRECTORY)
    const target = MIGRATED_AUTHORING_RECORDS[0]
    if (!target) throw new Error("Missing formal record")
    const authoring = ruleRecord(target)

    const definitions = structuredClone(baseline.definitions) as unknown as {
      effects: Array<{
        effectId: string
        kind: string
        parameters?: Record<string, unknown>
      }>
    }
    const baselineRule = definitions.effects.find(
      (rule) => rule.effectId === target.ids.effectId,
    )
    if (!baselineRule || baselineRule.kind !== "contribution")
      throw new Error("Missing selected baseline rule")
    baselineRule.parameters = {
      amount: { kind: "constant", unit: "ratio", value: 0.999 },
    }

    const catalog = structuredClone(baseline.catalog) as unknown as {
      options: Array<{ optionId: string; name: string }>
    }
    const baselineOption = catalog.options.find(
      (option) => option.optionId === target.ids.optionId,
    )
    if (!baselineOption) throw new Error("Missing selected baseline option")
    baselineOption.name = "baseline mutation must not leak"

    const compilation = compileAuthoringRecords([target], {
      definitions: definitions as unknown as typeof baseline.definitions,
      catalog: catalog as unknown as typeof baseline.catalog,
      coverage: baseline.coverage,
    })
    const compiledRule = compilation.artifacts.definitions.effects.find(
      (rule) => rule.effectId === target.ids.effectId,
    )
    expect(compiledRule?.kind).toBe("contribution")
    if (compiledRule?.kind === "contribution")
      expect(compiledRule.parameters).toEqual(authoring.parameters)
    const compiledOption = compilation.artifacts.catalog.options.find(
      (option) => option.optionId === target.ids.optionId,
    )
    expect(compiledOption?.name).toBe(target.option.name)
    expect(compiledOption?.name).not.toBe("baseline mutation must not leak")
  })

  it("formats byte-identical artifacts for the migrated records", async () => {
    const result = await verifyFormalAuthoring({
      outputDirectory: join(
        temporaryDirectory("fairy-authoring-migration-"),
        "output",
      ),
    })
    expect(result.recordCount).toBe(19)
    expect(result.summary).toBe(
      "rules: 19, options: 17, coverage positions: 15, skill targets: 2, supplemental records: 1",
    )
    expect(result.equivalent).toBe(true)
    expect(result.differences).toEqual([])
    expect(result.byteIdentical).toBe(true)
    for (const hash of result.hashes) expect(hash.candidate).toBe(hash.baseline)
  })

  it("keeps the formal records independent from the P2-1 pilot inputs", () => {
    const authoringDirectory = new URL(
      "../scripts/static-effects/authoring/",
      import.meta.url,
    )
    for (const file of ["records.ts", "run-migration.ts"]) {
      const source = readFileSync(new URL(file, authoringDirectory), "utf8")
      expect(source).not.toMatch(
        /from ["']\.\/(?:pilot-records|pilot-options)\.ts["']/u,
      )
    }
    const generator = readFileSync(
      new URL("../scripts/generate-static-effects.ts", import.meta.url),
      "utf8",
    )
    expect(generator).not.toMatch(/pilot-records|pilot-options/u)
    const pilotRecords = new Set<unknown>(PILOT_AUTHORING_RECORDS)
    for (const record of MIGRATED_AUTHORING_RECORDS)
      expect(pilotRecords.has(record)).toBe(false)
  })

  it("rejects structurally invalid authoring before writing a candidate", () => {
    const record = MIGRATED_AUTHORING_RECORDS[0]
    if (!record) throw new Error("Missing formal record")
    const invalid = [
      {
        ...record,
        operation: { kind: "json-path", path: "$.operation" },
      },
    ] as unknown as EffectAuthoringRecord[]
    const outputDirectory = join(
      temporaryDirectory("fairy-authoring-invalid-"),
      "candidate",
    )
    expect(() =>
      compileAuthoringPilot({
        records: invalid,
        baselineDirectory: BASELINE_DIRECTORY,
        outputDirectory,
      }),
    ).toThrow(/Authoring records are invalid/u)
    expect(existsSync(outputDirectory)).toBe(false)
  })

  it("resolves the authoring mode and rejects unknown values", () => {
    expect(resolveAuthoringMode(undefined)).toBe("authoring")
    expect(resolveAuthoringMode("authoring")).toBe("authoring")
    expect(resolveAuthoringMode("converter-fallback")).toBe(
      "converter-fallback",
    )
    expect(() => resolveAuthoringMode("unknown")).toThrow(
      /Unknown authoring mode/u,
    )
  })

  it("does not apply authoring when the explicit fallback is selected", () => {
    const baseline = readStaticArtifacts(BASELINE_DIRECTORY)
    const changed = cloneRecords()
    const first = changed[0]
    if (!first) throw new Error("Missing formal record")
    const parameters = ruleRecord(first).parameters as unknown as Record<
      string,
      { kind: string; values?: Record<string, number> }
    >
    const amount = parameters["amount"]
    if (!amount?.values) throw new Error("Missing amount parameters")
    amount.values["1"] = 0.1501

    expect(() =>
      applyStaticEffectsAuthoring(baseline, {
        authoringRecords: changed,
      }),
    ).toThrow(/not semantically equivalent/u)

    const fallback = applyStaticEffectsAuthoring(baseline, {
      authoring: "converter-fallback",
      authoringRecords: changed,
    } satisfies StaticEffectsGenerationOptions)
    expect(fallback).toBe(baseline)

    expect(() =>
      applyStaticEffectsAuthoring(baseline, {
        authoring: "unknown" as never,
      }),
    ).toThrow(/Unknown authoring mode/u)
  })
})
