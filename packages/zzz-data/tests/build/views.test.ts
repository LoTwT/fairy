import { describe, expect, it } from "vitest"

import { resolveStaticBuildSourceDamageViews } from "../../src"

describe("static build source damage views", () => {
  it("returns an empty view list for unsupported sources within the current stage", () => {
    const result = resolveStaticBuildSourceDamageViews({
      loadout: {
        agentId: "1241",
        wEngineId: "14124",
        driveDiscSets: [{ id: "31000", pieces: 4 }],
      },
      panel: {
        attack: 3200,
        baseAttack: 1200,
        critRate: 0.55,
        critDamage: 1.4,
      },
      scenario: {
        damageType: "normal",
        skillTag: "basic",
        skillMultiplier: "350%",
        attribute: "以太",
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.mode).toBe("baseline")
    expect(result.loadout.agent.name).toBe("朱鸢")
    expect(result.entries).toEqual([])
    expect(result.assumptions).toEqual([])
  })

  it("keeps specialty compatibility checks aligned with the main resolver", () => {
    expect(() =>
      resolveStaticBuildSourceDamageViews({
        loadout: {
          agentId: "1021",
          wEngineId: "14137",
        },
        panel: {
          attack: 2800,
          critRate: 0.5,
          critDamage: 1.1,
        },
        scenario: {
          damageType: "normal",
          skillTag: "basic",
          skillMultiplier: "300%",
          attribute: "物理",
          enemy: {
            defenderBaseDefense: 953,
            defenderResistance: 0.2,
          },
        },
      }),
    ).toThrow(/incompatible/)
  })
})
