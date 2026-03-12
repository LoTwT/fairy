import { describe, expect, it } from "vitest"

import { resolveBuildSourceDamageViews } from "../src/mastra/tools/zzz/resolve-build-source-damage-views"
import { runTool } from "./shared"

describe("resolveBuildSourceDamageViews tool", () => {
  it("returns source-specific views for covered anomaly agents", async () => {
    const result = await runTool(resolveBuildSourceDamageViews, {
      agent: "爱丽丝",
      mode: "baseline",
      finalPanel: {
        attack: 2800,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 200,
        anomalyMastery: 180,
      },
      scenario: {
        damageType: "anomaly",
        skillTag: "enhancedSpecial",
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
    expect((result as any).views.entries).toHaveLength(1)
    expect((result as any).views.entries[0]).toMatchObject({
      id: "alice-polarity-assault",
      supported: true,
      resolutionMode: "standalone",
    })
    expect((result as any).views.entries[0].damage.expected).toBeGreaterThan(0)
  })

  it("rejects non-anomaly source view requests", async () => {
    const result = await runTool(resolveBuildSourceDamageViews, {
      agent: "爱丽丝",
      finalPanel: {
        attack: 2800,
        critRate: 0.2,
        critDamage: 0.5,
      },
      scenario: {
        damageType: "normal",
        skillTag: "basic",
        skillMultiplier: "300%",
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect((result as any).found).toBe(false)
    expect((result as any).supportedDamageTypes).toEqual([
      "anomaly",
      "disorder",
    ])
  })

  it("returns source-view support scope when the agent has no view coverage", async () => {
    const result = await runTool(resolveBuildSourceDamageViews, {
      agent: "朱鸢",
      finalPanel: {
        attack: 3200,
        critRate: 0.55,
        critDamage: 1.4,
      },
      scenario: {
        damageType: "anomaly",
        skillTag: "special",
        damageMultiplier: "300%",
        attribute: "以太",
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect((result as any).found).toBe(false)
    expect((result as any).supportedAgents).toEqual(["爱丽丝", "柏妮思", "雅"])
  })
})
