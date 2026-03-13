import { describe, expect, it } from "vitest"

import { resolveBuildTriggerMatrix } from "../src/mastra/tools/zzz/resolve-build-trigger-matrix"
import { runTool } from "./shared"

describe("resolveBuildTriggerMatrix tool", () => {
  it("returns anomaly trigger-entry rows for covered agents", async () => {
    const result = await runTool(resolveBuildTriggerMatrix, {
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
    expect((result as any).matrix.rows).toHaveLength(2)
    expect((result as any).matrix.summary).toMatchObject({
      rowCount: 2,
      mainFormulaCount: 1,
      sourceViewCount: 1,
      supportedCount: 2,
      unsupportedCount: 0,
      hasSourceViews: true,
      groups: [
        {
          key: "main-formula",
          label: "主公式结算",
          count: 1,
          supportedCount: 1,
          unsupportedCount: 0,
        },
        {
          key: "source-view",
          label: "额外来源结算",
          count: 1,
          supportedCount: 1,
          unsupportedCount: 0,
        },
      ],
    })
    expect((result as any).matrix.rows[0].metadata.entryKind).toBe(
      "main-formula",
    )
    expect((result as any).matrix.rows[0].metadata.templateSource).toBe(
      "main-formula",
    )
    expect((result as any).matrix.rows[1]).toMatchObject({
      supported: true,
      metadata: {
        entryKind: "source-view",
        templateSource: "source-view",
        sourceType: "agent",
        sourceId: "1401",
        sourceStableKey: "source-view:alice-polarity-assault",
        sourceViewId: "alice-polarity-assault",
      },
    })
  })

  it("rejects normal trigger-matrix requests", async () => {
    const result = await runTool(resolveBuildTriggerMatrix, {
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

  it("returns trigger-matrix support scope when the agent has no trigger coverage", async () => {
    const result = await runTool(resolveBuildTriggerMatrix, {
      agent: "朱鸢",
      finalPanel: {
        attack: 3200,
        critRate: 0.55,
        critDamage: 1.4,
        anomalyProficiency: 160,
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
    expect((result as any).supportedAgents).toEqual(
      expect.arrayContaining(["爱丽丝", "柏妮思", "雅", "爱芮", "薇薇安"]),
    )
  })

  it("returns disorder trigger-entry rows for Vivian", async () => {
    const result = await runTool(resolveBuildTriggerMatrix, {
      agent: "薇薇安",
      wEngine: "飞鸟星梦",
      mode: "full-buff",
      agentLevel: 60,
      agentMindscape: 2,
      coreSkillLevel: 7,
      wEngineRefinement: 1,
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
        anomalyType: "ether",
        remainingTime: 5,
        attribute: "以太",
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect((result as any).found).toBe(true)
    expect((result as any).matrix.rows).toHaveLength(2)
    expect((result as any).matrix.summary).toMatchObject({
      rowCount: 2,
      mainFormulaCount: 1,
      sourceViewCount: 1,
      supportedCount: 2,
      unsupportedCount: 0,
      hasSourceViews: true,
    })
    expect((result as any).matrix.rows[1]).toMatchObject({
      supported: true,
      metadata: {
        canonicalLabel: "薇薇安：[异放]",
        entryKind: "source-view",
        templateSource: "source-view",
        sourceType: "agent",
        sourceId: "1331",
        sourceStableKey: "source-view:vivian-exflow",
        sourceViewId: "vivian-exflow",
      },
    })
    expect(
      (result as any).matrix.rows[1].requirements.map((item: any) => item.kind),
    ).toEqual(expect.arrayContaining(["panel-value", "scenario-value"]))
  })
})
