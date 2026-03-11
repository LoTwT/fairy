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
})
