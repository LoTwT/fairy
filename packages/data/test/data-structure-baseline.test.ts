import { createHash } from "node:crypto"
import { lstatSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const dataRoot = fileURLToPath(new URL("..", import.meta.url))
const baselinePath = fileURLToPath(
  new URL("./fixtures/data-structure-baseline.json", import.meta.url),
)
const updateBaseline = process.env.UPDATE_DATA_STRUCTURE_BASELINE === "1"

function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex")
}

function sha256File(path: string): string {
  return sha256(readFileSync(path))
}

function posixPath(path: string): string {
  return path.split(sep).join("/")
}

/** 递归列出普通文件；符号链接和非普通文件会让基线失败，而不是被静默跳过。 */
function listFiles(directory: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...listFiles(path))
      continue
    }
    if (!entry.isFile() || !lstatSync(path).isFile())
      throw new Error(`artifact is not a regular file: ${path}`)
    files.push(path)
  }
  return files.toSorted()
}

/** 摘要只由相对路径和文件字节决定；排序固定，避免目录遍历顺序影响结果。 */
function digestFileSet(root: string, files: readonly string[]): string {
  const lines = files.map((file) => {
    const path = posixPath(relative(root, file))
    return `${path}\0${sha256File(file)}`
  })
  return sha256(`${lines.join("\n")}\n`)
}

function digestStrings(values: readonly string[]): string {
  return sha256(`${values.toSorted().join("\n")}\n`)
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"))
}

interface BaselineIndex {
  readonly entities: Readonly<
    Record<
      string,
      {
        readonly rulesVersion: string
        readonly memberIds: readonly string[]
        readonly members: Readonly<Record<string, unknown>>
      }
    >
  >
  readonly source: { readonly version: string }
}

function buildIntegratedBaseline() {
  const root = join(dataRoot, "integrated")
  const index = readJson(join(root, "index.json")) as BaselineIndex
  const files = listFiles(root)
  const categories: Record<
    string,
    {
      rulesVersion: string
      memberCount: number
      memberIdSetSha256: string
      fileCount: number
      memberFileSetSha256: string
    }
  > = {}
  for (const name of Object.keys(index.entities).toSorted()) {
    const category = index.entities[name]
    const memberFiles = files.filter((file) => {
      const [first] = posixPath(relative(root, file)).split("/")
      return first === name
    })
    categories[name] = {
      rulesVersion: category.rulesVersion,
      memberCount: category.memberIds.length,
      memberIdSetSha256: digestStrings(category.memberIds),
      fileCount: memberFiles.length,
      memberFileSetSha256: digestFileSet(root, memberFiles),
    }
  }
  return {
    indexSha256: sha256File(join(root, "index.json")),
    sourceVersion: index.source.version,
    fileCount: files.length,
    categories,
  }
}

function buildAttributesBaseline() {
  const root = join(dataRoot, "definitions/attributes")
  const manifest = readJson(join(root, "manifest.json")) as {
    readonly inputs: readonly unknown[]
    readonly artifacts: Readonly<Record<string, string>>
    readonly evidence: { readonly resources: readonly unknown[] }
    readonly limitations: readonly unknown[]
    readonly discrepancies: readonly unknown[]
  }
  const files = listFiles(root)
  const manifestPath = join(root, "manifest.json")
  const artifactFiles = files.filter((file) => file !== manifestPath)
  return {
    manifestSha256: sha256File(manifestPath),
    counts: {
      inputs: manifest.inputs.length,
      artifacts: Object.keys(manifest.artifacts).length,
      evidenceResources: manifest.evidence.resources.length,
      limitations: manifest.limitations.length,
      discrepancies: manifest.discrepancies.length,
    },
    fileCount: files.length,
    artifactFileSetSha256: digestFileSet(root, artifactFiles),
  }
}

function buildSkillsBaseline() {
  const root = join(dataRoot, "definitions/skills")
  const manifest = readJson(join(root, "manifest.json")) as {
    readonly members: readonly string[]
    readonly coverage: { readonly actions: number }
  }
  const files = listFiles(root)
  const manifestPath = join(root, "manifest.json")
  const artifactFiles = files.filter((file) => file !== manifestPath)
  return {
    manifestSha256: sha256File(manifestPath),
    memberCount: manifest.members.length,
    actionCount: manifest.coverage.actions,
    fileCount: files.length,
    artifactFileSetSha256: digestFileSet(root, artifactFiles),
  }
}

function buildEffectsBaseline() {
  const root = join(dataRoot, "definitions/effects")
  const definitions = readJson(join(root, "static.json")) as {
    readonly ruleSetId: string
    readonly revision: number
    readonly effects: readonly unknown[]
  }
  const catalog = readJson(join(root, "static-catalog.json")) as {
    readonly ruleSetId: string
    readonly revision: number
    readonly entities: readonly unknown[]
    readonly options: readonly { readonly variants: readonly unknown[] }[]
  }
  const coverage = readJson(join(root, "static-coverage.json")) as {
    readonly ruleSetId: string
    readonly revision: number
    readonly records: readonly unknown[]
  }
  return {
    static: {
      sha256: sha256File(join(root, "static.json")),
      ruleSetId: definitions.ruleSetId,
      revision: definitions.revision,
      ruleCount: definitions.effects.length,
    },
    staticCatalog: {
      sha256: sha256File(join(root, "static-catalog.json")),
      ruleSetId: catalog.ruleSetId,
      revision: catalog.revision,
      optionCount: catalog.options.length,
      variantCount: catalog.options.reduce(
        (count, option) => count + option.variants.length,
        0,
      ),
      entityCount: catalog.entities.length,
    },
    staticCoverage: {
      sha256: sha256File(join(root, "static-coverage.json")),
      ruleSetId: coverage.ruleSetId,
      revision: coverage.revision,
      recordCount: coverage.records.length,
    },
  }
}

function buildBaseline() {
  return {
    schemaVersion: 1,
    integrated: buildIntegratedBaseline(),
    attributes: buildAttributesBaseline(),
    skills: buildSkillsBaseline(),
    effects: buildEffectsBaseline(),
  }
}

describe("data artifact structural baseline", () => {
  it("matches the committed structure and identity baseline", () => {
    const actual = buildBaseline()
    if (updateBaseline) {
      writeFileSync(baselinePath, `${JSON.stringify(actual, null, 2)}\n`)
      return
    }
    expect(actual).toEqual(readJson(baselinePath))
  })
})
