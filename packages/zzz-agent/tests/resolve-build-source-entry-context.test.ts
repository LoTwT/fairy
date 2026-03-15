import { expect, it } from "vitest"
import { resolveBuildToolSourceEntriesContext } from "../src/mastra/tools/zzz/resolve-build-source-entry-context"

it("allows utility-only source entry requests without a final panel", () => {
  const result = resolveBuildToolSourceEntriesContext({
    scenario: undefined,
    finalPanel: undefined,
  })

  expect(result.ok).toBe(true)
  if (!result.ok) return

  expect(result.context.utilityOnly).toBe(true)
  expect(result.context.scenario).toBeUndefined()
  expect(result.context.panel).toBeUndefined()
})

it("requires a full final panel for anomaly source entry requests", () => {
  const result = resolveBuildToolSourceEntriesContext({
    scenario: {
      damageType: "anomaly",
      skillTag: "special",
      damageMultiplier: 3,
      enemy: {
        defenderBaseDefense: 953,
        defenderResistance: 0.2,
      },
    },
    finalPanel: undefined,
  })

  expect(result.ok).toBe(false)
  if (result.ok) return

  expect(result.response.message).toContain("finalPanel")
})

it("normalizes non-anomaly panels with default attack crit fields", () => {
  const result = resolveBuildToolSourceEntriesContext({
    scenario: {
      damageType: "normal",
      skillTag: "basic",
      skillMultiplier: "350%",
      enemy: {
        defenderBaseDefense: 953,
        defenderResistance: 0.2,
      },
    },
    finalPanel: {
      attack: 3200,
      critRate: 0.5,
      critDamage: 1.2,
    },
  })

  expect(result.ok).toBe(true)
  if (!result.ok) return

  expect(result.context.utilityOnly).toBe(true)
  expect(result.context.panel).toEqual({
    attack: 3200,
    critRate: 0.5,
    critDamage: 1.2,
  })
})
