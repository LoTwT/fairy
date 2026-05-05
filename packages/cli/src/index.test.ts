import { describe, expect, it } from "vitest"
import { spawnSync } from "node:child_process"
import { tmpdir } from "node:os"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { runCli } from "./index"

const source = {
  sourceId: "fixture",
  sourceVersion: "rules-v0.1",
  sourceAnchor: "golden",
}

const baseSnapshot = {
  schemaVersion: "1.0.0",
  gameVersion: "ZZZ-2.2",
  ruleSetVersion: "rules-v0.1",
  dataVersion: "data-v0.1.0",
  sourceVersion: "source-v0.1.0",
  team: [
    {
      agentId: "yixuan",
      level: 60,
      agentSpecialty: "rupture",
      attribute: "ether",
      panel: {
        attack: 1000,
        maxHp: 12000,
        sheerForce: 1000,
        impact: 120,
        critRate: 0,
        critDamage: 0,
      },
    },
  ],
  activeActor: { agentId: "yixuan" },
  attackSegments: [
    {
      id: "seg-1",
      attribute: "ether",
      tags: ["basic"],
      damageType: "regular",
      multiplier: 1,
      source,
    },
  ],
  enemy: {
    level: 60,
    rank: "boss",
    maxHp: 1000000,
  },
}

const messages = {
  "ERR-SRC-001": "Modifier at {path} has no source.",
}
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..")

describe("fairy cli", () => {
  it("calculates a snapshot from stdin and writes CalcResult JSON", async () => {
    const io = fakeIo({ stdin: JSON.stringify(baseSnapshot) })
    const code = await runCli(["calc", "-", "--lang", "en"], io)
    const result = JSON.parse(io.output.stdout) as { summary: { rawTotalDamage: number }; trace: unknown[] }

    expect(code).toBe(0)
    expect(result.summary.rawTotalDamage).toBeCloseTo(454.545, 3)
    expect(result.trace.length).toBeGreaterThan(0)
    expect(io.output.stderr).toBe("")
  })

  it("renders localized warning diagnostics to stderr without changing stdout JSON", async () => {
    const snapshot = structuredClone(baseSnapshot) as Record<string, unknown> & {
      attackSegments: Array<Record<string, unknown>>
    }
    snapshot.attackSegments = [
      {
        id: "seg-1",
        attribute: "ether",
        tags: ["basic"],
        damageType: "regular",
        multiplier: 1,
      },
    ]
    const io = fakeIo({ stdin: JSON.stringify(snapshot) })
    const code = await runCli(["calc", "-", "--lang", "en"], io)
    const result = JSON.parse(io.output.stdout) as { warnings: Array<{ key: string }> }

    expect(code).toBe(0)
    expect(result.warnings.some(warning => warning.key === "ERR-SRC-001")).toBe(true)
    expect(io.output.stderr).toContain("WARNING ERR-SRC-001 attackSegments[0].source")
    expect(io.output.stderr).toContain("Modifier at attackSegments[0].source has no source.")
  })

  it("loads diagnostic messages when cwd is outside the repo root", () => {
    const snapshot = withoutAttackSegmentSource()
    const run = spawnSync(process.execPath, [
      resolve(repoRoot, "packages/cli/bin/fairy.js"),
      "calc",
      "-",
      "--lang",
      "en",
    ], {
      cwd: tmpdir(),
      input: JSON.stringify(snapshot),
      encoding: "utf8",
    })
    const result = JSON.parse(run.stdout) as { warnings: Array<{ key: string }> }

    expect(run.status).toBe(0)
    expect(result.warnings.some(warning => warning.key === "ERR-SRC-001")).toBe(true)
    expect(run.stderr).toContain("WARNING ERR-SRC-001")
    expect(run.stderr).not.toContain("ENOENT")
  })

  it("keeps the documented pnpm invocation JSON-only", () => {
    const run = spawnSync("pnpm", [
      "--silent",
      "--filter",
      "@fairy/cli",
      "run",
      "cli",
      "--",
      "help",
    ], {
      cwd: repoRoot,
      encoding: "utf8",
    })
    const result = JSON.parse(run.stdout) as { schemaVersion: string }

    expect(run.status).toBe(0)
    expect(result.schemaVersion).toBe("fairy-cli-help-v1")
    expect(run.stderr).toBe("")
  })

  it("shows pnpm lifecycle output without --silent, so docs must not recommend it", () => {
    const run = spawnSync("pnpm", [
      "--filter",
      "@fairy/cli",
      "run",
      "cli",
      "--",
      "help",
    ], {
      cwd: repoRoot,
      encoding: "utf8",
    })

    expect(run.status).toBe(0)
    expect(run.stdout.trimStart().startsWith("{")).toBe(false)
  })

  it("compares two snapshot files", async () => {
    const stronger = structuredClone(baseSnapshot)
    stronger.team[0]!.panel.attack = 1200
    const io = fakeIo({
      files: {
        "/repo/left.json": JSON.stringify(baseSnapshot),
        "/repo/right.json": JSON.stringify(stronger),
      },
    })
    const code = await runCli(["compare", "left.json", "right.json"], io)
    const result = JSON.parse(io.output.stdout) as {
      delta: { rawTotalDamage: number }
      left: { summary: { rawTotalDamage: number } }
      right: { summary: { rawTotalDamage: number } }
    }

    expect(code).toBe(0)
    expect(result.right.summary.rawTotalDamage).toBeGreaterThan(result.left.summary.rawTotalDamage)
    expect(result.delta.rawTotalDamage).toBeCloseTo(90.909, 3)
  })

  it("passes result mode through to core calculation", async () => {
    const snapshot = structuredClone(baseSnapshot)
    snapshot.team[0]!.panel.critRate = 0.5
    snapshot.team[0]!.panel.critDamage = 1
    const io = fakeIo({ stdin: JSON.stringify(snapshot) })
    const code = await runCli(["calc", "-", "--result-mode", "crit"], io)
    const result = JSON.parse(io.output.stdout) as { summary: { rawTotalDamage: number } }

    expect(code).toBe(0)
    expect(result.summary.rawTotalDamage).toBeCloseTo(909.091, 3)
  })

  it("accepts boolean flags before the input path", async () => {
    const io = fakeIo({
      files: {
        "/repo/snapshot.json": JSON.stringify(baseSnapshot),
      },
    })
    const code = await runCli(["calc", "--pretty", "snapshot.json"], io)
    const result = JSON.parse(io.output.stdout) as { summary: { rawTotalDamage: number } }

    expect(code).toBe(0)
    expect(result.summary.rawTotalDamage).toBeCloseTo(454.545, 3)
    expect(io.output.stdout.startsWith("{\n")).toBe(true)
  })

  it("scans a numeric snapshot path into JSON rows", async () => {
    const io = fakeIo({ stdin: JSON.stringify(baseSnapshot) })
    const code = await runCli([
      "scan",
      "-",
      "--path",
      "team[0].panel.attack",
      "--from",
      "1000",
      "--to",
      "1100",
      "--step",
      "100",
    ], io)
    const result = JSON.parse(io.output.stdout) as {
      scan: { path: string }
      rows: Array<{ value: number; summary: { rawTotalDamage: number } }>
    }

    expect(code).toBe(0)
    expect(result.scan.path).toBe("team[0].panel.attack")
    expect(result.rows.map(row => row.value)).toEqual([1000, 1100])
    expect(result.rows[1]!.summary.rawTotalDamage).toBeGreaterThan(result.rows[0]!.summary.rawTotalDamage)
  })

  it("returns JSON errors for invalid arguments", async () => {
    const io = fakeIo({ stdin: JSON.stringify(baseSnapshot) })
    const code = await runCli(["calc", "-", "--lang", "fr"], io)
    const error = JSON.parse(io.output.stderr) as { ok: false; error: { code: string } }

    expect(code).toBe(1)
    expect(error.error.code).toBe("ERR-CLI-ARG")
    expect(io.output.stdout).toBe("")
  })

  it("returns JSON schema errors for invalid snapshots", async () => {
    const io = fakeIo({ stdin: JSON.stringify({ schemaVersion: "1.0.0" }) })
    const code = await runCli(["calc", "-"], io)
    const error = JSON.parse(io.output.stderr) as { ok: false; error: { code: string; details: unknown[] } }

    expect(code).toBe(1)
    expect(error.error.code).toBe("ERR-CLI-SCHEMA")
    expect(error.error.details.length).toBeGreaterThan(0)
    expect(io.output.stdout).toBe("")
  })
})

function withoutAttackSegmentSource() {
  const snapshot = structuredClone(baseSnapshot) as Record<string, unknown> & {
    attackSegments: Array<Record<string, unknown>>
  }
  snapshot.attackSegments = [
    {
      id: "seg-1",
      attribute: "ether",
      tags: ["basic"],
      damageType: "regular",
      multiplier: 1,
    },
  ]
  return snapshot
}

function fakeIo(input: {
  stdin?: string
  files?: Record<string, string>
} = {}) {
  const output = {
    stdout: "",
    stderr: "",
  }

  return {
    cwd: "/repo",
    output,
    readFile: async (path: string) => {
      const file = input.files?.[path]
      if (file === undefined)
        throw new Error(`missing test file: ${path}`)
      return file
    },
    readStdin: async () => input.stdin ?? "",
    stdout: (text: string) => {
      output.stdout += text
    },
    stderr: (text: string) => {
      output.stderr += text
    },
    loadMessages: async () => messages,
  }
}
