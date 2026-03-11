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
    expect(result.rows[0]?.metadata).toEqual({
      order: 1,
      actionName: "普通攻击",
      skillName: "普通攻击",
      qualifiers: [],
      entryType: "hit",
      segmentLabel: "一段",
      segmentIndex: 1,
    })

    const etherBurst = result.rows.find(
      (row) => row.id === "1241-suppression-ether-3",
    )
    expect(etherBurst?.skillMultiplier).toBe("964.2%")
    expect(etherBurst?.metadata).toMatchObject({
      skillName: "请勿抵抗",
      qualifiers: ["以太"],
      entryType: "hit",
      segmentIndex: 3,
    })
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
      targetSize: "small",
    })

    const ultimate = result.rows.find((row) => row.label === "终结技·永冬狂宴")
    expect(ultimate?.skillMultiplier).toBe("4469.3%")
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
    expect(chainRow?.build.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.7, 4)
    expect(ultimateRow?.build.resolvedBuckets.bonusDamageSum).toBeCloseTo(
      0.7,
      4,
    )
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
    expect(chainRow?.build.resolvedBuckets.bonusDamageSum).toBeCloseTo(0.5, 4)
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
    expect(
      enhancedSpecialRow?.build.resolvedBuckets.bonusDamageSum,
    ).toBeCloseTo(0.51, 4)
    expect(enhancedSpecialRow?.build.resolvedBuckets.sheerBonusSum).toBeCloseTo(
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
