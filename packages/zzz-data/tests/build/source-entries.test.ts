import { describe, expect, it } from "vitest"

import { resolveStaticBuildSourceEntries } from "../../src"

describe("static build source entries", () => {
  it("returns utility-only entries without requiring a scenario", () => {
    const result = resolveStaticBuildSourceEntries({
      loadout: {
        agentId: "1021",
        wEngineId: "12003",
        wEngineRefinement: 1,
      },
    })

    expect(result.entries).toHaveLength(1)
    expect(result.entries[0]).toMatchObject({
      id: "lunar-noviluna-energy-refund",
      metadata: {
        entryKind: "source-utility-view",
        stableKey: "source-utility:lunar-noviluna-energy-refund",
      },
    })
    expect(result.assumptions).toEqual([])
  })

  it("returns utility and source-damage entries together for covered disorder loadouts", () => {
    const result = resolveStaticBuildSourceEntries({
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

    expect(result.entries).toHaveLength(2)
    expect(result.entries.map((entry) => entry.metadata.entryKind)).toEqual(
      expect.arrayContaining(["source-damage-view", "source-utility-view"]),
    )
    expect(result.entries.map((entry) => entry.id)).toEqual(
      expect.arrayContaining([
        "aria-exflow",
        "flamemaker-shaker-offfield-energy-regen",
      ]),
    )
  })

  it("keeps utility-only behavior for normal scenarios", () => {
    const result = resolveStaticBuildSourceEntries({
      loadout: {
        agentId: "1021",
        wEngineId: "12003",
        wEngineRefinement: 1,
      },
      scenario: {
        damageType: "normal",
        skillTag: "basic",
        skillMultiplier: "300%",
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.entries).toHaveLength(1)
    expect(result.entries[0]?.metadata.entryKind).toBe("source-utility-view")
    expect(result.assumptions).toContain(
      "当前 source-entry collection 在 normal / sheer 场景下只返回 utility entries，不展开 source damage views。",
    )
  })

  it("requires a full panel when collecting anomaly source entries", () => {
    expect(() =>
      resolveStaticBuildSourceEntries({
        loadout: {
          agentId: "1401",
        },
        scenario: {
          damageType: "anomaly",
          skillTag: "enhancedSpecial",
          damageMultiplier: "500%",
          attribute: "物理",
          enemy: {
            defenderBaseDefense: 953,
            defenderResistance: 0.2,
          },
        },
      }),
    ).toThrow(/panel is required/)
  })
})
