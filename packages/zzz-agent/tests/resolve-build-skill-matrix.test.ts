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

  it("returns supported scope when agent is outside the V1 matrix", async () => {
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
