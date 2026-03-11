import { describe, expect, it } from "vitest"

import { resolveStaticBuildDamage } from "../../src"

describe("static build resolver", () => {
  it("resolves Zhu Yuan baseline normal damage", () => {
    const result = resolveStaticBuildDamage({
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
      scenario: {
        damageType: "normal",
        skillTag: "basic",
        skillMultiplier: "350%",
        attribute: "以太",
        combatTags: ["suppressionMode"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.profile.id).toBe("standard-normal")
    expect(result.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.4, 4)
    expect(result.resolvedBuckets.critRate).toBeCloseTo(0.15, 4)
    expect(result.resolvedPanel.attack).toBe(3200)
    expect(result.damageParams.baseDamage).toBeCloseTo(11200, 4)
    expect(
      result.trace.find((item) => item.effectId === "woodpecker-2pc-crit-rate")
        ?.status,
    ).toBe("skipped")
  })

  it("resolves Evelyn full-buff threshold effects", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1321",
        wEngineId: "14132",
        driveDiscSets: [{ id: "31100", pieces: 4 }],
        coreSkillLevel: 7,
        wEngineRefinement: 1,
      },
      panel: {
        attack: 3300,
        baseAttack: 1250,
        critRate: 0.6,
        critDamage: 1.2,
      },
      scenario: {
        damageType: "normal",
        skillTag: "chain",
        skillMultiplier: "400%",
        attribute: "火属性",
        extraAbilityActive: true,
        combatTags: ["restrained"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.resolvedPanel.critRate).toBeCloseTo(0.85, 4)
    expect(result.resolvedPanel.critDamage).toBeCloseTo(1.7, 4)
    expect(result.resolvedBuckets.ignoreResistance).toBeCloseTo(0.25, 4)
    expect(result.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.3, 4)
    expect(result.resolvedBuckets.skillMultiplierFactor).toBeCloseTo(1.25, 4)
    expect(
      result.trace.find(
        (item) => item.effectId === "evelyn-extra-high-crit-skill-multiplier",
      )?.status,
    ).toBe("applied")
  })

  it("resolves Yixuan sheer profile with HP fallback", () => {
    const result = resolveStaticBuildDamage({
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
      scenario: {
        damageType: "sheer",
        skillTag: "enhancedSpecial",
        skillMultiplier: "500%",
        attribute: "玄墨",
        extraAbilityActive: true,
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
          isStunned: true,
        },
      },
    })

    expect(result.profile.id).toBe("yixuan-sheer")
    expect(result.resolvedPanel.baseDamageStat).toBe("sheerForce")
    expect(result.resolvedPanel.baseDamageValue).toBeCloseTo(1800, 4)
    expect(result.resolvedPanel.critRate).toBeCloseTo(0.72, 4)
    expect(result.resolvedBuckets.bonusDamageSum).toBeCloseTo(1.06, 4)
    expect(result.resolvedBuckets.sheerBonusSum).toBeCloseTo(0.3, 4)
    expect(
      result.assumptions.some((item) => item.includes("生命值 × 0.1")),
    ).toBe(true)
  })

  it("resolves Soldier 11 fire-suppression build", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1041",
        wEngineId: "14104",
        driveDiscSets: [{ id: "32200", pieces: 4 }],
        coreSkillLevel: 7,
        wEngineRefinement: 1,
      },
      panel: {
        attack: 3100,
        baseAttack: 1100,
        critRate: 0.5,
        critDamage: 1.2,
      },
      scenario: {
        damageType: "normal",
        skillTag: "basic",
        skillMultiplier: "500%",
        attribute: "火属性",
        combatTags: ["fireSuppression", "burningTarget"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.profile.id).toBe("standard-normal")
    expect(result.loadout.agent.name).toBe("「11号」")
    expect(result.resolvedBuckets.attackPercent).toBeCloseTo(0.28, 4)
    expect(result.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.8, 4)
    expect(result.resolvedBuckets.critRate).toBeCloseTo(0.28, 4)
    expect(result.resolvedPanel.attack).toBeCloseTo(3408, 4)
  })

  it("resolves Harumasa dash crit profile", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1201",
        wEngineId: "14120",
        driveDiscSets: [{ id: "32400", pieces: 4 }],
        coreSkillLevel: 7,
        wEngineRefinement: 1,
      },
      panel: {
        attack: 3000,
        baseAttack: 1200,
        critRate: 0.4,
        critDamage: 1.2,
      },
      scenario: {
        damageType: "normal",
        skillTag: "dash",
        skillMultiplier: "400%",
        attribute: "电属性",
        combatTags: ["harumasaSharpness", "shockedTarget"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.loadout.agent.name).toBe("悠真")
    expect(result.resolvedPanel.critRate).toBeCloseTo(0.85, 4)
    expect(result.resolvedPanel.critDamage).toBeCloseTo(1.92, 4)
    expect(result.resolvedBuckets.attackPercent).toBeCloseTo(0.28, 4)
    expect(result.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.5, 4)
  })
})
