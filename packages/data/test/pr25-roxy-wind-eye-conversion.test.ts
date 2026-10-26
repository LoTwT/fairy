import { createHash } from "node:crypto"
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
import original from "./fixtures/roxy-wind-eye-source.json" with { type: "json" }

const id = "nanoka:agents:1621:m6-giant-windstorm"
const effectId = "agent:1621:nanoka:m6-giant-windstorm"
const entry = SUPPLEMENTS.find((s) => s.supplementId === id) as SupplementOption
const entity = SUPPLEMENTS.find(
  (s) =>
    s.supplementId === "nanoka:agents:1621:initial-energy-regen-conversion",
)!
const casket = SUPPLEMENTS.find(
  (s) => s.kind === "entity" && s.entity.identity?.entityId === "14162",
)!
const source: SourceData = {
  agents: [],
  wengines: [],
  driveDiscs: [],
  skillSubcategories: [],
  followUpSkillRules: [],
}
const functions: SourceNormalization = {
  normalizeAgent: (e) => e,
  normalizeWengine: (e) => e,
  normalizeDriveDisc: (e) => e,
  collectEffectsFromPack: (p) =>
    p.effectBlocks?.flatMap((b) => b.effects) ?? p.effects ?? [],
  applyAnomalyFlagsToPack: (p) => p,
}
const convert = (supplements: readonly Supplement[] = [entity, entry]) =>
  convertSource(source, functions, [], supplements)
const independent = (): SupplementOption => ({
  ...structuredClone(entry),
  supplementId: "fixture:unrelated",
  optionId: "fixture:unrelated-option",
  rule: {
    ...structuredClone(entry.rule),
    effectId: "agent:1621:fixture:unrelated",
  },
})

describe("Roxy wind-eye independently frozen source and exact registration", () => {
  it.each(["zh", "en"] as const)(
    "retains complete %s clauses and all parameter rows from fixed 3.3.12",
    async (locale) => {
      const ref = original.sources[locale]
      const bytes = await readFile(
        new URL(`../integrated/${ref.resourcePath}`, import.meta.url),
      )
      const details = JSON.parse(bytes.toString())
      expect(original.sourceVersion).toBe("3.3.12+19634983")
      expect(bytes.length).toBe(ref.bytes)
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(ref.sha256)
      expect(original.locales[locale].description.value).toEqual(
        details.skill.special.description[4],
      )
      expect(original.locales[locale].parameters.value).toEqual(
        details.skill.special.description[9],
      )
      for (const rank of ["3", "5", "6"] as const)
        expect(original.locales[locale].mindscapes[rank].value).toBe(
          details.talent[rank].desc,
        )
      expect(original.locales[locale].mindscapes["6"].value).toContain("250%")
      expect(original.locales[locale].description.value.desc).toContain(
        locale === "zh" ? "持续1秒" : "for 1s",
      )
      const rows = details.skill.special.description[9].param
      expect([
        rows[0].param["1621022"].damagePercentage,
        rows[1].param["1621019"].damagePercentage,
        rows[3].param["1621020"].damagePercentage,
      ]).toEqual([5210, 5210, 20840])
      expect([
        rows[0].param["1621022"].damagePercentageGrowth,
        rows[1].param["1621019"].damagePercentageGrowth,
        rows[3].param["1621020"].damagePercentageGrowth,
      ]).toEqual([480, 480, 1900])
    },
  )
  it("preserves the named upstream convention without adding its ids to the old source version", () => {
    expect(original.upstream.commit).toBe(
      "7a4f2776bf4a44cb108fcd7f5834f63606ade914",
    )
    expect(original.upstream.skills.map((s) => s.pointer)).toEqual([
      "/skills/843",
      "/skills/844",
      "/skills/845",
    ])
    expect(original.upstream.skills.map((s) => s.record.baseMult)).toEqual([
      417.4, 104.9, 104.9,
    ])
    for (const { record } of original.upstream.skills)
      expect(record).toMatchObject({
        agentId: "Roxy",
        damageType: "direct",
        skillTypes: ["special", "specialBasic"],
        element: "风",
        baseMultFactor: 100,
        buffAnchorId: null,
        settlementMult: 0,
        ownerGroupId: null,
      })
  })
  it("compiles one independent M6 option with exact target and original item", () => {
    const result = convert()
    expect(result.definitions.revision).toBe("54")
    expect(result.definitions.effects).toHaveLength(3)
    expect(result.catalog.options).toHaveLength(2)
    expect(result.coverage.records).toEqual([])
    expect(result.catalog.entities).toHaveLength(1)
    const rule = result.definitions.effects.find(
      (e) => e.effectId === effectId,
    )!
    expect(rule).toMatchObject({
      source: { identity: { kind: "agent", entityId: "1621" } },
      operation: {
        kind: "hit-adjustment",
        field: "damageMultiplier",
        operator: "scale",
        itemIds: ["action:agent:1621:action:0024:base"],
        value: { kind: "literal", unit: "multiplier", value: 2.5 },
      },
    })
    expect(
      result.catalog.options.find((o) => o.optionId === id)?.variants[0],
    ).toMatchObject({
      configuration: { minimumMindscape: 6 },
      maximumLayers: 1,
      inputs: [],
      mechanism: {
        kind: "independent-settlement",
        damageItemRequirements: [
          {
            itemId: "action:agent:1621:action:0024:base",
            stat: "attack",
            role: "base",
            allowedModes: ["direct"],
            source: "holder-current",
          },
        ],
      },
    })
    expect(result.catalog.skillTargets).toEqual([
      {
        targetId: "zzz-hp:skill:roxy-giant-windstorm",
        upstreamId: null,
        agentEntityId: "1621",
        category: "special",
        name: "风眼·巨型风旋（1秒合计）",
        countsAsFollowUp: false,
      },
    ])
  })
  it.each([
    [
      "owner",
      (s: any) => {
        s.rule.identity.entityId = "1251"
      },
    ],
    [
      "catalog owner",
      (s: any) => {
        s.catalogEntityId = "agents:qingyi"
      },
    ],
    [
      "rule rank",
      (s: any) => {
        s.rule.config.right.value = 0
      },
    ],
    [
      "variant rank",
      (s: any) => {
        s.variant.configuration.minimumMindscape = 0
      },
    ],
    [
      "scale",
      (s: any) => {
        s.rule.operation.value.value = 3.5
      },
    ],
    [
      "operator",
      (s: any) => {
        s.rule.operation.operator = "add"
      },
    ],
    [
      "item scope",
      (s: any) => {
        s.rule.operation.itemIds.push("action:agent:1621:action:0023:base")
      },
    ],
    [
      "target",
      (s: any) => {
        s.skillTarget.targetId = "all-special"
      },
    ],
    [
      "target owner",
      (s: any) => {
        s.skillTarget.agentEntityId = "1251"
      },
    ],
    [
      "target condition",
      (s: any) => {
        s.rule.when.conditions.pop()
      },
    ],
    [
      "damage requirement",
      (s: any) => {
        s.variant.mechanism.damageItemRequirements = []
      },
    ],
    [
      "provider",
      (s: any) => {
        delete s.variant.mechanism.damageItemRequirements[0].source
      },
    ],
    [
      "layer count",
      (s: any) => {
        s.rule.maximumLayers = 9
      },
    ],
    [
      "beneficiary",
      (s: any) => {
        s.rule.beneficiary.kind = "team"
      },
    ],
    [
      "metadata",
      (s: any) => {
        s.variant.conditionDescription = "unreviewed"
      },
    ],
    [
      "version",
      (s: any) => {
        s.source = s.source.replace("3.3.12+19634983", "3.2")
      },
    ],
    [
      "missing language",
      (s: any) => {
        s.evidence = s.evidence.slice(0, 3)
      },
    ],
    [
      "clause pointer",
      (s: any) => {
        s.evidence[0].pointer = "/talent/1/desc"
      },
    ],
    [
      "source hash",
      (s: any) => {
        s.evidence[0].sha256 = "0".repeat(64)
      },
    ],
    [
      "unknown field",
      (s: any) => {
        s.unreviewed = true
      },
    ],
  ] as const)("rejects complete registration drift: %s", (_label, mutate) => {
    const changed = structuredClone(entry)
    mutate(changed)
    expect(() => convert([entity, changed])).toThrow(
      /Roxy mindscape registration drift/,
    )
  })
  it.each([
    "supplement",
    "option",
    "main-effect",
    "additional-effect",
  ] as const)(
    "protects reserved %s identity after other identifiers are renamed",
    (identity) => {
      const changed = independent() as any
      if (identity === "supplement") changed.supplementId = id
      if (identity === "option") changed.optionId = id
      if (identity === "main-effect") changed.rule.effectId = effectId
      if (identity === "additional-effect")
        changed.additionalRules = [entry.rule]
      expect(() => convert([entity, changed])).toThrow(
        /Roxy mindscape registration drift/,
      )
    },
  )
  it("rejects duplicates but preserves valid subsets and unrelated registrations", () => {
    expect(() => convert([entity, entry, entry])).toThrow(
      /Duplicate Roxy mindscape/,
    )
    expect(() =>
      convert([entity, { ...entry, additionalRules: [entry.rule] }]),
    ).toThrow(/Duplicate Roxy mindscape/)
    expect(convert([entity]).catalog.options).toHaveLength(1)
    expect(convert([entity, independent()]).catalog.options).toHaveLength(2)
  })
  it("preserves complete metadata and references under genuine reordering", () => {
    const a = convert([entity, casket, entry]),
      b = convert([entry, casket, entity])
    expect(b.definitions).toEqual(a.definitions)
    expect(b.catalog.entities).toEqual(a.catalog.entities)
    expect(b.catalog.skillTargets).toEqual(a.catalog.skillTargets)
    expect(
      b.catalog.options.toSorted((x, y) =>
        x.optionId.localeCompare(y.optionId),
      ),
    ).toEqual(
      a.catalog.options.toSorted((x, y) =>
        x.optionId.localeCompare(y.optionId),
      ),
    )
    expect(
      b.coverage.supplementalRecords.toSorted((x, y) =>
        x.supplementId.localeCompare(y.supplementId),
      ),
    ).toEqual(
      a.coverage.supplementalRecords.toSorted((x, y) =>
        x.supplementId.localeCompare(y.supplementId),
      ),
    )
  })
  it("rejects changed original bytes and invalid pointers through the production source verifier", async () => {
    const root = await mkdtemp(join(tmpdir(), "fairy-roxy-wind-eye-"))
    try {
      const directory = join(root, "verified/integrated/agents/1621")
      await mkdir(directory, { recursive: true })
      for (const locale of ["zh", "en"])
        await writeFile(
          join(directory, `details.${locale}.json`),
          await readFile(
            new URL(
              `../integrated/agents/1621/details.${locale}.json`,
              import.meta.url,
            ),
          ),
        )
      expect(await verifySupplementEvidence(root, [entry])).toEqual([
        `supplement:${id}`,
      ])
      const changed = structuredClone(entry) as any
      changed.evidence[0].pointer = "/talent/99/desc"
      await expect(verifySupplementEvidence(root, [changed])).rejects.toThrow(
        /pointer missing/,
      )
      await writeFile(
        join(directory, "details.en.json"),
        (await readFile(join(directory, "details.en.json"))).toString() + "\n",
      )
      await expect(verifySupplementEvidence(root, [entry])).rejects.toThrow(
        /Evidence file changed/,
      )
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
