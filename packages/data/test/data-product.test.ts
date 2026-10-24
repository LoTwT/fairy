import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, describe, expect, it } from "vitest"
import {
  loadAgentActionsManifest,
  loadDataProductManifests,
  loadPanelAttributesManifest,
  loadStaticEffectsProduct,
} from "../scripts/data-product/manifests.ts"
import {
  queryStaticCoverage,
  type StaticCoverageStatus,
} from "../scripts/data-product/static-coverage.ts"

interface StructureBaseline {
  readonly integrated: {
    readonly categories: Readonly<
      Record<string, { readonly memberCount: number }>
    >
  }
  readonly attributes: {
    readonly counts: {
      readonly inputs: number
      readonly artifacts: number
      readonly limitations: number
      readonly discrepancies: number
    }
  }
  readonly skills: {
    readonly memberCount: number
    readonly actionCount: number
  }
  readonly effects: {
    readonly sourceRepository: string
    readonly sourceCommit: string
    readonly staticCatalog: {
      readonly entityCount: number
      readonly optionCount: number
      readonly differenceCount: number
      readonly mechanismCount: number
    }
    readonly staticCoverage: {
      readonly recordCount: number
      readonly supplementalRecordCount: number
    }
  }
}

const structureBaseline = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL("./fixtures/data-structure-baseline.json", import.meta.url),
    ),
    "utf8",
  ),
) as StructureBaseline

function baselineMemberCount(category: string): number {
  const entry = structureBaseline.integrated.categories[category]
  if (entry === undefined)
    throw new Error(`data structure baseline is missing category "${category}"`)
  return entry.memberCount
}

const fixtureRoots: string[] = []

afterEach(() => {
  for (const root of fixtureRoots.splice(0))
    rmSync(root, { recursive: true, force: true })
})

function writeFixture(files: Readonly<Record<string, unknown>>): string {
  const root = mkdtempSync(join(tmpdir(), "fairy-data-product-"))
  fixtureRoots.push(root)
  for (const [relativePath, value] of Object.entries(files)) {
    const path = join(root, relativePath)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, JSON.stringify(value))
  }
  return root
}

function fixtureFiles(): Record<string, unknown> {
  return {
    "attributes/manifest.json": {
      schemaVersion: 1,
      rulesVersion: "panel-attributes/test",
      sourceVersion: "test+1",
      artifacts: {},
      inputs: [],
      limitations: ["属性限制"],
      discrepancies: [{ id: "disc-test", description: "属性差异" }],
      members: { agents: ["1"], wEngines: [] },
      evidence: { zzzHpCommit: "test-commit", resources: [] },
    },
    "skills/manifest.json": {
      schemaVersion: 1,
      rulesVersion: "agent-actions/test",
      sourceVersion: "test+1",
      artifacts: {},
      inputs: [],
      limitations: [],
      coverage: {
        agents: 1,
        actions: 1,
        damage: 1,
        dazeOnly: 0,
        luminize: 0,
        unavailable: 0,
        individualHitActions: 0,
      },
      discrepancies: [
        {
          actionId: "action:agent:1:action:0001",
          field: "element",
          upstream: "电",
          adopted: "physical",
          reason: "技能差异",
        },
      ],
      members: ["1"],
      registrySha256: "a".repeat(64),
      staticCatalogSha256: "b".repeat(64),
      evidence: { zzzHpCommit: "test-commit", resources: [] },
    },
    "effects/static.json": {
      schemaVersion: 1,
      ruleSetId: "test-effects",
      revision: "1",
      effects: [],
      actions: [],
      states: [],
    },
    "effects/static-catalog.json": {
      schemaVersion: 2,
      ruleSetId: "test-effects",
      revision: "1",
      entities: [],
      mechanisms: [],
      skillTargets: [],
      source: {
        repository: "test/source",
        commit: "test-commit",
        files: [{ path: "source.json", sha256: "c".repeat(64) }],
      },
      differences: [
        { differenceId: "diff-a", explanation: "差异 A", references: [] },
        { differenceId: "diff-text", explanation: "仅说明", references: [] },
      ],
      options: [
        {
          optionId: "test:option",
          catalogEntityId: "agents:test",
          name: "测试选项",
          conditionDescription: "",
          target: "self",
          variants: [
            {
              effectIds: ["test:effect"],
              differences: ["diff-a"],
            },
          ],
        },
        {
          optionId: "test:other",
          catalogEntityId: "agents:test",
          name: "其他选项",
          conditionDescription: "",
          target: "self",
          variants: [{ effectIds: [], differences: [] }],
        },
      ],
    },
    "effects/static-coverage.json": {
      schemaVersion: 1,
      ruleSetId: "test-effects",
      revision: "1",
      source: {
        repository: "test/source",
        commit: "test-commit",
        files: [{ path: "source.json", sha256: "c".repeat(64) }],
      },
      summary: {
        entities: 1,
        packs: 1,
        emptyPacks: 0,
        rawEffects: 3,
        rules: 1,
        options: 2,
        converted: 2,
        corrected: 0,
        unsupported: 1,
        supplements: {
          records: 2,
          rules: 1,
          options: 1,
          entities: 0,
          integrated: 1,
          outOfScope: 1,
        },
      },
      records: [
        {
          pointer: "/test/0",
          catalogEntityId: "agents:test",
          rank: 0,
          rankKind: "mindscape",
          stat: "atk",
          optionId: "test:other",
          effectIds: ["test:effect"],
          status: "converted",
          normalizationChanges: [],
          rawValue: 1,
          normalizedValue: 1,
        },
        {
          pointer: "/test/1",
          catalogEntityId: "agents:test",
          rank: 0,
          rankKind: "mindscape",
          stat: "atk",
          optionId: "test:option",
          effectIds: ["test:effect"],
          status: "converted",
          normalizationChanges: [],
          rawValue: 1,
          normalizedValue: 1,
        },
        {
          pointer: "/test/2",
          catalogEntityId: "agents:test",
          rank: 0,
          rankKind: "mindscape",
          stat: "atk",
          optionId: "test:option",
          effectIds: ["test:effect"],
          status: "unsupported",
          reason: "test-reason",
          explanation: "测试说明",
          normalizationChanges: [],
          rawValue: 1,
          normalizedValue: 1,
        },
      ],
      supplementalRecords: [
        {
          supplementId: "supplement:test",
          source: "nanoka:test",
          kind: "option",
          optionId: "test:option",
          effectIds: ["test:effect"],
          status: "integrated",
          supportedRanks: "1",
          computationTarget: "test target",
        },
        {
          supplementId: "supplement:no-effect-ids",
          source: "nanoka:test",
          kind: "unsupported-option",
          optionId: "test:option",
          status: "out-of-scope",
          reason: "test-out-of-scope",
          supportedRanks: "1",
          computationTarget: "test target",
        },
      ],
      deferredMechanisms: [],
      fieldMappings: {},
      packs: [],
      entities: [],
      reverseGaps: [],
    },
  }
}

describe("data product manifests", () => {
  const aggregate = loadDataProductManifests()
  const effectsProduct = loadStaticEffectsProduct()

  it("normalizes the panel attributes manifest without changing domain fields", () => {
    const manifest = aggregate.panelAttributes
    expect(manifest.product).toBe("panel-attributes")
    expect(manifest.schemaVersion).toBe(1)
    expect(manifest.rulesVersion.label).toBe("panel-attributes/2")
    expect(manifest.source.version).toBe("3.3.12+19634983")
    expect(manifest.coverage.unit).toBe("members")
    expect(manifest.coverage.count).toBe(
      baselineMemberCount("agents") + baselineMemberCount("w-engines"),
    )
    expect(manifest.coverage.statusCounts).toEqual({})
    expect(manifest.coverage.supplementalCount).toBe(0)
    expect(manifest.coverage.supplementalStatusCounts).toEqual({})
    expect(manifest.artifacts).toHaveLength(
      structureBaseline.attributes.counts.artifacts,
    )
    expect(manifest.artifacts[0]).toMatchObject({
      path: "attributes/agents/1011.json",
      sha256Origin: "manifest",
    })
    expect(manifest.artifacts[0]?.bytes).toBeGreaterThan(0)
    expect(manifest.limitations).toHaveLength(
      structureBaseline.attributes.counts.limitations,
    )
    expect(manifest.discrepancies).toHaveLength(
      structureBaseline.attributes.counts.discrepancies,
    )
    expect(manifest.discrepancies[0]?.id).toBe("disc-impact-percent")
    expect(manifest.extensions.members.agents).toHaveLength(
      baselineMemberCount("agents"),
    )
    expect(manifest.extensions.members.wEngines).toHaveLength(
      baselineMemberCount("w-engines"),
    )
    expect(manifest.extensions.inputs).toHaveLength(
      structureBaseline.attributes.counts.inputs,
    )
    expect(manifest.extensions.inputs[0]?.path).toBe("agents/1011/data.json")
    expect(manifest.extensions.inputs[0]?.sha256).toMatch(/^[0-9a-f]{64}$/u)
    expect(manifest.extensions.evidence.zzzHpCommit).toBe(
      "0df40c5bc38f8da7ed0f9eed6be87fb8155b8357",
    )
  })

  it("normalizes the agent actions manifest coverage counts", () => {
    const manifest = aggregate.agentActions
    expect(manifest.product).toBe("agent-actions")
    expect(manifest.rulesVersion.label).toBe("agent-actions/2")
    expect(manifest.source.version).toBe("3.3.12+19634983")
    expect(manifest.coverage.unit).toBe("actions")
    expect(manifest.coverage.count).toBe(structureBaseline.skills.actionCount)
    expect(manifest.coverage.statusCounts).toEqual({
      damage: 1166,
      dazeOnly: 174,
      luminize: 4,
      unavailable: 4,
    })
    expect(manifest.coverage.supplementalCount).toBe(0)
    expect(manifest.coverage.supplementalStatusCounts).toEqual({})
    expect(manifest.artifacts).toHaveLength(
      structureBaseline.skills.memberCount,
    )
    expect(manifest.limitations).toHaveLength(9)
    expect(manifest.discrepancies).toHaveLength(167)
    expect(manifest.extensions.members).toHaveLength(
      structureBaseline.skills.memberCount,
    )
    expect(manifest.extensions.coverage.individualHitActions).toBe(1)
  })

  it("normalizes static effects and records the text-only difference limitation", () => {
    const manifest = aggregate.staticEffects
    expect(manifest).toEqual(effectsProduct.manifest)
    expect(manifest.product).toBe("static-effects")
    expect(manifest.schemaVersion).toBe(1)
    expect(manifest.rulesVersion).toEqual({
      label: "zzz-hp-static-effects/52",
      ruleSetId: "zzz-hp-static-effects",
      revision: "52",
    })
    expect(manifest.source).toEqual({
      repository: structureBaseline.effects.sourceRepository,
      commit: structureBaseline.effects.sourceCommit,
    })
    expect(manifest.artifacts.map((artifact) => artifact.path)).toEqual([
      "effects/static.json",
      "effects/static-catalog.json",
      "effects/static-coverage.json",
    ])
    for (const artifact of manifest.artifacts) {
      expect(artifact.sha256Origin).toBe("computed")
      expect(artifact.sha256).toMatch(/^[0-9a-f]{64}$/u)
      expect(artifact.bytes).toBeGreaterThan(0)
    }
    expect(manifest.coverage.unit).toBe("coverage-records")
    expect(manifest.coverage.count).toBe(
      structureBaseline.effects.staticCoverage.recordCount,
    )
    expect(manifest.coverage.statusCounts).toEqual({
      converted: 1167,
      corrected: 116,
      unsupported: 77,
    })
    expect(manifest.coverage.supplementalCount).toBe(
      structureBaseline.effects.staticCoverage.supplementalRecordCount,
    )
    expect(manifest.coverage.supplementalStatusCounts).toEqual({
      "integrated": 68,
      "out-of-scope": 33,
    })
    expect(manifest.discrepancies).toHaveLength(
      structureBaseline.effects.staticCatalog.differenceCount,
    )
    expect(manifest.limitations).toHaveLength(5)
    expect(
      manifest.limitations.some(
        (limitation) =>
          limitation.origin === "manifest" &&
          limitation.scope === "agents:remiel",
      ),
    ).toBe(true)
    expect(
      manifest.limitations.some(
        (limitation) =>
          limitation.origin === "reader" &&
          limitation.text.includes("promotion-stats-equipper-defense"),
      ),
    ).toBe(true)
    expect(manifest.extensions.sourceFiles).toEqual(
      effectsProduct.coverage.source.files,
    )
    expect(effectsProduct.catalog.source).toEqual(
      effectsProduct.coverage.source,
    )
    expect(manifest.extensions.catalog).toEqual({
      entities: structureBaseline.effects.staticCatalog.entityCount,
      options: structureBaseline.effects.staticCatalog.optionCount,
      differences: structureBaseline.effects.staticCatalog.differenceCount,
      mechanisms: structureBaseline.effects.staticCatalog.mechanismCount,
    })
    expect(manifest.extensions.coverage.rawEffects).toBe(
      manifest.coverage.count,
    )
    expect(manifest.extensions.coverage.supplements.records).toBe(
      manifest.coverage.supplementalCount,
    )
  })

  it("reports a missing required manifest field", () => {
    const files = fixtureFiles()
    delete (files["attributes/manifest.json"] as Record<string, unknown>)
      .rulesVersion
    const root = writeFixture(files)
    expect(() => loadPanelAttributesManifest(root)).toThrow(
      'attributes/manifest.json: missing required field "rulesVersion"',
    )
  })

  it("reports an unknown manifest field", () => {
    const files = fixtureFiles()
    ;(files["skills/manifest.json"] as Record<string, unknown>).unexpected =
      true
    const root = writeFixture(files)
    expect(() => loadAgentActionsManifest(root)).toThrow(
      'skills/manifest.json: unknown field(s) "unexpected"',
    )
  })

  it("reports a missing artifact file", () => {
    const files = fixtureFiles()
    ;(files["attributes/manifest.json"] as Record<string, unknown>).artifacts =
      { "agents/missing.json": "d".repeat(64) }
    const root = writeFixture(files)
    expect(() => loadPanelAttributesManifest(root)).toThrow(
      'attributes/manifest.json: artifact "attributes/agents/missing.json" is missing or unreadable',
    )
  })

  it("reports an unknown coverage status", () => {
    const files = fixtureFiles()
    const coverage = files["effects/static-coverage.json"] as {
      records: Record<string, unknown>[]
    }
    coverage.records[2]!.status = "mystery"
    const root = writeFixture(files)
    expect(() => loadStaticEffectsProduct(root)).toThrow(
      'static-coverage.json.records[2].status: expected "converted", "corrected", or "unsupported"',
    )
  })

  it("reports an unregistered structured difference reference", () => {
    const files = fixtureFiles()
    const catalog = files["effects/static-catalog.json"] as {
      options: { variants: { differences: string[] }[] }[]
    }
    catalog.options[0]!.variants[0]!.differences = ["missing-diff"]
    const root = writeFixture(files)
    expect(() => loadStaticEffectsProduct(root)).toThrow(
      "static-catalog.json.options: variants reference unregistered differenceId(s): missing-diff",
    )
  })

  it.each([
    ["effects/static.json", 2, 1],
    ["effects/static-catalog.json", 1, 2],
    ["effects/static-catalog.json", 3, 2],
    ["effects/static-coverage.json", 2, 1],
  ] as const)(
    "rejects %s with schemaVersion %i",
    (artifactPath, received, expected) => {
      const files = fixtureFiles()
      ;(files[artifactPath] as Record<string, unknown>).schemaVersion = received
      const root = writeFixture(files)
      expect(() => loadStaticEffectsProduct(root)).toThrow(
        `${artifactPath}: schemaVersion expected ${expected}, received ${received}`,
      )
    },
  )

  it("reports static products with different revisions", () => {
    const files = fixtureFiles()
    ;(
      files["effects/static-coverage.json"] as Record<string, unknown>
    ).revision = "2"
    const root = writeFixture(files)
    expect(() => loadStaticEffectsProduct(root)).toThrow(
      "static effects products disagree on revision",
    )
  })

  it("reports static products with different source repositories", () => {
    const files = fixtureFiles()
    const catalog = files["effects/static-catalog.json"] as {
      source: { repository: string }
    }
    catalog.source.repository = "other/repository"
    const root = writeFixture(files)
    expect(() => loadStaticEffectsProduct(root)).toThrow(
      "static effects products disagree on source.repository",
    )
  })

  it("reports static products with different source commits", () => {
    const files = fixtureFiles()
    const catalog = files["effects/static-catalog.json"] as {
      source: { commit: string }
    }
    catalog.source.commit = "other-commit"
    const root = writeFixture(files)
    expect(() => loadStaticEffectsProduct(root)).toThrow(
      "static effects products disagree on source.commit",
    )
  })

  it("reports static products with different source file digests", () => {
    const files = fixtureFiles()
    const catalog = files["effects/static-catalog.json"] as {
      source: { files: { path: string; sha256: string }[] }
    }
    catalog.source.files[0]!.sha256 = "d".repeat(64)
    const root = writeFixture(files)
    expect(() => loadStaticEffectsProduct(root)).toThrow(
      'static effects products disagree on source.files: sha256 disagrees for "source.json"',
    )
  })

  it("reports static products with different source file sets", () => {
    const files = fixtureFiles()
    const catalog = files["effects/static-catalog.json"] as {
      source: { files: { path: string; sha256: string }[] }
    }
    catalog.source.files.push({ path: "extra.json", sha256: "e".repeat(64) })
    const root = writeFixture(files)
    expect(() => loadStaticEffectsProduct(root)).toThrow(
      'static effects products disagree on source.files: static-catalog.json additionally lists "extra.json" at index 1',
    )
  })
})

describe("static coverage query", () => {
  const product = loadStaticEffectsProduct()

  function matchesFor(filter: Parameters<typeof queryStaticCoverage>[1]) {
    return queryStaticCoverage(product, filter)
  }

  it("filters records and supplemental records by catalog entity", () => {
    const result = matchesFor({ catalogEntityId: "agents:alexandrina" })
    expect(result.matches).toHaveLength(12)
    expect(
      result.matches.filter((match) => match.group === "records"),
    ).toHaveLength(10)
    const supplements = result.matches.filter(
      (match) => match.group === "supplementalRecords",
    )
    expect(supplements).toHaveLength(2)
    for (const match of supplements) {
      if (match.group !== "supplementalRecords") continue
      expect(match.catalogEntityId).toBe("agents:alexandrina")
      expect(match.optionId).toBeTruthy()
    }
  })

  it("filters by pointer and reports the supplemental pointer limitation", () => {
    const result = matchesFor({
      pointer: "/agents/1/mindscapeBuffs/0/effectBlocks/0/effects/0",
    })
    expect(result.matches).toHaveLength(1)
    expect(result.matches[0]).toMatchObject({
      group: "records",
      catalogEntityId: "agents:alexandrina",
      pointer: "/agents/1/mindscapeBuffs/0/effectBlocks/0/effects/0",
      status: "converted",
    })
    expect(result.limitations).toContain(
      "supplementalRecords 不携带结构化 pointer；pointer 过滤只应用于 records。",
    )
  })

  it("filters records by status and keeps unsupported reasons", () => {
    const unsupported = matchesFor({ status: "unsupported" })
    expect(unsupported.matches).toHaveLength(77)
    for (const match of unsupported.matches) {
      if (match.group !== "records") throw new Error("expected record")
      expect(match.status).toBe("unsupported")
      expect(match.reason).toBeTruthy()
      expect(match.explanation).toBeTruthy()
    }
    const integrated = matchesFor({ status: "integrated" })
    expect(integrated.matches).toHaveLength(68)
    expect(
      integrated.matches.every(
        (match) => match.group === "supplementalRecords",
      ),
    ).toBe(true)

    const outOfScope = matchesFor({ status: "out-of-scope" })
    expect(outOfScope.matches).toHaveLength(33)
    for (const match of outOfScope.matches) {
      if (match.group !== "supplementalRecords")
        throw new Error("expected supplemental record")
      expect(match.effectIds).toBeUndefined()
    }
  })

  it("filters by differenceId through structured variant references", () => {
    const potentialLevel = matchesFor({
      differenceId: "potential-level-expression",
    })
    expect(potentialLevel.matches).toHaveLength(12)
    for (const match of potentialLevel.matches) {
      if (match.group !== "records") throw new Error("expected record")
      expect(match.status).toBe("corrected")
    }

    const potentialGate = matchesFor({
      differenceId: "potential-branch-gate",
    })
    expect(potentialGate.matches).toHaveLength(13)
    expect(
      potentialGate.matches.filter(
        (match) => match.group === "supplementalRecords",
      ),
    ).toHaveLength(5)

    const yanagi = matchesFor({
      differenceId: "yanagi-polarity-disorder-isolation",
    })
    expect(yanagi.matches).toHaveLength(3)
    for (const match of yanagi.matches) {
      if (match.group !== "records") throw new Error("expected record")
      expect(match.status).toBe("unsupported")
      expect(match.reason).toBe("semantic-conflict")
    }
  })

  it("returns empty results for unknown filters", () => {
    expect(
      matchesFor({ catalogEntityId: "agents:not-registered" }).matches,
    ).toEqual([])
    expect(matchesFor({ pointer: "/not/registered" }).matches).toEqual([])
    expect(
      matchesFor({ status: "mystery" as StaticCoverageStatus }).matches,
    ).toEqual([])
    const unknownDifference = matchesFor({ differenceId: "not-registered" })
    expect(unknownDifference.matches).toEqual([])
    expect(unknownDifference.limitations[0]).toContain("未登记")
  })

  it("does not treat text-only differences as structured references", () => {
    const result = matchesFor({
      differenceId: "promotion-stats-equipper-defense",
    })
    expect(result.matches).toEqual([])
    expect(result.limitations[0]).toContain("结构化引用")
    expect(result.limitations[0]).not.toContain("未登记")
  })

  it("keeps every applicable limitation when filters combine", () => {
    const result = matchesFor({
      differenceId: "promotion-stats-equipper-defense",
      pointer: "/not/registered",
    })
    expect(result.matches).toEqual([])
    expect(result.limitations).toHaveLength(2)
    expect(result.limitations[0]).toContain("pointer")
    expect(result.limitations[1]).toContain("结构化引用")
  })

  it("does not modify the loaded catalog or coverage", () => {
    const coverageBefore = structuredClone(product.coverage)
    const catalogBefore = structuredClone(product.catalog)
    matchesFor({ catalogEntityId: "agents:alexandrina" })
    matchesFor({ status: "unsupported" })
    matchesFor({ differenceId: "potential-branch-gate" })
    matchesFor({
      pointer: "/agents/1/mindscapeBuffs/0/effectBlocks/0/effects/0",
    })
    expect(product.coverage).toEqual(coverageBefore)
    expect(product.catalog).toEqual(catalogBefore)
  })

  it("matches a difference through effectIds when the record option is not linked", () => {
    const root = writeFixture(fixtureFiles())
    const synthetic = loadStaticEffectsProduct(root)
    const result = queryStaticCoverage(synthetic, {
      differenceId: "diff-a",
      status: "converted",
    })
    expect(result.matches).toHaveLength(2)
    expect(result.matches.map((match) => match.optionId)).toContain(
      "test:other",
    )
    expect(result.matches).toContainEqual(
      expect.objectContaining({
        group: "records",
        optionId: "test:other",
        effectIds: ["test:effect"],
        pointer: "/test/0",
      }),
    )
  })

  it("matches a supplemental record without effectIds through its option", () => {
    const root = writeFixture(fixtureFiles())
    const synthetic = loadStaticEffectsProduct(root)
    const result = queryStaticCoverage(synthetic, { differenceId: "diff-a" })
    const supplement = result.matches.find(
      (match) =>
        match.group === "supplementalRecords" &&
        match.supplementId === "supplement:no-effect-ids",
    )
    expect(supplement).toMatchObject({
      group: "supplementalRecords",
      optionId: "test:option",
      status: "out-of-scope",
    })
    if (supplement?.group !== "supplementalRecords")
      throw new Error("expected supplemental record")
    expect(supplement.effectIds).toBeUndefined()
  })

  it("keeps the synthetic pointer and text-only semantics", () => {
    const root = writeFixture(fixtureFiles())
    const synthetic = loadStaticEffectsProduct(root)
    const byPointer = queryStaticCoverage(synthetic, { pointer: "/test/0" })
    expect(byPointer.matches).toHaveLength(1)
    expect(byPointer.matches.every((match) => match.group === "records")).toBe(
      true,
    )
    expect(byPointer.limitations).toHaveLength(1)

    const textOnly = queryStaticCoverage(synthetic, {
      differenceId: "diff-text",
    })
    expect(textOnly.matches).toEqual([])
    expect(textOnly.limitations[0]).toContain("结构化引用")
  })
})
