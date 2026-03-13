import { describe, expect, it } from "vitest"

import {
  resolveStaticBuildTriggerMatrix,
  supportedStaticBuildTriggerMatrixAgents,
} from "../../src"

describe("static build trigger matrix", () => {
  it("exports the current trigger-matrix support scope", () => {
    expect(
      supportedStaticBuildTriggerMatrixAgents.map((item) => item.name),
    ).toEqual(expect.arrayContaining(["爱丽丝", "柏妮思", "雅", "爱芮"]))
    expect(supportedStaticBuildTriggerMatrixAgents).toHaveLength(4)
  })

  it("resolves an anomaly trigger-entry matrix for Alice", () => {
    const result = resolveStaticBuildTriggerMatrix({
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

    expect(result.rows).toHaveLength(2)
    expect(result.rows[0]).toMatchObject({
      id: "main-formula:anomaly",
      supported: true,
      metadata: {
        stableKey: "main-formula:anomaly",
        entryKind: "main-formula",
        damageType: "anomaly",
      },
    })
    expect(result.rows[1]).toMatchObject({
      id: "source-view:alice-polarity-assault",
      supported: true,
      metadata: {
        stableKey: "source-view:alice-polarity-assault",
        entryKind: "source-view",
        damageType: "anomaly",
        sourceViewId: "alice-polarity-assault",
        sourceViewResolutionMode: "standalone",
      },
    })
    expect(result.rows[1]?.damage?.expected).toBeGreaterThan(0)
  })

  it("resolves a disorder trigger-entry matrix for Aria", () => {
    const result = resolveStaticBuildTriggerMatrix({
      mode: "full-buff",
      loadout: {
        agentId: "1501",
        agentLevel: 60,
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

    expect(result.rows).toHaveLength(2)
    expect(result.rows[0]?.metadata.damageType).toBe("disorder")
    expect(result.rows[1]).toMatchObject({
      id: "source-view:aria-exflow",
      metadata: {
        entryKind: "source-view",
        sourceViewId: "aria-exflow",
        sourceViewResolutionMode: "delta",
      },
    })
    expect(
      result.rows[1]?.sourceNotes.some(
        (note) => note.owner === "dynamicSnapshot",
      ),
    ).toBe(true)
  })
})
