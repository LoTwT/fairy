import { describe, expect, it } from "vitest"
import { readdirSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..")
const examplesDir = resolve(repoRoot, "examples/snapshots")

describe("dogfooding examples", () => {
  const exampleFiles = readdirSync(examplesDir)
    .filter(file => file.endsWith(".json"))
    .sort()

  it("keeps all example snapshots as strict JSON", () => {
    expect(exampleFiles.length).toBeGreaterThan(0)

    for (const file of exampleFiles) {
      const text = readFileSync(resolve(examplesDir, file), "utf8")
      expect(() => JSON.parse(text), file).not.toThrow()
    }
  })

  it("runs every example snapshot through calc with JSON-only stdout", () => {
    for (const file of exampleFiles) {
      const run = spawnSync("pnpm", [
        "--silent",
        "--filter",
        "@randomplay/cli",
        "run",
        "cli",
        "--",
        "calc",
        resolve(examplesDir, file),
        "--lang",
        "zh",
      ], {
        cwd: repoRoot,
        encoding: "utf8",
      })
      const parsed = JSON.parse(run.stdout) as { errors: unknown[] }

      expect(run.status, `${file} exit status\nstderr:\n${run.stderr}`).toBe(0)
      expect(run.stderr, `${file} stderr`).toBe("")
      expect(parsed.errors, `${file} result errors`).toEqual([])
    }
  })

  it("covers the accepted Anby core F basic 16 dogfood fixture", () => {
    const run = spawnSync("pnpm", [
      "--silent",
      "--filter",
      "@randomplay/cli",
      "run",
      "cli",
      "--",
      "calc",
      resolve(examplesDir, "dogfood-anby-core-f-basic16-dullahan-9528.json"),
      "--lang",
      "zh",
    ], {
      cwd: repoRoot,
      encoding: "utf8",
    })
    const parsed = JSON.parse(run.stdout) as {
      summary: {
        expectedDamage?: number
        lanes: {
          nonCrit: { rawDamage: number; displayDamage: number }
          crit: { rawDamage: number; displayDamage: number }
        }
        daze: { value: number; ratioRaw: number; ratioDisplay: number }
      }
      errors: unknown[]
    }

    expect(run.status, `exit status\nstderr:\n${run.stderr}`).toBe(0)
    expect(run.stderr).toBe("")
    expect(parsed.errors).toEqual([])
    expect(parsed.summary.expectedDamage).toBeUndefined()
    expect(parsed.summary.lanes.nonCrit.rawDamage).toBeCloseTo(223.7458540909091, 10)
    expect(parsed.summary.lanes.nonCrit.displayDamage).toBe(224)
    expect(parsed.summary.lanes.crit.rawDamage).toBeCloseTo(335.6187811363636, 10)
    expect(parsed.summary.lanes.crit.displayDamage).toBe(336)
    expect(parsed.summary.daze.value).toBe(37.536)
    expect(parsed.summary.daze.ratioRaw).toBeCloseTo(0.4561041107209254, 12)
    expect(parsed.summary.daze.ratioDisplay).toBe(0)
  })

  it("keeps root example aliases JSON-only when called with pnpm --silent", () => {
    for (const script of ["fairy:s1", "fairy:s2", "fairy:s3"]) {
      const run = spawnSync("pnpm", ["--silent", script], {
        cwd: repoRoot,
        encoding: "utf8",
      })
      const parsed = JSON.parse(run.stdout) as { errors: unknown[] }

      expect(run.status, `${script} exit status\nstderr:\n${run.stderr}`).toBe(0)
      expect(run.stderr, `${script} stderr`).toBe("")
      expect(parsed.errors, `${script} result errors`).toEqual([])
    }
  })
})
