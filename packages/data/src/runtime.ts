import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import {
  assertNanokaRuntimeGameDataArtifact,
  type NanokaRuntimeGameDataArtifact,
} from "./runtime-policy"

const runtimeGameDataPath = fileURLToPath(new URL("../cleaned/runtime/game-data.json", import.meta.url))

let cachedNanokaRuntimeGameDataArtifact: NanokaRuntimeGameDataArtifact | undefined

export function loadNanokaRuntimeGameDataArtifact() {
  cachedNanokaRuntimeGameDataArtifact ??= JSON.parse(readFileSync(runtimeGameDataPath, "utf8")) as NanokaRuntimeGameDataArtifact
  assertNanokaRuntimeGameDataArtifact(cachedNanokaRuntimeGameDataArtifact)
  return cachedNanokaRuntimeGameDataArtifact
}

export const nanokaRuntimeGameDataArtifact = loadNanokaRuntimeGameDataArtifact()

export function getNanokaRuntimeGameData() {
  return loadNanokaRuntimeGameDataArtifact().data
}

export function getNanokaRuntimeSourcePolicy() {
  return loadNanokaRuntimeGameDataArtifact().runtimeSourcePolicy
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
