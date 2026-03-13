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
    expect(result.summary.rowCount).toBe(21)
    expect(result.summary.baseDamageStat).toBe("attack")
    expect(result.diagnosticSummary.count).toBe(
      result.rows.flatMap((row) => row.diagnostics).length,
    )
    expect(result.diagnosticSummary.hasDiagnostics).toBe(
      result.diagnosticSummary.count > 0,
    )
    expect(result.sourceNoteSummary.count).toBe(
      result.rows.flatMap((row) => row.sourceNotes).length,
    )
    expect(result.sourceNoteSummary.hasSourceNotes).toBe(
      result.sourceNoteSummary.count > 0,
    )
    expect(result.summary.commonBuckets.critRate).toBeCloseTo(0.15, 4)
    expect(
      result.summary.commonFormulaMultipliers.critMultiplier,
    ).toBeGreaterThan(1)
    const globalEffect = result.effectSummary.find(
      (item) =>
        item.sourceName === "防暴者Ⅵ型" &&
        item.label === "音擎被动：暴击率提升",
    )
    expect(globalEffect).toMatchObject({
      appliedRowCount: 21,
      totalRowCount: 21,
      appliesToAllRows: true,
      condition: "当前矩阵全部生效",
    })
    expect(globalEffect?.value).toBeTruthy()
    expect(result.rows).toHaveLength(21)
    expect(result.rows[0]?.label).toBe("普通攻击·一段")
    expect(result.rows[0]?.metadata).toMatchObject({
      order: 1,
      actionName: "普通攻击",
      skillName: "普通攻击",
      qualifiers: [],
      canonicalLabel: "普通攻击·一段",
      stableKey:
        "1241::curated::0::一段伤害倍率::1::basic::default::Ether::agent-default",
      templateSource: "curated",
      sourceSkillTypeId: 0,
      sourceStatName: "一段伤害倍率",
      sourceOccurrence: 1,
      attributeSource: "agent-default",
      templateCombatTags: [],
      entryType: "hit",
      aggregationType: "per-hit",
      isAdditionalDamage: false,
      variantAxis: "segment",
      segmentLabel: "一段",
      segmentIndex: 1,
    })
    expect(result.rows[0]?.metadata.sourceStatId).toBeTruthy()

    const etherBurst = result.rows.find(
      (row) => row.id === "1241-suppression-ether-3",
    )
    expect(etherBurst?.skillMultiplier).toBe("964.2%")
    expect(etherBurst?.metadata).toMatchObject({
      skillName: "请勿抵抗",
      canonicalLabel: "普通攻击·请勿抵抗·以太·三段",
      qualifiers: ["以太"],
      templateSource: "curated",
      sourceSkillTypeId: 0,
      templateCombatTags: ["suppressionMode"],
      sourceStatName: "三段伤害倍率（以太）",
      sourceOccurrence: 1,
      attributeSource: "template",
      entryType: "hit",
      aggregationType: "per-hit",
      isAdditionalDamage: false,
      variantAxis: "segment",
      segmentIndex: 3,
    })
    expect(etherBurst?.metadata.sourceStatId).toBeTruthy()
    expect(etherBurst?.damageSummary.expected).toBeGreaterThan(0)
    expect(etherBurst?.damageSummary.crit).toBeGreaterThan(
      etherBurst?.damageSummary.expected ?? 0,
    )
    expect(etherBurst?.diagnostics).toBeInstanceOf(Array)
    expect(etherBurst?.sourceNotes).toBeInstanceOf(Array)
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
    expect(result.summary.rowCount).toBe(22)
    expect(result.summary.baseDamageStat).toBe("sheerForce")
    expect(result.diagnosticSummary.count).toBe(
      result.rows.flatMap((row) => row.diagnostics).length,
    )
    expect(result.sourceNoteSummary.count).toBe(
      result.rows.flatMap((row) => row.sourceNotes).length,
    )
    expect(result.rows).toHaveLength(22)
    expect(result.rows.every((row) => row.damageType === "sheer")).toBe(true)

    const ultimate = result.rows.find((row) => row.label === "终结技·青溟云影")
    expect(ultimate?.skillMultiplier).toBe("4380.9%")
    expect(ultimate?.damageSummary.expected).toBeGreaterThan(0)
    expect(ultimate?.build.resolvedPanel.baseDamageStat).toBe("sheerForce")
  })

  it("builds Ellen full skill matrix rows", () => {
    const result = resolveStaticBuildSkillMatrix({
      mode: "full-buff",
      loadout: {
        agentId: "1191",
        wEngineId: "14119",
        driveDiscSets: [{ id: "32500", pieces: 4 }],
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
        combatTags: ["frozenTarget"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.profile.id).toBe("standard-normal")
    expect(result.rows).toHaveLength(24)
    expect(result.rows[0]?.label).toBe("普通攻击·利齿修剪法·一段")
    const frostSmall = result.rows.find(
      (row) => row.id === "1191-basic-frost-small",
    )
    expect(frostSmall?.metadata).toMatchObject({
      skillName: "霜锋",
      entryType: "size-variant",
      aggregationType: "whole-entry",
      isAdditionalDamage: false,
      variantAxis: "target-size",
      targetSize: "small",
    })

    const ultimate = result.rows.find((row) => row.label === "终结技·永冬狂宴")
    expect(ultimate?.skillMultiplier).toBe("4469.3%")
    expect(ultimate?.damageSummary.expected).toBeGreaterThan(0)
    expect(ultimate?.build.damage.expected.total).toBeGreaterThan(0)
  })

  it("builds Harumasa matrix rows with dash slash tags", () => {
    const result = resolveStaticBuildSkillMatrix({
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
      context: {
        combatTags: ["shockedTarget"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.rows).toHaveLength(22)
    const slash = result.rows.find((row) => row.id === "1201-dash-slash-1")
    expect(slash?.skillMultiplier).toBe("384.3%")
    expect(slash?.combatTags).toContain("harumasaSharpness")
    const extra = result.rows.find((row) => row.id === "1201-dash-slash-extra")
    expect(extra?.metadata).toMatchObject({
      skillName: "飞弦",
      qualifiers: ["斩", "额外伤害"],
      entryType: "extra",
      aggregationType: "whole-entry",
      isAdditionalDamage: true,
    })
    const ultimate = result.rows.find((row) => row.label === "终结技·残心")
    expect(ultimate?.skillMultiplier).toBe("4619.4%")
  })

  it("builds generic attack agent matrix rows when no curated template exists", () => {
    const result = resolveStaticBuildSkillMatrix({
      loadout: {
        agentId: "1021",
        wEngineId: "14102",
      },
      panel: {
        attack: 2800,
        baseAttack: 1100,
        critRate: 0.5,
        critDamage: 1.1,
      },
      context: {
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.profile.id).toBe("standard-normal")
    expect(result.rows.length).toBeGreaterThan(0)
    expect(result.rows[0]?.label).toBe("普通攻击·一段")
    expect(result.rows[0]?.skillMultiplier).toBe("131.7%")
    expect(result.effectSummary.some((item) => item.appliedRowCount > 0)).toBe(
      true,
    )
    expect(result.rows[0]?.metadata).toMatchObject({
      canonicalLabel: "普通攻击·一段",
      templateSource: "generated",
      attributeSource: "agent-default",
      sourceOccurrence: 1,
      templateCombatTags: [],
      aggregationType: "per-hit",
      isAdditionalDamage: false,
      variantAxis: "segment",
    })
    expect(result.rows[0]?.metadata.sourceStatId).toBeTruthy()
    expect(
      result.assumptions.some((item) =>
        item.includes("猫又 当前未收录 curated"),
      ),
    ).toBe(false)
    expect(
      result.assumptions.some((item) => item.includes("通用技能矩阵模板生成")),
    ).toBe(true)
  })

  it("applies Zero Anby curated effects while keeping generic matrix generation", () => {
    const result = resolveStaticBuildSkillMatrix({
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
      context: {
        extraAbilityActive: true,
        combatTags: ["silverStarTarget", "purityBloom", "purityBloomMax"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.profile.id).toBe("standard-normal")
    expect(result.rows.length).toBeGreaterThan(0)
    const chainRow = result.rows.find((row) => row.skillTag === "chain")
    const ultimateRow = result.rows.find((row) => row.label === "终结技")
    expect(chainRow?.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.7, 4)
    expect(ultimateRow?.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.7, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes("零号·安比 当前未收录 curated"),
      ),
    ).toBe(false)
    expect(
      result.assumptions.some((item) => item.includes("通用技能矩阵模板生成")),
    ).toBe(true)
  })

  it("applies Hugo curated effects on generic chain matrix rows", () => {
    const result = resolveStaticBuildSkillMatrix({
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
      context: {
        extraAbilityActive: true,
        combatTags: ["darkAbyssEcho", "commonEnemy"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    const chainRow = result.rows.find((row) => row.skillTag === "chain")
    expect(chainRow?.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.5, 4)
    expect(chainRow?.build.resolvedPanel.critRate).toBeCloseTo(0.62, 4)
    expect(chainRow?.build.resolvedPanel.critDamage).toBeCloseTo(1.9, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes("雨果 当前未收录 curated"),
      ),
    ).toBe(false)
    expect(
      result.assumptions.some((item) => item.includes("通用技能矩阵模板生成")),
    ).toBe(true)
  })

  it("applies Mato curated effects on generic rupture matrix rows", () => {
    const result = resolveStaticBuildSkillMatrix({
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
      context: {
        combatTags: ["moltenEdge", "hpLoss", "hpConsumedSlash"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    const basicRow = result.rows.find((row) => row.skillTag === "basic")
    expect(basicRow?.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.35, 4)
    expect(basicRow?.build.resolvedPanel.critRate).toBeCloseTo(0.6, 4)
    expect(basicRow?.build.resolvedPanel.critDamage).toBeCloseTo(1.6, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes("真斗 当前未收录 curated"),
      ),
    ).toBe(false)
    expect(
      result.assumptions.some((item) => item.includes("通用技能矩阵模板生成")),
    ).toBe(true)
  })

  it("applies Idhari curated effects on generic rupture matrix rows", () => {
    const result = resolveStaticBuildSkillMatrix({
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
      context: {
        extraAbilityActive: true,
        combatTags: ["lowHp", "hpLoss"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    const enhancedSpecialRow = result.rows.find(
      (row) => row.skillTag === "enhancedSpecial",
    )
    expect(enhancedSpecialRow?.resolvedBuckets.bonusDamageSum).toBeCloseTo(1, 4)
    expect(enhancedSpecialRow?.resolvedBuckets.sheerBonusSum).toBeCloseTo(
      0.18,
      4,
    )
    expect(enhancedSpecialRow?.build.resolvedPanel.critRate).toBeCloseTo(0.6, 4)
    expect(enhancedSpecialRow?.build.resolvedPanel.critDamage).toBeCloseTo(
      1.5,
      4,
    )
  })

  it("applies Ye Shunguang curated effects on generic attack matrix rows", () => {
    const result = resolveStaticBuildSkillMatrix({
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
      context: {
        combatTags: ["hedao", "etherCurtain"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    const ultimateRow = result.rows.find((row) => row.skillTag === "ultimate")
    expect(ultimateRow?.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.5, 4)
    expect(ultimateRow?.resolvedBuckets.ignoreResistance).toBeCloseTo(0.2, 4)
    expect(ultimateRow?.build.resolvedPanel.critRate).toBeCloseTo(0.75, 4)
    expect(ultimateRow?.build.resolvedPanel.critDamage).toBeCloseTo(1.45, 4)
  })

  it("applies Xisifu curated effects on generic attack matrix rows", () => {
    const result = resolveStaticBuildSkillMatrix({
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
      context: {
        extraAbilityActive: true,
        combatTags: ["toxin"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    const basicRow = result.rows.find((row) => row.skillTag === "basic")
    expect(basicRow?.resolvedBuckets.critRate).toBeCloseTo(0.25, 4)
    expect(basicRow?.resolvedBuckets.critDamage).toBeCloseTo(0.5, 4)
    expect(basicRow?.build.resolvedPanel.critRate).toBeCloseTo(0.7, 4)
    expect(basicRow?.build.resolvedPanel.critDamage).toBeCloseTo(1.7, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes("希希芙 当前未收录 curated"),
      ),
    ).toBe(false)
    expect(
      result.assumptions.some((item) => item.includes("通用技能矩阵模板生成")),
    ).toBe(true)
  })

  it("applies Sid curated effects on generic attack matrix rows", () => {
    const result = resolveStaticBuildSkillMatrix({
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
      context: {
        extraAbilityActive: true,
        combatTags: ["raidState", "encirclement"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    const basicRow = result.rows.find((row) => row.skillTag === "basic")
    expect(basicRow?.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.8, 4)
    expect(basicRow?.resolvedBuckets.ignoreResistance).toBeCloseTo(0.25, 4)
    expect(basicRow?.build.resolvedPanel.attack).toBeCloseTo(4300, 4)
    expect(basicRow?.build.resolvedPanel.critRate).toBeCloseTo(0.6, 4)
    expect(basicRow?.build.resolvedPanel.critDamage).toBeCloseTo(1.5, 4)
    expect(
      result.assumptions.some((item) =>
        item.includes("「席德」 当前未收录 curated"),
      ),
    ).toBe(false)
    expect(
      result.assumptions.some((item) => item.includes("通用技能矩阵模板生成")),
    ).toBe(true)
  })

  it("builds generic rupture matrix rows through the standard sheer profile", () => {
    const result = resolveStaticBuildSkillMatrix({
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
      context: {
        extraAbilityActive: true,
        combatTags: ["banyueCoreBuff", "mingwang", "vajraFlame"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.profile.id).toBe("standard-sheer")
    expect(result.rows.length).toBeGreaterThan(0)
    expect(result.rows.every((row) => row.damageType === "sheer")).toBe(true)
    expect(result.rows[0]?.build.resolvedPanel.baseDamageStat).toBe(
      "sheerForce",
    )
    const enhancedSpecialRow = result.rows.find(
      (row) => row.label === "强化特殊技",
    )
    expect(enhancedSpecialRow?.resolvedBuckets.bonusDamageSum).toBeCloseTo(
      0.51,
      4,
    )
    expect(enhancedSpecialRow?.resolvedBuckets.sheerBonusSum).toBeCloseTo(
      0.18,
      4,
    )
    expect(
      result.assumptions.some((item) =>
        item.includes("般岳 当前未收录 curated"),
      ),
    ).toBe(false)
  })
})
