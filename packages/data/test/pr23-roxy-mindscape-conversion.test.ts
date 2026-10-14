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
import {
  calculateStaticDamage,
  parseEffectRuleSet,
} from "../../core/src/effects/index.ts"
import { makeRoxyMindscapeRequest } from "./fixtures/roxy-mindscape-consumer.ts"
import original from "./fixtures/roxy-mindscape-source.json" with { type: "json" }

// 预期直接来自固定中英文条款与新主仓原件；不导入新登记的参数作为 oracle。
const expected = [
  ["m1-hit-resistance-reduction", 1, 0.15, "target-resistance-reduction"],
  ["m1-critical-damage", 1, 0.4, "criticalDamage"],
  ["m2-stun-damage", 2, 0.3, "stun-damage-adjustment"],
  ["m4-ultimate-damage", 4, 0.2, "damage-bonus"],
  ["m6-wind-resistance-ignore", 6, 0.15, "attacker-resistance-ignore"],
] as const
const ids = expected.map(([slug]) => `nanoka:agents:1621:${slug}`)
const registrations = SUPPLEMENTS.filter(
  (entry): entry is SupplementOption =>
    entry.kind === "option" && ids.includes(entry.supplementId),
)
const roxyEntity = SUPPLEMENTS.find(
  (entry) =>
    entry.supplementId === "nanoka:agents:1621:initial-energy-regen-conversion",
)!
const casketEntity = SUPPLEMENTS.find(
  (entry) =>
    entry.kind === "entity" && entry.entity.identity?.entityId === "14162",
)!
// 固定来源的 Roxy 子集确实为空；没有构造不存在的旧 Roxy 块作为正控。
const absentSource: SourceData = {
  agents: [],
  wengines: [],
  driveDiscs: [],
  skillSubcategories: [],
  followUpSkillRules: [],
}
const functions: SourceNormalization = {
  normalizeAgent: (entity) => entity,
  normalizeWengine: (entity) => entity,
  normalizeDriveDisc: (entity) => entity,
  collectEffectsFromPack: (pack) =>
    pack.effectBlocks?.flatMap((block) => block.effects) ?? pack.effects ?? [],
  applyAnomalyFlagsToPack: (pack) => pack,
}
const convert = (
  supplements: readonly Supplement[] = [roxyEntity, ...registrations],
  data: SourceData = absentSource,
) => convertSource(data, functions, [], supplements)

describe("Roxy Nanoka fixed mindscape registration", () => {
  it("compiles five clauses on the existing entity with independent original expectations", () => {
    const result = convert()
    expect(registrations).toHaveLength(5)
    expect(result.catalog.entities).toHaveLength(1)
    expect(result.catalog.entities[0]).toMatchObject({
      catalogEntityId: "nanoka:agents:1621",
      upstreamId: null,
      identity: { kind: "agent", entityId: "1621" },
      profession: "击破",
      element: "wind",
    })
    for (const [slug, rank, amount, channel] of expected) {
      const option = result.catalog.options.find(
        (entry) => entry.optionId === `nanoka:agents:1621:${slug}`,
      )!
      expect(option.variants).toHaveLength(1)
      expect(option.variants[0]).toMatchObject({
        configuration: { minimumMindscape: rank },
        maximumLayers: 1,
        inputs: [],
      })
      expect(option.variants[0]!.configuration.coreSkillLevels).toBeUndefined()
      expect(option.variants[0]!.references).toEqual(
        ["zh", "en"].map((locale) => ({
          sourceId: "nanoka-integrated",
          version: "3.2",
          locale,
          resourcePath: `agents/1621/details.${locale}.json`,
          pointer: `/talent/${rank}/desc`,
        })),
      )
      const rule = result.definitions.effects.find(
        (entry) => entry.effectId === `agent:1621:nanoka:${slug}`,
      )!
      expect(rule.kind).toBe("contribution")
      if (rule.kind !== "contribution") throw new Error("wrong rule kind")
      expect(rule.source.identity).toEqual({ kind: "agent", entityId: "1621" })
      expect(rule.operation).toMatchObject({
        value: { kind: "literal", value: amount },
      })
      expect(
        rule.operation.kind === "factor-contribution"
          ? rule.operation.channel
          : rule.operation.kind === "stat-adjustment"
            ? rule.operation.stat
            : null,
      ).toBe(channel)
      expect(
        original.talents.zh[String(rank) as keyof typeof original.talents.zh],
      ).toContain(`${Math.round(amount * 100)}%`)
      expect(
        original.talents.en[String(rank) as keyof typeof original.talents.en],
      ).toContain(`${Math.round(amount * 100)}%`)
    }
    expect(result.catalog.skillTargets).toEqual([
      {
        targetId: "zzz-hp:skill:roxy-requiem-for-the-night-burial",
        upstreamId: null,
        agentEntityId: "1621",
        category: "ultimate",
        name: "终结技：葬夜安魂曲",
        countsAsFollowUp: false,
      },
    ])
    expect(result.definitions.actions).toHaveLength(1)
    expect(result.definitions.actions[0]!.actionId).toBe(
      original.originalUltimate.actionId,
    )
  })
  it.each([
    [
      "identity",
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
      "cultivation",
      (s: any) => {
        s.variant.configuration.minimumMindscape = 0
      },
    ],
    [
      "rule cultivation",
      (s: any) => {
        s.rule.config.right.value = 0
      },
    ],
    [
      "clause pointer",
      (s: any) => {
        s.evidence[0].pointer = "/talent/4/desc"
      },
    ],
    [
      "resource",
      (s: any) => {
        s.evidence[0].path = "agents/1251/details.zh.json"
      },
    ],
    [
      "version",
      (s: any) => {
        s.source = s.source.replace("3.2", "3.3")
      },
    ],
    [
      "sha",
      (s: any) => {
        s.evidence[0].sha256 = "0".repeat(64)
      },
    ],
    [
      "missing language",
      (s: any) => {
        s.evidence.pop()
      },
    ],
    [
      "value",
      (s: any) => {
        s.rule.operation.value.value = 0.3
      },
    ],
    [
      "beneficiary",
      (s: any) => {
        s.rule.beneficiary.kind = "holder"
      },
    ],
    [
      "unknown field",
      (s: any) => {
        s.unreviewed = true
      },
    ],
  ] as const)("rejects registration drift: %s", (_label, mutate) => {
    const changed = structuredClone(registrations[0]!)
    mutate(changed)
    expect(() =>
      convert([roxyEntity, changed, ...registrations.slice(1)]),
    ).toThrow(/Roxy mindscape registration drift/)
  })
  it("rejects duplicate actual registrations before any folding", () => {
    expect(() =>
      convert([roxyEntity, ...registrations, registrations[0]!]),
    ).toThrow(/Duplicate Roxy mindscape/)
    expect(() => convert([roxyEntity, roxyEntity, ...registrations])).toThrow(
      /Duplicate supplement entity/,
    )
  })
  it("rejects the real new upstream Roxy entity as a changed source boundary", () => {
    expect(original.upstreamRoxyIdentity.id).toBe("Roxy")
    const realNewEntity = {
      ...original.upstreamRoxyIdentity,
      mindscapeBuffs: [],
    }
    // 此处只验证真实新实体出现这一冲突，不冒充 fac 中的旧记录或成功正控。
    expect(() =>
      convert(undefined, { ...absentSource, agents: [realNewEntity] }),
    ).toThrow(/Unreviewed entity identity: agents:Roxy/)
    expect(
      Object.values(original.upstreamBlocks).flatMap((blocks) =>
        blocks.flatMap((block) =>
          block.effects.map((effect) => [effect.id, effect.stat, effect.value]),
        ),
      ),
    ).toEqual([
      ["eff-muppfe6g-956sbb", "resPen", 15],
      ["eff-muppfukt-ck2j4e", "critDmg", 40],
      ["eff-muppg5bs-4w8a0e", "staggerVulnerable", 30],
      ["eff-muppgwvr-e7am7i", "skillDmgBonus", 20],
      ["eff-muppihiv-mxxqb8", "resPen", 15],
    ])
  })
  it("preserves full identities, source references and metadata under real registration reordering", () => {
    const ordered = [roxyEntity, casketEntity, ...registrations]
    const reversed = ordered.toReversed()
    expect(reversed.map((s) => s.supplementId)).not.toEqual(
      ordered.map((s) => s.supplementId),
    )
    expect(
      reversed
        .filter((s) => s.kind === "entity")
        .map((s) => s.entity.catalogEntityId),
    ).not.toEqual(
      ordered
        .filter((s) => s.kind === "entity")
        .map((s) => s.entity.catalogEntityId),
    )
    const a = convert(ordered),
      b = convert(reversed)
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
  it("uses the production evidence verifier for both language bytes and pointers", async () => {
    const publication = await mkdtemp(join(tmpdir(), "fairy-roxy-evidence-"))
    try {
      const directory = join(publication, "verified/integrated/agents/1621")
      await mkdir(directory, { recursive: true })
      for (const lang of ["zh", "en"]) {
        const bytes = await readFile(
          new URL(
            `../integrated/agents/1621/details.${lang}.json`,
            import.meta.url,
          ),
        )
        // URL 相对 test 的上一级为 packages/data，直接核对原始同版条款。
        expect(JSON.parse(bytes.toString()).talent[1].desc).toBe(
          original.talents[lang as "zh" | "en"]["1"],
        )
        await writeFile(join(directory, `details.${lang}.json`), bytes)
      }
      expect(
        await verifySupplementEvidence(publication, registrations),
      ).toEqual(ids.map((id) => `supplement:${id}`))
      const missing = structuredClone(registrations[0]!)
      ;(missing.evidence as any)[0].pointer = "/talent/99/desc"
      await expect(
        verifySupplementEvidence(publication, [missing]),
      ).rejects.toThrow(/pointer missing/)
      const path = join(directory, "details.en.json")
      await writeFile(path, (await readFile(path)).toString() + "\n")
      await expect(
        verifySupplementEvidence(publication, registrations),
      ).rejects.toThrow(/Evidence file changed/)
      const realHash = createHash("sha256")
        .update(
          await readFile(
            new URL(
              "../integrated/agents/1621/details.en.json",
              import.meta.url,
            ),
          ),
        )
        .digest("hex")
      expect(realHash).toBe(
        "30a75cab3c664648ca8f9bbcfdce04bc5d92b5897b9187c17c6620c76c282b2a",
      )
    } finally {
      await rm(publication, { recursive: true, force: true })
    }
  })
})

function independentRegistration(entry: SupplementOption): SupplementOption {
  return {
    ...structuredClone(entry),
    supplementId: "fixture:independent-supplement",
    optionId: "fixture:independent-option",
    rule: { ...entry.rule, effectId: "agent:1621:fixture:independent-effect" },
  }
}

function atMindscapeZero(entry: SupplementOption): SupplementOption {
  if (
    entry.rule.config.kind !== "compare-number" ||
    entry.rule.config.unit !== "count"
  )
    throw new Error("Expected a numeric cultivation gate")
  return {
    ...entry,
    variant: {
      ...entry.variant,
      configuration: { ...entry.variant.configuration, minimumMindscape: 0 },
    },
    rule: {
      ...entry.rule,
      config: {
        ...entry.rule.config,
        right: { kind: "literal", unit: "count", value: 0 },
      },
    },
  }
}

function calculateConvertedM6(
  converted: ReturnType<typeof convert>,
  rank: 0 | 6,
  selected = true,
) {
  const input = makeRoxyMindscapeRequest(
    converted.definitions,
    converted.catalog,
    rank,
  )
  const { skillTargetIds: _skillTargetIds, ...hit } = input.hit
  const [firstItem, ...otherItems] = hit.damageItems.map((sourceItem) => {
    if (sourceItem.mode !== "direct")
      throw new Error("Expected direct damage items in the M6 fixture")
    const { mode: _mode, role: _role, ...item } = sourceItem
    return item
  })
  if (!firstItem) throw new Error("Expected a nonempty damage request")
  return calculateStaticDamage({
    definitions: converted.definitions,
    bindings: input.bindings,
    world: input.world,
    selections: selected
      ? [
          {
            effectId: "agent:1621:nanoka:m6-wind-resistance-ignore",
            bindingId: "binding:roxy",
            layers: 1,
          },
        ]
      : [],
    hit: {
      ...hit,
      damageItems: [firstItem, ...otherItems],
    },
    damage: input.damage,
  })
}

describe("Roxy reserved supplement, option and generated rule identities", () => {
  it.each(registrations.map((entry) => [entry.supplementId, entry] as const))(
    "rejects renamed registration with both cultivation gates lowered: %s",
    (_id, entry) => {
      const changed = atMindscapeZero({
        ...entry,
        supplementId: "fixture:renamed-supplement",
      })
      expect(() => convert([roxyEntity, changed])).toThrow(
        /Roxy mindscape registration drift/,
      )
    },
  )

  it.each(
    registrations.flatMap((entry) =>
      (["optionId", "effectId"] as const).map(
        (identityKind) => [entry.supplementId, identityKind, entry] as const,
      ),
    ),
  )(
    "recognizes %s through only its reserved %s",
    (_id, identityKind, entry) => {
      const independent = independentRegistration(entry)
      const changed: SupplementOption =
        identityKind === "optionId"
          ? { ...independent, optionId: entry.optionId }
          : {
              ...independent,
              rule: { ...independent.rule, effectId: entry.rule.effectId },
            }
      expect(() => convert([roxyEntity, changed])).toThrow(
        /Roxy mindscape registration drift/,
      )
    },
  )

  it("recognizes a reserved effect moved from the main rule to additionalRules", () => {
    const entry = registrations[4]!
    const changed: SupplementOption = {
      ...independentRegistration(entry),
      additionalRules: [entry.rule],
    }
    expect(() => convert([roxyEntity, changed])).toThrow(
      /Roxy mindscape registration drift/,
    )
  })

  it.each(["optionId", "main rule", "additional rule"] as const)(
    "rejects reserved identities pointing to different clauses through %s",
    (identityKind) => {
      const first = registrations[0]!
      const second = registrations[1]!
      const independent = independentRegistration(first)
      const changed: SupplementOption =
        identityKind === "optionId"
          ? { ...independent, optionId: first.optionId, rule: second.rule }
          : identityKind === "main rule"
            ? { ...first, rule: second.rule }
            : { ...first, additionalRules: [second.rule] }
      expect(() => convert([roxyEntity, changed])).toThrow(
        /Roxy mindscape registration drift/,
      )
    },
  )

  it.each(["supplementId", "optionId", "effectId", "additional rule"] as const)(
    "rejects duplicate reserved ownership through %s before ordinary compilation",
    (identityKind) => {
      const entry = registrations[4]!
      const independent = independentRegistration(entry)
      const duplicate: SupplementOption =
        identityKind === "supplementId"
          ? { ...independent, supplementId: entry.supplementId }
          : identityKind === "optionId"
            ? { ...independent, optionId: entry.optionId }
            : identityKind === "effectId"
              ? { ...independent, rule: entry.rule }
              : { ...independent, additionalRules: [entry.rule] }
      for (const ordered of [
        [entry, duplicate],
        [duplicate, entry],
      ])
        expect(() => convert([roxyEntity, ...ordered])).toThrow(
          /Duplicate Roxy mindscape/,
        )
    },
  )

  it.each(["main and additional", "two additional"] as const)(
    "rejects duplicate reserved effect identity in %s rules",
    (position) => {
      const entry = registrations[4]!
      const independent = independentRegistration(entry)
      const duplicate: SupplementOption =
        position === "main and additional"
          ? { ...independent, rule: entry.rule, additionalRules: [entry.rule] }
          : { ...independent, additionalRules: [entry.rule, entry.rule] }
      expect(() => convert([roxyEntity, duplicate])).toThrow(
        /Duplicate Roxy mindscape/,
      )
    },
  )

  it.each(registrations.map((entry) => [entry.supplementId, entry] as const))(
    "accepts a legitimate subset containing only %s",
    (_id, entry) => {
      const converted = convert([roxyEntity, entry])
      expect(
        converted.catalog.options.map((option) => option.optionId),
      ).toContain(entry.optionId)
      expect(
        converted.definitions.effects.filter(
          (rule) => rule.effectId === entry.rule.effectId,
        ),
      ).toHaveLength(1)
    },
  )

  it("accepts empty and entity-only inputs without this batch", () => {
    expect(convert([]).definitions.effects).toEqual([])
    const converted = convert([roxyEntity])
    expect(converted.definitions.effects).toHaveLength(2)
    expect(converted.catalog.options).toHaveLength(1)
  })

  it("accepts independent identities on the same entity and source with additional rules", () => {
    const entry = atMindscapeZero(independentRegistration(registrations[4]!))
    const independent: SupplementOption = {
      ...entry,
      additionalRules: [
        {
          ...entry.rule,
          effectId: "agent:1621:fixture:independent-additional-effect",
        },
      ],
    }
    const converted = convert([roxyEntity, independent])
    expect(
      converted.catalog.options.find(
        (option) => option.optionId === independent.optionId,
      )!.variants[0]!.effectIds,
    ).toEqual([
      independent.rule.effectId,
      independent.additionalRules![0]!.effectId,
    ])
    expect(parseEffectRuleSet(converted.definitions).ok).toBe(true)
  })

  it("keeps actual converted M6 nonzero at M6, rejects M0 selection and stops renamed M0 at generation", () => {
    const entry = registrations[4]!
    // 局部转换的真实输出直接进入低层消费；不冒称重新生成完整目录。
    const converted = convert([roxyEntity, entry])
    const locked = calculateConvertedM6(converted, 0)
    expect(locked.ok).toBe(false)
    if (locked.ok) throw new Error("M6 must remain locked at M0")
    expect(locked.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "CONTEXT_MISMATCH",
          pointer: "/selections/0",
        }),
      ]),
    )
    const selected = calculateConvertedM6(converted, 6)
    expect(selected.ok).toBe(true)
    if (!selected.ok) throw new Error(JSON.stringify(selected.issues))
    expect(selected.value.expected).toBe(2868.75)
    expect(selected.value.factors.nonCritical.resistance).toBe(0.85)
    const closed = calculateConvertedM6(converted, 0, false)
    expect(closed.ok).toBe(true)
    if (!closed.ok) throw new Error(JSON.stringify(closed.issues))
    expect(closed.value.expected).toBe(2362.5)
    expect(closed.value.factors.nonCritical.resistance).toBe(0.7)
    const changed = atMindscapeZero({
      ...entry,
      supplementId: "fixture:renamed-m6",
    })
    expect(() => convert([roxyEntity, changed])).toThrow(
      /Roxy mindscape registration drift/,
    )
  })
})
