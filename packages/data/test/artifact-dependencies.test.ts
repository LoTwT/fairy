import { createHash } from "node:crypto"
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { afterEach, describe, expect, it } from "vitest"
import { isMainModuleEntry } from "../scripts/data-product/cli.ts"
import {
  artifactDependencyPaths,
  formatArtifactDependencyReport,
  verifyArtifactDependencies,
  type ArtifactDependencyReport,
  type DependencyViolation,
} from "../scripts/data-product/dependencies.ts"
import {
  loadAgentActionsManifest,
  loadPanelAttributesManifest,
  loadStaticEffectsProduct,
} from "../scripts/data-product/manifests.ts"
import {
  runVerifyArtifactDependenciesCli,
  verifyArtifactDependencyFiles,
  type ArtifactDependencyLocations,
  type VerifyArtifactDependenciesCliIo,
} from "../scripts/verify-artifact-dependencies.ts"

const fixtureRoots: string[] = []

afterEach(() => {
  for (const root of fixtureRoots.splice(0))
    rmSync(root, { recursive: true, force: true })
})

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex")
}

function writeText(root: string, relativePath: string, text: string): string {
  const path = join(root, relativePath)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
  return path
}

function writeJson(root: string, relativePath: string, value: unknown): string {
  return writeText(root, relativePath, JSON.stringify(value))
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T
}

interface DependencyFixture {
  readonly locations: ArtifactDependencyLocations
  readonly attributesManifestPath: string
  readonly skillsManifestPath: string
  readonly inputPath: string
  readonly attributesArtifactPath: string
  readonly skillsArtifactPath: string
  readonly staticCatalogPath: string
  readonly staticCoveragePath: string
  readonly registryPath: string
  readonly sourceManifestPath: string
  readonly files: readonly string[]
  readonly inputSha256: string
}

function staticSource(): {
  readonly repository: string
  readonly commit: string
  readonly files: readonly { readonly path: string; readonly sha256: string }[]
} {
  return {
    repository: "test/source",
    commit: "test-commit",
    files: [{ path: "source.json", sha256: "c".repeat(64) }],
  }
}

function createFixture(): DependencyFixture {
  const root = mkdtempSync(join(tmpdir(), "fairy-artifact-dependencies-"))
  fixtureRoots.push(root)

  const inputText = JSON.stringify({ id: "1" })
  const inputSha256 = sha256(inputText)
  const inputPath = writeText(root, "integrated/agents/1/data.json", inputText)

  const attributesArtifactText = JSON.stringify({ agent: "1" })
  const attributesArtifactPath = writeText(
    root,
    "definitions/attributes/agents/1.json",
    attributesArtifactText,
  )
  const skillsArtifactText = JSON.stringify({ actions: [] })
  const skillsArtifactPath = writeText(
    root,
    "definitions/skills/agents/1.json",
    skillsArtifactText,
  )

  const registryText = JSON.stringify([])
  const registrySha256 = sha256(registryText)
  const registryPath = writeText(
    root,
    "scripts/skills/registry.json",
    registryText,
  )
  const sourceManifestPath = writeJson(
    root,
    "scripts/static-effects/source-manifest.json",
    { "source.json": "c".repeat(64) },
  )

  writeJson(root, "definitions/effects/static.json", {
    schemaVersion: 1,
    ruleSetId: "test-effects",
    revision: "1",
    effects: [],
    states: [],
    actions: [],
  })
  const catalogText = JSON.stringify({
    schemaVersion: 2,
    ruleSetId: "test-effects",
    revision: "1",
    source: staticSource(),
    entities: [],
    options: [],
    skillTargets: [],
    mechanisms: [],
    differences: [],
  })
  const staticCatalogPath = writeText(
    root,
    "definitions/effects/static-catalog.json",
    catalogText,
  )
  const staticCoveragePath = writeJson(
    root,
    "definitions/effects/static-coverage.json",
    {
      schemaVersion: 1,
      ruleSetId: "test-effects",
      revision: "1",
      source: staticSource(),
      summary: {
        entities: 0,
        packs: 0,
        emptyPacks: 0,
        rawEffects: 0,
        rules: 0,
        options: 0,
        converted: 0,
        corrected: 0,
        unsupported: 0,
        supplements: {
          records: 0,
          rules: 0,
          options: 0,
          entities: 0,
          integrated: 0,
          outOfScope: 0,
        },
      },
      records: [],
      supplementalRecords: [],
      deferredMechanisms: [],
      fieldMappings: {},
      packs: [],
      entities: [],
      reverseGaps: [],
    },
  )

  const attributesManifestPath = writeJson(
    root,
    "definitions/attributes/manifest.json",
    {
      schemaVersion: 1,
      rulesVersion: "panel-attributes/test",
      sourceVersion: "test+1",
      members: { agents: ["1"], wEngines: [] },
      inputs: [{ path: "agents/1/data.json", sha256: inputSha256 }],
      artifacts: {
        "agents/1.json": sha256(attributesArtifactText),
      },
      evidence: { zzzHpCommit: "test-commit", resources: [] },
      limitations: [],
      discrepancies: [],
    },
  )
  const skillsManifestPath = writeJson(
    root,
    "definitions/skills/manifest.json",
    {
      schemaVersion: 1,
      rulesVersion: "agent-actions/test",
      sourceVersion: "test+1",
      members: ["1"],
      inputs: [{ path: "agents/1/data.json", sha256: inputSha256 }],
      artifacts: {
        "agents/1.json": sha256(skillsArtifactText),
      },
      evidence: { zzzHpCommit: "test-commit", resources: [] },
      registrySha256,
      staticCatalogSha256: sha256(catalogText),
      coverage: {
        agents: 1,
        actions: 0,
        damage: 0,
        dazeOnly: 0,
        luminize: 0,
        unavailable: 0,
        individualHitActions: 0,
      },
      limitations: [],
      discrepancies: [],
    },
  )
  writeJson(root, "integrated/index.json", {
    format: "test",
    source: { id: "nanoka-zzz", inputs: [], version: "test+1" },
  })

  return {
    locations: {
      definitionsDirectory: join(root, "definitions"),
      integratedDirectory: join(root, "integrated"),
      skillsRegistryPath: registryPath,
      sourceManifestPath,
    },
    attributesManifestPath,
    skillsManifestPath,
    inputPath,
    attributesArtifactPath,
    skillsArtifactPath,
    staticCatalogPath,
    staticCoveragePath,
    registryPath,
    sourceManifestPath,
    files: [
      attributesManifestPath,
      skillsManifestPath,
      inputPath,
      attributesArtifactPath,
      skillsArtifactPath,
      staticCatalogPath,
      staticCoveragePath,
      registryPath,
      sourceManifestPath,
      join(root, "definitions/effects/static.json"),
      join(root, "integrated/index.json"),
    ],
    inputSha256,
  }
}

function reportFor(fixture: DependencyFixture): ArtifactDependencyReport {
  return verifyArtifactDependencyFiles(fixture.locations)
}

function violationOf(
  report: ArtifactDependencyReport,
  code: DependencyViolation["code"],
): DependencyViolation {
  const violation = report.violations.find((entry) => entry.code === code)
  if (violation === undefined)
    throw new Error(
      `missing violation "${code}"; got ${report.violations.map((entry) => entry.code).join(", ")}`,
    )
  return violation
}

interface CliResult {
  readonly code: number
  readonly stdout: string
  readonly stderr: string
}

function runCli(
  args: readonly string[],
  locations: ArtifactDependencyLocations = {},
): CliResult {
  let stdout = ""
  let stderr = ""
  const io: VerifyArtifactDependenciesCliIo = {
    stdout: (text) => {
      stdout += text
    },
    stderr: (text) => {
      stderr += text
    },
  }
  const code = runVerifyArtifactDependenciesCli(args, { ...locations, io })
  return { code, stdout, stderr }
}

function snapshot(files: readonly string[]): Map<string, string> {
  return new Map(files.map((path) => [path, sha256(readFileSync(path))]))
}

describe("artifact dependency graph", () => {
  it("passes the official data and exposes every required link", () => {
    const report = verifyArtifactDependencyFiles()
    expect(report.ok).toBe(true)
    expect(report.violations).toEqual([])

    const panelAttributes = loadPanelAttributesManifest()
    const agentActions = loadAgentActionsManifest()
    const inputEdges =
      panelAttributes.extensions.inputs.length +
      agentActions.extensions.inputs.length
    const artifactEdges =
      panelAttributes.artifacts.length + agentActions.artifacts.length
    expect(report.edges.filter((edge) => edge.kind === "input")).toHaveLength(
      inputEdges,
    )
    expect(
      report.edges.filter((edge) => edge.kind === "artifact"),
    ).toHaveLength(artifactEdges)
    expect(report.summary.nodes).toBe(report.nodes.length)
    expect(report.summary.edges).toBe(report.edges.length)

    expect(report.edges).toContainEqual({
      from: artifactDependencyPaths.panelAttributesManifest,
      to: artifactDependencyPaths.integratedIndex,
      kind: "source-version",
    })
    expect(report.edges).toContainEqual({
      from: artifactDependencyPaths.agentActionsManifest,
      to: artifactDependencyPaths.integratedIndex,
      kind: "source-version",
    })
    expect(report.edges).toContainEqual({
      from: artifactDependencyPaths.panelAttributesManifest,
      to: `integrated/${panelAttributes.extensions.inputs[0].path}`,
      kind: "input",
    })
    expect(report.edges).toContainEqual({
      from: artifactDependencyPaths.agentActionsManifest,
      to: `integrated/${agentActions.extensions.inputs[0].path}`,
      kind: "input",
    })
    expect(report.edges).toContainEqual({
      from: artifactDependencyPaths.panelAttributesManifest,
      to: `definitions/${panelAttributes.artifacts[0].path}`,
      kind: "artifact",
    })
    expect(report.edges).toContainEqual({
      from: artifactDependencyPaths.agentActionsManifest,
      to: `definitions/${agentActions.artifacts[0].path}`,
      kind: "artifact",
    })
    expect(report.edges).toContainEqual({
      from: artifactDependencyPaths.agentActionsManifest,
      to: artifactDependencyPaths.staticCatalog,
      kind: "static-catalog",
    })
    expect(report.edges).toContainEqual({
      from: artifactDependencyPaths.agentActionsManifest,
      to: artifactDependencyPaths.skillsRegistry,
      kind: "skills-registry",
    })
    expect(report.edges).toContainEqual({
      from: artifactDependencyPaths.staticCatalog,
      to: artifactDependencyPaths.sourceManifest,
      kind: "source-files",
    })
    expect(report.edges).toContainEqual({
      from: artifactDependencyPaths.staticCoverage,
      to: artifactDependencyPaths.sourceManifest,
      kind: "source-files",
    })

    const text = formatArtifactDependencyReport(report)
    expect(text.split("\n").length).toBeLessThan(10)
  })

  it("sorts nodes, edges and violations deterministically", () => {
    const first = verifyArtifactDependencyFiles()
    const second = verifyArtifactDependencyFiles()
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))

    const nodeIds = first.nodes.map((node) => node.id)
    expect(nodeIds).toEqual([...nodeIds].toSorted())
    const edgeKeys = first.edges.map(
      (edge) => `${edge.from}\u0000${edge.to}\u0000${edge.kind}`,
    )
    expect(edgeKeys).toEqual([...edgeKeys].toSorted())
  })
})

describe("artifact dependency violations", () => {
  it("reports an input digest mismatch shared by two manifests once", () => {
    const fixture = createFixture()
    const changed = JSON.stringify({ id: "changed" })
    writeFileSync(fixture.inputPath, changed)
    const report = reportFor(fixture)
    expect(report.ok).toBe(false)
    expect(report.violations).toHaveLength(1)
    expect(violationOf(report, "input-sha256-mismatch")).toEqual({
      code: "input-sha256-mismatch",
      node: "integrated/agents/1/data.json",
      expected: fixture.inputSha256,
      actual: sha256(changed),
    })
  })

  it("reports an artifact digest mismatch", () => {
    const fixture = createFixture()
    const changed = JSON.stringify({ agent: "changed" })
    writeFileSync(fixture.attributesArtifactPath, changed)
    const violation = violationOf(
      reportFor(fixture),
      "artifact-sha256-mismatch",
    )
    expect(violation).toMatchObject({
      node: "definitions/attributes/agents/1.json",
      actual: sha256(changed),
    })
  })

  it("reports a static catalog digest mismatch", () => {
    const fixture = createFixture()
    const skills = readJson<Record<string, unknown>>(fixture.skillsManifestPath)
    skills.staticCatalogSha256 = "0".repeat(64)
    writeFileSync(fixture.skillsManifestPath, JSON.stringify(skills))
    const violation = violationOf(
      reportFor(fixture),
      "static-catalog-sha256-mismatch",
    )
    expect(violation).toMatchObject({
      node: "definitions/effects/static-catalog.json",
      expected: "0".repeat(64),
    })
  })

  it("reports a skills registry digest mismatch", () => {
    const fixture = createFixture()
    const skills = readJson<Record<string, unknown>>(fixture.skillsManifestPath)
    skills.registrySha256 = "1".repeat(64)
    writeFileSync(fixture.skillsManifestPath, JSON.stringify(skills))
    const violation = violationOf(
      reportFor(fixture),
      "skills-registry-sha256-mismatch",
    )
    expect(violation).toMatchObject({
      node: "scripts/skills/registry.json",
      expected: "1".repeat(64),
    })
  })

  it("reports a source version mismatch", () => {
    const fixture = createFixture()
    const attributes = readJson<Record<string, unknown>>(
      fixture.attributesManifestPath,
    )
    attributes.sourceVersion = "test+2"
    writeFileSync(fixture.attributesManifestPath, JSON.stringify(attributes))
    const violation = violationOf(reportFor(fixture), "source-version-mismatch")
    expect(violation).toMatchObject({
      node: "definitions/attributes/manifest.json",
      path: "sourceVersion",
      expected: "test+1",
      actual: "test+2",
    })
  })

  it("reports source-manifest digest and membership mismatches", () => {
    const fixture = createFixture()
    writeFileSync(
      fixture.sourceManifestPath,
      JSON.stringify({
        "source.json": "d".repeat(64),
        "extra.json": "e".repeat(64),
      }),
    )
    const report = reportFor(fixture)
    expect(violationOf(report, "source-file-sha256-mismatch")).toMatchObject({
      node: "definitions/effects/static-catalog.json",
      path: "source.json",
      expected: "d".repeat(64),
      actual: "c".repeat(64),
    })
    expect(violationOf(report, "source-file-missing")).toMatchObject({
      path: "extra.json",
      expected: "e".repeat(64),
      actual: "<missing>",
    })

    writeFileSync(fixture.sourceManifestPath, JSON.stringify({}))
    expect(violationOf(reportFor(fixture), "source-file-extra")).toMatchObject({
      path: "source.json",
      expected: "<missing>",
      actual: "c".repeat(64),
    })
  })

  it("compares duplicate declared source paths instead of collapsing them", () => {
    const fixture = createFixture()
    const duplicateSource = {
      repository: "test/source",
      commit: "test-commit",
      files: [
        { path: "source.json", sha256: "c".repeat(64) },
        { path: "source.json", sha256: "d".repeat(64) },
      ],
    }
    const catalog = readJson<Record<string, unknown>>(fixture.staticCatalogPath)
    catalog.source = duplicateSource
    const catalogText = JSON.stringify(catalog)
    writeFileSync(fixture.staticCatalogPath, catalogText)
    const coverage = readJson<Record<string, unknown>>(
      fixture.staticCoveragePath,
    )
    coverage.source = duplicateSource
    writeFileSync(fixture.staticCoveragePath, JSON.stringify(coverage))
    const skills = readJson<Record<string, unknown>>(fixture.skillsManifestPath)
    skills.staticCatalogSha256 = sha256(catalogText)
    writeFileSync(fixture.skillsManifestPath, JSON.stringify(skills))

    const report = reportFor(fixture)
    expect(report.violations).toHaveLength(1)
    expect(violationOf(report, "source-file-sha256-mismatch")).toMatchObject({
      path: "source.json",
      expected: "c".repeat(64),
      actual: "d".repeat(64),
    })
  })

  it("reports a missing source manifest", () => {
    const fixture = createFixture()
    rmSync(fixture.sourceManifestPath)
    expect(violationOf(reportFor(fixture), "source-manifest-missing")).toEqual({
      code: "source-manifest-missing",
      node: "scripts/static-effects/source-manifest.json",
      expected: "readable source-manifest.json",
      actual: "<missing>",
    })
  })

  it("reports missing inputs and a missing skills registry", () => {
    const fixture = createFixture()
    rmSync(fixture.inputPath)
    rmSync(fixture.registryPath)
    const report = reportFor(fixture)
    expect(violationOf(report, "input-missing")).toMatchObject({
      node: "integrated/agents/1/data.json",
      expected: fixture.inputSha256,
      actual: "<missing>",
    })
    expect(violationOf(report, "skills-registry-missing")).toMatchObject({
      node: "scripts/skills/registry.json",
      actual: "<missing>",
    })
  })

  it("sorts multiple violations by code and node", () => {
    const fixture = createFixture()
    writeFileSync(fixture.inputPath, JSON.stringify({ id: "changed" }))
    writeFileSync(
      fixture.attributesArtifactPath,
      JSON.stringify({ agent: "changed" }),
    )
    writeFileSync(fixture.skillsArtifactPath, JSON.stringify({ actions: [1] }))
    const keys = reportFor(fixture).violations.map(
      (violation) => `${violation.code}:${violation.node}`,
    )
    expect(keys).toEqual([...keys].toSorted())
  })

  it("delegates artifact existence and static identity checks to P1-1", () => {
    const missingArtifact = createFixture()
    rmSync(missingArtifact.attributesArtifactPath)
    expect(() => reportFor(missingArtifact)).toThrowError(
      /artifact "attributes\/agents\/1\.json" is missing/u,
    )

    const inconsistentRevision = createFixture()
    const coverage = readJson<Record<string, unknown>>(
      inconsistentRevision.staticCoveragePath,
    )
    coverage.revision = "2"
    writeFileSync(
      inconsistentRevision.staticCoveragePath,
      JSON.stringify(coverage),
    )
    expect(() => reportFor(inconsistentRevision)).toThrowError(
      /disagree on revision/u,
    )
  })

  it("does not modify any input or artifact", () => {
    const fixture = createFixture()
    const before = snapshot(fixture.files)
    reportFor(fixture)
    reportFor(fixture)
    expect(snapshot(fixture.files)).toEqual(before)
  })
})

describe("verify:artifact-dependencies CLI", () => {
  it("emits stable JSON for the official data", () => {
    const first = runCli(["--json"])
    const second = runCli(["--json"])
    expect(first.code).toBe(0)
    expect(first.stderr).toBe("")
    expect(second.stdout).toBe(first.stdout)
    const parsed = JSON.parse(first.stdout) as ArtifactDependencyReport
    expect(parsed.schemaVersion).toBe(1)
    expect(parsed.ok).toBe(true)
    expect(parsed.nodes.length).toBe(parsed.summary.nodes)
    expect(parsed.edges.length).toBe(parsed.summary.edges)
  })

  it("summarizes official data without printing every node", () => {
    const result = runCli([])
    expect(result.code).toBe(0)
    expect(result.stderr).toBe("")
    expect(result.stdout).toContain("制品依赖检查通过")
    expect(result.stdout.split("\n").length).toBeLessThan(10)
  })

  it("reports fixture violations in both text and JSON modes", () => {
    const fixture = createFixture()
    writeFileSync(fixture.inputPath, JSON.stringify({ id: "changed" }))
    const text = runCli([], fixture.locations)
    expect(text.code).toBe(1)
    expect(text.stdout).toContain("制品依赖检查失败")
    expect(text.stdout).toContain("input-sha256-mismatch")

    const json = runCli(["--json"], fixture.locations)
    expect(json.code).toBe(1)
    const parsed = JSON.parse(json.stdout) as ArtifactDependencyReport
    expect(parsed.ok).toBe(false)
    expect(parsed.violations).toHaveLength(1)
  })

  it("reports reader failures as structured errors", () => {
    const fixture = createFixture()
    rmSync(fixture.staticCatalogPath)
    const result = runCli(["--json"], fixture.locations)
    expect(result.code).toBe(1)
    expect(result.stdout).toBe("")
    const parsed = JSON.parse(result.stderr) as {
      readonly ok: boolean
      readonly error: { readonly code: string; readonly message: string }
    }
    expect(parsed.ok).toBe(false)
    expect(parsed.error.code).toBe("LOAD_FAILED")
    expect(parsed.error.message).toContain("static-catalog.json")
  })

  it("reports argument errors separately from load failures", () => {
    const result = runCli(["--bogus", "--json"])
    expect(result.code).toBe(1)
    expect(result.stdout).toBe("")
    const parsed = JSON.parse(result.stderr) as {
      readonly error: { readonly code: string; readonly message: string }
    }
    expect(parsed.error.code).toBe("INVALID_ARGUMENT")
    expect(parsed.error.message).toContain("--bogus")
  })

  it("prints help without reading data", () => {
    const result = runCli(["--help"])
    expect(result.code).toBe(0)
    expect(result.stdout).toContain("verify:artifact-dependencies")
  })

  it.skipIf(process.platform === "win32")(
    "detects the CLI entry through a symlink",
    () => {
      const cliPath = fileURLToPath(
        new URL("../scripts/verify-artifact-dependencies.ts", import.meta.url),
      )
      const root = mkdtempSync(join(tmpdir(), "fairy-artifact-deps-entry-"))
      fixtureRoots.push(root)
      const link = join(root, "verify-link.ts")
      symlinkSync(cliPath, link)
      const moduleUrl = pathToFileURL(cliPath).href
      expect(isMainModuleEntry(link, moduleUrl)).toBe(true)
      expect(isMainModuleEntry(cliPath, moduleUrl)).toBe(true)
      expect(isMainModuleEntry(undefined, moduleUrl)).toBe(false)
      expect(isMainModuleEntry(join(root, "missing.ts"), moduleUrl)).toBe(false)
    },
  )
})

describe("artifact dependency pure verifier", () => {
  it("uses supplied facts instead of rereading the matching files", () => {
    const fixture = createFixture()
    const definitionsDirectory = fixture.locations.definitionsDirectory
    if (definitionsDirectory === undefined)
      throw new Error("fixture definitions directory is required")
    const report = verifyArtifactDependencies({
      panelAttributes: loadPanelAttributesManifest(definitionsDirectory),
      agentActions: loadAgentActionsManifest(definitionsDirectory),
      staticEffects: loadStaticEffectsProduct(definitionsDirectory),
      integratedSourceVersion: "test+1",
      integratedInputFiles: [
        { path: "agents/1/data.json", sha256: "0".repeat(64) },
      ],
      definitionArtifactFiles: [
        { path: "attributes/agents/1.json", sha256: "1".repeat(64) },
        { path: "skills/agents/1.json", sha256: "2".repeat(64) },
      ],
      skillsRegistryFile: {
        path: artifactDependencyPaths.skillsRegistry,
        sha256: "0".repeat(64),
      },
      sourceManifestFiles: [{ path: "source.json", sha256: "c".repeat(64) }],
    })
    expect(
      report.violations.map((violation) => violation.code).toSorted(),
    ).toEqual([
      "artifact-sha256-mismatch",
      "artifact-sha256-mismatch",
      "input-sha256-mismatch",
      "skills-registry-sha256-mismatch",
    ])
  })
})
