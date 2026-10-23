import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  artifactDependencyPaths,
  formatArtifactDependencyReport,
  verifyArtifactDependencies,
  type ArtifactDependencyReport,
  type DependencyFileDigest,
} from "./data-product/dependencies.ts"
import { isMainModuleEntry } from "./data-product/cli.ts"
import {
  expectField,
  expectRecord,
  expectSha256,
  expectString,
  readJsonFile,
} from "./data-product/json.ts"
import {
  defaultDefinitionsDirectory,
  loadAgentActionsManifest,
  loadPanelAttributesManifest,
  loadStaticEffectsProduct,
} from "./data-product/manifests.ts"

const usage =
  "用法：pnpm --filter @randomplay/data verify:artifact-dependencies [--json]"

const defaultIntegratedDirectory = fileURLToPath(
  new URL("../integrated/", import.meta.url),
)
const defaultSkillsRegistryPath = fileURLToPath(
  new URL("./skills/registry.json", import.meta.url),
)
const defaultSourceManifestPath = fileURLToPath(
  new URL("./static-effects/source-manifest.json", import.meta.url),
)

export interface ArtifactDependencyLocations {
  readonly definitionsDirectory?: string
  readonly integratedDirectory?: string
  readonly skillsRegistryPath?: string
  readonly sourceManifestPath?: string
}

export interface VerifyArtifactDependenciesCliIo {
  readonly stdout: (text: string) => void
  readonly stderr: (text: string) => void
}

export interface VerifyArtifactDependenciesCliOptions extends ArtifactDependencyLocations {
  readonly io?: VerifyArtifactDependenciesCliIo
}

interface ParsedArguments {
  readonly help: boolean
  readonly json: boolean
}

function parseArguments(args: readonly string[]): ParsedArguments {
  if (args.includes("--help") || args.includes("-h"))
    return { help: true, json: args.includes("--json") }
  const unknown = args.filter((argument) => argument !== "--json")
  if (unknown.length > 0) throw new Error(`未知参数：${unknown.join(" ")}`)
  return { help: false, json: args.includes("--json") }
}

function fileDigest(path: string): string | undefined {
  try {
    return createHash("sha256").update(readFileSync(path)).digest("hex")
  } catch {
    return undefined
  }
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function distinctPaths(
  entries: readonly { readonly path: string }[],
): readonly string[] {
  return [...new Set(entries.map((entry) => entry.path))].toSorted(compareText)
}

function readIntegratedSourceVersion(integratedDirectory: string): string {
  const label = artifactDependencyPaths.integratedIndex
  const index = expectRecord(
    readJsonFile(join(integratedDirectory, "index.json"), label).value,
    label,
  )
  const source = expectRecord(
    expectField(index, "source", label),
    `${label}.source`,
  )
  return expectString(
    expectField(source, "version", `${label}.source`),
    `${label}.source.version`,
  )
}

/** 读取 source-manifest 的扁平 path → sha256 映射；缺失时返回 undefined。 */
function readSourceManifestFiles(
  path: string,
): readonly DependencyFileDigest[] | undefined {
  if (!existsSync(path)) return undefined
  const label = artifactDependencyPaths.sourceManifest
  const record = expectRecord(readJsonFile(path, label).value, label)
  return Object.entries(record)
    .map(([filePath, digest]) => ({
      path: filePath,
      sha256: expectSha256(digest, `${label}["${filePath}"]`),
    }))
    .toSorted((left, right) => compareText(left.path, right.path))
}

/** 读取 P1-1 已校验的制品，再补上依赖检查所需的实际文件摘要。 */
export function verifyArtifactDependencyFiles(
  locations: ArtifactDependencyLocations = {},
): ArtifactDependencyReport {
  const definitionsDirectory =
    locations.definitionsDirectory ?? defaultDefinitionsDirectory
  const integratedDirectory =
    locations.integratedDirectory ?? defaultIntegratedDirectory
  const skillsRegistryPath =
    locations.skillsRegistryPath ?? defaultSkillsRegistryPath
  const sourceManifestPath =
    locations.sourceManifestPath ?? defaultSourceManifestPath

  const panelAttributes = loadPanelAttributesManifest(definitionsDirectory)
  const agentActions = loadAgentActionsManifest(definitionsDirectory)
  const staticEffects = loadStaticEffectsProduct(definitionsDirectory)

  const inputPaths = distinctPaths([
    ...panelAttributes.extensions.inputs,
    ...agentActions.extensions.inputs,
  ])
  const artifactPaths = distinctPaths([
    ...panelAttributes.artifacts,
    ...agentActions.artifacts,
  ])

  const registrySha256 = fileDigest(skillsRegistryPath)

  return verifyArtifactDependencies({
    panelAttributes,
    agentActions,
    staticEffects,
    integratedSourceVersion: readIntegratedSourceVersion(integratedDirectory),
    integratedInputFiles: inputPaths.map((path) => {
      const sha256 = fileDigest(join(integratedDirectory, path))
      return sha256 === undefined ? { path } : { path, sha256 }
    }),
    definitionArtifactFiles: artifactPaths.map((path) => {
      const sha256 = fileDigest(join(definitionsDirectory, path))
      return sha256 === undefined ? { path } : { path, sha256 }
    }),
    skillsRegistryFile:
      registrySha256 === undefined
        ? undefined
        : {
            path: artifactDependencyPaths.skillsRegistry,
            sha256: registrySha256,
          },
    sourceManifestFiles: readSourceManifestFiles(sourceManifestPath),
  })
}

function reportError(
  error: unknown,
  json: boolean,
  io: VerifyArtifactDependenciesCliIo,
  code = "LOAD_FAILED",
): number {
  const message = error instanceof Error ? error.message : String(error)
  if (json)
    io.stderr(
      `${JSON.stringify(
        {
          schemaVersion: 1,
          ok: false,
          type: "error",
          error: { code, message },
        },
        null,
        2,
      )}\n`,
    )
  else io.stderr(`错误：${message}\n`)
  return 1
}

/** 可测试的 CLI 入口：不调用 process.exit，只返回退出码。 */
export function runVerifyArtifactDependenciesCli(
  args: readonly string[],
  options: VerifyArtifactDependenciesCliOptions = {},
): number {
  const io = options.io ?? {
    stdout: (text: string) => process.stdout.write(text),
    stderr: (text: string) => process.stderr.write(text),
  }

  let parsed: ParsedArguments
  try {
    parsed = parseArguments(args)
  } catch (error) {
    return reportError(error, args.includes("--json"), io, "INVALID_ARGUMENT")
  }

  if (parsed.help) {
    io.stdout(`${usage}\n`)
    return 0
  }

  try {
    const report = verifyArtifactDependencyFiles(options)
    io.stdout(
      `${
        parsed.json
          ? JSON.stringify(report, null, 2)
          : formatArtifactDependencyReport(report)
      }\n`,
    )
    return report.ok ? 0 : 1
  } catch (error) {
    return reportError(error, parsed.json, io)
  }
}

if (isMainModuleEntry(process.argv[1], import.meta.url))
  process.exitCode = runVerifyArtifactDependenciesCli(process.argv.slice(2))
