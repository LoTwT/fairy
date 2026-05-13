import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = join(import.meta.dirname, "../../..")
const candidatePath = join(repoRoot, "data/cleaned/audit/v1-agent-source-candidates.json")
const packageCandidatePath = join(repoRoot, "packages/data/cleaned/audit/v1-agent-source-candidates.json")
const nicoleAcceptancePath = join(repoRoot, "data/cleaned/audit/nicole.acceptance.json")
const packageNicoleAcceptancePath = join(repoRoot, "packages/data/cleaned/audit/nicole.acceptance.json")
const yanagiAcceptancePath = join(repoRoot, "data/cleaned/audit/yanagi.acceptance.json")
const packageYanagiAcceptancePath = join(repoRoot, "packages/data/cleaned/audit/yanagi.acceptance.json")
const replayReportPath = join(repoRoot, "data/cleaned/golden/v1-replay-report.json")
const packageReplayReportPath = join(repoRoot, "packages/data/cleaned/golden/v1-replay-report.json")

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T
}

describe("V1 golden true-data replay baseline", () => {
  it("passes offline verification for generated source candidates and replay report", () => {
    execFileSync(
      "tsx",
      ["scripts/golden-v1-replay.ts", "verify"],
      {
        cwd: join(repoRoot, "packages/data"),
        stdio: ["ignore", "pipe", "pipe"],
      },
    )
  })

  it("tracks the 20-anchor executable gate and deferred anchors explicitly", () => {
    const report = readJson<{
      v1AnchorIds: string[]
      deferredAnchorIds: string[]
      summary: {
        v1AnchorCount: number
        passed: number
        pendingHarness: number
        blocked: number
        blockingDiagnostics: number
        releaseReady: boolean
      }
      anchors: Array<{
        id: string
        status: string
        notes: string[]
        diagnostics?: Array<{ key: string; effectId: string; reason: string }>
      }>
    }>(replayReportPath)

    expect(report.v1AnchorIds).toHaveLength(20)
    expect(report.v1AnchorIds).toEqual([
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
      "G14",
      "G15",
      "G16",
      "G17",
      "G18",
      "G21",
      "G22",
      "G23",
    ])
    expect(report.deferredAnchorIds).toEqual(["G13", "G19", "G20"])
    expect(report.summary).toMatchObject({
      v1AnchorCount: 20,
      passed: 20,
      pendingHarness: 0,
      blocked: 0,
      blockingDiagnostics: 0,
      releaseReady: true,
    })

    const g13 = report.anchors.find(anchor => anchor.id === "G13")
    expect(g13?.status).toBe("deferred")
    const g04 = report.anchors.find(anchor => anchor.id === "G04")
    expect(g04?.status).toBe("passed")
    expect(g04?.notes.join("\n")).toContain("199.17%, 268.61%, and 161.67%")
    const g09 = report.anchors.find(anchor => anchor.id === "G09")
    expect(g09?.status).toBe("passed")
    expect(g09?.notes.join("\n")).toContain("daze ratio display floors")
    const g10 = report.anchors.find(anchor => anchor.id === "G10")
    expect(g10?.status).toBe("passed")
    expect(g10?.notes.join("\n")).toContain("both resistanceZone and anomaly-buildup-resistance")
    const g11 = report.anchors.find(anchor => anchor.id === "G11")
    expect(g11?.status).toBe("passed")
    const g18 = report.anchors.find(anchor => anchor.id === "G18")
    expect(g18?.status).toBe("passed")
    expect(g18?.notes.join("\n")).toContain("Greta level-70 max HP")
    const g22 = report.anchors.find(anchor => anchor.id === "G22")
    expect(g22?.status).toBe("passed")
    expect(g22?.notes.join("\n")).toContain("inactive/active snapshot states")
    const g23 = report.anchors.find(anchor => anchor.id === "G23")
    expect(g23?.status).toBe("passed")
    expect(g23?.notes.join("\n")).toContain("skill levels 1-16")
  })

  it("extracts only the minimal V1 agent rows and source text candidates", () => {
    const candidates = readJson<{
      policy: { enemyPolicy: string }
      agents: Record<string, { sourceKey: string; attribute: string; agentSpecialty: string }>
      effectCandidates: Array<{
        effectId: string
        releaseGateRequired: boolean
        unparsedEffect: { severity: string; reason: string; diagnosticKey: string }
        sourceRefs: Array<{ sourceAnchor: string }>
        sourceTextHash: string
      }>
    }>(candidatePath)

    expect(Object.keys(candidates.agents).sort()).toEqual(["nicole", "yanagi", "yixuan"])
    expect(candidates.agents.yixuan).toMatchObject({
      sourceKey: "1371",
      attribute: "auricInk",
      agentSpecialty: "rupture",
    })
    expect(candidates.agents.nicole).toMatchObject({
      sourceKey: "1031",
      attribute: "ether",
      agentSpecialty: "support",
    })
    expect(candidates.agents.yanagi).toMatchObject({
      sourceKey: "1221",
      attribute: "electric",
      agentSpecialty: "anomaly",
    })
    expect(candidates.policy.enemyPolicy).toContain("No Excel enemy rows are read")

    const gateRequired = candidates.effectCandidates
      .filter(candidate => candidate.releaseGateRequired)
      .map(candidate => candidate.effectId)
    expect(gateRequired).toEqual([
      "nicole-defense-reduction",
      "yanagi-disorder-boost",
      "yanagi-polarity-disorder-ex-special",
    ])
    expect(
      candidates.effectCandidates.every(candidate =>
        candidate.sourceTextHash.length === 64
        && candidate.unparsedEffect.diagnosticKey === "ERR-DAT-005",
      ),
    ).toBe(true)
  })

  it("records lo-user manual acceptance for G22/G23 source mappings", () => {
    const nicole = readJson<{
      records: Array<{
        effectId: string
        acceptedBy: string
        decisionRef: { target: string; messageId: string }
        acceptedMapping: Record<string, unknown>
      }>
    }>(nicoleAcceptancePath)
    const yanagi = readJson<{
      records: Array<{
        effectId: string
        acceptedBy: string
        decisionRef: { target: string; messageId: string }
        acceptedMapping: { supportedSkillLevels?: number[]; inactiveStateMustHaveNoEffect?: boolean }
      }>
    }>(yanagiAcceptancePath)

    expect(nicole.records).toHaveLength(1)
    expect(nicole.records[0]).toMatchObject({
      effectId: "nicole-defense-reduction",
      acceptedBy: "@lo-user",
      decisionRef: { target: "#fairy:e2e57d52", messageId: "6af6f017" },
      acceptedMapping: {
        handlerId: "defense-reduction",
        requiresActivation: true,
        inactiveStateMustHaveNoEffect: true,
      },
    })
    expect(yanagi.records.map(record => record.effectId)).toEqual([
      "yanagi-disorder-boost",
      "yanagi-polarity-disorder-ex-special",
    ])
    expect(yanagi.records.every(record =>
      record.acceptedBy === "@lo-user"
      && record.decisionRef.messageId === "6af6f017",
    )).toBe(true)
    expect(
      yanagi.records.find(record => record.effectId === "yanagi-disorder-boost")
        ?.acceptedMapping.inactiveStateMustHaveNoEffect,
    ).toBe(true)
    expect(
      yanagi.records.find(record => record.effectId === "yanagi-polarity-disorder-ex-special")
        ?.acceptedMapping.supportedSkillLevels,
    ).toEqual(Array.from({ length: 16 }, (_, index) => index + 1))
  })

  it("keeps the synced package copy byte-identical to cleaned staging", () => {
    expect(readFileSync(packageCandidatePath, "utf8")).toBe(readFileSync(candidatePath, "utf8"))
    expect(readFileSync(packageNicoleAcceptancePath, "utf8")).toBe(readFileSync(nicoleAcceptancePath, "utf8"))
    expect(readFileSync(packageYanagiAcceptancePath, "utf8")).toBe(readFileSync(yanagiAcceptancePath, "utf8"))
    expect(readFileSync(packageReplayReportPath, "utf8")).toBe(readFileSync(replayReportPath, "utf8"))
  })
})
