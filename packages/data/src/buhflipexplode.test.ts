import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = join(import.meta.dirname, "../../..")
const snapshotId = "2026-05-05T0445Z"
const snapshotRoot = join(
  repoRoot,
  "data/source/raw/buhflipexplode",
  snapshotId,
)

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T
}

describe("buhflipexplode Deadly Assault source snapshot", () => {
  it("passes offline hash and algorithm drift verification", () => {
    execFileSync(
      "node",
      [
        "scripts/buhflipexplode-da-source.mjs",
        "verify",
        "--snapshot",
        snapshotId,
      ],
      {
        cwd: join(repoRoot, "packages/data"),
        stdio: ["ignore", "pipe", "pipe"],
      },
    )
  })

  it("retains only live Deadly Assault versions from the upstream config", () => {
    const algorithmManifest = readJson<{
      runtimeConfig: { vLive: number, vBeta: number }
      liveDataPolicy: {
        liveVersionKeys: string[]
        excludedVersionKeys: string[]
      }
    }>(join(snapshotRoot, "algorithm-manifest.json"))
    const liveVersions = readJson<Record<string, unknown>>(
      join(snapshotRoot, "da/da-versions.live.json"),
    )

    expect(algorithmManifest.runtimeConfig).toMatchObject({
      vLive: 35,
      vBeta: 36,
    })
    expect(Object.keys(liveVersions)).toHaveLength(35)
    expect(Object.keys(liveVersions)).toEqual(
      algorithmManifest.liveDataPolicy.liveVersionKeys,
    )
    for (const key of algorithmManifest.liveDataPolicy.excludedVersionKeys)
      expect(liveVersions).not.toHaveProperty(key)
  })

  it("filters enemy and buff payloads to live-version references", () => {
    const liveVersions = readJson<Record<string, {
      versionBuffIDs: string[]
      versionEnemies: Array<{ id: string }>
    }>>(join(snapshotRoot, "da/da-versions.live.json"))
    const enemies = readJson<Record<string, unknown>>(
      join(snapshotRoot, "assets/zzz/enemies.live.json"),
    )
    const buffs = readJson<Record<string, unknown>>(
      join(snapshotRoot, "assets/zzz/buffs.live.json"),
    )

    const referencedEnemyIds = new Set<string>()
    const referencedBuffIds = new Set<string>()
    for (const version of Object.values(liveVersions)) {
      for (const enemy of version.versionEnemies)
        referencedEnemyIds.add(enemy.id)
      for (const buffId of version.versionBuffIDs)
        referencedBuffIds.add(buffId)
    }

    expect(Object.keys(enemies).sort()).toEqual([...referencedEnemyIds].sort())
    expect(Object.keys(buffs).sort()).toEqual([...referencedBuffIds].sort())
  })

  it("documents the GPL source-code boundary separately from game data", () => {
    const fetchManifest = readJson<{
      sourceRepository: {
        license: string
        runtimeUseDecision: string
      }
    }>(join(snapshotRoot, "fetch-manifest.json"))

    expect(fetchManifest.sourceRepository.license).toBe("GPL-3.0")
    expect(fetchManifest.sourceRepository.runtimeUseDecision).toContain(
      "independent MIT code",
    )
  })
})
