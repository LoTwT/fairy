import { parseGameData, type GameData, type SourceRef } from "@randomplay/core"
import type { CleanedGameDataArtifact } from "./types/cleaned-data"

export const NANOKA_RUNTIME_SOURCE_ID = "nanoka-zzz"
export const NANOKA_RUNTIME_SOURCE_VERSION = "2.8"
export const NANOKA_RUNTIME_DATA_VERSION = "fairy-v0.1.0-nanoka-runtime"

export const ARCHIVED_RUNTIME_SOURCE_IDS = [
  "lo-user-excel",
  "mihoyo-zzz-critical-assault",
  "buhflipexplode-zzz-da",
  "nanoka-zzz-boss-manual-2026-05-07",
] as const

export interface NanokaRuntimeSourcePolicy {
  primarySourceId: typeof NANOKA_RUNTIME_SOURCE_ID
  configuredLiveVersion: typeof NANOKA_RUNTIME_SOURCE_VERSION
  deprecatedRuntimeSourceIds: typeof ARCHIVED_RUNTIME_SOURCE_IDS
  archivedSourcesRuntimeAllowed: false
  phase3ExitSyncId: "phase3-sync-002-g27-g28"
}

export interface NanokaRuntimeGameDataArtifact extends CleanedGameDataArtifact {
  runtimeCutoverReady: true
  runtimeSourcePolicy: NanokaRuntimeSourcePolicy
}

interface SourceRefCandidate {
  sourceId?: unknown
  sourceVersion?: unknown
  sourceAnchor?: unknown
  dataPath?: unknown
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isSourceRefCandidate(value: unknown): value is SourceRefCandidate {
  return isObject(value) && typeof value.sourceId === "string"
}

function collectSourceRefs(value: unknown, refs: SourceRef[] = []): SourceRef[] {
  if (Array.isArray(value)) {
    for (const item of value)
      collectSourceRefs(item, refs)
    return refs
  }

  if (!isObject(value))
    return refs

  if (isSourceRefCandidate(value)) {
    const ref: SourceRef = { sourceId: value.sourceId as string }
    if (typeof value.sourceVersion === "string")
      ref.sourceVersion = value.sourceVersion
    if (typeof value.sourceAnchor === "string")
      ref.sourceAnchor = value.sourceAnchor
    if (typeof value.dataPath === "string")
      ref.dataPath = value.dataPath
    refs.push(ref)
  }

  for (const item of Object.values(value))
    collectSourceRefs(item, refs)

  return refs
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition)
    throw new Error(message)
}

export function assertNanokaRuntimeGameDataArtifact(
  artifact: unknown,
): asserts artifact is NanokaRuntimeGameDataArtifact {
  assert(isObject(artifact), "runtime game data artifact must be an object")
  assert(artifact.kind === "gameData", "runtime artifact kind must be gameData")
  assert(artifact.dataVersion === NANOKA_RUNTIME_DATA_VERSION, "runtime artifact dataVersion drifted")
  assert(artifact.runtimeCutoverReady === true, "runtimeCutoverReady must be true after Phase 4 cutover")

  const policy = artifact.runtimeSourcePolicy
  assert(isObject(policy), "runtimeSourcePolicy is required")
  assert(policy.primarySourceId === NANOKA_RUNTIME_SOURCE_ID, "runtime primary source must be nanoka-zzz")
  assert(policy.configuredLiveVersion === NANOKA_RUNTIME_SOURCE_VERSION, "runtime sourceVersion must use configured live version")
  assert(policy.archivedSourcesRuntimeAllowed === false, "archived sources must not be allowed at runtime")
  assert(policy.phase3ExitSyncId === "phase3-sync-002-g27-g28", "runtime cutover must cite Phase 3 exit sync")
  assert(
    JSON.stringify(policy.deprecatedRuntimeSourceIds) === JSON.stringify(ARCHIVED_RUNTIME_SOURCE_IDS),
    "deprecated runtime source id list drifted",
  )

  const data = parseGameData(artifact.data) as GameData
  assert(data.sourceVersion === `${NANOKA_RUNTIME_SOURCE_ID}@${NANOKA_RUNTIME_SOURCE_VERSION}`, "runtime GameData sourceVersion must be nanoka-zzz@2.8")
  assert(data.sources.length === 1, "runtime GameData must expose exactly one runtime source document")
  assert(data.sources[0]?.id === NANOKA_RUNTIME_SOURCE_ID, "runtime GameData source document must be nanoka-zzz")
  assert(data.sources[0]?.sourceVersion === NANOKA_RUNTIME_SOURCE_VERSION, "runtime GameData source document must use configured live version")
  assert(Object.keys(data.agents).length === 53, "runtime GameData must include the full approved-live character batch")
  assert(Object.keys(data.wEngines).length === 89, "runtime GameData must include the full approved-live W-Engine batch")
  assert(Object.keys(data.driveDiscs).length === 26, "runtime GameData must include the full approved-live Drive Disc set batch")
  assert(Object.keys(data.enemies).length === 269, "runtime GameData must include the full approved-live enemy batch")

  const archivedSources = new Set<string>(ARCHIVED_RUNTIME_SOURCE_IDS)
  for (const ref of collectSourceRefs(data)) {
    assert(!archivedSources.has(ref.sourceId), `runtime GameData must not reference archived source ${ref.sourceId}`)
    assert(ref.sourceId === NANOKA_RUNTIME_SOURCE_ID, `runtime GameData must not reference non-nanoka source ${ref.sourceId}`)
    assert(ref.sourceVersion === NANOKA_RUNTIME_SOURCE_VERSION, `${ref.sourceAnchor ?? ref.sourceId}: runtime source refs must use configured live version`)
  }
}
