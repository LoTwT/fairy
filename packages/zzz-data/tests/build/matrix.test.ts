import { describe, expect, it } from "vitest"

import { resolveStaticBuildSkillMatrix } from "../../src"

describe("static build skill matrix", () => {
  it("builds Zhu Yuan full skill matrix rows", () => {
    const result = resolveStaticBuildSkillMatrix({
      loadout: {
        agentId: "1241",
        wEngineId: "14124",
        driveDiscSets: [{ id: "31000", pieces: 4 }],
        coreSkillLevel: 7,
        wEngineRefinement: 1,
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

    expect(result.profile.id).toBe("standard-normal")
    expect(result.rows).toHaveLength(21)
    expect(result.rows[0]?.label).toBe("普通攻击·一段")

    const etherBurst = result.rows.find(
      (row) => row.id === "1241-suppression-ether-3",
    )
    expect(etherBurst?.skillMultiplier).toBe("964.2%")
    expect(etherBurst?.build.damage.expected.total).toBeGreaterThan(0)
  })

  it("builds Yixuan skill matrix with sheer rows", () => {
    const result = resolveStaticBuildSkillMatrix({
      mode: "full-buff",
      loadout: {
        agentId: "1371",
        wEngineId: "14137",
        driveDiscSets: [{ id: "33100", pieces: 4 }],
        coreSkillLevel: 7,
        wEngineRefinement: 1,
      },
      panel: {
        attack: 2500,
        critRate: 0.4,
        critDamage: 1.2,
        hp: 18000,
      },
      context: {
        extraAbilityActive: true,
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
          isStunned: true,
        },
      },
    })

    expect(result.profile.id).toBe("yixuan-sheer")
    expect(result.rows).toHaveLength(22)
    expect(result.rows.every((row) => row.damageType === "sheer")).toBe(true)

    const ultimate = result.rows.find((row) => row.label === "终结技·青溟云影")
    expect(ultimate?.skillMultiplier).toBe("4380.9%")
    expect(ultimate?.build.resolvedPanel.baseDamageStat).toBe("sheerForce")
  })
})
