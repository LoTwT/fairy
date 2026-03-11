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

  it("applies curated effects for Nekomata and Steel Cushion", () => {
    const result = resolveStaticBuildDamage({
      loadout: {
        agentId: "1021",
        wEngineId: "14102",
        driveDiscSets: [{ id: "31000", pieces: 2 }],
      },
      panel: {
        attack: 2800,
        baseAttack: 1100,
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
    })

    expect(result.profile.id).toBe("standard-normal")
    expect(result.loadout.agent.name).toBe("猫又")
    expect(result.loadout.wEngine?.name).toBe("钢铁肉垫")
    expect(result.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.2, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes("猫又 当前未收录 curated"),
      ),
    ).toBe(false)
    expect(
      result.assumptions.some((item) =>
        item.includes("钢铁肉垫 当前未收录 curated"),
      ),
    ).toBe(false)
  })

  it("applies curated effects for Zero Anby and Sacrifice Purity", () => {
    const result = resolveStaticBuildDamage({
      loadout: {
        agentId: "1381",
        wEngineId: "14138",
      },
      panel: {
        attack: 3000,
        baseAttack: 1200,
        critRate: 0.5,
        critDamage: 1.2,
      },
      scenario: {
        damageType: "normal",
        skillTag: "chain",
        skillMultiplier: "450%",
        attribute: "电属性",
        extraAbilityActive: true,
        combatTags: ["silverStarTarget", "purityBloom", "purityBloomMax"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.loadout.agent.name).toBe("零号·安比")
    expect(result.loadout.wEngine?.name).toBe("牺牲洁纯")
    expect(result.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.7, 4)
    expect(result.resolvedPanel.critRate).toBeCloseTo(0.6, 4)
    expect(result.resolvedPanel.critDamage).toBeCloseTo(1.6, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes("零号·安比 当前未收录 curated"),
      ),
    ).toBe(false)
    expect(
      result.assumptions.some((item) =>
        item.includes("牺牲洁纯 当前未收录 curated"),
      ),
    ).toBe(false)
  })

  it("applies curated effects for Hugo and Myriad Eclipse", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1291",
        wEngineId: "14129",
        coreSkillLevel: 7,
        wEngineRefinement: 1,
      },
      panel: {
        attack: 3200,
        baseAttack: 1200,
        critRate: 0.5,
        critDamage: 1.2,
      },
      scenario: {
        damageType: "normal",
        skillTag: "chain",
        skillMultiplier: "500%",
        attribute: "冰属性",
        extraAbilityActive: true,
        combatTags: ["darkAbyssEcho", "commonEnemy"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.loadout.agent.name).toBe("雨果")
    expect(result.loadout.wEngine?.name).toBe("千面日陨")
    expect(result.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.5, 4)
    expect(result.resolvedPanel.critRate).toBeCloseTo(0.62, 4)
    expect(result.resolvedPanel.critDamage).toBeCloseTo(1.9, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes("雨果 当前未收录 curated"),
      ),
    ).toBe(false)
    expect(
      result.assumptions.some((item) =>
        item.includes("千面日陨 当前未收录 curated"),
      ),
    ).toBe(false)
  })

  it("applies curated effects for Orphie and Bellicose Blaze", () => {
    const result = resolveStaticBuildDamage({
      loadout: {
        agentId: "1301",
        wEngineId: "14130",
      },
      panel: {
        attack: 3400,
        baseAttack: 1250,
        critRate: 0.45,
        critDamage: 1.2,
      },
      scenario: {
        damageType: "normal",
        skillTag: "basic",
        skillMultiplier: "420%",
        attribute: "火属性",
        combatTags: ["followUp", "crosshairFocus"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.loadout.agent.name).toBe("奥菲丝&「鬼火」")
    expect(result.loadout.wEngine?.name).toBe("嚣枪喧焰")
    expect(result.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.85, 4)
    expect(result.resolvedPanel.critRate).toBeCloseTo(0.9, 4)
    expect(result.resolvedPanel.attack).toBeCloseTo(3680, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes("奥菲丝&「鬼火」 当前未收录 curated"),
      ),
    ).toBe(false)
  })

  it("supports non-signature w-engines when specialties are compatible", () => {
    const result = resolveStaticBuildDamage({
      loadout: {
        agentId: "1021",
        wEngineId: "14001",
      },
      panel: {
        attack: 2800,
        baseAttack: 1100,
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
    })

    expect(result.loadout.agent.name).toBe("猫又")
    expect(result.loadout.wEngine?.name).toBe("加农转子")
    expect(
      result.assumptions.some((item) =>
        item.includes("加农转子 当前未收录 curated 音擎效果"),
      ),
    ).toBe(true)
  })

  it("rejects incompatible w-engine specialties", () => {
    expect(() =>
      resolveStaticBuildDamage({
        loadout: {
          agentId: "1021",
          wEngineId: "14137",
        },
        panel: {
          attack: 2800,
          baseAttack: 1100,
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

  it("supports generic rupture agents through the standard sheer profile", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1471",
        wEngineId: "14147",
        coreSkillLevel: 7,
        wEngineRefinement: 1,
      },
      panel: {
        attack: 2400,
        critRate: 0.35,
        critDamage: 1.1,
        sheerForce: 1650,
      },
      scenario: {
        damageType: "sheer",
        skillTag: "enhancedSpecial",
        skillMultiplier: "500%",
        attribute: "火属性",
        extraAbilityActive: true,
        combatTags: ["banyueCoreBuff", "mingwang", "vajraFlame"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.profile.id).toBe("standard-sheer")
    expect(result.loadout.agent.name).toBe("般岳")
    expect(result.resolvedPanel.baseDamageStat).toBe("sheerForce")
    expect(result.resolvedPanel.baseDamageValue).toBe(1650)
    expect(result.resolvedPanel.critRate).toBeCloseTo(0.55, 4)
    expect(result.resolvedPanel.critDamage).toBeCloseTo(1.46, 4)
    expect(result.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.51, 4)
    expect(result.resolvedBuckets.sheerBonusSum).toBeCloseTo(0.18, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes("般岳 当前未收录 curated"),
      ),
    ).toBe(false)
  })
})
