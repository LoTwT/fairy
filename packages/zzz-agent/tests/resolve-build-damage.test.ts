import { describe, expect, it } from "vitest"
import { resolveBuildDamage } from "../src/mastra/tools/zzz/resolve-build-damage"
import { runTool } from "./shared"

describe("resolveBuildDamage tool", () => {
  it("matches supported aliases and returns resolved build output", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "伊芙琳·舒瓦利耶",
      wEngine: "心弦夜响",
      driveDiscs: [{ name: "河豚电音", pieces: 4 }],
      mode: "full-buff",
      finalPanel: {
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
        combatTags: ["restrained"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect((result as any).found).toBe(true)
    expect((result as any).build.loadout.agent.name).toBe("伊芙琳")
    expect((result as any).build.summary.baseDamageStat).toBe("attack")
    expect(
      (result as any).build.summary.formulaMultipliers.critMultiplier,
    ).toBeGreaterThan(1)
    expect(
      (result as any).build.summary.diagnosticGroups.length,
    ).toBeGreaterThan(0)
    expect((result as any).build.diagnosticSummary.count).toBe(
      (result as any).build.diagnostics.length,
    )
    expect((result as any).build.diagnosticSummary.hasDefaultedInput).toBe(true)
    expect((result as any).build.sourceNoteSummary.count).toBe(
      (result as any).build.sourceNotes.length,
    )
    expect((result as any).build.effectSummary.length).toBeGreaterThan(0)
    expect(
      (result as any).build.effectSummary[0].bucket.length,
    ).toBeGreaterThan(0)
    expect((result as any).build.assumptionSummary.count).toBe(
      (result as any).build.assumptions.length,
    )
    expect((result as any).build.caveatSummary.assumptionCount).toBe(
      (result as any).build.assumptions.length,
    )
    expect(
      (result as any).build.resolvedBuckets.skillMultiplierFactor,
    ).toBeCloseTo(1.25, 4)
  })

  it("supports Yixuan sheer profile through the high-level tool", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "仪玄",
      wEngine: "青溟笼舍",
      driveDiscs: [{ name: "云岿如我", pieces: 4 }],
      mode: "full-buff",
      finalPanel: {
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
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
          isStunned: true,
        },
      },
    })

    expect((result as any).found).toBe(true)
    expect((result as any).build.profile.id).toBe("yixuan-sheer")
    expect((result as any).build.damage.expected.total).toBeGreaterThan(0)
  })

  it("supports Soldier 11 aliases through the high-level tool", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "soldier 11",
      wEngine: "硫磺石",
      driveDiscs: [{ name: "炎狱重金属", pieces: 4 }],
      mode: "full-buff",
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    expect((result as any).build.loadout.agent.name).toBe("「11号」")
    expect((result as any).build.resolvedBuckets.attackPercent).toBeCloseTo(
      0.28,
      4,
    )
  })

  it("supports generic attack agents in the high-level resolver", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "猫又",
      wEngine: "加农转子",
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    expect((result as any).build.loadout.agent.name).toBe("猫又")
    expect((result as any).build.loadout.wEngine.name).toBe("加农转子")
  })

  it("supports Corin partial coverage through the high-level resolver", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "可琳",
      wEngine: "家政员",
      mode: "full-buff",
      finalPanel: {
        attack: 2600,
        baseAttack: 1050,
        critRate: 0.35,
        critDamage: 0.8,
      },
      scenario: {
        damageType: "normal",
        skillTag: "basic",
        skillMultiplier: "320%",
        attribute: "物理",
        extraAbilityActive: true,
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
          isStunned: true,
        },
      },
    })

    expect((result as any).found).toBe(true)
    expect((result as any).build.loadout.agent.name).toBe("可琳")
    expect((result as any).build.loadout.wEngine.name).toBe("家政员")
    expect((result as any).build.resolvedBuckets.bonusDamageSum).toBeCloseTo(
      0.8,
      4,
    )
  })

  it("keeps Billy legacy signatures on source notes instead of generic coverage gaps", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "比利",
      wEngine: "仿制星徽引擎",
      finalPanel: {
        attack: 2500,
        baseAttack: 1000,
        critRate: 0.4,
        critDamage: 0.9,
      },
      scenario: {
        damageType: "normal",
        skillTag: "basic",
        skillMultiplier: "280%",
        attribute: "物理",
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect((result as any).found).toBe(true)
    expect((result as any).build.loadout.agent.name).toBe("比利")
    expect((result as any).build.assumptions.join(" ")).not.toContain(
      "比利 当前未收录 curated",
    )
    expect((result as any).build.sourceNotes.length).toBeGreaterThan(0)
  })

  it("supports Zero Anby curated effects through aliases", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "零号安比",
      wEngine: "牺牲洁纯",
      mode: "baseline",
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    expect((result as any).build.loadout.agent.name).toBe("零号·安比")
    expect((result as any).build.loadout.wEngine.name).toBe("牺牲洁纯")
    expect((result as any).build.resolvedBuckets.bonusDamageSum).toBeCloseTo(
      0.7,
      4,
    )
  })

  it("supports Hugo curated effects through the high-level tool", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "雨果",
      wEngine: "千面日陨",
      mode: "full-buff",
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    expect((result as any).build.loadout.agent.name).toBe("雨果")
    expect((result as any).build.loadout.wEngine.name).toBe("千面日陨")
    expect((result as any).build.resolvedBuckets.bonusDamageSum).toBeCloseTo(
      0.5,
      4,
    )
  })

  it("keeps Moon Phase Charlie as utility-only source notes in the high-level tool", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "猫又",
      wEngine: "「月相」-朔",
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    expect((result as any).build.loadout.wEngine.name).toBe("「月相」-朔")
    expect((result as any).build.assumptions.join(" ")).not.toContain(
      "「月相」-朔 当前未收录 curated",
    )
    expect(
      (result as any).build.sourceNotes.some(
        (item: any) =>
          item.sourceType === "w-engine" &&
          item.sourceId === "12003" &&
          item.message.includes("能量回复"),
      ),
    ).toBe(true)
  })

  it("keeps Electromag Charlie as utility-only source notes in the high-level tool", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "格莉丝",
      wEngine: "「电磁暴」-叁式",
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    expect((result as any).build.loadout.wEngine.name).toBe("「电磁暴」-叁式")
    expect((result as any).build.assumptions.join(" ")).not.toContain(
      "「电磁暴」-叁式 当前未收录 curated",
    )
    expect(
      (result as any).build.sourceNotes.some(
        (item: any) =>
          item.sourceType === "w-engine" &&
          item.sourceId === "12012" &&
          item.message.includes("能量回复"),
      ),
    ).toBe(true)
  })

  it("supports Banyue rupture curated effects through the high-level tool", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "般岳",
      wEngine: "怒目金刚",
      mode: "full-buff",
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    expect((result as any).build.loadout.agent.name).toBe("般岳")
    expect((result as any).build.profile.id).toBe("standard-sheer")
    expect((result as any).build.resolvedBuckets.sheerBonusSum).toBeCloseTo(
      0.18,
      4,
    )
  })

  it("supports Mato rupture curated effects through the high-level tool", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "真斗",
      wEngine: "燔火胧夜",
      mode: "full-buff",
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    expect((result as any).build.loadout.agent.name).toBe("真斗")
    expect((result as any).build.loadout.wEngine.name).toBe("燔火胧夜")
    expect((result as any).build.resolvedBuckets.bonusDamageSum).toBeCloseTo(
      0.35,
      4,
    )
  })

  it("supports Idhari rupture curated effects through the high-level tool", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "伊德海莉",
      wEngine: "海妖摇篮",
      mode: "full-buff",
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    expect((result as any).build.loadout.agent.name).toBe("伊德海莉")
    expect((result as any).build.resolvedBuckets.sheerBonusSum).toBeCloseTo(
      0.18,
      4,
    )
  })

  it("supports Ye Shunguang attack curated effects through the high-level tool", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "叶瞬光",
      wEngine: "云霓孤光",
      mode: "full-buff",
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    expect((result as any).build.loadout.agent.name).toBe("叶瞬光")
    expect((result as any).build.resolvedBuckets.ignoreResistance).toBeCloseTo(
      0.2,
      4,
    )
  })

  it("supports Xisifu curated effects through the high-level tool", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "希希芙",
      wEngine: "鳞齿寻踪",
      mode: "full-buff",
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    expect((result as any).build.loadout.agent.name).toBe("希希芙")
    expect((result as any).build.loadout.wEngine.name).toBe("鳞齿寻踪")
    expect((result as any).build.resolvedPanel.critRate).toBeCloseTo(0.7, 4)
    expect((result as any).build.resolvedPanel.critDamage).toBeCloseTo(1.7, 4)
  })

  it("supports Sid curated effects through the high-level tool", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "席德",
      wEngine: "机巧心种",
      mode: "full-buff",
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    expect((result as any).build.loadout.agent.name).toBe("「席德」")
    expect((result as any).build.loadout.wEngine.name).toBe("机巧心种")
    expect((result as any).build.resolvedPanel.attack).toBeCloseTo(4300, 4)
    expect((result as any).build.resolvedBuckets.bonusDamageSum).toBeCloseTo(
      0.8,
      4,
    )
  })

  it("returns supported scope when agent is outside the supported specialties", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "安比",
      finalPanel: {
        attack: 2000,
        critRate: 0.5,
        critDamage: 1,
      },
      scenario: {
        damageType: "normal",
        skillTag: "basic",
        skillMultiplier: "200%",
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect((result as any).found).toBe(false)
    expect((result as any).supportedAgents).toContain("朱鸢")
  })

  it("rejects w-engines whose specialty is incompatible with the agent", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "猫又",
      wEngine: "青溟笼舍",
      finalPanel: {
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

    expect((result as any).found).toBe(false)
    expect((result as any).message).toContain("无法使用")
    expect((result as any).supportedWEngines).toContain("加农转子")
    expect((result as any).supportedWEngines).not.toContain("青溟笼舍")
  })

  it("supports anomaly agents through the high-level resolver", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "格莉丝",
      wEngine: "嵌合编译器",
      driveDiscs: [{ name: "自由蓝调", pieces: 2 }],
      mode: "full-buff",
      agentLevel: 60,
      finalPanel: {
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
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect((result as any).found).toBe(true)
    expect((result as any).build.profile.id).toBe("standard-anomaly")
    expect((result as any).build.loadout.agent.name).toBe("格莉丝")
    expect((result as any).build.loadout.wEngine.name).toBe("嵌合编译器")
    expect((result as any).build.resolvedPanel.anomalyProficiency).toBeCloseTo(
      225,
      4,
    )
  })

  it("supports Grace m2 electric resistance reduction through the high-level resolver", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "格莉丝",
      wEngine: "嵌合编译器",
      mode: "full-buff",
      agentLevel: 60,
      agentMindscape: 2,
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    expect((result as any).build.loadout.agentMindscape).toBe(2)
    expect(
      (result as any).build.resolvedBuckets.resistanceReduction,
    ).toBeCloseTo(0.085, 4)
  })

  it("supports Grace m2 anomaly multiplier snapshots through the high-level resolver", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "格莉丝",
      wEngine: "嵌合编译器",
      mode: "full-buff",
      agentLevel: 60,
      agentMindscape: 2,
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    expect(
      (result as any).build.resolvedBuckets.skillMultiplierFactor,
    ).toBeCloseTo(1.25, 4)
  })

  it("supports disorder damage through the high-level resolver", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "格莉丝",
      wEngine: "嵌合编译器",
      driveDiscs: [{ name: "自由蓝调", pieces: 2 }],
      mode: "full-buff",
      agentLevel: 60,
      finalPanel: {
        attack: 3000,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 120,
      },
      scenario: {
        damageType: "disorder",
        skillTag: "enhancedSpecial",
        anomalyType: "感电",
        remainingTime: 5,
        attribute: "电属性",
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect((result as any).found).toBe(true)
    expect((result as any).build.profile.id).toBe("standard-disorder")
    expect((result as any).build.damageParams.anomalyType).toBe("electric")
    expect((result as any).build.damageParams.remainingTime).toBe(5)
  })

  it("accepts v5 dynamicSnapshot contract through the high-level resolver", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "柏妮思",
      wEngine: "灼心摇壶",
      mode: "full-buff",
      agentLevel: 60,
      finalPanel: {
        attack: 3000,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 180,
      },
      scenario: {
        damageType: "disorder",
        skillTag: "enhancedSpecial",
        anomalyType: "灼烧",
        remainingTime: 8,
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

    expect((result as any).found).toBe(true)
    expect((result as any).build.profile.id).toBe("standard-disorder")
  })

  it("supports Alice disorder curated effects through the high-level resolver", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "爱丽丝",
      wEngine: "十方锻星",
      mode: "full-buff",
      agentLevel: 60,
      finalPanel: {
        attack: 3000,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 180,
      },
      scenario: {
        damageType: "disorder",
        skillTag: "basic",
        anomalyType: "强击",
        remainingTime: 5,
        attribute: "物理",
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect((result as any).found).toBe(true)
    expect((result as any).build.loadout.agent.name).toBe("爱丽丝")
    expect((result as any).build.loadout.wEngine.name).toBe("十方锻星")
    expect(
      (result as any).build.resolvedBuckets.anomalyBonusDamageSum,
    ).toBeCloseTo(0.9, 4)
    expect((result as any).build.resolvedBuckets.bonusDamageSum).toBeCloseTo(
      0.4,
      4,
    )
  })

  it("accepts anomalyMastery snapshots for Alice through the high-level resolver", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "爱丽丝",
      wEngine: "十方锻星",
      mode: "full-buff",
      agentLevel: 60,
      finalPanel: {
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
        anomalyType: "强击",
        remainingTime: 5,
        attribute: "物理",
        extraAbilityActive: true,
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect((result as any).found).toBe(true)
    expect((result as any).build.loadout.agent.name).toBe("爱丽丝")
    expect((result as any).build.resolvedPanel.anomalyMastery).toBe(200)
    expect((result as any).build.resolvedPanel.anomalyProficiency).toBeCloseTo(
      276,
      4,
    )
    expect(
      (result as any).build.diagnostics.some(
        (item: any) =>
          item.kind === "defaulted-input" &&
          item.owner === "scenario" &&
          item.keys.includes("scenario.extraAbilityActive"),
      ),
    ).toBe(false)
    expect(
      (result as any).build.assumptions.some((item: string) =>
        item.includes("finalPanel.anomalyMastery 快照展开异常掌控转异常精通"),
      ),
    ).toBe(true)
  })

  it("returns structured defaulted-input diagnostics through the high-level resolver", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "柏妮思",
      mode: "full-buff",
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    expect(
      (result as any).build.diagnostics.some(
        (item: any) =>
          item.kind === "defaulted-input" &&
          item.keys.includes("scenario.attribute"),
      ),
    ).toBe(true)
    expect(
      (result as any).build.diagnostics.some(
        (item: any) =>
          item.kind === "defaulted-input" &&
          item.keys.includes("loadout.agentLevel"),
      ),
    ).toBe(true)
  })

  it("supports Alice mindscape-aware disorder refinements through the high-level resolver", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "爱丽丝",
      wEngine: "十方锻星",
      mode: "full-buff",
      agentLevel: 60,
      agentMindscape: 4,
      finalPanel: {
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
        anomalyType: "强击",
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

    expect((result as any).found).toBe(true)
    expect((result as any).build.loadout.agentMindscape).toBe(4)
    expect((result as any).build.resolvedBuckets.defenseReduction).toBeCloseTo(
      0.2,
      4,
    )
    expect(
      (result as any).build.resolvedBuckets.anomalyBonusDamageSum,
    ).toBeCloseTo(1.05, 4)
    expect((result as any).build.resolvedBuckets.ignoreResistance).toBeCloseTo(
      0.1,
      4,
    )
  })

  it("supports Aria mindscape-aware anomaly crit and defense penetration through the high-level resolver", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "爱芮",
      wEngine: "壳中之灵",
      mode: "full-buff",
      agentLevel: 60,
      agentMindscape: 2,
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    expect((result as any).build.loadout.agentMindscape).toBe(2)
    expect((result as any).build.resolvedBuckets.anomalyCritRate).toBeCloseTo(
      0.4,
      4,
    )
    expect((result as any).build.resolvedBuckets.anomalyCritDamage).toBeCloseTo(
      0.25,
      4,
    )
    expect((result as any).build.resolvedBuckets.defenseReduction).toBeCloseTo(
      0.24,
      4,
    )
  })

  it("supports Aria dynamic snapshot exflow ratios through the high-level resolver", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "爱芮",
      mode: "full-buff",
      agentLevel: 60,
      finalPanel: {
        attack: 2950,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 150,
      },
      scenario: {
        damageType: "disorder",
        skillTag: "enhancedSpecial",
        anomalyType: "侵蚀",
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

    expect((result as any).found).toBe(true)
    expect(
      (result as any).build.resolvedBuckets.anomalyBonusDamageSum,
    ).toBeCloseTo(0.65, 4)
    expect(
      (result as any).build.assumptions.some((item: string) =>
        item.includes("scenario.dynamicSnapshot.values.ariaExflowDamageRatio"),
      ),
    ).toBe(true)
  })

  it("supports Vivian mindscape-aware disorder refinements through the high-level resolver", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "薇薇安",
      wEngine: "霰落星殿",
      mode: "full-buff",
      agentLevel: 60,
      agentMindscape: 2,
      finalPanel: {
        attack: 3000,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 180,
      },
      scenario: {
        damageType: "disorder",
        skillTag: "basic",
        anomalyType: "侵蚀",
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

    expect((result as any).found).toBe(true)
    expect((result as any).build.loadout.agentMindscape).toBe(2)
    expect(
      (result as any).build.resolvedBuckets.anomalyBonusDamageSum,
    ).toBeCloseTo(0.28, 4)
    expect((result as any).build.resolvedBuckets.ignoreResistance).toBeCloseTo(
      0.15,
      4,
    )
  })

  it("supports Jane mindscape-aware anomaly refinements through the high-level resolver", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "简",
      wEngine: "淬锋钳刺",
      mode: "full-buff",
      agentLevel: 60,
      agentMindscape: 4,
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    expect((result as any).build.loadout.agentMindscape).toBe(4)
    expect((result as any).build.resolvedBuckets.anomalyCritRate).toBeCloseTo(
      0.688,
      4,
    )
    expect((result as any).build.resolvedBuckets.defenseReduction).toBeCloseTo(
      0.15,
      4,
    )
    expect((result as any).build.resolvedBuckets.anomalyCritDamage).toBeCloseTo(
      1,
      4,
    )
    expect(
      (result as any).build.resolvedBuckets.anomalyBonusDamageSum,
    ).toBeCloseTo(0.18, 4)
  })

  it("supports Jane m1 frenzy scaling through the high-level resolver", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "简",
      wEngine: "淬锋钳刺",
      mode: "full-buff",
      agentLevel: 60,
      agentMindscape: 1,
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    expect((result as any).build.loadout.agentMindscape).toBe(1)
    expect((result as any).build.resolvedBuckets.bonusDamageSum).toBeCloseTo(
      0.54,
      4,
    )
  })

  it("supports Jane anomaly multiplier snapshots through the high-level resolver", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "简",
      wEngine: "淬锋钳刺",
      mode: "full-buff",
      agentLevel: 60,
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    expect(
      (result as any).build.resolvedBuckets.skillMultiplierFactor,
    ).toBeCloseTo(1.4, 4)
  })

  it("supports Yanagi mindscape-aware disorder refinements through the high-level resolver", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "柳",
      wEngine: "时流贤者",
      mode: "full-buff",
      agentLevel: 60,
      agentMindscape: 4,
      finalPanel: {
        attack: 3100,
        baseAttack: 1250,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 320,
      },
      scenario: {
        damageType: "disorder",
        skillTag: "enhancedSpecial",
        anomalyType: "感电",
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

    expect((result as any).found).toBe(true)
    expect((result as any).build.loadout.agentMindscape).toBe(4)
    expect(
      (result as any).build.resolvedBuckets.anomalyProficiency,
    ).toBeCloseTo(155, 4)
    expect((result as any).build.resolvedBuckets.penetrationRate).toBeCloseTo(
      0.16,
      4,
    )
  })

  it("supports Yanagi m2 extra-thrust disorder scaling through the high-level resolver", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "柳",
      wEngine: "时流贤者",
      mode: "full-buff",
      agentLevel: 60,
      agentMindscape: 2,
      finalPanel: {
        attack: 3100,
        baseAttack: 1250,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 320,
      },
      scenario: {
        damageType: "disorder",
        skillTag: "enhancedSpecial",
        anomalyType: "感电",
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

    expect((result as any).found).toBe(true)
    expect((result as any).build.loadout.agentMindscape).toBe(2)
    expect(
      (result as any).build.resolvedBuckets.anomalyBonusDamageSum,
    ).toBeCloseTo(2.5 + (20 / 15 - 1) + 2, 4)
  })

  it("supports Timeweaver anomaly multiplier snapshots through the high-level resolver", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "柳",
      wEngine: "时流贤者",
      mode: "full-buff",
      agentLevel: 60,
      finalPanel: {
        attack: 3100,
        baseAttack: 1250,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 320,
      },
      scenario: {
        damageType: "disorder",
        skillTag: "enhancedSpecial",
        anomalyType: "感电",
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

    expect((result as any).found).toBe(true)
    expect(
      (result as any).build.resolvedBuckets.skillMultiplierFactor,
    ).toBeCloseTo(1.3, 4)
  })

  it("supports Piper anomaly multiplier snapshots through the high-level resolver", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "派派",
      wEngine: "触电唇彩",
      mode: "full-buff",
      agentLevel: 60,
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    expect(
      (result as any).build.resolvedBuckets.skillMultiplierFactor,
    ).toBeCloseTo(1.2, 4)
  })

  it("supports Burnice fire disorder duration refinement through the high-level resolver", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "柏妮思",
      wEngine: "灼心摇壶",
      mode: "full-buff",
      agentLevel: 60,
      finalPanel: {
        attack: 3100,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 160,
      },
      scenario: {
        damageType: "disorder",
        skillTag: "assist",
        anomalyType: "灼烧",
        remainingTime: 5,
        attribute: "火属性",
        extraAbilityActive: true,
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect((result as any).found).toBe(true)
    expect((result as any).build.loadout.agent.name).toBe("柏妮思")
    expect((result as any).build.loadout.wEngine.name).toBe("灼心摇壶")
    expect(
      (result as any).build.resolvedBuckets.anomalyBonusDamageSum,
    ).toBeCloseTo(12.5 / 9.5 - 1, 4)
  })

  it("supports progression-aware Burnice snapshots through the high-level resolver", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "柏妮思",
      mode: "full-buff",
      agentLevel: 60,
      agentMindscape: 5,
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    expect((result as any).build.loadout.agentMindscape).toBe(5)
    expect(
      (result as any).build.resolvedPanel.energyGenerationRate,
    ).toBeCloseTo(2.8, 4)
    expect((result as any).build.resolvedBuckets.anomalyMastery).toBeCloseTo(
      25,
      4,
    )
    expect((result as any).build.resolvedBuckets.bonusDamageSum).toBeCloseTo(
      0.2,
      4,
    )
  })

  it("supports Burnice m2 heat penetration through the high-level resolver", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "柏妮思",
      mode: "full-buff",
      agentLevel: 60,
      agentMindscape: 2,
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    expect((result as any).build.loadout.agentMindscape).toBe(2)
    expect((result as any).build.resolvedBuckets.penetrationRate).toBeCloseTo(
      0.2,
      4,
    )
  })

  it("supports Burnice m6 fire resistance ignore through resolved snapshots", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "柏妮思",
      mode: "full-buff",
      agentLevel: 60,
      agentMindscape: 6,
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    expect((result as any).build.resolvedBuckets.ignoreResistance).toBeCloseTo(
      0.25,
      4,
    )
    expect(
      (result as any).build.assumptions.some((item: string) =>
        item.includes(
          "柏妮思的影画6 25% 火抗无视当前已按 scenario.resolvedSnapshot.bucketDeltas.ignoreResistance 记录",
        ),
      ),
    ).toBe(true)
  })

  it("supports Burnice dynamic ember snapshots through the high-level resolver", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "柏妮思",
      mode: "full-buff",
      agentLevel: 60,
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    expect(
      (result as any).build.resolvedBuckets.anomalyBonusDamageSum,
    ).toBeCloseTo(2.5, 4)
    expect(
      (result as any).build.assumptions.some((item: string) =>
        item.includes("scenario.dynamicSnapshot 的[燃点]/[余烬]快照"),
      ),
    ).toBe(true)
  })

  it("accepts V6 state snapshot fields through the high-level resolver", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "爱丽丝",
      mode: "baseline",
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    expect((result as any).build.damage.expected.total).toBeGreaterThan(0)
  })

  it("applies V7 resolved snapshot fields through the high-level resolver", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "爱丽丝",
      mode: "baseline",
      agentLevel: 60,
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    expect((result as any).build.damage.expected.total).toBeGreaterThan(0)
    expect(
      (result as any).build.resolvedBuckets.anomalyBonusDamageSum,
    ).toBeCloseTo(0.3, 4)
    expect(
      (result as any).build.resolvedBuckets.skillMultiplierFactor,
    ).toBeCloseTo(1.8, 4)
  })

  it("supports Alice polarity assault state snapshots through the high-level resolver", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "爱丽丝",
      mode: "baseline",
      agentLevel: 60,
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    expect(
      (result as any).build.resolvedBuckets.skillMultiplierFactor,
    ).toBeCloseTo(2.5, 4)
    expect(
      (result as any).build.assumptions.some((item: string) =>
        item.includes("已按 scenario.stateSnapshot 展开[极性强击]"),
      ),
    ).toBe(true)
  })

  it("supports progression-aware Orphie snapshots through the high-level resolver", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "奥菲丝&「鬼火」",
      wEngine: "嚣枪喧焰",
      agentMindscape: 1,
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    expect((result as any).build.loadout.agentMindscape).toBe(1)
    expect((result as any).build.resolvedPanel.attack).toBeCloseTo(3740, 4)
    expect((result as any).build.resolvedBuckets.bonusDamageSum).toBeCloseTo(
      1.05,
      4,
    )
  })

  it("supports Orphie mindscape-aware static bonuses through the high-level resolver", async () => {
    const result = await runTool(resolveBuildDamage, {
      agent: "奥菲丝&「鬼火」",
      agentMindscape: 4,
      mode: "full-buff",
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    expect((result as any).build.loadout.agentMindscape).toBe(4)
    expect((result as any).build.resolvedPanel.attack).toBeCloseTo(3990, 4)
    expect((result as any).build.resolvedBuckets.bonusDamageSum).toBeCloseTo(
      0.6,
      4,
    )
    expect((result as any).build.resolvedBuckets.ignoreResistance).toBeCloseTo(
      0.15,
      4,
    )
  })

  it("rejects anomaly formulas for non-anomaly agents", async () => {
    await expect(
      runTool(resolveBuildDamage, {
        agent: "朱鸢",
        finalPanel: {
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
    ).rejects.toThrow(/does not support damageType=anomaly/)
  })
})
