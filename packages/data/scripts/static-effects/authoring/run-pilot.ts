import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { compareStaticArtifacts, formatDifference } from "./canonical.ts"
import {
  compileAuthoringPilot,
  readStaticArtifacts,
  summarizeCompilation,
  unsupportedRecordCount,
} from "./compile.ts"
import { PILOT_AUTHORING_RECORDS } from "./pilot-records.ts"
import { isMainModuleEntry } from "../../data-product/cli.ts"

const DEFAULT_BASELINE = fileURLToPath(
  new URL("../../../definitions/effects", import.meta.url),
)

export interface PilotRunResult {
  readonly outputDirectory: string
  readonly baselineDirectory: string
  readonly recordCount: number
  readonly unsupportedCount: number
  readonly summary: string
  readonly equivalent: boolean
  readonly differences: readonly string[]
}

export function runAuthoringPilot(
  options: {
    readonly baselineDirectory?: string
    readonly outputDirectory?: string
  } = {},
): PilotRunResult {
  const baselineDirectory = resolve(
    options.baselineDirectory ?? DEFAULT_BASELINE,
  )
  const outputDirectory = resolve(
    options.outputDirectory ??
      mkdtempSync(join(tmpdir(), "fairy-authoring-pilot-")),
  )
  const compilation = compileAuthoringPilot({
    records: PILOT_AUTHORING_RECORDS,
    baselineDirectory,
    outputDirectory,
  })
  const baseline = readStaticArtifacts(baselineDirectory)
  const candidate = readStaticArtifacts(outputDirectory)
  const comparison = compareStaticArtifacts(baseline, candidate)
  return {
    outputDirectory,
    baselineDirectory,
    recordCount: compilation.recordCount,
    unsupportedCount: unsupportedRecordCount(PILOT_AUTHORING_RECORDS),
    summary: summarizeCompilation(compilation),
    equivalent: comparison.equivalent,
    differences: comparison.differences.map(formatDifference),
  }
}

function main(args: readonly string[]): number {
  const [baselineDirectory, outputDirectory] = args
  const result = runAuthoringPilot({
    ...(baselineDirectory === undefined ? {} : { baselineDirectory }),
    ...(outputDirectory === undefined ? {} : { outputDirectory }),
  })
  console.log(
    `Authoring pilot: ${result.recordCount} records (${result.unsupportedCount} unsupported)`,
  )
  console.log(`Compiled: ${result.summary}`)
  console.log(`Baseline: ${result.baselineDirectory}`)
  console.log(`Output:   ${result.outputDirectory}`)
  if (!result.equivalent) {
    console.log(
      `Semantic comparison: FAIL (${result.differences.length} differences)`,
    )
    for (const difference of result.differences) console.log(`  ${difference}`)
    return 1
  }
  console.log("Semantic comparison: PASS (0 differences)")
  return 0
}

if (isMainModuleEntry(process.argv[1], import.meta.url))
  process.exitCode = main(process.argv.slice(2))
