import { describe, expect, it } from "vitest"

import {
  compactStaticBuildSkillMatrixResult,
  compactStaticBuildSourceEntryCollection,
  compactStaticBuildTriggerMatrixResult,
  resolveStaticBuildSkillMatrix,
  resolveStaticBuildSourceEntries,
  resolveStaticBuildTriggerMatrix,
} from "../../src"

describe("static build compact helpers", () => {
  it("compacts skill matrix rows without build details by default", () => {
    const matrix = resolveStaticBuildSkillMatrix({
      loadout: {
        agentId: "1241",
        wEngineId: "14124",
      },
      panel: {
        attack: 3200,
        baseAttack: 1200,
        critRate: 0.55,
        critDamage: 1.4,
      },
      context: {
        combatTags: ["suppressionMode"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    const compact = compactStaticBuildSkillMatrixResult(matrix)

    expect(compact.rows).toHaveLength(21)
    expect(compact.rows[0]?.build).toBeUndefined()
    expect(compact.rows[0]?.damage.expected).toBeGreaterThan(0)
    expect(compact.rows[0]?.resolvedBuckets).toEqual(
      matrix.rows[0]?.resolvedBuckets,
    )
  })

  it("compacts trigger matrix rows and keeps full build only when requested", () => {
    const matrix = resolveStaticBuildTriggerMatrix({
      mode: "baseline",
      loadout: {
        agentId: "1401",
        agentLevel: 60,
      },
      panel: {
        attack: 2800,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 200,
        anomalyMastery: 180,
      },
      scenario: {
        damageType: "anomaly",
        skillTag: "enhancedSpecial",
        damageMultiplier: "500%",
        attribute: "物理",
        stateSnapshot: {
          flags: {
            alicePolarityAssaultState: true,
          },
          values: {
            alicePolarityAssaultDamageRatio: 2.5,
          },
        },
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    const compact = compactStaticBuildTriggerMatrixResult(matrix, true)

    expect(compact.rows).toHaveLength(2)
    expect(compact.rows[0]?.build).toBeTruthy()
    expect(compact.rows[1]?.metadata.entryKind).toBe("source-view")
  })

  it("compacts source-entry collections for mixed damage and utility entries", () => {
    const collection = resolveStaticBuildSourceEntries({
      mode: "full-buff",
      loadout: {
        agentId: "1501",
        wEngineId: "14117",
        agentLevel: 60,
        wEngineRefinement: 1,
      },
      panel: {
        attack: 2950,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 150,
      },
      scenario: {
        damageType: "disorder",
        skillTag: "enhancedSpecial",
        anomalyType: "ether",
        remainingTime: 5,
        attribute: "以太",
        dynamicSnapshot: {
          values: {
            ariaExflowDamageRatio: 0.45,
            ariaStunnedDamageRatio: 0.2,
          },
        },
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
          isStunned: true,
        },
      },
    })

    const compact = compactStaticBuildSourceEntryCollection(collection)

    expect(compact.summary.entryCount).toBe(2)
    expect(compact.entries.map((entry) => entry.metadata.entryKind)).toEqual(
      expect.arrayContaining(["source-damage-view", "source-utility-view"]),
    )
    const damageEntry = compact.entries.find(
      (entry) => entry.metadata.entryKind === "source-damage-view",
    )
    expect(damageEntry?.damage).toBeTruthy()
    expect("build" in (damageEntry ?? {})).toBe(false)
  })
})
