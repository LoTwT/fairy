export type NanokaSnapshotDiffChangeKind = "changed" | "missing" | "new"

export interface NanokaSnapshotDiffInput {
  sourceVersion: string
  contentHash: string
  records: Record<string, unknown>
}

export interface NanokaSnapshotDiffChange {
  kind: NanokaSnapshotDiffChangeKind
  path: string
  before?: number
  after?: number
}

export interface NanokaSnapshotDiffPair {
  fromVersion: string
  toVersion: string
  fromContentHash: string
  toContentHash: string
  changes: NanokaSnapshotDiffChange[]
}

export interface NanokaSnapshotDiffHistory {
  schemaVersion: "nanoka-snapshot-diff-history/v0.1"
  sourceId: string
  generatedAt: string
  diffKind: "snapshot-derived-numeric-diff"
  latestResearchVersion?: string
  approvedLiveVersions: string[]
  comparedPairs: NanokaSnapshotDiffPair[]
  officialPatchNoteText: {
    status: "not-found"
    decision: "D-20 R4.a"
  }
  runtimeCutoverReady: false
}

export interface DeriveNanokaSnapshotDiffHistoryOptions {
  sourceId: string
  generatedAt: string
  approvedLiveVersions: string[]
  latestResearchVersion?: string
}

export function deriveNanokaSnapshotDiffHistory(
  inputs: readonly NanokaSnapshotDiffInput[],
  options: DeriveNanokaSnapshotDiffHistoryOptions,
): NanokaSnapshotDiffHistory {
  assertApprovedSnapshotDiffInputs(inputs, options)

  const inputsByVersion = new Map(inputs.map(input => [input.sourceVersion, input]))
  const orderedInputs = options.approvedLiveVersions
    .map(version => inputsByVersion.get(version))
    .filter((input): input is NanokaSnapshotDiffInput => input !== undefined)

  const comparedPairs: NanokaSnapshotDiffPair[] = []
  for (let index = 1; index < orderedInputs.length; index += 1) {
    const from = orderedInputs[index - 1]!
    const to = orderedInputs[index]!
    comparedPairs.push({
      fromVersion: from.sourceVersion,
      toVersion: to.sourceVersion,
      fromContentHash: from.contentHash,
      toContentHash: to.contentHash,
      changes: diffNumericLeaves(from.records, to.records),
    })
  }

  return {
    schemaVersion: "nanoka-snapshot-diff-history/v0.1",
    sourceId: options.sourceId,
    generatedAt: options.generatedAt,
    diffKind: "snapshot-derived-numeric-diff",
    ...(options.latestResearchVersion === undefined ? {} : { latestResearchVersion: options.latestResearchVersion }),
    approvedLiveVersions: [...options.approvedLiveVersions],
    comparedPairs,
    officialPatchNoteText: {
      status: "not-found",
      decision: "D-20 R4.a",
    },
    runtimeCutoverReady: false,
  }
}

export function assertApprovedSnapshotDiffInputs(
  inputs: readonly NanokaSnapshotDiffInput[],
  options: Pick<DeriveNanokaSnapshotDiffHistoryOptions, "approvedLiveVersions" | "latestResearchVersion">,
): void {
  const approved = new Set(options.approvedLiveVersions)
  for (const input of inputs) {
    if (!approved.has(input.sourceVersion))
      throw new Error(`snapshot-diff input ${input.sourceVersion} is not in approvedLiveVersions`)
    if (input.sourceVersion === options.latestResearchVersion)
      throw new Error(`snapshot-diff input ${input.sourceVersion} is latest research-only`)
    if (!/^sha256:[a-f0-9]{64}$/.test(input.contentHash))
      throw new Error(`snapshot-diff input ${input.sourceVersion} must include sha256 contentHash`)
  }
}

export function diffNumericLeaves(
  from: Record<string, unknown>,
  to: Record<string, unknown>,
): NanokaSnapshotDiffChange[] {
  const fromLeaves = numericLeaves(from)
  const toLeaves = numericLeaves(to)
  const paths = [...new Set([...fromLeaves.keys(), ...toLeaves.keys()])].sort((left, right) =>
    left.localeCompare(right, "en", { numeric: true }),
  )

  const changes: NanokaSnapshotDiffChange[] = []
  for (const path of paths) {
    const before = fromLeaves.get(path)
    const after = toLeaves.get(path)
    if (before === undefined && after !== undefined) {
      changes.push({ kind: "new", path, after })
    }
    else if (before !== undefined && after === undefined) {
      changes.push({ kind: "missing", path, before })
    }
    else if (before !== undefined && after !== undefined && before !== after) {
      changes.push({ kind: "changed", path, before, after })
    }
  }
  return changes
}

function numericLeaves(value: unknown, path = ""): Map<string, number> {
  const leaves = new Map<string, number>()
  collectNumericLeaves(value, path, leaves)
  return leaves
}

function collectNumericLeaves(value: unknown, path: string, leaves: Map<string, number>): void {
  if (typeof value === "number" && Number.isFinite(value)) {
    leaves.set(path || "/", value)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectNumericLeaves(item, `${path}/${index}`, leaves))
    return
  }
  if (typeof value === "object" && value !== null) {
    for (const [key, item] of Object.entries(value))
      collectNumericLeaves(item, `${path}/${escapeJsonPointer(key)}`, leaves)
  }
}

function escapeJsonPointer(value: string): string {
  return value.replace(/~/g, "~0").replace(/\//g, "~1")
}
