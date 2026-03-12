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
    expect(
      (result.damageParams as { baseDamage: number }).baseDamage,
    ).toBeCloseTo(11200, 4)
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
    expect(
      result.assumptions.some((item) =>
        item.includes("未提供时仅展开核心技中的基础攻击力提升"),
      ),
    ).toBe(true)
  })

  it("expands Orphie progression-aware attack bonus from energyGenerationRate", () => {
    const result = resolveStaticBuildDamage({
      loadout: {
        agentId: "1301",
        wEngineId: "14130",
        agentMindscape: 1,
        coreSkillLevel: 7,
      },
      panel: {
        attack: 3400,
        baseAttack: 1250,
        critRate: 0.45,
        critDamage: 1.2,
        energyGenerationRate: 1.9,
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

    expect(result.loadout.agentMindscape).toBe(1)
    expect(result.resolvedPanel.energyGenerationRate).toBeCloseTo(1.9, 4)
    expect(result.resolvedPanel.attack).toBeCloseTo(3740, 4)
    expect(result.resolvedBuckets.bonusDamageSum).toBeCloseTo(1.05, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes(
          "finalPanel.energyGenerationRate 展开[准星聚焦]的额外攻击力",
        ),
      ),
    ).toBe(true)
  })

  it("expands Orphie mindscape-aware static bonuses without changing contract", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1301",
        agentMindscape: 4,
        coreSkillLevel: 7,
      },
      panel: {
        attack: 3400,
        baseAttack: 1250,
        critRate: 0.45,
        critDamage: 1.2,
        energyGenerationRate: 1.9,
      },
      scenario: {
        damageType: "normal",
        skillTag: "enhancedSpecial",
        skillMultiplier: "420%",
        attribute: "火属性",
        combatTags: ["crosshairFocus", "afterUltimate"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.loadout.agentMindscape).toBe(4)
    expect(result.resolvedPanel.attack).toBeCloseTo(3990, 4)
    expect(result.resolvedPanel.critRate).toBeCloseTo(0.7, 4)
    expect(result.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.6, 4)
    expect(result.resolvedBuckets.ignoreResistance).toBeCloseTo(0.15, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes("影画2喧响值回复仍未在 static resolver 中展开"),
      ),
    ).toBe(true)
  })

  it("applies curated effects for Mato and Grill Owisp", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1441",
        wEngineId: "13144",
      },
      panel: {
        attack: 2500,
        critRate: 0.35,
        critDamage: 1.1,
        sheerForce: 1800,
      },
      scenario: {
        damageType: "sheer",
        skillTag: "basic",
        skillMultiplier: "450%",
        attribute: "火属性",
        combatTags: ["moltenEdge", "hpLoss", "hpConsumedSlash"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.loadout.agent.name).toBe("真斗")
    expect(result.loadout.wEngine?.name).toBe("燔火胧夜")
    expect(result.profile.id).toBe("standard-sheer")
    expect(result.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.35, 4)
    expect(result.resolvedPanel.critRate).toBeCloseTo(0.6, 4)
    expect(result.resolvedPanel.critDamage).toBeCloseTo(1.6, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes("真斗 当前未收录 curated"),
      ),
    ).toBe(false)
    expect(
      result.assumptions.some((item) =>
        item.includes("燔火胧夜 当前未收录 curated"),
      ),
    ).toBe(false)
  })

  it("applies curated effects for Idhari and Kraken's Cradle", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1051",
        wEngineId: "14105",
      },
      panel: {
        attack: 2600,
        critRate: 0.4,
        critDamage: 1.2,
        sheerForce: 1750,
      },
      scenario: {
        damageType: "sheer",
        skillTag: "enhancedSpecial",
        skillMultiplier: "500%",
        attribute: "冰属性",
        extraAbilityActive: true,
        combatTags: ["lowHp", "hpLoss"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.loadout.agent.name).toBe("伊德海莉")
    expect(result.loadout.wEngine?.name).toBe("海妖摇篮")
    expect(result.profile.id).toBe("standard-sheer")
    expect(result.resolvedBuckets.bonusDamageSum).toBeCloseTo(1, 4)
    expect(result.resolvedBuckets.sheerBonusSum).toBeCloseTo(0.18, 4)
    expect(result.resolvedPanel.critRate).toBeCloseTo(0.6, 4)
    expect(result.resolvedPanel.critDamage).toBeCloseTo(1.5, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes("伊德海莉 当前未收录 curated"),
      ),
    ).toBe(false)
    expect(
      result.assumptions.some((item) =>
        item.includes("海妖摇篮 当前未收录 curated"),
      ),
    ).toBe(false)
  })

  it("applies curated effects for Ye Shunguang and Cloudcleave Radiance", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1431",
        wEngineId: "14143",
      },
      panel: {
        attack: 3400,
        baseAttack: 1300,
        critRate: 0.45,
        critDamage: 1.2,
      },
      scenario: {
        damageType: "normal",
        skillTag: "ultimate",
        skillMultiplier: "700%",
        attribute: "凛刃",
        combatTags: ["hedao", "etherCurtain"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.loadout.agent.name).toBe("叶瞬光")
    expect(result.loadout.wEngine?.name).toBe("云霓孤光")
    expect(result.profile.id).toBe("standard-normal")
    expect(result.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.5, 4)
    expect(result.resolvedBuckets.ignoreResistance).toBeCloseTo(0.2, 4)
    expect(result.resolvedPanel.critRate).toBeCloseTo(0.75, 4)
    expect(result.resolvedPanel.critDamage).toBeCloseTo(1.45, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes("叶瞬光 当前未收录 curated"),
      ),
    ).toBe(false)
    expect(
      result.assumptions.some((item) =>
        item.includes("云霓孤光 当前未收录 curated"),
      ),
    ).toBe(false)
  })

  it("applies curated effects for Xisifu and Fanged Trace", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1521",
        wEngineId: "14152",
      },
      panel: {
        attack: 3200,
        baseAttack: 1200,
        critRate: 0.45,
        critDamage: 1.2,
      },
      scenario: {
        damageType: "normal",
        skillTag: "basic",
        skillMultiplier: "400%",
        attribute: "电属性",
        extraAbilityActive: true,
        combatTags: ["toxin"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.loadout.agent.name).toBe("希希芙")
    expect(result.loadout.wEngine?.name).toBe("鳞齿寻踪")
    expect(result.resolvedPanel.critRate).toBeCloseTo(0.7, 4)
    expect(result.resolvedPanel.critDamage).toBeCloseTo(1.7, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes("希希芙 当前未收录 curated"),
      ),
    ).toBe(false)
    expect(
      result.assumptions.some((item) =>
        item.includes("鳞齿寻踪 当前未收录 curated"),
      ),
    ).toBe(false)
  })

  it("applies curated effects for Sid and Machinaseed", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1461",
        wEngineId: "14146",
      },
      panel: {
        attack: 3300,
        baseAttack: 1250,
        critRate: 0.45,
        critDamage: 1.2,
      },
      scenario: {
        damageType: "normal",
        skillTag: "basic",
        skillMultiplier: "400%",
        attribute: "电属性",
        extraAbilityActive: true,
        combatTags: ["raidState", "encirclement"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.loadout.agent.name).toBe("「席德」")
    expect(result.loadout.wEngine?.name).toBe("机巧心种")
    expect(result.resolvedPanel.attack).toBeCloseTo(4300, 4)
    expect(result.resolvedPanel.critRate).toBeCloseTo(0.6, 4)
    expect(result.resolvedPanel.critDamage).toBeCloseTo(1.5, 4)
    expect(result.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.8, 4)
    expect(result.resolvedBuckets.ignoreResistance).toBeCloseTo(0.25, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes("「席德」 当前未收录 curated"),
      ),
    ).toBe(false)
    expect(
      result.assumptions.some((item) =>
        item.includes("机巧心种 当前未收录 curated"),
      ),
    ).toBe(false)
  })

  it("supports non-signature w-engines when specialties are compatible", () => {
    const result = resolveStaticBuildDamage({
      loadout: {
        agentId: "1021",
        wEngineId: "14001",
        wEngineRefinement: 1,
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
    expect(result.resolvedBuckets.attackPercent).toBeCloseTo(0.075, 4)
    expect(result.resolvedPanel.attack).toBeCloseTo(2882.5, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes("加农转子 当前未收录 curated 音擎效果"),
      ),
    ).toBe(false)
    expect(
      result.sourceNotes.some(
        (item) =>
          item.sourceType === "w-engine" &&
          item.sourceId === "14001" &&
          item.status === "process-only" &&
          item.guidance.kind === "keep-process-only",
      ),
    ).toBe(true)
  })

  it("applies curated attack generic w-engine effects for Gilded Blossom", () => {
    const result = resolveStaticBuildDamage({
      loadout: {
        agentId: "1021",
        wEngineId: "13013",
        wEngineRefinement: 1,
      },
      panel: {
        attack: 2800,
        baseAttack: 1100,
        critRate: 0.5,
        critDamage: 1.1,
      },
      scenario: {
        damageType: "normal",
        skillTag: "enhancedSpecial",
        skillMultiplier: "300%",
        attribute: "物理",
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.loadout.wEngine?.name).toBe("鎏金花信")
    expect(result.resolvedBuckets.attackPercent).toBeCloseTo(0.06, 4)
    expect(result.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.15, 4)
    expect(result.resolvedPanel.attack).toBeCloseTo(2866, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes("鎏金花信 当前未收录 curated"),
      ),
    ).toBe(false)
  })

  it("applies curated attack generic w-engine effects for Starlight Engine", () => {
    const result = resolveStaticBuildDamage({
      loadout: {
        agentId: "1021",
        wEngineId: "13004",
        wEngineRefinement: 1,
      },
      panel: {
        attack: 2800,
        baseAttack: 1100,
        critRate: 0.5,
        critDamage: 1.1,
      },
      scenario: {
        damageType: "normal",
        skillTag: "assist",
        skillMultiplier: "300%",
        attribute: "物理",
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.loadout.wEngine?.name).toBe("星徽引擎")
    expect(result.resolvedBuckets.attackPercent).toBeCloseTo(0.12, 4)
    expect(result.resolvedPanel.attack).toBeCloseTo(2932, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes("星徽引擎 当前未收录 curated"),
      ),
    ).toBe(false)
  })

  it("applies curated attack generic w-engine effects for Moon Phase variants", () => {
    const obscure = resolveStaticBuildDamage({
      loadout: {
        agentId: "1021",
        wEngineId: "12002",
        wEngineRefinement: 1,
      },
      panel: {
        attack: 2800,
        baseAttack: 1100,
        critRate: 0.5,
        critDamage: 1.1,
      },
      scenario: {
        damageType: "normal",
        skillTag: "chain",
        skillMultiplier: "300%",
        attribute: "物理",
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })
    const full = resolveStaticBuildDamage({
      loadout: {
        agentId: "1021",
        wEngineId: "12001",
        wEngineRefinement: 1,
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

    expect(obscure.loadout.wEngine?.name).toBe("「月相」-晦")
    expect(obscure.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.15, 4)
    expect(full.loadout.wEngine?.name).toBe("「月相」-望")
    expect(full.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.12, 4)
  })

  it("applies partial curated rupture generic w-engine effects for Puzzle Sphere", () => {
    const regular = resolveStaticBuildDamage({
      loadout: {
        agentId: "1471",
        wEngineId: "13012",
        wEngineRefinement: 1,
      },
      panel: {
        attack: 2400,
        baseAttack: 1000,
        critRate: 0.35,
        critDamage: 1.1,
        sheerForce: 1650,
      },
      scenario: {
        damageType: "sheer",
        skillTag: "enhancedSpecial",
        skillMultiplier: "500%",
        attribute: "火属性",
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })
    const lowHp = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1471",
        wEngineId: "13012",
        wEngineRefinement: 1,
      },
      panel: {
        attack: 2400,
        baseAttack: 1000,
        critRate: 0.35,
        critDamage: 1.1,
        sheerForce: 1650,
      },
      scenario: {
        damageType: "sheer",
        skillTag: "enhancedSpecial",
        skillMultiplier: "500%",
        attribute: "火属性",
        combatTags: ["lowHp"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(regular.loadout.wEngine?.name).toBe("幻变魔方")
    expect(regular.resolvedBuckets.critDamage).toBeCloseTo(0.16, 4)
    expect(regular.resolvedBuckets.bonusDamageSum).toBe(0)
    expect(
      regular.assumptions.some((item) =>
        item.includes("幻变魔方 当前未收录 curated"),
      ),
    ).toBe(false)

    expect(lowHp.resolvedBuckets.critDamage).toBeCloseTo(0.16, 4)
    expect(lowHp.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.2, 4)
  })

  it("applies curated attack generic w-engine effects for Marcato Desire", () => {
    const regular = resolveStaticBuildDamage({
      loadout: {
        agentId: "1021",
        wEngineId: "13015",
        wEngineRefinement: 1,
      },
      panel: {
        attack: 2800,
        baseAttack: 1100,
        critRate: 0.5,
        critDamage: 1.1,
      },
      scenario: {
        damageType: "normal",
        skillTag: "enhancedSpecial",
        skillMultiplier: "300%",
        attribute: "物理",
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })
    const anomalousTarget = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1021",
        wEngineId: "13015",
        wEngineRefinement: 1,
      },
      panel: {
        attack: 2800,
        baseAttack: 1100,
        critRate: 0.5,
        critDamage: 1.1,
      },
      scenario: {
        damageType: "normal",
        skillTag: "chain",
        skillMultiplier: "300%",
        attribute: "物理",
        combatTags: ["targetAnomalous"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(regular.loadout.wEngine?.name).toBe("强音热望")
    expect(regular.resolvedBuckets.attackPercent).toBeCloseTo(0.06, 4)
    expect(regular.resolvedPanel.attack).toBeCloseTo(2866, 4)
    expect(
      regular.assumptions.some((item) =>
        item.includes("强音热望 当前未收录 curated"),
      ),
    ).toBe(false)

    expect(anomalousTarget.resolvedBuckets.attackPercent).toBeCloseTo(0.12, 4)
    expect(anomalousTarget.resolvedPanel.attack).toBeCloseTo(2932, 4)
  })

  it("applies curated attack generic w-engine effects for Street Superstar", () => {
    const baseline = resolveStaticBuildDamage({
      loadout: {
        agentId: "1021",
        wEngineId: "13001",
        wEngineRefinement: 1,
      },
      panel: {
        attack: 2800,
        baseAttack: 1100,
        critRate: 0.5,
        critDamage: 1.1,
      },
      scenario: {
        damageType: "normal",
        skillTag: "ultimate",
        skillMultiplier: "300%",
        attribute: "物理",
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })
    const fullBuff = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1021",
        wEngineId: "13001",
        wEngineRefinement: 1,
      },
      panel: {
        attack: 2800,
        baseAttack: 1100,
        critRate: 0.5,
        critDamage: 1.1,
      },
      scenario: {
        damageType: "normal",
        skillTag: "ultimate",
        skillMultiplier: "300%",
        attribute: "物理",
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(baseline.loadout.wEngine?.name).toBe("街头巨星")
    expect(baseline.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.15, 4)
    expect(fullBuff.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.45, 4)
    expect(
      fullBuff.assumptions.some((item) =>
        item.includes("街头巨星 当前未收录 curated"),
      ),
    ).toBe(false)
  })

  it("applies curated rupture generic w-engine effects for Qingyi Cauldron", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1471",
        wEngineId: "13019",
        wEngineRefinement: 1,
      },
      panel: {
        attack: 2400,
        baseAttack: 1000,
        critRate: 0.35,
        critDamage: 1.1,
        sheerForce: 1650,
      },
      scenario: {
        damageType: "sheer",
        skillTag: "enhancedSpecial",
        skillMultiplier: "500%",
        attribute: "火属性",
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.loadout.wEngine?.name).toBe("青漪灵鼎")
    expect(result.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.12, 4)
    expect(result.resolvedPanel.critRate).toBeCloseTo(0.415, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes("青漪灵鼎 当前未收录 curated"),
      ),
    ).toBe(false)
  })

  it("applies curated rupture generic w-engine effects for Electro Walk and refines Ash Cobalt into source-aware unsupported notes", () => {
    const electroWalk = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1471",
        wEngineId: "13014",
        wEngineRefinement: 1,
      },
      panel: {
        attack: 2400,
        baseAttack: 1000,
        critRate: 0.35,
        critDamage: 1.1,
        sheerForce: 1650,
      },
      scenario: {
        damageType: "sheer",
        skillTag: "basic",
        skillMultiplier: "500%",
        attribute: "火属性",
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })
    const ashCobalt = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1471",
        wEngineId: "12015",
        wEngineRefinement: 1,
      },
      panel: {
        attack: 2400,
        baseAttack: 1000,
        critRate: 0.35,
        critDamage: 1.1,
        sheerForce: 1650,
      },
      scenario: {
        damageType: "sheer",
        skillTag: "basic",
        skillMultiplier: "500%",
        attribute: "火属性",
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(electroWalk.loadout.wEngine?.name).toBe("电波漫步")
    expect(electroWalk.resolvedBuckets.penetrationValue).toBe(240)
    expect(ashCobalt.loadout.wEngine?.name).toBe("「灰烬」-钴蓝")
    expect(ashCobalt.resolvedBuckets.attackPercent).toBe(0)
    expect(
      ashCobalt.unsupportedEffects.some((item) =>
        item.includes("当前 profile 不使用攻击力作为基础乘区"),
      ),
    ).toBe(true)
    expect(
      ashCobalt.assumptions.some(
        (item) => item.includes("灰烬") && item.includes("未收录 curated"),
      ),
    ).toBe(false)
  })

  it("applies curated anomaly generic w-engine effects for Electromag variants", () => {
    const mastery = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1181",
        wEngineId: "12010",
        agentLevel: 60,
        wEngineRefinement: 1,
      },
      panel: {
        attack: 3000,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 120,
      },
      scenario: {
        damageType: "anomaly",
        skillTag: "enhancedSpecial",
        damageMultiplier: "500%",
        attribute: "电属性",
        combatTags: ["anomalyApplied"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })
    const proficiency = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1181",
        wEngineId: "12011",
        agentLevel: 60,
        wEngineRefinement: 1,
      },
      panel: {
        attack: 3000,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 120,
      },
      scenario: {
        damageType: "anomaly",
        skillTag: "enhancedSpecial",
        damageMultiplier: "500%",
        attribute: "电属性",
        combatTags: ["anomalyApplied"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(mastery.loadout.wEngine?.name).toBe("「电磁暴」-壹式")
    expect(mastery.resolvedPanel.anomalyMastery).toBe(25)
    expect(proficiency.loadout.wEngine?.name).toBe("「电磁暴」-贰式")
    expect(proficiency.resolvedBuckets.anomalyProficiency).toBe(25)
    expect(proficiency.resolvedPanel.anomalyProficiency).toBeCloseTo(145, 4)
  })

  it("records unsupported-effect diagnostics when attack percent buffs need baseAttack", () => {
    const result = resolveStaticBuildDamage({
      mode: "baseline",
      loadout: {
        agentId: "1041",
        wEngineId: "14104",
      },
      panel: {
        attack: 3100,
        critRate: 0.5,
        critDamage: 1.2,
      },
      scenario: {
        damageType: "normal",
        skillTag: "basic",
        skillMultiplier: "500%",
        attribute: "火属性",
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(
      result.unsupportedEffects.some((item) =>
        item.includes("缺少 finalPanel.baseAttack"),
      ),
    ).toBe(true)
    expect(
      result.diagnostics.some(
        (item) =>
          item.kind === "unsupported-effect" &&
          item.owner === "finalPanel" &&
          item.sourceType === "w-engine" &&
          item.sourceId === "14104" &&
          item.keys.includes("finalPanel.baseAttack") &&
          item.message.includes("缺少 finalPanel.baseAttack"),
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

  it("resolves anomaly damage with anomaly buckets and agent level", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1181",
        wEngineId: "14118",
        driveDiscSets: [{ id: "31300", pieces: 2 }],
        agentLevel: 60,
        wEngineRefinement: 1,
      },
      panel: {
        attack: 3000,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 120,
      },
      scenario: {
        damageType: "anomaly",
        skillTag: "enhancedSpecial",
        damageMultiplier: "500%",
        attribute: "电属性",
        extraAbilityActive: true,
        combatTags: ["graceShockPrepared"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.profile.id).toBe("standard-anomaly")
    expect(result.loadout.agent.name).toBe("格莉丝")
    expect(result.loadout.wEngine?.name).toBe("嵌合编译器")
    expect(result.resolvedPanel.agentLevel).toBe(60)
    expect(result.resolvedPanel.attack).toBeCloseTo(3144, 4)
    expect(result.resolvedPanel.anomalyProficiency).toBeCloseTo(225, 4)
    expect(result.resolvedBuckets.attackPercent).toBeCloseTo(0.12, 4)
    expect(result.resolvedBuckets.anomalyBonusDamageSum).toBeCloseTo(0.36, 4)
    expect(result.resolvedBuckets.anomalyProficiency).toBeCloseTo(105, 4)
    expect(
      (result.damageParams as { virtualAgentLevel: number }).virtualAgentLevel,
    ).toBe(60)
    expect(
      (result.damageParams as { virtualAgentAttack: number })
        .virtualAgentAttack,
    ).toBeCloseTo(3144, 4)
    expect(
      (
        result.damageParams as {
          virtualAgentAnomalyProficiency: number
        }
      ).virtualAgentAnomalyProficiency,
    ).toBeCloseTo(225, 4)
    expect(result.damage.expected.total).toBeGreaterThan(0)
    expect(
      result.assumptions.some((item) =>
        item.includes("格莉丝 当前未收录 curated"),
      ),
    ).toBe(false)
  })

  it("expands Grace m2 electric resistance reduction on grenade-hit targets", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1181",
        wEngineId: "14118",
        agentLevel: 60,
        agentMindscape: 2,
        wEngineRefinement: 1,
      },
      panel: {
        attack: 3000,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 120,
      },
      scenario: {
        damageType: "anomaly",
        skillTag: "enhancedSpecial",
        damageMultiplier: "500%",
        attribute: "电属性",
        extraAbilityActive: true,
        combatTags: ["graceShockPrepared", "graceGrenadeHitTarget"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.loadout.agentMindscape).toBe(2)
    expect(result.resolvedBuckets.resistanceReduction).toBeCloseTo(0.085, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes('combatTags: ["graceGrenadeHitTarget"]'),
      ),
    ).toBe(true)
  })

  it("records Grace m2 anomaly multiplier snapshots through resolvedSnapshot", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1181",
        wEngineId: "14118",
        agentLevel: 60,
        agentMindscape: 2,
        wEngineRefinement: 1,
      },
      panel: {
        attack: 3000,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 120,
      },
      scenario: {
        damageType: "anomaly",
        skillTag: "enhancedSpecial",
        damageMultiplier: "500%",
        attribute: "电属性",
        resolvedSnapshot: {
          multiplierFactors: {
            skillMultiplierFactor: 1.25,
          },
        },
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.resolvedBuckets.skillMultiplierFactor).toBeCloseTo(1.25, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes(
          '格莉丝的影画2当前可通过 combatTags: ["graceGrenadeHitTarget"] 显式展开电抗降低；[电能]层数获取与消耗仍属于状态 / 过程问题，电属性异常积蓄效率折算后的最终异常倍率已按 scenario.resolvedSnapshot.multiplierFactors.skillMultiplierFactor 记录。',
        ),
      ),
    ).toBe(true)
  })

  it("resolves disorder damage for anomaly agents", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1181",
        wEngineId: "14118",
        driveDiscSets: [{ id: "31300", pieces: 2 }],
        agentLevel: 60,
        wEngineRefinement: 1,
      },
      panel: {
        attack: 3000,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 120,
      },
      scenario: {
        damageType: "disorder",
        skillTag: "enhancedSpecial",
        anomalyType: "electric",
        remainingTime: 5,
        attribute: "电属性",
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.profile.id).toBe("standard-disorder")
    expect((result.damageParams as { anomalyType: string }).anomalyType).toBe(
      "electric",
    )
    expect(
      (result.damageParams as { remainingTime: number }).remainingTime,
    ).toBe(5)
    expect(result.resolvedPanel.anomalyProficiency).toBeCloseTo(225, 4)
    expect(result.damage.expected.total).toBeGreaterThan(0)
  })

  it("applies curated anomaly crit effects for Jane and Sharpened Stinger", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1261",
        wEngineId: "14126",
        agentLevel: 60,
        coreSkillLevel: 7,
        wEngineRefinement: 1,
      },
      panel: {
        attack: 3000,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 180,
      },
      scenario: {
        damageType: "anomaly",
        skillTag: "dash",
        damageMultiplier: "500%",
        attribute: "物理",
        extraAbilityActive: true,
        combatTags: ["gnawedTarget"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.loadout.agent.name).toBe("简")
    expect(result.loadout.wEngine?.name).toBe("淬锋钳刺")
    expect(result.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.36, 4)
    expect(result.resolvedBuckets.anomalyCritRate).toBeCloseTo(0.688, 4)
    expect(result.resolvedBuckets.anomalyCritDamage).toBeCloseTo(0.5, 4)
    expect(
      result.assumptions.some((item) => item.includes("简 当前未收录 curated")),
    ).toBe(false)
    expect(
      result.assumptions.some((item) =>
        item.includes("淬锋钳刺 当前未收录 curated"),
      ),
    ).toBe(false)
  })

  it("expands Jane mindscape-aware anomaly bonuses on gnawed targets", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1261",
        wEngineId: "14126",
        agentLevel: 60,
        agentMindscape: 4,
        coreSkillLevel: 7,
        wEngineRefinement: 1,
      },
      panel: {
        attack: 3000,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 180,
      },
      scenario: {
        damageType: "anomaly",
        skillTag: "dash",
        damageMultiplier: "500%",
        attribute: "物理",
        extraAbilityActive: true,
        combatTags: ["gnawedTarget", "assaultOrDisorderTriggered"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.loadout.agentMindscape).toBe(4)
    expect(result.resolvedBuckets.anomalyCritRate).toBeCloseTo(0.688, 4)
    expect(result.resolvedBuckets.defenseReduction).toBeCloseTo(0.15, 4)
    expect(result.resolvedBuckets.anomalyCritDamage).toBeCloseTo(1, 4)
    expect(result.resolvedBuckets.anomalyBonusDamageSum).toBeCloseTo(0.18, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes("影画4当前已支持[强击]/[紊乱]后异常伤害提升"),
      ),
    ).toBe(true)
  })

  it("expands Jane m1 frenzy anomaly proficiency scaling into bonus damage", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1261",
        wEngineId: "14126",
        agentLevel: 60,
        agentMindscape: 1,
        coreSkillLevel: 7,
        wEngineRefinement: 1,
      },
      panel: {
        attack: 3000,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 180,
      },
      scenario: {
        damageType: "anomaly",
        skillTag: "dash",
        damageMultiplier: "500%",
        attribute: "物理",
        extraAbilityActive: true,
        combatTags: ["gnawedTarget", "janeFrenzy"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.loadout.agentMindscape).toBe(1)
    expect(result.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.54, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes('combatTags: ["janeFrenzy"]'),
      ),
    ).toBe(true)
  })

  it("records Jane anomaly buildup multipliers through resolvedSnapshot", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1261",
        wEngineId: "14126",
        agentLevel: 60,
        coreSkillLevel: 7,
        wEngineRefinement: 1,
      },
      panel: {
        attack: 3000,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 180,
      },
      scenario: {
        damageType: "anomaly",
        skillTag: "dash",
        damageMultiplier: "500%",
        attribute: "物理",
        resolvedSnapshot: {
          multiplierFactors: {
            skillMultiplierFactor: 1.4,
          },
        },
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.resolvedBuckets.skillMultiplierFactor).toBeCloseTo(1.4, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes(
          '简的每点异常精通追加异常暴击率当前已自动折算；影画1的[狂热]状态异常精通转增伤当前可通过 combatTags: ["janeFrenzy"] 静态展开；[狂热]进入 / 退出属于状态问题，物理异常积蓄效率折算后的最终异常倍率已按 scenario.resolvedSnapshot.multiplierFactors.skillMultiplierFactor 记录。',
        ),
      ),
    ).toBe(true)
  })

  it("applies curated disorder effects for Yanagi and Timeweaver", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1221",
        wEngineId: "14122",
        agentLevel: 60,
        coreSkillLevel: 7,
        wEngineRefinement: 1,
      },
      panel: {
        attack: 3100,
        baseAttack: 1250,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 320,
      },
      scenario: {
        damageType: "disorder",
        skillTag: "enhancedSpecial",
        anomalyType: "electric",
        remainingTime: 5,
        attribute: "电属性",
        extraAbilityActive: true,
        combatTags: ["yanagiMoonEclipse", "targetAnomalous"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.loadout.agent.name).toBe("柳")
    expect(result.loadout.wEngine?.name).toBe("时流贤者")
    expect(result.profile.id).toBe("standard-disorder")
    expect(result.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.2, 4)
    expect(result.resolvedBuckets.anomalyBonusDamageSum).toBeCloseTo(2.75, 4)
    expect(result.resolvedBuckets.anomalyProficiency).toBeCloseTo(75, 4)
    expect(
      result.assumptions.some((item) => item.includes("柳 当前未收录 curated")),
    ).toBe(false)
    expect(
      result.assumptions.some((item) =>
        item.includes("时流贤者 当前未收录 curated"),
      ),
    ).toBe(false)
  })

  it("expands Yanagi mindscape-aware anomaly proficiency and penetration", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1221",
        wEngineId: "14122",
        agentLevel: 60,
        agentMindscape: 4,
        coreSkillLevel: 7,
        wEngineRefinement: 1,
      },
      panel: {
        attack: 3100,
        baseAttack: 1250,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 320,
      },
      scenario: {
        damageType: "disorder",
        skillTag: "enhancedSpecial",
        anomalyType: "electric",
        remainingTime: 5,
        attribute: "电属性",
        extraAbilityActive: true,
        combatTags: [
          "yanagiMoonEclipse",
          "targetAnomalous",
          "yanagiInsight",
          "yanagiRecognizedTarget",
        ],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.loadout.agentMindscape).toBe(4)
    expect(result.resolvedBuckets.anomalyProficiency).toBeCloseTo(155, 4)
    expect(result.resolvedBuckets.penetrationRate).toBeCloseTo(0.16, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes("影画4当前已支持[识破]目标的穿透率提升"),
      ),
    ).toBe(true)
  })

  it("records Timeweaver anomaly multiplier snapshots through resolvedSnapshot", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1221",
        wEngineId: "14122",
        agentLevel: 60,
        coreSkillLevel: 7,
        wEngineRefinement: 1,
      },
      panel: {
        attack: 3100,
        baseAttack: 1250,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 320,
      },
      scenario: {
        damageType: "disorder",
        skillTag: "enhancedSpecial",
        anomalyType: "electric",
        remainingTime: 5,
        attribute: "电属性",
        resolvedSnapshot: {
          multiplierFactors: {
            skillMultiplierFactor: 1.3,
          },
        },
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.resolvedBuckets.skillMultiplierFactor).toBeCloseTo(1.3, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes(
          "时流贤者的电属性异常积蓄效率折算后的最终倍率已按 scenario.resolvedSnapshot.multiplierFactors.skillMultiplierFactor 记录",
        ),
      ),
    ).toBe(true)
  })

  it("expands Yanagi m2 extra-thrust disorder scaling", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1221",
        wEngineId: "14122",
        agentLevel: 60,
        agentMindscape: 2,
        coreSkillLevel: 7,
        wEngineRefinement: 1,
      },
      panel: {
        attack: 3100,
        baseAttack: 1250,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 320,
      },
      scenario: {
        damageType: "disorder",
        skillTag: "enhancedSpecial",
        anomalyType: "electric",
        remainingTime: 5,
        attribute: "电属性",
        extraAbilityActive: true,
        combatTags: ["yanagiMoonEclipse", "yanagiExtraThrustDisorder"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.loadout.agentMindscape).toBe(2)
    expect(result.resolvedBuckets.anomalyBonusDamageSum).toBeCloseTo(
      2.5 + (20 / 15 - 1) + 2,
      4,
    )
    expect(
      result.assumptions.some((item) =>
        item.includes('combatTags: ["yanagiExtraThrustDisorder"]'),
      ),
    ).toBe(true)
  })

  it("records Yanagi m2 anomaly multiplier snapshots through resolvedSnapshot", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1221",
        wEngineId: "14122",
        agentLevel: 60,
        agentMindscape: 2,
        coreSkillLevel: 7,
        wEngineRefinement: 1,
      },
      panel: {
        attack: 3100,
        baseAttack: 1250,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 320,
      },
      scenario: {
        damageType: "disorder",
        skillTag: "enhancedSpecial",
        anomalyType: "electric",
        remainingTime: 5,
        attribute: "电属性",
        resolvedSnapshot: {
          multiplierFactors: {
            skillMultiplierFactor: 1.35,
          },
        },
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.resolvedBuckets.skillMultiplierFactor).toBeCloseTo(1.35, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes(
          '柳的影画2当前可通过 combatTags: ["yanagiExtraThrustDisorder"] 显式展开[极性紊乱]倍率提升',
        ),
      ),
    ).toBe(true)
    expect(
      result.assumptions.some((item) =>
        item.includes(
          "scenario.resolvedSnapshot.multiplierFactors.skillMultiplierFactor 记录",
        ),
      ),
    ).toBe(true)
    expect(
      result.assumptions.some((item) =>
        item.includes("能量消耗仍未在 static resolver 中展开"),
      ),
    ).toBe(true)
  })

  it("applies curated anomaly proficiency effects for Aria and Soul Shell", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1501",
        wEngineId: "14150",
        agentLevel: 60,
        coreSkillLevel: 7,
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
        damageType: "anomaly",
        skillTag: "enhancedSpecial",
        damageMultiplier: "520%",
        attribute: "以太",
        combatTags: ["targetAnomalous"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.loadout.agent.name).toBe("爱芮")
    expect(result.loadout.wEngine?.name).toBe("壳中之灵")
    expect(result.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.2, 4)
    expect(result.resolvedBuckets.anomalyBonusDamageSum).toBeCloseTo(0.1, 4)
    expect(result.resolvedBuckets.anomalyProficiency).toBeCloseTo(180, 4)
    expect(result.resolvedPanel.anomalyProficiency).toBeCloseTo(330, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes("爱芮 当前未收录 curated"),
      ),
    ).toBe(false)
    expect(
      result.assumptions.some((item) =>
        item.includes("壳中之灵 当前未收录 curated"),
      ),
    ).toBe(false)
    expect(
      result.assumptions.some((item) => item.includes("ariaExflowDamageRatio")),
    ).toBe(true)
  })

  it("expands Aria mindscape-aware anomaly crit and defense penetration", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1501",
        wEngineId: "14150",
        agentLevel: 60,
        agentMindscape: 2,
        coreSkillLevel: 7,
        wEngineRefinement: 1,
      },
      panel: {
        attack: 2950,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 150,
        anomalyMastery: 130,
      },
      scenario: {
        damageType: "disorder",
        skillTag: "enhancedSpecial",
        anomalyType: "侵蚀",
        remainingTime: 5,
        attribute: "以太",
        combatTags: ["targetAnomalous", "ariaDreamtime"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.loadout.agentMindscape).toBe(2)
    expect(result.resolvedBuckets.anomalyCritRate).toBeCloseTo(0.4, 4)
    expect(result.resolvedBuckets.anomalyCritDamage).toBeCloseTo(0.25, 4)
    expect(result.resolvedBuckets.defenseReduction).toBeCloseTo(0.24, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes('combatTags: ["ariaDreamtime"]'),
      ),
    ).toBe(true)
  })

  it("applies Aria dynamic snapshot exflow ratios to anomaly/disorder damage", () => {
    const result = resolveStaticBuildDamage({
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

    expect(result.resolvedBuckets.anomalyBonusDamageSum).toBeCloseTo(0.65, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes("scenario.dynamicSnapshot.values.ariaExflowDamageRatio"),
      ),
    ).toBe(true)
    expect(
      result.assumptions.some((item) =>
        item.includes("scenario.dynamicSnapshot.values.ariaStunnedDamageRatio"),
      ),
    ).toBe(true)
  })

  it("applies curated anomaly bonus for Piper with anomaly-compatible engines", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1281",
        wEngineId: "13009",
        agentLevel: 60,
        wEngineRefinement: 1,
      },
      panel: {
        attack: 2800,
        baseAttack: 1100,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 120,
      },
      scenario: {
        damageType: "anomaly",
        skillTag: "enhancedSpecial",
        damageMultiplier: "480%",
        attribute: "物理",
        extraAbilityActive: true,
        combatTags: ["piperOverdrive", "targetAnomalous"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.loadout.agent.name).toBe("派派")
    expect(result.loadout.wEngine?.name).toBe("触电唇彩")
    expect(result.resolvedBuckets.attackPercent).toBeCloseTo(0.1, 4)
    expect(result.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.33, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes("派派 当前未收录 curated"),
      ),
    ).toBe(false)
    expect(
      result.assumptions.some((item) =>
        item.includes("触电唇彩 当前未收录 curated"),
      ),
    ).toBe(false)
  })

  it("records Piper anomaly multiplier snapshots through resolvedSnapshot", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1281",
        wEngineId: "13009",
        agentLevel: 60,
        wEngineRefinement: 1,
      },
      panel: {
        attack: 2800,
        baseAttack: 1100,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 120,
      },
      scenario: {
        damageType: "anomaly",
        skillTag: "enhancedSpecial",
        damageMultiplier: "480%",
        attribute: "物理",
        resolvedSnapshot: {
          multiplierFactors: {
            skillMultiplierFactor: 1.2,
          },
        },
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.resolvedBuckets.skillMultiplierFactor).toBeCloseTo(1.2, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes(
          "派派的[动力]层数获取与消耗属于状态 / 过程问题；其对应的物理异常积蓄效率折算后的最终异常倍率已按 scenario.resolvedSnapshot.multiplierFactors.skillMultiplierFactor 记录。",
        ),
      ),
    ).toBe(true)
  })

  it("refines Vivian disorder bonus by disorder source type", () => {
    const baseInput = {
      mode: "full-buff" as const,
      loadout: {
        agentId: "1331",
        wEngineId: "14133",
        agentLevel: 60,
        wEngineRefinement: 1,
      },
      panel: {
        attack: 3000,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 180,
      },
      scenario: {
        damageType: "disorder" as const,
        skillTag: "basic" as const,
        remainingTime: 5,
        attribute: "以太" as const,
        extraAbilityActive: true,
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    }

    const etherResult = resolveStaticBuildDamage({
      ...baseInput,
      scenario: {
        ...baseInput.scenario,
        anomalyType: "ether",
      },
    })
    const electricResult = resolveStaticBuildDamage({
      ...baseInput,
      scenario: {
        ...baseInput.scenario,
        anomalyType: "electric",
      },
    })

    expect(etherResult.resolvedBuckets.anomalyBonusDamageSum).toBeCloseTo(
      0.12,
      4,
    )
    expect(electricResult.resolvedBuckets.anomalyBonusDamageSum).toBeCloseTo(
      0,
      4,
    )
  })

  it("expands Vivian mindscape-aware ether anomaly and disorder bonuses", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1331",
        wEngineId: "14133",
        agentLevel: 60,
        agentMindscape: 2,
        wEngineRefinement: 1,
      },
      panel: {
        attack: 3000,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 180,
      },
      scenario: {
        damageType: "disorder",
        skillTag: "basic",
        anomalyType: "ether",
        remainingTime: 5,
        attribute: "以太",
        extraAbilityActive: true,
        combatTags: ["prophecyTarget"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.loadout.agentMindscape).toBe(2)
    expect(result.resolvedBuckets.anomalyBonusDamageSum).toBeCloseTo(0.28, 4)
    expect(result.resolvedBuckets.ignoreResistance).toBeCloseTo(0.15, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes("影画2当前只展开以太异常/紊乱的 15% 无视抗性"),
      ),
    ).toBe(true)
  })

  it("records Vivian m2 anomaly multiplier snapshots through resolvedSnapshot", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1331",
        wEngineId: "14133",
        agentLevel: 60,
        agentMindscape: 2,
        wEngineRefinement: 1,
      },
      panel: {
        attack: 3000,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 180,
      },
      scenario: {
        damageType: "disorder",
        skillTag: "basic",
        anomalyType: "ether",
        remainingTime: 5,
        attribute: "以太",
        resolvedSnapshot: {
          multiplierFactors: {
            skillMultiplierFactor: 1.25,
          },
        },
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.resolvedBuckets.skillMultiplierFactor).toBeCloseTo(1.25, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes(
          "薇薇安的影画2当前只展开以太异常/紊乱的 15% 无视抗性；[异放]精通收益提升若后续要静态快照化，优先仍归 dynamicSnapshot；异常积蓄效率折算后的最终倍率已按 scenario.resolvedSnapshot.multiplierFactors.skillMultiplierFactor 记录。",
        ),
      ),
    ).toBe(true)
  })

  it("replaces generic anomaly assumptions with source-specific Burnice notes", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1171",
        wEngineId: "14117",
        driveDiscSets: [{ id: "31800", pieces: 4 }],
        agentLevel: 60,
        wEngineRefinement: 1,
      },
      panel: {
        attack: 3100,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 160,
      },
      scenario: {
        damageType: "anomaly",
        skillTag: "enhancedSpecial",
        damageMultiplier: "520%",
        attribute: "火属性",
        extraAbilityActive: true,
        combatTags: ["offField"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(
      result.assumptions.some((item) =>
        item.includes("柏妮思 当前未收录 curated"),
      ),
    ).toBe(false)
    expect(
      result.assumptions.some((item) =>
        item.includes("灼心摇壶 当前未收录 curated"),
      ),
    ).toBe(false)
    expect(result.resolvedBuckets.anomalyProficiency).toBeCloseTo(80, 4)
    expect(
      result.assumptions.some((item) => item.includes("burniceEmberState")),
    ).toBe(true)
    expect(
      result.assumptions.some((item) => item.includes("后场能量自动回复")),
    ).toBe(true)
    expect(
      result.sourceNotes.some(
        (note) =>
          note.sourceType === "agent" &&
          note.sourceId === "1171" &&
          note.owner === "dynamicSnapshot" &&
          note.status === "missing-input" &&
          note.guidance.kind === "provide-input" &&
          note.guidance.target === "dynamicSnapshot" &&
          note.keys.includes(
            "scenario.dynamicSnapshot.flags.burniceEmberState",
          ),
      ),
    ).toBe(true)
  })

  it("records generic defaulted-input diagnostics for anomaly resolver defaults", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1171",
      },
      panel: {
        attack: 3100,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 160,
      },
      scenario: {
        damageType: "anomaly",
        skillTag: "enhancedSpecial",
        damageMultiplier: "520%",
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(
      result.diagnostics.some(
        (item) =>
          item.kind === "defaulted-input" &&
          item.owner === "scenario" &&
          item.keys.includes("scenario.attribute"),
      ),
    ).toBe(true)
    expect(
      result.diagnostics.some(
        (item) =>
          item.kind === "defaulted-input" &&
          item.owner === "scenario" &&
          item.keys.includes("scenario.extraAbilityActive"),
      ),
    ).toBe(true)
    expect(
      result.diagnostics.some(
        (item) =>
          item.kind === "defaulted-input" &&
          item.owner === "loadout" &&
          item.keys.includes("loadout.agentMindscape"),
      ),
    ).toBe(true)
    expect(
      result.diagnostics.some(
        (item) =>
          item.kind === "defaulted-input" &&
          item.owner === "loadout" &&
          item.keys.includes("loadout.agentLevel"),
      ),
    ).toBe(true)
  })

  it("expands Burnice progression-aware anomaly mastery and damage bonus", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1171",
        agentLevel: 60,
        agentMindscape: 5,
      },
      panel: {
        attack: 3100,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 160,
        energyGenerationRate: 2.8,
      },
      scenario: {
        damageType: "anomaly",
        skillTag: "enhancedSpecial",
        damageMultiplier: "520%",
        attribute: "火属性",
        extraAbilityActive: true,
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.loadout.agentMindscape).toBe(5)
    expect(result.resolvedPanel.energyGenerationRate).toBeCloseTo(2.8, 4)
    expect(result.resolvedBuckets.anomalyMastery).toBeCloseTo(25, 4)
    expect(result.resolvedPanel.anomalyMastery).toBeCloseTo(25, 4)
    expect(result.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.2, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes("finalPanel.energyGenerationRate 展开潜能觉醒：沸点派对"),
      ),
    ).toBe(true)
  })

  it("expands Burnice m2 heat penetration with stack-aware penetration rate", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1171",
        agentLevel: 60,
        agentMindscape: 2,
      },
      panel: {
        attack: 3100,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 160,
      },
      scenario: {
        damageType: "anomaly",
        skillTag: "enhancedSpecial",
        damageMultiplier: "520%",
        attribute: "火属性",
        extraAbilityActive: true,
        combatTags: ["burniceHeatPenetration"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.loadout.agentMindscape).toBe(2)
    expect(result.resolvedBuckets.penetrationRate).toBeCloseTo(0.2, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes('combatTags: ["burniceHeatPenetration"]'),
      ),
    ).toBe(true)
  })

  it("keeps Burnice m6 fire resistance ignore as an explicit resolved snapshot assumption when missing", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1171",
        agentLevel: 60,
        agentMindscape: 6,
      },
      panel: {
        attack: 3100,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 160,
      },
      scenario: {
        damageType: "anomaly",
        skillTag: "enhancedSpecial",
        damageMultiplier: "520%",
        attribute: "火属性",
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.resolvedBuckets.ignoreResistance).toBeCloseTo(0, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes(
          "25% 火抗无视当前可通过 scenario.resolvedSnapshot.bucketDeltas.ignoreResistance 显式提供",
        ),
      ),
    ).toBe(true)
  })

  it("adopts Burnice m6 fire resistance ignore through resolved snapshots", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1171",
        agentLevel: 60,
        agentMindscape: 6,
      },
      panel: {
        attack: 3100,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 160,
      },
      scenario: {
        damageType: "anomaly",
        skillTag: "enhancedSpecial",
        damageMultiplier: "520%",
        attribute: "火属性",
        resolvedSnapshot: {
          bucketDeltas: {
            ignoreResistance: 0.25,
          },
        },
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.resolvedBuckets.ignoreResistance).toBeCloseTo(0.25, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes("scenario.resolvedSnapshot.bucketDeltas"),
      ),
    ).toBe(true)
    expect(
      result.assumptions.some((item) =>
        item.includes(
          "柏妮思的影画6 25% 火抗无视当前已按 scenario.resolvedSnapshot.bucketDeltas.ignoreResistance 记录",
        ),
      ),
    ).toBe(true)
    expect(
      result.assumptions.some((item) =>
        item.includes(
          "特殊[余烬]与额外[灼烧]结算仍未在 static resolver 中展开",
        ),
      ),
    ).toBe(true)
  })

  it("applies Burnice dynamic ember snapshot ratios to anomaly and disorder damage", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1171",
        agentLevel: 60,
      },
      panel: {
        attack: 3100,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 160,
      },
      scenario: {
        damageType: "anomaly",
        skillTag: "enhancedSpecial",
        damageMultiplier: "520%",
        attribute: "火属性",
        dynamicSnapshot: {
          flags: {
            burniceEmberState: true,
          },
          counts: {
            burniceEmberExtraTriggers: 2,
          },
          values: {
            burniceEmberDamageRatio: 1.25,
          },
        },
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.resolvedBuckets.anomalyBonusDamageSum).toBeCloseTo(2.5, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes("scenario.dynamicSnapshot 的[燃点]/[余烬]快照"),
      ),
    ).toBe(true)
    expect(
      result.sourceNotes.some(
        (note) =>
          note.sourceType === "agent" &&
          note.sourceId === "1171" &&
          note.owner === "dynamicSnapshot" &&
          note.status === "resolved" &&
          note.guidance.kind === "input-applied" &&
          note.guidance.target === "dynamicSnapshot" &&
          note.keys.includes(
            "scenario.dynamicSnapshot.values.burniceEmberDamageRatio",
          ),
      ),
    ).toBe(true)
    expect(
      result.assumptions.some((item) =>
        item.includes("burniceEmberDamageRatio"),
      ),
    ).toBe(false)
  })

  it("accepts V6 state snapshot contract without changing current resolver behavior", () => {
    const result = resolveStaticBuildDamage({
      mode: "baseline",
      loadout: {
        agentId: "1401",
        agentLevel: 60,
      },
      panel: {
        attack: 2800,
        critRate: 0.4,
        critDamage: 1.1,
        anomalyProficiency: 180,
      },
      scenario: {
        damageType: "anomaly",
        skillTag: "special",
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

    expect(result.damage.expected.total).toBeGreaterThan(0)
  })

  it("applies V7 resolved snapshot bucket and multiplier overrides", () => {
    const result = resolveStaticBuildDamage({
      mode: "baseline",
      loadout: {
        agentId: "1401",
        agentLevel: 60,
      },
      panel: {
        attack: 2800,
        critRate: 0.4,
        critDamage: 1.1,
        anomalyProficiency: 180,
      },
      scenario: {
        damageType: "anomaly",
        skillTag: "special",
        damageMultiplier: "500%",
        attribute: "物理",
        resolvedSnapshot: {
          bucketDeltas: {
            anomalyBonusDamageSum: 0.3,
          },
          multiplierFactors: {
            skillMultiplierFactor: 1.8,
          },
        },
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.damage.expected.total).toBeGreaterThan(0)
    expect(result.resolvedBuckets.anomalyBonusDamageSum).toBeCloseTo(0.3, 4)
    expect(result.resolvedBuckets.skillMultiplierFactor).toBeCloseTo(1.8, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes("scenario.resolvedSnapshot.bucketDeltas"),
      ),
    ).toBe(true)
    expect(
      result.assumptions.some((item) =>
        item.includes(
          "scenario.resolvedSnapshot.multiplierFactors.skillMultiplierFactor",
        ),
      ),
    ).toBe(true)
  })

  it("applies Alice polarity assault ratios from state snapshots to anomaly damage", () => {
    const result = resolveStaticBuildDamage({
      mode: "baseline",
      loadout: {
        agentId: "1401",
        agentLevel: 60,
      },
      panel: {
        attack: 2800,
        critRate: 0.4,
        critDamage: 1.1,
        anomalyProficiency: 180,
      },
      scenario: {
        damageType: "anomaly",
        skillTag: "special",
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

    expect(result.resolvedBuckets.skillMultiplierFactor).toBeCloseTo(2.5, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes("已按 scenario.stateSnapshot 展开[极性强击]"),
      ),
    ).toBe(true)
  })

  it("refines Miyabi assumptions when frostburn break state is present but ratio is missing", () => {
    const result = resolveStaticBuildDamage({
      mode: "baseline",
      loadout: {
        agentId: "1091",
        wEngineId: "14109",
        agentLevel: 60,
      },
      panel: {
        attack: 2800,
        critRate: 0.4,
        critDamage: 1.1,
        anomalyProficiency: 180,
      },
      scenario: {
        damageType: "anomaly",
        skillTag: "special",
        damageMultiplier: "600%",
        attribute: "烈霜",
        stateSnapshot: {
          flags: {
            miyabiFrostburnBreakState: true,
          },
        },
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(
      result.assumptions.some((item) =>
        item.includes("miyabiFrostburnBreakDamageRatio"),
      ),
    ).toBe(true)
  })

  it("records Miyabi frostburn break snapshots without forcing them into the current anomaly formula", () => {
    const result = resolveStaticBuildDamage({
      mode: "baseline",
      loadout: {
        agentId: "1091",
        wEngineId: "14109",
        agentLevel: 60,
      },
      panel: {
        attack: 2800,
        critRate: 0.4,
        critDamage: 1.1,
        anomalyProficiency: 180,
      },
      scenario: {
        damageType: "anomaly",
        skillTag: "special",
        damageMultiplier: "600%",
        attribute: "烈霜",
        stateSnapshot: {
          flags: {
            miyabiFrostburnBreakState: true,
          },
          values: {
            miyabiFrostburnBreakDamageRatio: 7.5,
          },
        },
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.resolvedBuckets.skillMultiplierFactor).toBe(1)
    expect(
      result.assumptions.some((item) =>
        item.includes(
          "已记录 scenario.stateSnapshot 的[霜灼·破]状态与倍率快照",
        ),
      ),
    ).toBe(true)
  })

  it("marks Hailstorm Shrine as a research-only source note", () => {
    const result = resolveStaticBuildDamage({
      mode: "baseline",
      loadout: {
        agentId: "1091",
        wEngineId: "14109",
        agentLevel: 60,
      },
      panel: {
        attack: 2800,
        critRate: 0.4,
        critDamage: 1.1,
        anomalyProficiency: 180,
      },
      scenario: {
        damageType: "anomaly",
        skillTag: "special",
        damageMultiplier: "600%",
        attribute: "烈霜",
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(
      result.sourceNotes.some(
        (note) =>
          note.sourceType === "w-engine" &&
          note.sourceId === "14109" &&
          note.owner === "sourceView" &&
          note.status === "research-only" &&
          note.guidance.kind === "keep-research-only",
      ),
    ).toBe(true)
  })

  it("marks Chaos Metal 4pc as a research-only source note", () => {
    const result = resolveStaticBuildDamage({
      mode: "baseline",
      loadout: {
        agentId: "1331",
        wEngineId: "14133",
        driveDiscSets: [{ id: "32300", pieces: 4 }],
        agentLevel: 60,
        wEngineRefinement: 1,
      },
      panel: {
        attack: 3000,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 180,
      },
      scenario: {
        damageType: "disorder",
        skillTag: "basic",
        anomalyType: "ether",
        remainingTime: 5,
        attribute: "以太",
        extraAbilityActive: true,
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(
      result.sourceNotes.some(
        (note) =>
          note.sourceType === "drive-disc" &&
          note.sourceId === "32300" &&
          note.owner === "sourceView" &&
          note.status === "research-only" &&
          note.guidance.kind === "keep-research-only",
      ),
    ).toBe(true)
  })

  it("keeps Roaring Ride on source-note assumptions instead of source views", () => {
    const result = resolveStaticBuildDamage({
      mode: "baseline",
      loadout: {
        agentId: "1171",
        wEngineId: "13128",
        agentLevel: 60,
      },
      panel: {
        attack: 3100,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 160,
      },
      scenario: {
        damageType: "anomaly",
        skillTag: "enhancedSpecial",
        damageMultiplier: "520%",
        attribute: "火属性",
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(
      result.sourceNotes.some(
        (note) =>
          note.sourceType === "w-engine" &&
          note.sourceId === "13128" &&
          note.owner === "process" &&
          note.status === "process-only" &&
          note.guidance.kind === "keep-process-only",
      ),
    ).toBe(true)
    expect(
      result.sourceNotes.some(
        (note) =>
          note.sourceType === "w-engine" &&
          note.sourceId === "13128" &&
          note.owner === "sourceView",
      ),
    ).toBe(false)
  })

  it("keeps Freedom Blues 4pc as a process note instead of source views", () => {
    const result = resolveStaticBuildDamage({
      mode: "baseline",
      loadout: {
        agentId: "1171",
        driveDiscSets: [{ id: "31300", pieces: 4 }],
        agentLevel: 60,
      },
      panel: {
        attack: 3100,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 160,
      },
      scenario: {
        damageType: "anomaly",
        skillTag: "enhancedSpecial",
        damageMultiplier: "520%",
        attribute: "火属性",
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(
      result.sourceNotes.some(
        (note) =>
          note.sourceType === "drive-disc" &&
          note.sourceId === "31300" &&
          note.owner === "process" &&
          note.status === "process-only" &&
          note.guidance.kind === "keep-process-only",
      ),
    ).toBe(true)
    expect(
      result.sourceNotes.some(
        (note) =>
          note.sourceType === "drive-disc" &&
          note.sourceId === "31300" &&
          note.owner === "sourceView",
      ),
    ).toBe(false)
  })

  it("refines Burnice progression assumptions when mindscape is present but energyGenerationRate is missing", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1171",
        agentLevel: 60,
        agentMindscape: 1,
      },
      panel: {
        attack: 3100,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 160,
      },
      scenario: {
        damageType: "anomaly",
        skillTag: "enhancedSpecial",
        damageMultiplier: "520%",
        attribute: "火属性",
        extraAbilityActive: true,
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.resolvedBuckets.anomalyMastery).toBe(0)
    expect(result.resolvedBuckets.bonusDamageSum).toBe(0)
    expect(
      result.assumptions.some((item) =>
        item.includes("未提供时，初始能量自动回复转异常掌控与伤害提升未展开"),
      ),
    ).toBe(true)
  })

  it("applies Burnice extra ability to fire disorder remaining-time scaling", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1171",
        agentLevel: 60,
        coreSkillLevel: 7,
      },
      panel: {
        attack: 3100,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 160,
      },
      scenario: {
        damageType: "disorder",
        skillTag: "assist",
        anomalyType: "fire",
        remainingTime: 5,
        attribute: "火属性",
        extraAbilityActive: true,
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.resolvedBuckets.anomalyBonusDamageSum).toBeCloseTo(
      12.5 / 9.5 - 1,
      4,
    )
    expect(
      result.assumptions.some((item) =>
        item.includes("已展开额外能力带来的灼烧持续时间延长"),
      ),
    ).toBe(true)
    expect(
      result.assumptions.some((item) => item.includes("[燃点]/[余烬]")),
    ).toBe(true)
  })

  it("replaces generic anomaly assumptions with source-specific Alice notes", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1401",
        wEngineId: "14140",
        agentLevel: 60,
        wEngineRefinement: 1,
      },
      panel: {
        attack: 3000,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 180,
      },
      scenario: {
        damageType: "disorder",
        skillTag: "basic",
        anomalyType: "physical",
        remainingTime: 5,
        attribute: "物理",
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(
      result.assumptions.some((item) =>
        item.includes("爱丽丝 当前未收录 curated"),
      ),
    ).toBe(false)
    expect(result.resolvedBuckets.anomalyBonusDamageSum).toBeCloseTo(0.9, 4)
    expect(
      result.assumptions.some((item) => item.includes("异常掌控转异常精通")),
    ).toBe(true)
    expect(
      result.assumptions.some((item) =>
        item.includes("物理异常剩余时间换算紊乱倍率"),
      ),
    ).toBe(false)
  })

  it("uses anomalyMastery snapshot to expand Alice extra ability", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1401",
        wEngineId: "14140",
        agentLevel: 60,
        wEngineRefinement: 1,
      },
      panel: {
        attack: 3000,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 180,
        anomalyMastery: 200,
      },
      scenario: {
        damageType: "disorder",
        skillTag: "basic",
        anomalyType: "physical",
        remainingTime: 5,
        attribute: "物理",
        extraAbilityActive: true,
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.resolvedBuckets.anomalyBonusDamageSum).toBeCloseTo(0.9, 4)
    expect(result.resolvedBuckets.anomalyProficiency).toBeCloseTo(96, 4)
    expect(result.resolvedPanel.anomalyProficiency).toBeCloseTo(276, 4)
    expect(result.resolvedPanel.anomalyMastery).toBe(200)
    expect(
      result.assumptions.some((item) =>
        item.includes("finalPanel.anomalyMastery 快照展开异常掌控转异常精通"),
      ),
    ).toBe(true)
    expect(
      result.assumptions.some((item) =>
        item.includes("异常掌控转异常精通未在 static resolver 中自动展开"),
      ),
    ).toBe(false)
    expect(result.assumptions.some((item) => item.includes("[极性强击]"))).toBe(
      true,
    )
    expect(
      result.assumptions.some((item) =>
        item.includes("十方锻星的异常掌控提升未在 static resolver 中自动推导"),
      ),
    ).toBe(false)
    expect(
      result.assumptions.some((item) =>
        item.includes(
          "十方锻星的[强击]触发/接战即满层逻辑未在 static resolver 中展开",
        ),
      ),
    ).toBe(true)
    expect(
      result.sourceNotes.some(
        (note) =>
          note.sourceType === "agent" &&
          note.sourceId === "1401" &&
          note.owner === "finalPanel" &&
          note.status === "resolved" &&
          note.keys.includes("finalPanel.anomalyMastery"),
      ),
    ).toBe(true)
  })

  it("expands Alice mindscape-aware physical disorder bonus and ignore resistance", () => {
    const result = resolveStaticBuildDamage({
      mode: "full-buff",
      loadout: {
        agentId: "1401",
        wEngineId: "14140",
        agentLevel: 60,
        agentMindscape: 4,
        wEngineRefinement: 1,
      },
      panel: {
        attack: 3000,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 180,
        anomalyMastery: 200,
      },
      scenario: {
        damageType: "disorder",
        skillTag: "basic",
        anomalyType: "physical",
        remainingTime: 5,
        attribute: "物理",
        extraAbilityActive: true,
        combatTags: ["aliceAfterAssault"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.loadout.agentMindscape).toBe(4)
    expect(result.resolvedBuckets.defenseReduction).toBeCloseTo(0.2, 4)
    expect(result.resolvedBuckets.anomalyBonusDamageSum).toBeCloseTo(1.05, 4)
    expect(result.resolvedBuckets.ignoreResistance).toBeCloseTo(0.1, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes('combatTags: ["aliceAfterAssault"] 显式展开'),
      ),
    ).toBe(true)
  })

  it("rejects anomaly damage types for non-anomaly specialties", () => {
    expect(() =>
      resolveStaticBuildDamage({
        loadout: {
          agentId: "1241",
        },
        panel: {
          attack: 3200,
          critRate: 0.55,
          critDamage: 1.4,
          anomalyProficiency: 120,
        },
        scenario: {
          damageType: "anomaly",
          skillTag: "basic",
          damageMultiplier: "500%",
          attribute: "以太",
          enemy: {
            defenderBaseDefense: 953,
            defenderResistance: 0.2,
          },
        },
      }),
    ).toThrow(/does not support damageType=anomaly/)
  })
})
