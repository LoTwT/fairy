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

  it("returns supported scope when agent is outside the V1 resolver", async () => {
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
})
