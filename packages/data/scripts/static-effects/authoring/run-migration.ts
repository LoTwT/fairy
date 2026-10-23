import { createHash } from "node:crypto"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { formatGeneratedJson } from "../../nanoka-integration/format.ts"
import { isMainModuleEntry } from "../../data-product/cli.ts"
import { compareStaticArtifacts, formatDifference } from "./canonical.ts"
import {
  compileAuthoringRecords,
  readStaticArtifacts,
  summarizeCompilation,
  writeStaticArtifacts,
} from "./compile.ts"
import { MIGRATED_AUTHORING_RECORDS } from "./records.ts"

const DEFAULT_BASELINE = fileURLToPath(
  new URL("../../../definitions/effects", import.meta.url),
)
const ARTIFACT_FILES = [
  "static.json",
  "static-catalog.json",
  "static-coverage.json",
] as const

export interface ArtifactHash {
  readonly file: string
  readonly baseline: string
  readonly candidate: string
}

export interface FormalAuthoringVerification {
  readonly baselineDirectory: string
  readonly outputDirectory: string
  readonly recordCount: number
  readonly summary: string
  readonly equivalent: boolean
  readonly differences: readonly string[]
  readonly byteIdentical: boolean
  readonly hashes: readonly ArtifactHash[]
}

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex")
}

/**
 * 正式迁移记录的验收入口：编译到输出目录，格式化后同时比较
 * 三制品语义与字节。默认输出到系统临时目录；写入仍受
 * `writeStaticArtifacts` 的受管 definitions/integrated/dist 保护。
 */
export async function verifyFormalAuthoring(
  options: {
    readonly baselineDirectory?: string
    readonly outputDirectory?: string
  } = {},
): Promise<FormalAuthoringVerification> {
  const baselineDirectory = resolve(
    options.baselineDirectory ?? DEFAULT_BASELINE,
  )
  const createdOutput = options.outputDirectory === undefined
  const outputDirectory = resolve(
    options.outputDirectory ??
      mkdtempSync(join(tmpdir(), "fairy-authoring-migration-")),
  )
  try {
    const baseline = readStaticArtifacts(baselineDirectory)
    const compilation = compileAuthoringRecords(
      MIGRATED_AUTHORING_RECORDS,
      baseline,
    )
    writeStaticArtifacts(outputDirectory, compilation.artifacts)
    await formatGeneratedJson(outputDirectory, [...ARTIFACT_FILES])
    const candidate = readStaticArtifacts(outputDirectory)
    const comparison = compareStaticArtifacts(baseline, candidate)
    const hashes = ARTIFACT_FILES.map((file) => ({
      file,
      baseline: sha256(join(baselineDirectory, file)),
      candidate: sha256(join(outputDirectory, file)),
    }))
    return {
      baselineDirectory,
      outputDirectory,
      recordCount: MIGRATED_AUTHORING_RECORDS.length,
      summary: summarizeCompilation(compilation),
      equivalent: comparison.equivalent,
      differences: comparison.differences.map(formatDifference),
      byteIdentical: hashes.every((hash) => hash.baseline === hash.candidate),
      hashes,
    }
  } catch (error) {
    if (createdOutput) rmSync(outputDirectory, { recursive: true, force: true })
    throw error
  }
}

async function main(args: readonly string[]): Promise<number> {
  const [baselineDirectory, outputDirectory] = args
  const result = await verifyFormalAuthoring({
    ...(baselineDirectory === undefined ? {} : { baselineDirectory }),
    ...(outputDirectory === undefined ? {} : { outputDirectory }),
  })
  console.log(`Migrated authoring records: ${result.recordCount} records`)
  console.log(`Compiled: ${result.summary}`)
  console.log(`Baseline: ${result.baselineDirectory}`)
  console.log(`Output:   ${result.outputDirectory}`)
  console.log(
    `Semantic comparison: ${result.equivalent ? "PASS" : "FAIL"} (${result.differences.length} differences)`,
  )
  for (const difference of result.differences) console.log(`  ${difference}`)
  for (const hash of result.hashes)
    console.log(
      `${hash.file}: baseline ${hash.baseline} / candidate ${hash.candidate}${hash.baseline === hash.candidate ? "" : " (changed)"}`,
    )
  console.log(`Byte comparison: ${result.byteIdentical ? "PASS" : "CHANGED"}`)
  return result.equivalent ? (result.byteIdentical ? 0 : 2) : 1
}

if (isMainModuleEntry(process.argv[1], import.meta.url))
  process.exitCode = await main(process.argv.slice(2))
