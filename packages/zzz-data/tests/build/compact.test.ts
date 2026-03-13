import { describe, expect, it } from "vitest"

import {
  compactStaticBuildSkillMatrixResult,
  compactStaticBuildSourceDamageViewsResult,
  compactStaticBuildSourceEntryCollection,
  compactStaticBuildSourceUtilityViewsResult,
  compactStaticBuildTriggerMatrixResult,
  resolveStaticBuildSkillMatrix,
  resolveStaticBuildSourceDamageViews,
  resolveStaticBuildSourceEntries,
  resolveStaticBuildSourceUtilityViews,
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
    expect(compact.rows[1]?.requirementSummary).toEqual({
      count: 2,
      satisfiedCount: 2,
      unsatisfiedCount: 0,
      hasUnsatisfied: false,
      groups: [
        {
          key: "state-flag",
          count: 1,
          satisfiedCount: 1,
          unsatisfiedCount: 0,
        },
        {
          key: "state-value",
          count: 1,
          satisfiedCount: 1,
          unsatisfiedCount: 0,
        },
      ],
    })
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
    expect(
      (damageEntry as { requirementSummary?: unknown } | undefined)
        ?.requirementSummary,
    ).toEqual({
      count: 2,
      satisfiedCount: 2,
      unsatisfiedCount: 0,
      hasUnsatisfied: false,
      groups: [
        {
          key: "dynamic-value",
          count: 2,
          satisfiedCount: 2,
          unsatisfiedCount: 0,
        },
      ],
    })
    expect("build" in (damageEntry ?? {})).toBe(false)
  })

  it("compacts source-damage views without build details by default", () => {
    const views = resolveStaticBuildSourceDamageViews({
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

    const compact = compactStaticBuildSourceDamageViewsResult(views)

    expect(compact.entries).toHaveLength(1)
    expect(compact.entries[0]?.damage?.expected).toBeGreaterThan(0)
    expect(compact.entries[0]?.requirementSummary).toEqual({
      count: 2,
      satisfiedCount: 2,
      unsatisfiedCount: 0,
      hasUnsatisfied: false,
      groups: [
        {
          key: "state-flag",
          count: 1,
          satisfiedCount: 1,
          unsatisfiedCount: 0,
        },
        {
          key: "state-value",
          count: 1,
          satisfiedCount: 1,
          unsatisfiedCount: 0,
        },
      ],
    })
    expect("build" in (compact.entries[0] ?? {})).toBe(false)
  })

  it("compacts source-utility views into the same public shape used by high-level tools", () => {
    const views = resolveStaticBuildSourceUtilityViews({
      loadout: {
        agentId: "1021",
        wEngineId: "12003",
        wEngineRefinement: 1,
      },
    })

    const compact = compactStaticBuildSourceUtilityViewsResult(views)

    expect(compact.entries).toHaveLength(1)
    expect(compact.entries[0]).toMatchObject({
      id: "lunar-noviluna-energy-refund",
      metadata: {
        entryKind: "source-utility-view",
      },
      value: 3,
      unit: "energy",
    })
  })
})
