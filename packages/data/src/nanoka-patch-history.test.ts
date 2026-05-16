import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  assertApprovedSnapshotDiffInputs,
  deriveNanokaSnapshotDiffHistory,
  type NanokaSnapshotDiffHistory,
  type NanokaSnapshotDiffInput,
} from "./index"

const repoRoot = join(import.meta.dirname, "../../..")

const hash27 = `sha256:${"a".repeat(64)}`
const hash28 = `sha256:${"b".repeat(64)}`

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(join(repoRoot, path), "utf8")) as T
}

describe("nanoka snapshot-derived patch history gate", () => {
  it("derives numeric changed, missing, and new paths between approved live snapshots", () => {
    const previous: NanokaSnapshotDiffInput = {
      sourceVersion: "2.7",
      contentHash: hash27,
      records: {
        "zh/character/1021.json": {
          name: "ignored text",
          stats: {
            attack: 100,
            hp_max: 1000,
          },
        },
      },
    }
    const current: NanokaSnapshotDiffInput = {
      sourceVersion: "2.8",
      contentHash: hash28,
      records: {
        "zh/character/1021.json": {
          name: "changed text ignored",
          stats: {
            attack: 105,
            defence: 50,
          },
        },
      },
    }

    const history = deriveNanokaSnapshotDiffHistory([previous, current], {
      sourceId: "nanoka-zzz",
      generatedAt: "2026-05-15T13:40:00+08:00",
      approvedLiveVersions: ["2.7", "2.8"],
      latestResearchVersion: "3.0.2+15625449",
    })

    expect(history).toMatchObject({
      schemaVersion: "nanoka-snapshot-diff-history/v0.1",
      sourceId: "nanoka-zzz",
      diffKind: "snapshot-derived-numeric-diff",
      runtimeCutoverReady: false,
      officialPatchNoteText: {
        status: "not-found",
        decision: "D-20 R4.a",
      },
    })
    expect(history.comparedPairs).toHaveLength(1)
    expect(history.comparedPairs[0]?.changes).toEqual([
      {
        kind: "changed",
        path: "/zh~1character~11021.json/stats/attack",
        before: 100,
        after: 105,
      },
      {
        kind: "new",
        path: "/zh~1character~11021.json/stats/defence",
        after: 50,
      },
      {
        kind: "missing",
        path: "/zh~1character~11021.json/stats/hp_max",
        before: 1000,
      },
    ])
  })

  it("rejects latest/pre-release and non-hashed snapshot-diff inputs", () => {
    const latest: NanokaSnapshotDiffInput = {
      sourceVersion: "3.0.2+15625449",
      contentHash: hash28,
      records: {},
    }
    const missingHash: NanokaSnapshotDiffInput = {
      sourceVersion: "2.8",
      contentHash: "not-a-sha",
      records: {},
    }

    expect(() => assertApprovedSnapshotDiffInputs([latest], {
      approvedLiveVersions: ["2.8"],
      latestResearchVersion: "3.0.2+15625449",
    })).toThrow("not in approvedLiveVersions")
    expect(() => assertApprovedSnapshotDiffInputs([missingHash], {
      approvedLiveVersions: ["2.8"],
      latestResearchVersion: "3.0.2+15625449",
    })).toThrow("sha256 contentHash")
  })

  it("publishes a canonical baseline artifact for the current approved live allowlist", () => {
    const artifact = readJson<NanokaSnapshotDiffHistory & {
      approvedSnapshots: Array<{ sourceVersion: string, contentHash: string }>
      summary: { approvedSnapshotCount: number, comparedPairCount: number }
    }>("packages/data/cleaned/audit/nanoka-snapshot-diff-history.json")

    expect(artifact).toMatchObject({
      schemaVersion: "nanoka-snapshot-diff-history/v0.1",
      approvedLiveVersions: ["2.8"],
      latestResearchVersion: "3.0.2+15625449",
      comparedPairs: [],
      approvedSnapshots: [
        {
          sourceVersion: "2.8",
          contentHash: "sha256:91494c2c3bfda6ec47beccbf71066506ab0a315513aa751cf30e4c3a1dc0817d",
        },
      ],
      summary: {
        approvedSnapshotCount: 1,
        comparedPairCount: 0,
      },
    })
  })
})
