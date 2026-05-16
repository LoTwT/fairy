import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const packageDir = fileURLToPath(new URL("..", import.meta.url))
const replayReportPath = join(packageDir, "cleaned/golden/v1-replay-report.json")
const candidatePath = join(packageDir, "cleaned/audit/v1-agent-source-candidates.json")
const nicoleAcceptancePath = join(packageDir, "cleaned/audit/nicole.acceptance.json")
const yanagiAcceptancePath = join(packageDir, "cleaned/audit/yanagi.acceptance.json")

const v1AnchorIds = [
  "G01",
  "G02",
  "G03",
  "G04",
  "G05",
  "G06",
  "G07",
  "G08",
  "G09",
  "G10",
  "G11",
  "G12",
  "G13",
  "G14",
  "G15",
  "G16",
  "G17",
  "G18",
  "G19",
  "G20",
  "G21",
  "G22",
  "G23",
  "G24",
  "G25",
  "G26",
  "G27",
  "G28",
] as const

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition)
    throw new Error(message)
}

function verifyReport() {
  const report = readJson<{
    schemaVersion?: string
    parserVersion?: string
    policy?: Record<string, unknown>
    v1AnchorIds?: string[]
    deferredAnchorIds?: string[]
    summary?: {
      v1AnchorCount?: number
      passed?: number
      pendingHarness?: number
      blocked?: number
      deferred?: number
      blockingDiagnostics?: number
      releaseReady?: boolean
    }
    anchors?: Array<{
      id?: string
      status?: string
      sourceRefs?: Array<{ sourceId?: string }>
      diagnostics?: unknown[]
    }>
  }>(replayReportPath)

  assert(report.schemaVersion === "fairy-v1-golden-replay-report-v1", "unexpected golden report schemaVersion")
  assert(report.parserVersion === "golden-v1-replay-v0.1.0", "unexpected golden report parserVersion")
  assert(Array.isArray(report.v1AnchorIds), "golden report v1AnchorIds must be an array")
  assert(JSON.stringify(report.v1AnchorIds) === JSON.stringify(v1AnchorIds), "golden report anchor id list drifted")
  assert(Array.isArray(report.deferredAnchorIds) && report.deferredAnchorIds.length === 0, "golden report must not defer V1 anchors")
  assert(report.summary?.v1AnchorCount === v1AnchorIds.length, "golden report anchor count drifted")
  assert(report.summary?.passed === v1AnchorIds.length, "all V1 anchors must pass")
  assert(report.summary?.pendingHarness === 0, "golden report must not have pending harness anchors")
  assert(report.summary?.blocked === 0, "golden report must not have blocked anchors")
  assert(report.summary?.deferred === 0, "golden report must not have deferred anchors")
  assert(report.summary?.blockingDiagnostics === 0, "golden report must not have blocking diagnostics")
  assert(report.summary?.releaseReady === true, "golden report must be release ready")
  assert(Array.isArray(report.anchors) && report.anchors.length === v1AnchorIds.length, "golden report anchors length drifted")

  for (const anchorId of v1AnchorIds) {
    const anchor = report.anchors.find(item => item.id === anchorId)
    assert(anchor !== undefined, `${anchorId}: missing golden anchor`)
    assert(anchor.status === "passed", `${anchorId}: golden anchor must be passed`)
    assert(Array.isArray(anchor.sourceRefs) && anchor.sourceRefs.length > 0, `${anchorId}: sourceRefs are required`)
    assert((anchor.diagnostics?.length ?? 0) === 0, `${anchorId}: diagnostics must be empty`)
  }

  for (const artifactPath of [candidatePath, nicoleAcceptancePath, yanagiAcceptancePath])
    readJson<unknown>(artifactPath)

  return report
}

const command = process.argv[2] ?? "verify"
if (command !== "verify" && command !== "audit")
  throw new Error(`Unexpected command: ${command}`)

const report = verifyReport()
console.log(`${command === "audit" ? "golden V1 audit artifact retained" : "golden V1 verification passed"}: ${report.summary?.passed}/${report.summary?.v1AnchorCount} anchors passed`)
