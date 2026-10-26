import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { verifySupplementEvidence } from "../scripts/generate-static-effects.ts"
import { convertSource } from "../scripts/static-effects/convert.ts"
import {
  SUPPLEMENTS,
  type Supplement,
  type SupplementOption,
} from "../scripts/static-effects/supplements.ts"
import type {
  SourceData,
  SourceNormalization,
} from "../scripts/static-effects/source.ts"
import original from "./fixtures/roxy-additional-source.json" with { type: "json" }

const slugs = [
  "additional-level-damage",
  "additional-hit-stun-damage",
  "additional-weathered-direct-damage",
] as const
const entries = slugs.map(
  (slug) =>
    SUPPLEMENTS.find(
      (entry) => entry.supplementId === `nanoka:agents:1621:${slug}`,
    ) as SupplementOption,
)
const entity = SUPPLEMENTS.find(
  (entry) =>
    entry.supplementId === "nanoka:agents:1621:initial-energy-regen-conversion",
)!
const casket = SUPPLEMENTS.find(
  (entry) =>
    entry.kind === "entity" && entry.entity.identity?.entityId === "14162",
)!
// fac62407 的 Roxy 确实不存在；不捏造上游空块。
const absentSource: SourceData = {
  agents: [],
  wengines: [],
  driveDiscs: [],
  skillSubcategories: [],
  followUpSkillRules: [],
}
const functions: SourceNormalization = {
  normalizeAgent: (entry) => entry,
  normalizeWengine: (entry) => entry,
  normalizeDriveDisc: (entry) => entry,
  collectEffectsFromPack: (pack) =>
    pack.effectBlocks?.flatMap((block) => block.effects) ?? pack.effects ?? [],
  applyAnomalyFlagsToPack: (pack) => pack,
}
const convert = (supplements: readonly Supplement[] = [entity, ...entries]) =>
  convertSource(absentSource, functions, [], supplements)
const independent = (entry: SupplementOption): SupplementOption => ({
  ...structuredClone(entry),
  supplementId: "fixture:independent-supplement",
  optionId: "fixture:independent-option",
  rule: { ...entry.rule, effectId: "agent:1621:fixture:independent-effect" },
})

describe("Roxy additional ability frozen supplement registration", () => {
  it("generates precisely three independent rules and options on the existing Nanoka entity", () => {
    const output = convert()
    expect(output.definitions.revision).toBe("53")
    expect(entries).toHaveLength(3)
    expect(output.catalog.entities).toHaveLength(1)
    expect(output.catalog.entities[0]).toMatchObject({
      catalogEntityId: "nanoka:agents:1621",
      upstreamId: null,
      identity: { kind: "agent", entityId: "1621" },
      profession: "击破",
    })
    expect(output.definitions.effects).toHaveLength(5) // 既有回能双规则加三个独立条款。
    expect(output.catalog.options).toHaveLength(4)
    for (const [index, entry] of entries.entries()) {
      const option = output.catalog.options.find(
        (candidate) => candidate.optionId === entry.optionId,
      )!
      expect(option.target).toBe(index === 0 ? "self" : "team")
      expect(option.variants[0]).toMatchObject({
        configuration: {},
        maximumLayers: 1,
        inputs: [],
        applicability: {
          otherTeammateProfessions:
            original.independentExpectations.qualificationProfessions,
        },
      })
      expect(option.variants[0].mechanism).toEqual(
        index === 0
          ? {
              kind: "holder-level",
              holderLevelInputName: "roxy:additional:holder-level",
            }
          : index === 2
            ? {
                kind: "windswept-direct",
                metadata: {
                  applicabilityInputName:
                    "roxy:weathered-direct-damage:applicable",
                  applierTeam: "holder",
                  singleActiveSourceGroup: "roxy-additional-windswept",
                },
              }
            : undefined,
      )
      expect(option.variants[0].references).toEqual(
        (["zh", "en"] as const).flatMap((locale) =>
          original.languages[locale].clauses.map((clause) => ({
            sourceId: "nanoka-integrated",
            version: "3.3.12+19634983",
            locale,
            resourcePath: original.languages[locale].resourcePath,
            pointer: clause.pointer,
          })),
        ),
      )
      expect(entry.evidence.map((ref) => ref.rank)).toEqual([
        1, 2, 3, 4, 5, 6, 7, 1, 2, 3, 4, 5, 6, 7,
      ])
      const rule = output.definitions.effects.find(
        (candidate) => candidate.effectId === entry.rule.effectId,
      )!
      expect(rule).toMatchObject({
        kind: "contribution",
        config: { kind: "constant", value: true },
        beneficiary: { kind: index === 0 ? "holder" : "team" },
        operation: {
          kind: "factor-contribution",
          channel:
            index === 0
              ? "damage-bonus"
              : index === 1
                ? "stun-damage-adjustment"
                : "windswept-direct-damage-coefficient-increase",
        },
      })
    }
    expect(
      output.catalog.options.find((option) =>
        option.optionId.endsWith(":additional-weathered-direct-damage"),
      )!.variants[0].mechanism,
    ).toEqual({
      kind: "windswept-direct",
      metadata: {
        applicabilityInputName: "roxy:weathered-direct-damage:applicable",
        applierTeam: "holder",
        singleActiveSourceGroup: "roxy-additional-windswept",
      },
    })
    expect(output.catalog.skillTargets).toEqual([])
    expect(output.definitions.actions).toEqual([])
  })

  const mutations: readonly [string, (entry: any) => void][] = [
    [
      "identity",
      (entry) => {
        entry.rule.identity.entityId = "1251"
      },
    ],
    [
      "catalog owner",
      (entry) => {
        entry.catalogEntityId = "agents:qingyi"
      },
    ],
    [
      "rank gate",
      (entry) => {
        entry.variant.configuration.minimumMindscape = 1
      },
    ],
    [
      "wrong rule gate",
      (entry) => {
        entry.rule.config.value = false
      },
    ],
    [
      "missing language",
      (entry) => {
        entry.evidence.splice(7)
      },
    ],
    [
      "pointer",
      (entry) => {
        entry.evidence[0].pointer = "/talent/1/desc"
      },
    ],
    [
      "rank metadata",
      (entry) => {
        entry.evidence[0].rank = 7
      },
    ],
    [
      "sha",
      (entry) => {
        entry.evidence[0].sha256 = "0".repeat(64)
      },
    ],
    [
      "version",
      (entry) => {
        entry.source = entry.source.replace("3.3.12+19634983", "3.2")
      },
    ],
    [
      "OR gate",
      (entry) => {
        entry.variant.applicability.otherTeammateProfessions.pop()
      },
    ],
    [
      "beneficiary filter",
      (entry) => {
        entry.variant.applicability.beneficiaryProfession = "强攻"
      },
    ],
    [
      "output",
      (entry) => {
        entry.rule.operation = {
          kind: "factor-contribution",
          channel: "damage-bonus",
          value: { kind: "literal", unit: "ratio", value: 0.8 },
        }
      },
    ],
    [
      "beneficiary",
      (entry) => {
        entry.rule.beneficiary = { kind: "team-except-holder" }
      },
    ],
    [
      "unknown metadata",
      (entry) => {
        entry.unreviewed = true
      },
    ],
  ]
  it.each(
    entries.flatMap((entry) =>
      mutations.map(
        ([name, mutate]) => [entry.optionId, name, entry, mutate] as const,
      ),
    ),
  )(
    "rejects complete registration drift %s / %s",
    (_id, _name, entry, mutate) => {
      const changed = structuredClone(entry)
      mutate(changed)
      expect(() => convert([entity, changed])).toThrow(
        /Roxy additional ability registration drift/,
      )
    },
  )
  it.each(
    entries.flatMap((entry) =>
      ["supplementId", "optionId", "main effect", "additional effect"].map(
        (identity) => [entry.optionId, identity, entry] as const,
      ),
    ),
  )("recognizes %s solely by its reserved %s", (_id, identity, entry) => {
    const changed: any = independent(entry)
    if (identity === "supplementId") changed.supplementId = entry.supplementId
    if (identity === "optionId") changed.optionId = entry.optionId
    if (identity === "main effect") changed.rule.effectId = entry.rule.effectId
    if (identity === "additional effect") changed.additionalRules = [entry.rule]
    expect(() => convert([entity, changed])).toThrow(
      /Roxy additional ability registration/,
    )
  })
  it.each([
    "duplicate supplement",
    "duplicate main/additional",
    "duplicate additional",
    "conflicting identities",
  ])("rejects %s", (mode) => {
    const first = entries[0]!,
      second = entries[1]!
    const changed: any = structuredClone(first)
    if (mode === "duplicate main/additional")
      changed.additionalRules = [first.rule]
    if (mode === "duplicate additional") {
      changed.rule = independent(first).rule
      changed.additionalRules = [first.rule, first.rule]
    }
    if (mode === "conflicting identities") changed.optionId = second.optionId
    expect(() =>
      convert([
        entity,
        ...(mode === "duplicate supplement" ? [first, first] : [changed]),
      ]),
    ).toThrow(/Roxy additional ability registration/)
  })
  it.each(entries.map((entry) => [entry.optionId, entry] as const))(
    "accepts a legitimate subset %s",
    (_id, entry) => {
      expect(
        convert([entity, entry]).catalog.options.map(
          (option) => option.optionId,
        ),
      ).toContain(entry.optionId)
    },
  )
  it("permits independent supplement identities and preserves references under reordering", () => {
    const unrelated = independent(entries[0]!)
    const ordered = [entity, casket, ...entries, unrelated]
    const a = convert(ordered),
      b = convert(ordered.toReversed())
    expect(b.definitions).toEqual(a.definitions)
    expect(b.catalog.entities).toEqual(a.catalog.entities)
    expect(b.catalog.skillTargets).toEqual(a.catalog.skillTargets)
    expect(
      b.catalog.options.toSorted((left, right) =>
        left.optionId.localeCompare(right.optionId),
      ),
    ).toEqual(
      a.catalog.options.toSorted((left, right) =>
        left.optionId.localeCompare(right.optionId),
      ),
    )
    expect(
      b.coverage.supplementalRecords.toSorted((left, right) =>
        left.supplementId.localeCompare(right.supplementId),
      ),
    ).toEqual(
      a.coverage.supplementalRecords.toSorted((left, right) =>
        left.supplementId.localeCompare(right.supplementId),
      ),
    )
    expect(convert([]).definitions.effects).toEqual([])
  })
  it("verifies both language digests, all rank pointers and actual level metadata with the production verifier", async () => {
    const publication = await mkdtemp(
      join(tmpdir(), "fairy-roxy-additional-evidence-"),
    )
    try {
      const directory = join(publication, "verified/integrated/agents/1621")
      await mkdir(directory, { recursive: true })
      for (const file of ["data.json", "details.zh.json", "details.en.json"])
        await writeFile(
          join(directory, file),
          await readFile(
            new URL(`../integrated/agents/1621/${file}`, import.meta.url),
          ),
        )
      expect(await verifySupplementEvidence(publication, entries)).toEqual(
        entries.map((entry) => `supplement:${entry.supplementId}`),
      )
      const wrong = structuredClone(entries[0]!) as any
      wrong.evidence[0].rank = 7
      await expect(
        verifySupplementEvidence(publication, [wrong]),
      ).rejects.toThrow(/rank metadata mismatch/)
      wrong.evidence[0].pointer = "/passive/level/missing/desc/1"
      await expect(
        verifySupplementEvidence(publication, [wrong]),
      ).rejects.toThrow(/pointer missing/)
      const path = join(directory, "details.en.json")
      await writeFile(path, (await readFile(path)).toString() + "\n")
      await expect(
        verifySupplementEvidence(publication, entries),
      ).rejects.toThrow(/Evidence file changed/)
    } finally {
      await rm(publication, { recursive: true, force: true })
    }
  })
})
