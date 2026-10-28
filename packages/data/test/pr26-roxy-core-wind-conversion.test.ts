import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { convertSource } from "../scripts/static-effects/convert.ts"
import { verifySupplementEvidence } from "../scripts/generate-static-effects.ts"
import {
  SUPPLEMENTS,
  type Supplement,
  type SupplementOption,
} from "../scripts/static-effects/supplements.ts"
import type {
  SourceData,
  SourceNormalization,
} from "../scripts/static-effects/source.ts"
import original from "./fixtures/roxy-core-wind-source.json" with { type: "json" }
import { ROXY_CORE_ELEMENT_SUPPLEMENTS } from "../scripts/static-effects/roxy-core-wind.ts"

const ids = ["core-wind-critical-damage", "core-wind-sharp-critical-damage"]
const entries = ids.map(
  (slug) =>
    SUPPLEMENTS.find(
      (s) => s.supplementId === `nanoka:agents:1621:${slug}`,
    ) as SupplementOption,
)
const entity = SUPPLEMENTS.find(
  (s) =>
    s.supplementId === "nanoka:agents:1621:initial-energy-regen-conversion",
)!
const absentSource: SourceData = {
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
const convert = (supplements: readonly Supplement[] = [entity, ...entries]) =>
  convertSource(absentSource, functions, [], supplements)
const independent = (entry: SupplementOption): SupplementOption => ({
  ...structuredClone(entry),
  supplementId: "fixture:independent",
  optionId: "fixture:independent",
  rule: { ...entry.rule, effectId: "agent:1621:fixture:independent" },
})

describe("Roxy core wind supplement source and identity guards", () => {
  it("adds the two elemental state branches with unchanged caps and explicit elemental input ownership", () => {
    const result = convert([
      entity,
      ...entries,
      ...ROXY_CORE_ELEMENT_SUPPLEMENTS,
    ])
    expect(result.definitions.effects).toHaveLength(6)
    expect(result.catalog.options).toHaveLength(5)
    for (const [i, entry] of ROXY_CORE_ELEMENT_SUPPLEMENTS.entries()) {
      expect(entry.rule.parameters).toEqual(entries[i]!.rule.parameters)
      expect(entry.rule.operation).toEqual(entries[i]!.rule.operation)
      expect(entry.rule.uniqueness).toEqual(entries[i]!.rule.uniqueness)
      expect(entry.exclusiveGroup).toBe(entries[i]!.exclusiveGroup)
      expect(entry.evidence).toHaveLength(18)
      expect(
        entry.variant.mechanism?.kind === "element-buff-inputs"
          ? entry.variant.mechanism.inputs.map((e) => e.element)
          : undefined,
      ).toEqual(["physical", "fire", "ice", "electric", "ether"])
      for (const mutate of [
        (e: any) => {
          e.variant.mechanism.inputs.pop()
        },
        (e: any) => {
          e.rule.when = { kind: "constant", value: true }
        },
        (e: any) => {
          delete e.exclusiveGroup
        },
        (e: any) => {
          e.evidence.pop()
        },
      ]) {
        const drift = structuredClone(entry)
        mutate(drift)
        expect(() => convert([entity, drift])).toThrow(/Roxy core wind/)
      }
    }
  })
  it("adds exactly two independent branches without pretending fac62407 has Roxy", () => {
    const result = convert()
    expect(result.definitions.revision).toBe("58")
    expect(result.definitions.effects).toHaveLength(4)
    expect(result.catalog.options).toHaveLength(3)
    expect(result.catalog.entities).toHaveLength(1)
    expect(result.catalog.skillTargets).toEqual([])
    expect(result.catalog.entities[0]).toMatchObject({
      upstreamId: null,
      profession: "击破",
      identity: { entityId: "1621" },
    })
    for (const [index, entry] of entries.entries()) {
      const variant = result.catalog.options.find(
        (o) => o.optionId === entry.optionId,
      )!.variants[0]!
      expect(variant).toMatchObject({
        target: "team",
        maximumLayers: 1,
        inputs: [{ name: "roxy:core:external-critical-rate", unit: "ratio" }],
      })
      expect(variant.mechanism).toBeUndefined()
      expect(entry.evidence).toHaveLength(14)
      expect(entry.evidence.map((r) => r.pointer)).toEqual(
        ["zh", "en"].flatMap(() =>
          original.independentExpectations.map(
            (r) => `/passive/level/${1621500 + r.coreSkillLevel}/desc/0`,
          ),
        ),
      )
      const rule = result.definitions.effects.find(
        (r) => r.effectId === entry.rule.effectId,
      )!
      expect(rule).toMatchObject({
        scope: "hit",
        beneficiary: { kind: "team" },
        operation: {
          kind: "stat-adjustment",
          stat: index ? "sharpCriticalDamage" : "criticalDamage",
          stage: "direct",
        },
        when: { kind: "one-of", fact: "hit.element", values: ["wind"] },
        uniqueness: { scope: "team", select: { kind: "single-source-only" } },
      })
    }
  })
  const mutations: [string, (entry: any) => void][] = [
    [
      "holder identity",
      (e) => {
        e.rule.identity.entityId = "1251"
      },
    ],
    [
      "catalog identity",
      (e) => {
        e.catalogEntityId = "agents:claret"
      },
    ],
    [
      "supplement rename",
      (e) => {
        e.supplementId += ":renamed"
      },
    ],
    [
      "option rename",
      (e) => {
        e.optionId += ":renamed"
      },
    ],
    [
      "rule rename",
      (e) => {
        e.rule.effectId += ":renamed"
      },
    ],
    [
      "missing source reference",
      (e) => {
        e.evidence.pop()
      },
    ],
    [
      "wrong rank",
      (e) => {
        e.evidence[0].rank = 7
      },
    ],
    [
      "different clause",
      (e) => {
        e.evidence[0].pointer = "/talent/1/desc"
      },
    ],
    [
      "wrong digest",
      (e) => {
        e.evidence[0].sha256 = "0".repeat(64)
      },
    ],
    [
      "cap",
      (e) => {
        e.rule.parameters.cap.values[1] = 9
      },
    ],
    [
      "coefficient",
      (e) => {
        e.rule.parameters.coefficient.value = 0.9
      },
    ],
    [
      "missing input",
      (e) => {
        e.variant.inputs = []
      },
    ],
    [
      "wrong input unit",
      (e) => {
        e.variant.inputs[0].unit = "count"
      },
    ],
    [
      "default source",
      (e) => {
        e.variant.inputs[0].preset = 0.5
      },
    ],
    [
      "profession deletion",
      (e) => {
        e.variant.applicability = {}
      },
    ],
    [
      "hit element deletion",
      (e) => {
        e.rule.when = { kind: "constant", value: true }
      },
    ],
    [
      "source uniqueness deletion",
      (e) => {
        delete e.rule.uniqueness
      },
    ],
    [
      "source uniqueness key",
      (e) => {
        e.rule.uniqueness.key += ":changed"
      },
    ],
    [
      "source uniqueness scope",
      (e) => {
        e.rule.uniqueness.scope = "holder"
      },
    ],
    [
      "source uniqueness policy",
      (e) => {
        e.rule.uniqueness.select = { kind: "highest-value" }
      },
    ],
    [
      "wrong channel",
      (e) => {
        e.rule.operation.stat = "criticalRate"
      },
    ],
    [
      "extra rule",
      (e) => {
        e.additionalRules = [structuredClone(e.rule)]
      },
    ],
    [
      "multiple states",
      (e) => {
        e.rule.maximumLayers = 2
      },
    ],
  ]
  it.each(
    entries.flatMap((entry, index) =>
      mutations.map(([name, mutate]) => ({ index, name, entry, mutate })),
    ),
  )("rejects branch $index $name before folding", ({ entry, mutate }) => {
    const changed = structuredClone(entry)
    mutate(changed)
    expect(() => convert([entity, changed])).toThrow(/Roxy core wind/)
  })
  it.each(["supplement", "option", "main effect", "additional effect"])(
    "rejects reserved %s alias in an otherwise independent registration",
    (mode) => {
      const collision: any = independent(entries[0]!)
      if (mode === "supplement")
        collision.supplementId = entries[0]!.supplementId
      if (mode === "option") collision.optionId = entries[0]!.optionId
      if (mode === "main effect")
        collision.rule.effectId = entries[0]!.rule.effectId
      if (mode === "additional effect")
        collision.additionalRules = [structuredClone(entries[0]!.rule)]
      expect(() => convert([entity, collision])).toThrow(/Roxy core wind/)
    },
  )
  it.each(["equal", "conflicting"])(
    "rejects %s duplicate registration",
    (mode) => {
      const duplicate = structuredClone(entries[0]!)
      if (mode === "conflicting") (duplicate as any).rule.maximumLayers = 2
      expect(() => convert([entity, entries[0]!, duplicate])).toThrow(
        /Roxy core wind/,
      )
    },
  )
  it.each([0, 1])(
    "allows legitimate subset branch %s and unrelated supplemental identities",
    (index) => {
      const result = convert([
        entity,
        entries[index]!,
        independent(entries[index]!),
      ])
      expect(result.catalog.options).toHaveLength(3)
    },
  )
  it("preserves actual registration reorder output", () => {
    const expected = convert()
    const actual = convert([entries[1]!, entity, entries[0]!])
    const sorted = (rows: readonly any[], key: string) =>
      [...rows].sort((a, b) => a[key].localeCompare(b[key]))
    expect(sorted(actual.catalog.options, "optionId")).toEqual(
      sorted(expected.catalog.options, "optionId"),
    )
    expect(sorted(actual.definitions.effects, "effectId")).toEqual(
      sorted(expected.definitions.effects, "effectId"),
    )
  })
  it.each(["zh", "en"] as const)(
    "rejects %s complete original drift at generation evidence boundary",
    async (locale) => {
      const temp = await mkdtemp(join(tmpdir(), "fairy-roxy-core-source-"))
      try {
        const target = join(temp, "verified/integrated/agents/1621")
        await mkdir(target, { recursive: true })
        for (const file of ["data.json", "details.zh.json", "details.en.json"])
          await writeFile(
            join(target, file),
            await readFile(
              new URL(`../integrated/agents/1621/${file}`, import.meta.url),
            ),
          )
        expect(await verifySupplementEvidence(temp, entries)).toHaveLength(2)
        const document = JSON.parse(
          await readFile(join(target, `details.${locale}.json`), "utf8"),
        )
        document.passive.level["1621507"].desc[0] += " drift"
        await writeFile(
          join(target, `details.${locale}.json`),
          JSON.stringify(document),
        )
        await expect(verifySupplementEvidence(temp, entries)).rejects.toThrow(
          /Evidence file changed/,
        )
      } finally {
        await rm(temp, { recursive: true, force: true })
      }
    },
  )
})
