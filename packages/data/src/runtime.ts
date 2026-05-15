import runtimeGameDataJson from "../cleaned/runtime/game-data.json" with { type: "json" }
import {
  assertNanokaRuntimeGameDataArtifact,
  type NanokaRuntimeGameDataArtifact,
} from "./runtime-policy"

export const nanokaRuntimeGameDataArtifact = runtimeGameDataJson as unknown as NanokaRuntimeGameDataArtifact

export function getNanokaRuntimeGameData() {
  assertNanokaRuntimeGameDataArtifact(nanokaRuntimeGameDataArtifact)
  return nanokaRuntimeGameDataArtifact.data
}

export function getNanokaRuntimeSourcePolicy() {
  assertNanokaRuntimeGameDataArtifact(nanokaRuntimeGameDataArtifact)
  return nanokaRuntimeGameDataArtifact.runtimeSourcePolicy
}

export {
  ARCHIVED_RUNTIME_SOURCE_IDS,
  assertNanokaRuntimeGameDataArtifact,
  NANOKA_RUNTIME_DATA_VERSION,
  NANOKA_RUNTIME_SOURCE_ID,
  NANOKA_RUNTIME_SOURCE_VERSION,
  type NanokaRuntimeGameDataArtifact,
  type NanokaRuntimeSourcePolicy,
} from "./runtime-policy"
