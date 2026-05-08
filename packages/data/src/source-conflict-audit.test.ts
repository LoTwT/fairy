import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = join(import.meta.dirname, "../../..")
const auditPath = join(repoRoot, "data/cleaned/audit/mihoyo-buhflipexplode.source-conflicts.json")
const packageAuditPath = join(repoRoot, "packages/data/cleaned/audit/mihoyo-buhflipexplode.source-conflicts.json")
const rawAlignmentPath = join(
  repoRoot,
  "data/source/raw/mihoyo/zzz-da/2026-05-05T0850Z/alignment/mihoyo-buhflipexplode.json",
)

type AuditRecord = {
  auditId: string
  status: string
  buff: {
    mihoyoName: string
    buhflipexplodeName: string
    buhflipexplodeBuffId: string
  }
  normalizedComparison: {
    mihoyo: Record<string, unknown>
    buhflipexplode: Record<string, unknown>
    nanoka: Record<string, unknown>
  }
  releaseDecision: {
    sourceForCleanedResolution: string
    mihoyoHandling: string
    nanokaSupport: string
  }
}

type SourceConflictAudit = {
  policy: {
    selectedSource: string
    resolutionStatus: string
    thirdPartyLookupPolicy: string
    starterScenarioImpact: {
      checkedPath: string
      checkedPattern: string
      matches: number
    }
  }
  decision: {
    selectedBy: string
    decisionRef: { target: string; messageId: string }
    decisionText: string
  }
  manualLookupSource: {
    role: string
    observedDataVersion: string
  }
  summary: {
    totalRecords: number
    resolvedPreferBuhflipexplode: number
    remainingBlockingConflicts: number
    remainingNonBlockingReleaseConflicts: number
  }
  records: AuditRecord[]
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T
}

function recordByBuffId(audit: SourceConflictAudit, buffId: string): AuditRecord {
  const record = audit.records.find(item => item.buff.buhflipexplodeBuffId === buffId)
  expect(record, `missing audit record for buff ${buffId}`).toBeDefined()
  return record!
}

describe("Mihoyo/buhflipexplode source-conflict audit", () => {
  it("resolves the three release-relevant buff conflicts to buhflipexplode", () => {
    const audit = readJson<SourceConflictAudit>(auditPath)

    expect(audit.policy).toMatchObject({
      selectedSource: "buhflipexplode-zzz-da",
      resolutionStatus: "resolved",
      starterScenarioImpact: {
        checkedPath: "docs/ux/starter-scenarios.md",
        checkedPattern: "澄意|灼冽|破招|Clarity|Blazing Chill|Interrupt",
        matches: 0,
      },
    })
    expect(audit.policy.thirdPartyLookupPolicy).toContain("manual tie-breaker evidence only")
    expect(audit.decision).toMatchObject({
      selectedBy: "@lo-user",
      decisionRef: { target: "#fairy", messageId: "0a08cfb6" },
      decisionText: "Q1，按 buhflipexplode",
    })
    expect(audit.manualLookupSource).toMatchObject({
      role: "manual-tie-breaker-only",
      observedDataVersion: "3.0.1+15390262",
    })
    expect(audit.summary).toMatchObject({
      totalRecords: 3,
      resolvedPreferBuhflipexplode: 3,
      remainingBlockingConflicts: 0,
      remainingNonBlockingReleaseConflicts: 0,
    })
    expect(audit.records.map(record => record.auditId)).toEqual([
      "da-buff-69000030-period-21-clarity",
      "da-buff-69000015-period-8-blazing-chill",
      "da-buff-69000002-period-1-interrupt",
    ])
    expect(
      audit.records.every(record =>
        record.status === "resolved-prefer-buhflipexplode"
        && record.releaseDecision.sourceForCleanedResolution === "buhflipexplode-zzz-da"
        && record.releaseDecision.mihoyoHandling === "retained-as-conflicting-source-trace"
        && record.releaseDecision.nanokaSupport === "supports-buhflipexplode",
      ),
    ).toBe(true)
  })

  it("records the buhflipexplode/nanoka values that won the audit", () => {
    const audit = readJson<SourceConflictAudit>(auditPath)

    const clarity = recordByBuffId(audit, "69000030")
    expect(clarity.buff).toMatchObject({ mihoyoName: "澄意", buhflipexplodeName: "Clarity" })
    expect(clarity.normalizedComparison.mihoyo).toMatchObject({
      critDamage: 0.3,
      sheerDamage: 0.15,
    })
    expect(clarity.normalizedComparison.buhflipexplode).toMatchObject({
      maxHp: 0.25,
      sheerDamage: 0.15,
      ruptureDamage: 0.15,
      ultimateDamage: 0.15,
    })
    expect(clarity.normalizedComparison.nanoka).toMatchObject(clarity.normalizedComparison.buhflipexplode)

    const blazingChill = recordByBuffId(audit, "69000015")
    expect(blazingChill.buff).toMatchObject({ mihoyoName: "灼冽", buhflipexplodeName: "Blazing Chill" })
    expect(blazingChill.normalizedComparison.mihoyo).toMatchObject({
      decibelsRestored: 300,
      decibelsRecoveryCooldownSeconds: null,
    })
    expect(blazingChill.normalizedComparison.buhflipexplode).toMatchObject({
      decibelsRestored: 400,
      decibelsRecoveryCooldownSeconds: 15,
      anomalyProficiency: 80,
      durationSeconds: 15,
    })
    expect(blazingChill.normalizedComparison.nanoka).toMatchObject(blazingChill.normalizedComparison.buhflipexplode)

    const interrupt = recordByBuffId(audit, "69000002")
    expect(interrupt.buff).toMatchObject({ mihoyoName: "破招", buhflipexplodeName: "Interrupt" })
    expect(interrupt.normalizedComparison.mihoyo).toMatchObject({ critDamage: 0.2 })
    expect(interrupt.normalizedComparison.buhflipexplode).toMatchObject({
      listedAttackDamage: 0.3,
      attack: 0.1,
      critDamage: 0.1,
      durationSeconds: 15,
      maxStacks: 3,
    })
    expect(interrupt.normalizedComparison.nanoka).toMatchObject(interrupt.normalizedComparison.buhflipexplode)
  })

  it("keeps the raw source-conflict trace while adding cleaned release resolution", () => {
    const raw = readJson<{ unresolved: Array<{ reason: string }> }>(rawAlignmentPath)
    const audit = readJson<SourceConflictAudit>(auditPath)

    expect(raw.unresolved.filter(issue => issue.reason === "sourceConflict")).toHaveLength(3)
    expect(audit.records.every(record => record.status === "resolved-prefer-buhflipexplode")).toBe(true)
  })

  it("keeps the synced package copy byte-identical to cleaned staging", () => {
    expect(readFileSync(packageAuditPath, "utf8")).toBe(readFileSync(auditPath, "utf8"))
  })
})
