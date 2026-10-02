import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  actionSourceSignature,
  declaredPotentialLevels,
} from "../scripts/skills/registry.ts"
import type { AgentDetails } from "../src/integration/agent-types.ts"

const read = (path: string) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"))

const registry = read("../scripts/skills/registry.json") as readonly {
  entityId?: string
  potentialLevels?: readonly number[]
}[]

const details = read(
  "../.generated/integrated/agents/1021/details.zh.json",
) as AgentDetails

const entry = registry.find(
  (item) => item.entityId === "1021" && item.potentialLevels?.includes(6),
) as Parameters<typeof declaredPotentialLevels>[1]

if (!entry) throw new Error("Missing nekomata potential registry entry")

describe("potential level mapping", () => {
  it("reads levels from the source potentialDetail instead of id suffixes", () => {
    expect(declaredPotentialLevels(details, entry)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it("refuses rows whose potential entries are missing from the source", () => {
    const withoutDetail = structuredClone(details)
    delete (withoutDetail as { potentialDetail?: unknown }).potentialDetail
    expect(() => declaredPotentialLevels(withoutDetail, entry)).toThrow(
      /Unverified potential rows/u,
    )
  })

  it("refuses potential entries whose declared level is not 1—6", () => {
    const wrongLevels = structuredClone(details)
    for (const key of Object.keys(wrongLevels.potentialDetail))
      wrongLevels.potentialDetail[key]!.level = 99
    expect(() => declaredPotentialLevels(wrongLevels, entry)).toThrow(
      /Unverified potential rows/u,
    )
  })

  it("refuses potential rows whose ids no longer resolve to a level", () => {
    const renamed = structuredClone(details)
    const firstKey = Object.keys(renamed.potentialDetail)[0]!
    const firstDetail = renamed.potentialDetail[firstKey]!
    delete renamed.potentialDetail[firstKey]
    renamed.potentialDetail["102199"] = { ...firstDetail, id: 102199 }
    expect(() => declaredPotentialLevels(renamed, entry)).toThrow(
      /Unverified potential rows/u,
    )
  })
})

describe("conditional identity passive evidence", () => {
  const identityDetails = read(
    "../.generated/integrated/agents/1381/details.zh.json",
  ) as AgentDetails

  const identityEntries = registry.filter(
    (item) => "conditionalIdentity" in item,
  ) as unknown as (Parameters<typeof actionSourceSignature>[1] & {
    readonly sourceSignature: string
  })[]

  if (identityEntries.length === 0)
    throw new Error("Missing conditional identity registry entries")

  const signatureMoves = (mutate: (details: AgentDetails) => void) =>
    identityEntries.map((entry) => {
      const mutated = structuredClone(identityDetails)
      mutate(mutated)
      return actionSourceSignature(mutated, entry) !== entry.sourceSignature
    })

  it("keeps the registered passive evidence inside the semantic signature", () => {
    for (const entry of identityEntries)
      expect(actionSourceSignature(identityDetails, entry)).toBe(
        entry.sourceSignature,
      )
  })

  it("refuses changed or missing registered passive evidence", () => {
    expect(
      signatureMoves((mutated) => {
        mutated.passive.level["1381514"]!.desc[1] += "（改动）"
      }),
    ).toEqual(identityEntries.map(() => true))
    expect(
      signatureMoves((mutated) => {
        mutated.passive.level["1381514"]!.potential = [138100]
      }),
    ).toEqual(identityEntries.map(() => true))
    for (const entry of identityEntries) {
      const mutated = structuredClone(identityDetails)
      delete mutated.passive.level["1381507"]
      expect(() => actionSourceSignature(mutated, entry)).toThrow(
        /Missing related passive evidence/u,
      )
    }
  })

  it("refuses changed potential level mappings", () => {
    expect(
      signatureMoves((mutated) => {
        mutated.potentialDetail["138100"]!.level = 3
      }),
    ).toEqual(identityEntries.map(() => true))
  })
})
