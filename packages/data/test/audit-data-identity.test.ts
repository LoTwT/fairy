import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  baselinePath,
  collectAuditProblems,
  findProblemDelta,
  loadAuditInputs,
  type AuditBaseline,
  type AuditInputs,
} from "../scripts/audit-data-identity.ts"

function readBaseline(): AuditBaseline {
  return JSON.parse(readFileSync(baselinePath, "utf8")) as AuditBaseline
}

function requireMappedEntity(
  inputs: AuditInputs,
  index = 0,
): {
  readonly catalogEntityId: string
  readonly status?: string
  readonly identity?: { readonly entityId?: string } | null
} {
  const entity = inputs.catalog.entities.filter(
    (candidate) =>
      candidate.status === "mapped" &&
      candidate.identity?.entityId !== undefined,
  )[index]
  if (entity === undefined) throw new Error("no mapped catalog entity")
  return entity
}

function newProblemsFor(inputs: AuditInputs) {
  return findProblemDelta(collectAuditProblems(inputs), readBaseline().problems)
    .newProblems
}

describe("data identity audit", () => {
  it("matches the committed baseline without new findings", () => {
    const problems = collectAuditProblems(loadAuditInputs())
    const delta = findProblemDelta(problems, readBaseline().problems)
    expect(delta.newProblems).toEqual([])
  })

  it("reports a newly injected identity gap as outside the baseline", () => {
    const inputs = loadAuditInputs()
    const mapped = requireMappedEntity(inputs)
    delete (inputs.identities as Record<string, string | null>)[
      mapped.catalogEntityId
    ]
    expect(newProblemsFor(inputs)).toContainEqual(
      expect.objectContaining({
        check: "identity-mapping-missing",
        id: `identity-mapping-missing/${mapped.catalogEntityId}`,
      }),
    )
  })

  it("reports an identity value that differs from the catalog entity", () => {
    const inputs = loadAuditInputs()
    const mapped = requireMappedEntity(inputs)
    const expected = mapped.identity?.entityId
    if (expected === undefined) throw new Error("mapped entity has no identity")
    const actual = `${expected}-mismatch`
    ;(inputs.identities as Record<string, string | null>)[
      mapped.catalogEntityId
    ] = actual
    expect(newProblemsFor(inputs)).toContainEqual(
      expect.objectContaining({
        check: "identity-value-mismatch",
        id: `identity-value-mismatch/${mapped.catalogEntityId}`,
        details: {
          catalogEntityId: mapped.catalogEntityId,
          expected,
          actual,
        },
      }),
    )
  })

  it("reports a mapped entity without identity.entityId", () => {
    const inputs = loadAuditInputs()
    const mapped = requireMappedEntity(inputs)
    delete (mapped as { identity?: { entityId?: string } | null }).identity
    expect(newProblemsFor(inputs)).toContainEqual(
      expect.objectContaining({
        check: "identity-entity-id-missing",
        id: `identity-entity-id-missing/${mapped.catalogEntityId}`,
        details: {
          catalogEntityId: mapped.catalogEntityId,
          status: "mapped",
        },
      }),
    )
  })

  it("reports two mapped entities sharing one Nanoka ID", () => {
    const inputs = loadAuditInputs()
    const first = requireMappedEntity(inputs)
    const second = requireMappedEntity(inputs, 1)
    const nanokaEntityId = first.identity?.entityId
    if (nanokaEntityId === undefined)
      throw new Error("mapped entity has no identity")
    ;(second as { identity?: { entityId?: string } | null }).identity = {
      entityId: nanokaEntityId,
    }
    ;(inputs.identities as Record<string, string | null>)[
      second.catalogEntityId
    ] = nanokaEntityId
    expect(newProblemsFor(inputs)).toContainEqual(
      expect.objectContaining({
        check: "identity-duplicate",
        id: `identity-duplicate/${nanokaEntityId}`,
        details: {
          nanokaEntityId,
          catalogEntityIds: [
            first.catalogEntityId,
            second.catalogEntityId,
          ].toSorted(),
        },
      }),
    )
  })
})
