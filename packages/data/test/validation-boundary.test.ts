import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, describe, expect, it } from "vitest"
import type { IntegratedSnapshotIndex } from "../src/integration/snapshot-types.ts"
import { installCandidateAfterValidation } from "../scripts/candidate-output.ts"
import {
  loadAgentActionsCandidateManifest,
  loadPanelAttributesCandidateManifest,
} from "../scripts/data-product/manifests.ts"
import { prepareCalculationData } from "../scripts/prepare-calculation-data.ts"

const roots: string[] = []
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true })
})

function writeFixture(files: Readonly<Record<string, unknown>>): string {
  const root = mkdtempSync(join(tmpdir(), "fairy-validation-boundary-"))
  roots.push(root)
  for (const [relativePath, value] of Object.entries(files)) {
    const target = join(root, relativePath)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(
      target,
      typeof value === "string" ? value : JSON.stringify(value),
    )
  }
  return root
}

function minimalIndex(): IntegratedSnapshotIndex {
  return {
    source: { version: "3.3" },
    entities: { agents: { memberIds: [], members: {} } },
  } as unknown as IntegratedSnapshotIndex
}

function panelAttributesManifest(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    rulesVersion: "panel-attributes/test",
    sourceVersion: "3.3",
    artifacts: {},
    inputs: [],
    limitations: [],
    discrepancies: [],
    members: { agents: [], wEngines: [] },
    evidence: { zzzHpCommit: "test-commit", resources: [] },
  }
}

function agentActionsManifest(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    rulesVersion: "agent-actions/test",
    sourceVersion: "3.3",
    artifacts: {},
    inputs: [],
    limitations: [],
    coverage: {
      agents: 0,
      actions: 0,
      damage: 0,
      dazeOnly: 0,
      luminize: 0,
      unavailable: 0,
      individualHitActions: 0,
    },
    discrepancies: [],
    members: [],
    registrySha256: "a".repeat(64),
    staticCatalogSha256: "b".repeat(64),
    evidence: { zzzHpCommit: "test-commit", resources: [] },
  }
}

function minimalDefinitions(): Record<string, Record<string, unknown>> {
  return {
    "definitions/effects/static.json": {
      schemaVersion: 1,
      ruleSetId: "test-effects",
      revision: "1",
      effects: [],
      actions: [],
      states: [],
    },
    "definitions/effects/static-catalog.json": {
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
      differences: [],
      options: [],
    },
    "definitions/attributes/manifest.json": panelAttributesManifest(),
    "definitions/skills/manifest.json": agentActionsManifest(),
    "integrated/index.json": {},
  }
}

async function writeCandidate(
  root: string,
  name: string,
  manifest: Record<string, unknown>,
): Promise<string> {
  const candidate = join(root, name)
  await mkdir(candidate)
  await writeFile(join(candidate, "manifest.json"), JSON.stringify(manifest))
  return candidate
}

describe("calculation data validation boundary", () => {
  it("accepts the current definitions and writes calculation data", async () => {
    const root = await mkdtemp(join(tmpdir(), "fairy-validation-current-"))
    roots.push(root)
    await cp(
      fileURLToPath(new URL("../definitions", import.meta.url)),
      join(root, "definitions"),
      { recursive: true },
    )
    await mkdir(join(root, "integrated"))
    await writeFile(join(root, "integrated/index.json"), "{}")

    await prepareCalculationData(root, minimalIndex(), "0.5.0")

    const generated = await readFile(join(root, "calculation-data.ts"), "utf8")
    expect(generated).toContain('"snapshotId":"sha256:')
    expect(generated).toContain("export const staticPanelRules")
  })

  it("rejects an invalid static rule set with its file and field", async () => {
    const files = minimalDefinitions()
    ;(
      files["definitions/effects/static.json"] as Record<string, unknown>
    ).schemaVersion = 2
    const root = writeFixture(files)

    await expect(
      prepareCalculationData(root, minimalIndex(), "0.5.0"),
    ).rejects.toThrow(
      "definitions/effects/static.json: INVALID_DEFINITION at /schemaVersion: schemaVersion must be 1",
    )
    expect(existsSync(join(root, "calculation-data.ts"))).toBe(false)
  })

  it("rejects an invalid static catalog with its file and field", async () => {
    const files = minimalDefinitions()
    ;(
      files["definitions/effects/static-catalog.json"] as Record<
        string,
        unknown
      >
    ).revision = "2"
    const root = writeFixture(files)

    await expect(
      prepareCalculationData(root, minimalIndex(), "0.5.0"),
    ).rejects.toThrow(
      "definitions/effects/static-catalog.json: CONTEXT_MISMATCH at /catalog: Catalog schema, ruleSetId and revision must match the definitions",
    )
    expect(existsSync(join(root, "calculation-data.ts"))).toBe(false)
  })

  it("rejects an invalid attributes manifest before writing", async () => {
    const files = minimalDefinitions()
    delete (
      files["definitions/attributes/manifest.json"] as Record<string, unknown>
    ).rulesVersion
    const root = writeFixture(files)

    await expect(
      prepareCalculationData(root, minimalIndex(), "0.5.0"),
    ).rejects.toThrow(
      'definitions/attributes/manifest.json: missing required field "rulesVersion"',
    )
    expect(existsSync(join(root, "calculation-data.ts"))).toBe(false)
  })

  it("rejects an invalid skills manifest before writing", async () => {
    const files = minimalDefinitions()
    ;(
      files["definitions/skills/manifest.json"] as Record<string, unknown>
    ).unexpected = true
    const root = writeFixture(files)

    await expect(
      prepareCalculationData(root, minimalIndex(), "0.5.0"),
    ).rejects.toThrow(
      'definitions/skills/manifest.json: unknown field(s) "unexpected"',
    )
    expect(existsSync(join(root, "calculation-data.ts"))).toBe(false)
  })

  it("keeps the JSON boundary free of static artifact assertions", () => {
    const source = readFileSync(
      new URL("../scripts/prepare-calculation-data.ts", import.meta.url),
      "utf8",
    )
    expect(source).not.toMatch(/\bas\s+(RuleSet|StaticEffectCatalog)\b/)
  })
})

describe("generated candidate validation boundary", () => {
  it("validates a panel attributes candidate with the shared manifest reader", async () => {
    const root = await mkdtemp(join(tmpdir(), "fairy-validation-candidate-"))
    roots.push(root)
    const candidate = await writeCandidate(
      root,
      "attributes-candidate",
      panelAttributesManifest(),
    )

    expect(loadPanelAttributesCandidateManifest(candidate).product).toBe(
      "panel-attributes",
    )
    const manifest = panelAttributesManifest()
    manifest.unexpected = true
    const invalid = await writeCandidate(root, "invalid-attributes", manifest)
    expect(() => loadPanelAttributesCandidateManifest(invalid)).toThrow(
      'invalid-attributes/manifest.json: unknown field(s) "unexpected"',
    )
  })

  it("validates an agent actions candidate with the shared manifest reader", async () => {
    const root = await mkdtemp(join(tmpdir(), "fairy-validation-candidate-"))
    roots.push(root)
    const candidate = await writeCandidate(
      root,
      "actions-candidate",
      agentActionsManifest(),
    )

    expect(loadAgentActionsCandidateManifest(candidate).product).toBe(
      "agent-actions",
    )
    const manifest = agentActionsManifest()
    delete manifest.registrySha256
    const invalid = await writeCandidate(root, "invalid-actions", manifest)
    expect(() => loadAgentActionsCandidateManifest(invalid)).toThrow(
      'invalid-actions/manifest.json: missing required field "registrySha256"',
    )
  })

  it.each([
    [
      "panel attributes",
      panelAttributesManifest,
      loadPanelAttributesCandidateManifest,
    ],
    ["agent actions", agentActionsManifest, loadAgentActionsCandidateManifest],
  ] as const)(
    "does not replace the official directory when %s candidate validation fails",
    async (_label, makeManifest, loadCandidate) => {
      const root = await mkdtemp(join(tmpdir(), "fairy-validation-install-"))
      roots.push(root)
      const manifest = makeManifest()
      manifest.unexpected = true
      const candidate = await writeCandidate(root, "candidate", manifest)
      const official = join(root, "official")
      await mkdir(official)
      await writeFile(join(official, "keep.txt"), "official")

      await expect(
        installCandidateAfterValidation(candidate, official, () => {
          loadCandidate(candidate)
        }),
      ).rejects.toThrow(/unknown field/)
      expect(await readdir(official)).toEqual(["keep.txt"])
      expect(await readFile(join(official, "keep.txt"), "utf8")).toBe(
        "official",
      )
    },
  )

  it.each([
    [
      "panel attributes",
      panelAttributesManifest,
      loadPanelAttributesCandidateManifest,
    ],
    ["agent actions", agentActionsManifest, loadAgentActionsCandidateManifest],
  ] as const)(
    "installs a valid %s candidate unchanged",
    async (_label, makeManifest, loadCandidate) => {
      const root = await mkdtemp(join(tmpdir(), "fairy-validation-install-"))
      roots.push(root)
      const candidate = await writeCandidate(root, "candidate", makeManifest())
      const official = join(root, "official")

      await installCandidateAfterValidation(candidate, official, () => {
        loadCandidate(candidate)
      })
      expect(await readdir(official)).toEqual(["manifest.json"])
    },
  )
})
