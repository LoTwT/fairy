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
    expect((result as any).matrix.rows[0].metadata).toEqual({
      order: 1,
      actionName: "普通攻击",
      skillName: "普通攻击",
      qualifiers: [],
      entryType: "hit",
      segmentLabel: "一段",
      segmentIndex: 1,
    })
    expect((result as any).matrix.rows[0].build).toBeUndefined()
    expect((result as any).matrix.effectSummary[0].value).toBeTruthy()
    expect((result as any).matrix.summary.baseDamageStat).toBe("attack")
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
    expect((result as any).matrix.summary.baseDamageStat).toBe("sheerForce")
    expect((result as any).matrix.rows[0].build).toBeTruthy()
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
})
