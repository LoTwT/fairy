import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  baselinePath,
  collectAuditProblems,
  findProblemDelta,
  loadAuditInputs,
  type AuditBaseline,
} from "../scripts/audit-data-identity.ts"

function readBaseline(): AuditBaseline {
  return JSON.parse(readFileSync(baselinePath, "utf8")) as AuditBaseline
}

describe("data identity audit", () => {
  it("matches the committed baseline without new findings", () => {
    const problems = collectAuditProblems(loadAuditInputs())
    const delta = findProblemDelta(problems, readBaseline().problems)
    expect(delta.newProblems).toEqual([])
  })

  it("reports a newly injected identity gap as outside the baseline", () => {
    const inputs = loadAuditInputs()
    const mapped = inputs.catalog.entities.find(
      (entity) =>
        entity.status !== "placeholder" &&
        entity.identity?.entityId !== undefined,
    )
    if (mapped === undefined) throw new Error("no mapped catalog entity")
    delete (inputs.identities as Record<string, string>)[mapped.catalogEntityId]
    const delta = findProblemDelta(
      collectAuditProblems(inputs),
      readBaseline().problems,
    )
    expect(delta.newProblems).toContainEqual(
      expect.objectContaining({
        check: "identity-mapping-missing",
        id: `identity-mapping-missing/${mapped.catalogEntityId}`,
      }),
    )
  })
})
