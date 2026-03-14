import { describe, expect, it } from "vitest"
import { resolveBuildSkillMatrix } from "../src/mastra/tools/zzz/resolve-build-skill-matrix"
import { runTool } from "./shared"

describe("resolveBuildSkillMatrix tool", () => {
  it("returns full skill matrix rows for supported agents", async () => {
    const result = await runTool(resolveBuildSkillMatrix, {
      agent: "朱鸢",
      wEngine: "防暴者Ⅵ型",
      driveDiscs: [{ name: "啄木鸟电音", pieces: 4 }],
      mode: "baseline",
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    expect((result as any).matrix.rows).toHaveLength(21)
    expect((result as any).matrix.rows[0].label).toBe("普通攻击·一段")
    expect((result as any).matrix.rows[0].metadata).toMatchObject({
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
    const firstRow = (result as any).matrix.rows[0]
    expect(firstRow.metadata.sourceStatId).toBeTruthy()
    expect(firstRow.build).toBeUndefined()
    expect(firstRow.damage.expected).toBeGreaterThan(0)
    expect(firstRow.summary.expectedTotal).toBeCloseTo(
      firstRow.damage.expected,
      6,
    )
    expect(firstRow.diagnostics).toBeInstanceOf(Array)
    expect(firstRow.diagnosticSummary.count).toBe(firstRow.diagnostics.length)
    expect(firstRow.sourceNotes).toBeInstanceOf(Array)
    expect(firstRow.sourceNoteSummary.count).toBe(firstRow.sourceNotes.length)
    expect(firstRow.caveatSummary).toEqual({
      assumptionCount: firstRow.assumptions.length,
      unsupportedEffectCount: firstRow.unsupportedEffects.length,
      hasAssumptions: firstRow.assumptions.length > 0,
      hasUnsupportedEffects: firstRow.unsupportedEffects.length > 0,
    })
    expect(firstRow.assumptions).toBeInstanceOf(Array)
    expect(firstRow.unsupportedEffects).toBeInstanceOf(Array)
    const globalEffect = (result as any).matrix.effectSummary.find(
      (item: any) =>
        item.sourceName === "防暴者Ⅵ型" &&
        item.label === "音擎被动：暴击率提升",
    )
    expect(globalEffect?.value).toBeTruthy()
    expect(globalEffect?.appliedRowCount).toBe(21)
    expect(globalEffect?.totalRowCount).toBe(21)
    expect((result as any).matrix.summary.rowCount).toBe(21)
    expect((result as any).matrix.summary.baseDamageStat).toBe("attack")
    expect((result as any).matrix.unsupportedEffects).toEqual([
      ...new Set(
        (result as any).matrix.rows.flatMap(
          (row: any) => row.unsupportedEffects,
        ),
      ),
    ])
    expect((result as any).matrix.caveatSummary).toEqual({
      assumptionCount: (result as any).matrix.assumptions.length,
      unsupportedEffectCount: (result as any).matrix.unsupportedEffects.length,
      hasAssumptions: (result as any).matrix.assumptions.length > 0,
      hasUnsupportedEffects:
        (result as any).matrix.unsupportedEffects.length > 0,
    })
    expect((result as any).matrix.summary.caveatSummary).toEqual(
      (result as any).matrix.caveatSummary,
    )
    expect((result as any).matrix.diagnosticSummary.count).toBe(
      (result as any).matrix.rows.flatMap((row: any) => row.diagnostics).length,
    )
    expect((result as any).matrix.sourceNoteSummary.count).toBe(
      (result as any).matrix.rows.flatMap((row: any) => row.sourceNotes).length,
    )
    expect((result as any).matrix.summary.diagnosticSummary).toEqual(
      (result as any).matrix.diagnosticSummary,
    )
    expect((result as any).matrix.summary.sourceNoteSummary).toEqual(
      (result as any).matrix.sourceNoteSummary,
    )
    const normalGroup = (result as any).matrix.summary.groups.find(
      (group: any) => group.key === "普通攻击",
    )
    const normalRows = (result as any).matrix.rows.filter(
      (row: any) => row.group === "普通攻击",
    )
    expect(normalGroup?.count).toBe(normalRows.length)
    expect(normalGroup?.commonBuckets.critRate).toBeCloseTo(0.15, 4)
    expect(
      normalGroup?.commonFormulaMultipliers.critMultiplier,
    ).toBeGreaterThan(1)
    const normalGroupEffect = normalGroup?.effectSummary.find(
      (item: any) =>
        item.sourceName === "防暴者Ⅵ型" &&
        item.label === "音擎被动：暴击率提升",
    )
    expect(normalGroupEffect?.appliedRowCount).toBe(normalGroup?.count)
    expect(normalGroupEffect?.totalRowCount).toBe(normalGroup?.count)
    expect(normalGroup?.diagnosticSummary.count).toBe(
      normalRows.flatMap((row: any) => row.diagnostics).length,
    )
    expect(normalGroup?.sourceNoteSummary.count).toBe(
      normalRows.flatMap((row: any) => row.sourceNotes).length,
    )
    expect(normalGroup?.caveatSummary).toEqual({
      assumptionCount: normalGroup?.assumptions.length,
      unsupportedEffectCount: normalGroup?.unsupportedEffects.length,
      hasAssumptions: (normalGroup?.assumptions.length ?? 0) > 0,
      hasUnsupportedEffects: (normalGroup?.unsupportedEffects.length ?? 0) > 0,
    })
    expect(normalGroup?.assumptions).toEqual([
      ...new Set(normalRows.flatMap((row: any) => row.assumptions)),
    ])
    expect(normalGroup?.unsupportedEffects).toEqual([
      ...new Set(normalRows.flatMap((row: any) => row.unsupportedEffects)),
    ])
    expect(
      (result as any).matrix.summary.commonFormulaMultipliers.critMultiplier,
    ).toBeGreaterThan(1)
  })

  it("returns full per-row build details only when explicitly requested", async () => {
    const result = await runTool(resolveBuildSkillMatrix, {
      agent: "仪玄",
      wEngine: "青溟笼舍",
      driveDiscs: [{ name: "云岿如我", pieces: 4 }],
      mode: "full-buff",
      includeDetails: true,
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    expect((result as any).matrix.summary.rowCount).toBe(22)
    expect((result as any).matrix.summary.baseDamageStat).toBe("sheerForce")
    expect((result as any).matrix.diagnosticSummary.count).toBe(
      (result as any).matrix.rows.flatMap((row: any) => row.diagnostics).length,
    )
    expect((result as any).matrix.sourceNoteSummary.count).toBe(
      (result as any).matrix.rows.flatMap((row: any) => row.sourceNotes).length,
    )
    const firstRow = (result as any).matrix.rows[0]
    expect(firstRow.diagnosticSummary.count).toBe(firstRow.diagnostics.length)
    expect(firstRow.sourceNoteSummary.count).toBe(firstRow.sourceNotes.length)
    expect(firstRow.caveatSummary).toEqual({
      assumptionCount: firstRow.assumptions.length,
      unsupportedEffectCount: firstRow.unsupportedEffects.length,
      hasAssumptions: firstRow.assumptions.length > 0,
      hasUnsupportedEffects: firstRow.unsupportedEffects.length > 0,
    })
    expect(firstRow.build).toBeTruthy()
    expect(firstRow.summary).toEqual(firstRow.build.summary)
  })

  it("returns Ellen matrix rows through the high-level tool", async () => {
    const result = await runTool(resolveBuildSkillMatrix, {
      agent: "艾莲·乔",
      wEngine: "深海访客",
      driveDiscs: [{ name: "极地重金属", pieces: 4 }],
      mode: "full-buff",
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    expect((result as any).matrix.rows).toHaveLength(24)
    expect((result as any).matrix.rows[0].label).toBe(
      "普通攻击·利齿修剪法·一段",
    )
    const frost = (result as any).matrix.rows.find(
      (row: any) => row.id === "1191-basic-frost-small",
    )
    expect(frost?.metadata.targetSize).toBe("small")
  })

  it("returns generic matrix rows for newly supported attack agents", async () => {
    const result = await runTool(resolveBuildSkillMatrix, {
      agent: "猫又",
      wEngine: "钢铁肉垫",
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    expect((result as any).matrix.rows.length).toBeGreaterThan(0)
    expect((result as any).matrix.rows[0].label).toBe("普通攻击·一段")
  })

  it("keeps Moon Phase Charlie out of generic matrix coverage gaps", async () => {
    const result = await runTool(resolveBuildSkillMatrix, {
      agent: "猫又",
      wEngine: "「月相」-朔",
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    expect((result as any).matrix.assumptions.join(" ")).not.toContain(
      "「月相」-朔 当前未收录 curated",
    )
  })

  it("returns Corin generic matrix rows with partial Housekeeper coverage", async () => {
    const result = await runTool(resolveBuildSkillMatrix, {
      agent: "可琳",
      wEngine: "家政员",
      mode: "full-buff",
      finalPanel: {
        attack: 2600,
        baseAttack: 1050,
        critRate: 0.35,
        critDamage: 0.8,
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

    expect((result as any).found).toBe(true)
    expect((result as any).matrix.rows.length).toBeGreaterThan(0)
    expect(
      (result as any).matrix.summary.commonBuckets.bonusDamageSum,
    ).toBeCloseTo(0.8, 4)
  })

  it("keeps Billy generic matrix support while moving legacy gaps to source notes", async () => {
    const result = await runTool(resolveBuildSkillMatrix, {
      agent: "比利",
      wEngine: "仿制星徽引擎",
      finalPanel: {
        attack: 2500,
        baseAttack: 1000,
        critRate: 0.4,
        critDamage: 0.9,
      },
      context: {
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect((result as any).found).toBe(true)
    expect((result as any).matrix.rows.length).toBeGreaterThan(0)
    expect((result as any).matrix.assumptions.join(" ")).not.toContain(
      "比利 当前未收录 curated",
    )
  })

  it("returns Zero Anby generic matrix rows with curated buckets applied", async () => {
    const result = await runTool(resolveBuildSkillMatrix, {
      agent: "零号安比",
      wEngine: "牺牲洁纯",
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    expect((result as any).matrix.rows.length).toBeGreaterThan(0)
    const chainRow = (result as any).matrix.rows.find(
      (row: any) => row.label === "连携技",
    )
    const ultimateRow = (result as any).matrix.rows.find(
      (row: any) => row.label === "终结技",
    )
    expect(chainRow?.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.7, 4)
    expect(ultimateRow?.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.7, 4)
  })

  it("returns Hugo generic matrix rows with curated chain bonuses applied", async () => {
    const result = await runTool(resolveBuildSkillMatrix, {
      agent: "雨果",
      wEngine: "千面日陨",
      mode: "full-buff",
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    const chainRow = (result as any).matrix.rows.find(
      (row: any) => row.skillTag === "chain",
    )
    expect(chainRow?.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.5, 4)
    expect((result as any).matrix.summary.critRate).toBeCloseTo(0.62, 4)
    expect((result as any).matrix.summary.critDamage).toBeCloseTo(1.9, 4)
  })

  it("accepts progression-aware Orphie snapshots in skill matrix requests", async () => {
    const result = await runTool(resolveBuildSkillMatrix, {
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
      context: {
        combatTags: ["followUp", "crosshairFocus"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect((result as any).found).toBe(true)
    expect((result as any).matrix.loadout.agentMindscape).toBe(1)
    expect((result as any).matrix.summary.attack).toBeCloseTo(3740, 4)
  })

  it("applies Orphie mindscape-aware static bonuses in skill matrix requests", async () => {
    const result = await runTool(resolveBuildSkillMatrix, {
      agent: "奥菲丝&「鬼火」",
      agentMindscape: 4,
      finalPanel: {
        attack: 3400,
        baseAttack: 1250,
        critRate: 0.45,
        critDamage: 1.2,
        energyGenerationRate: 1.9,
      },
      context: {
        combatTags: ["crosshairFocus", "afterUltimate"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect((result as any).found).toBe(true)
    expect((result as any).matrix.loadout.agentMindscape).toBe(4)
    expect((result as any).matrix.summary.attack).toBeCloseTo(3990, 4)
    const enhancedSpecialRow = (result as any).matrix.rows.find(
      (row: any) => row.skillTag === "enhancedSpecial",
    )
    expect(enhancedSpecialRow?.resolvedBuckets.bonusDamageSum).toBeCloseTo(
      0.6,
      4,
    )
    expect(enhancedSpecialRow?.resolvedBuckets.ignoreResistance).toBeCloseTo(
      0.15,
      4,
    )
  })

  it("returns generic rupture matrix rows with Banyue curated buckets applied", async () => {
    const result = await runTool(resolveBuildSkillMatrix, {
      agent: "般岳",
      wEngine: "怒目金刚",
      mode: "full-buff",
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    const enhancedSpecialRow = (result as any).matrix.rows.find(
      (row: any) => row.label === "强化特殊技",
    )
    expect(enhancedSpecialRow?.resolvedBuckets.bonusDamageSum).toBeCloseTo(
      0.51,
      4,
    )
    expect(enhancedSpecialRow?.resolvedBuckets.sheerBonusSum).toBeCloseTo(
      0.18,
      4,
    )
  })

  it("returns Mato generic rupture matrix rows with curated buckets applied", async () => {
    const result = await runTool(resolveBuildSkillMatrix, {
      agent: "真斗",
      wEngine: "燔火胧夜",
      mode: "full-buff",
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    const basicRow = (result as any).matrix.rows.find(
      (row: any) => row.skillTag === "basic",
    )
    expect(basicRow?.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.35, 4)
    expect((result as any).matrix.summary.critRate).toBeCloseTo(0.6, 4)
  })

  it("returns Idhari generic rupture matrix rows with curated buckets applied", async () => {
    const result = await runTool(resolveBuildSkillMatrix, {
      agent: "伊德海莉",
      wEngine: "海妖摇篮",
      mode: "full-buff",
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    const enhancedSpecialRow = (result as any).matrix.rows.find(
      (row: any) => row.skillTag === "enhancedSpecial",
    )
    expect(enhancedSpecialRow?.resolvedBuckets.sheerBonusSum).toBeCloseTo(
      0.18,
      4,
    )
    expect((result as any).matrix.summary.critDamage).toBeCloseTo(1.5, 4)
  })

  it("returns Ye Shunguang generic attack matrix rows with curated buckets applied", async () => {
    const result = await runTool(resolveBuildSkillMatrix, {
      agent: "叶瞬光",
      wEngine: "云霓孤光",
      mode: "full-buff",
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    const ultimateRow = (result as any).matrix.rows.find(
      (row: any) => row.skillTag === "ultimate",
    )
    expect(ultimateRow?.resolvedBuckets.ignoreResistance).toBeCloseTo(0.2, 4)
    expect((result as any).matrix.summary.critRate).toBeCloseTo(0.75, 4)
  })

  it("returns Xisifu generic attack matrix rows with curated buckets applied", async () => {
    const result = await runTool(resolveBuildSkillMatrix, {
      agent: "希希芙",
      wEngine: "鳞齿寻踪",
      mode: "full-buff",
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    const basicRow = (result as any).matrix.rows.find(
      (row: any) => row.skillTag === "basic",
    )
    expect(basicRow?.resolvedBuckets.critRate).toBeCloseTo(0.25, 4)
    expect(basicRow?.resolvedBuckets.critDamage).toBeCloseTo(0.5, 4)
    expect((result as any).matrix.summary.critRate).toBeCloseTo(0.7, 4)
  })

  it("returns Sid generic attack matrix rows with curated buckets applied", async () => {
    const result = await runTool(resolveBuildSkillMatrix, {
      agent: "席德",
      wEngine: "机巧心种",
      mode: "full-buff",
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    const basicRow = (result as any).matrix.rows.find(
      (row: any) => row.skillTag === "basic",
    )
    expect(basicRow?.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.8, 4)
    expect(basicRow?.resolvedBuckets.ignoreResistance).toBeCloseTo(0.25, 4)
    expect((result as any).matrix.summary.attack).toBeCloseTo(4300, 4)
  })

  it("returns supported scope when agent is outside the supported specialties", async () => {
    const result = await runTool(resolveBuildSkillMatrix, {
      agent: "安比",
      finalPanel: {
        attack: 2000,
        critRate: 0.5,
        critDamage: 1,
      },
      context: {
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect((result as any).found).toBe(false)
    expect((result as any).supportedAgents).toContain("朱鸢")
  })

  it("rejects incompatible specialty w-engines before building the matrix", async () => {
    const result = await runTool(resolveBuildSkillMatrix, {
      agent: "猫又",
      wEngine: "青溟笼舍",
      finalPanel: {
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

    expect((result as any).found).toBe(false)
    expect((result as any).message).toContain("无法使用")
    expect((result as any).supportedWEngines).toContain("加农转子")
    expect((result as any).supportedWEngines).not.toContain("青溟笼舍")
  })

  it("keeps anomaly agents outside the current matrix support scope", async () => {
    const result = await runTool(resolveBuildSkillMatrix, {
      agent: "格莉丝",
      finalPanel: {
        attack: 3000,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 120,
      },
      context: {
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect((result as any).found).toBe(false)
    expect((result as any).supportedAgents).toContain("朱鸢")
    expect((result as any).supportedAgents).not.toContain("格莉丝")
  })
})
