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
    const mainFormulaRows = (result as any).matrix.rows.filter(
      (row: any) => row.metadata.entryKind === "main-formula",
    )
    const sourceViewRows = (result as any).matrix.rows.filter(
      (row: any) => row.metadata.entryKind === "source-view",
    )
    const mainFormulaAssumptionCount = mainFormulaRows.flatMap(
      (row: any) => row.assumptions,
    ).length
    const sourceViewAssumptionCount = sourceViewRows.flatMap(
      (row: any) => row.assumptions,
    ).length

    expect((result as any).found).toBe(true)
    expect((result as any).matrix.rows).toHaveLength(2)
    expect((result as any).matrix.caveatSummary).toEqual({
      assumptionCount: (result as any).matrix.assumptions.length,
      unsupportedCount: 0,
      hasAssumptions: (result as any).matrix.assumptions.length > 0,
      hasUnsupported: false,
    })
    expect((result as any).matrix.assumptionSummary).toEqual({
      count: (result as any).matrix.assumptions.length,
      hasAssumptions: (result as any).matrix.assumptions.length > 0,
    })
    expect((result as any).matrix.summary).toMatchObject({
      rowCount: 2,
      mainFormulaCount: 1,
      sourceViewCount: 1,
      supportedCount: 2,
      unsupportedCount: 0,
      hasSourceViews: true,
      requirementSummary: {
        count: 2,
        satisfiedCount: 2,
        unsatisfiedCount: 0,
        hasUnsatisfied: false,
        groups: [
          {
            key: "state-flag",
            count: 1,
            satisfiedCount: 1,
            unsatisfiedCount: 0,
          },
          {
            key: "state-value",
            count: 1,
            satisfiedCount: 1,
            unsatisfiedCount: 0,
          },
        ],
      },
      caveatSummary: {
        assumptionCount: (result as any).matrix.assumptions.length,
        unsupportedCount: 0,
        hasAssumptions: (result as any).matrix.assumptions.length > 0,
        hasUnsupported: false,
      },
      assumptionSummary: {
        count: (result as any).matrix.assumptions.length,
        hasAssumptions: (result as any).matrix.assumptions.length > 0,
      },
      diagnosticSummary: {
        count: 6,
        hasDiagnostics: true,
        hasDefaultedInput: true,
        hasCoverageGap: false,
        hasUnsupportedEffect: false,
        hasFallback: false,
        kindGroups: [{ key: "defaulted-input", label: "默认输入", count: 6 }],
        ownerGroups: [
          { key: "loadout", count: 4 },
          { key: "scenario", count: 2 },
        ],
      },
      sourceNoteSummary: {
        count: 4,
        hasSourceNotes: true,
        hasMissingInput: false,
        hasProcessOnly: false,
        hasResearchOnly: false,
        statusGroups: [{ key: "resolved", label: "已展开", count: 4 }],
        ownerGroups: [
          { key: "finalPanel", count: 2 },
          { key: "stateSnapshot", count: 2 },
        ],
      },
      groups: [
        {
          key: "main-formula",
          label: "主公式结算",
          count: 1,
          supportedCount: 1,
          unsupportedCount: 0,
          caveatSummary: {
            assumptionCount: mainFormulaAssumptionCount,
            unsupportedCount: 0,
            hasAssumptions: mainFormulaAssumptionCount > 0,
            hasUnsupported: false,
          },
          assumptionSummary: {
            count: mainFormulaAssumptionCount,
            hasAssumptions: mainFormulaAssumptionCount > 0,
          },
          requirementSummary: {
            count: 0,
            satisfiedCount: 0,
            unsatisfiedCount: 0,
            hasUnsatisfied: false,
            groups: [],
          },
          diagnosticSummary: {
            count: 3,
            hasDiagnostics: true,
            hasDefaultedInput: true,
            hasCoverageGap: false,
            hasUnsupportedEffect: false,
            hasFallback: false,
            kindGroups: [
              { key: "defaulted-input", label: "默认输入", count: 3 },
            ],
            ownerGroups: [
              { key: "loadout", count: 2 },
              { key: "scenario", count: 1 },
            ],
          },
          sourceNoteSummary: {
            count: 2,
            hasSourceNotes: true,
            hasMissingInput: false,
            hasProcessOnly: false,
            hasResearchOnly: false,
            statusGroups: [{ key: "resolved", label: "已展开", count: 2 }],
            ownerGroups: [
              { key: "finalPanel", count: 1 },
              { key: "stateSnapshot", count: 1 },
            ],
          },
        },
        {
          key: "source-view",
          label: "额外来源结算",
          count: 1,
          supportedCount: 1,
          unsupportedCount: 0,
          caveatSummary: {
            assumptionCount: sourceViewAssumptionCount,
            unsupportedCount: 0,
            hasAssumptions: sourceViewAssumptionCount > 0,
            hasUnsupported: false,
          },
          assumptionSummary: {
            count: sourceViewAssumptionCount,
            hasAssumptions: sourceViewAssumptionCount > 0,
          },
          requirementSummary: {
            count: 2,
            satisfiedCount: 2,
            unsatisfiedCount: 0,
            hasUnsatisfied: false,
            groups: [
              {
                key: "state-flag",
                count: 1,
                satisfiedCount: 1,
                unsatisfiedCount: 0,
              },
              {
                key: "state-value",
                count: 1,
                satisfiedCount: 1,
                unsatisfiedCount: 0,
              },
            ],
          },
          diagnosticSummary: {
            count: 3,
            hasDiagnostics: true,
            hasDefaultedInput: true,
            hasCoverageGap: false,
            hasUnsupportedEffect: false,
            hasFallback: false,
            kindGroups: [
              { key: "defaulted-input", label: "默认输入", count: 3 },
            ],
            ownerGroups: [
              { key: "loadout", count: 2 },
              { key: "scenario", count: 1 },
            ],
          },
          sourceNoteSummary: {
            count: 2,
            hasSourceNotes: true,
            hasMissingInput: false,
            hasProcessOnly: false,
            hasResearchOnly: false,
            statusGroups: [{ key: "resolved", label: "已展开", count: 2 }],
            ownerGroups: [
              { key: "finalPanel", count: 1 },
              { key: "stateSnapshot", count: 1 },
            ],
          },
        },
      ],
    })
    expect((result as any).matrix.rows[0].metadata.entryKind).toBe(
      "main-formula",
    )
    expect((result as any).matrix.rows[0].summary.expectedTotal).toBeCloseTo(
      (result as any).matrix.rows[0].damage.expected,
      6,
    )
    expect((result as any).matrix.rows[0].metadata.templateSource).toBe(
      "main-formula",
    )
    expect((result as any).matrix.rows[0].requirementSummary).toEqual({
      count: 0,
      satisfiedCount: 0,
      unsatisfiedCount: 0,
      hasUnsatisfied: false,
      groups: [],
    })
    expect((result as any).matrix.rows[0].diagnosticSummary).toEqual({
      count: 3,
      hasDiagnostics: true,
      hasDefaultedInput: true,
      hasCoverageGap: false,
      hasUnsupportedEffect: false,
      hasFallback: false,
      kindGroups: [
        {
          key: "defaulted-input",
          label: "默认输入",
          count: 3,
        },
      ],
      ownerGroups: [
        {
          key: "loadout",
          count: 2,
        },
        {
          key: "scenario",
          count: 1,
        },
      ],
    })
    expect((result as any).matrix.rows[0].sourceNoteSummary).toEqual({
      count: 2,
      hasSourceNotes: true,
      hasMissingInput: false,
      hasProcessOnly: false,
      hasResearchOnly: false,
      statusGroups: [{ key: "resolved", label: "已展开", count: 2 }],
      ownerGroups: [
        { key: "finalPanel", count: 1 },
        { key: "stateSnapshot", count: 1 },
      ],
    })
    expect((result as any).matrix.rows[0].assumptionSummary).toEqual({
      count: (result as any).matrix.rows[0].assumptions.length,
      hasAssumptions: (result as any).matrix.rows[0].assumptions.length > 0,
    })
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
      requirementSummary: {
        count: 2,
        satisfiedCount: 2,
        unsatisfiedCount: 0,
        hasUnsatisfied: false,
        groups: [
          {
            key: "state-flag",
            count: 1,
            satisfiedCount: 1,
            unsatisfiedCount: 0,
          },
          {
            key: "state-value",
            count: 1,
            satisfiedCount: 1,
            unsatisfiedCount: 0,
          },
        ],
      },
      diagnosticSummary: {
        count: 3,
        hasDiagnostics: true,
        hasDefaultedInput: true,
        hasCoverageGap: false,
        hasUnsupportedEffect: false,
        hasFallback: false,
        kindGroups: [
          {
            key: "defaulted-input",
            label: "默认输入",
            count: 3,
          },
        ],
        ownerGroups: [
          {
            key: "loadout",
            count: 2,
          },
          {
            key: "scenario",
            count: 1,
          },
        ],
      },
      sourceNoteSummary: {
        count: 2,
        hasSourceNotes: true,
        hasMissingInput: false,
        hasProcessOnly: false,
        hasResearchOnly: false,
        statusGroups: [{ key: "resolved", label: "已展开", count: 2 }],
        ownerGroups: [
          { key: "finalPanel", count: 1 },
          { key: "stateSnapshot", count: 1 },
        ],
      },
      assumptionSummary: {
        count: (result as any).matrix.rows[1].assumptions.length,
        hasAssumptions: (result as any).matrix.rows[1].assumptions.length > 0,
      },
    })
    expect((result as any).matrix.rows[1].summary.expectedTotal).toBeCloseTo(
      (result as any).matrix.rows[1].damage.expected,
      6,
    )
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
    expect((result as any).matrix.caveatSummary).toEqual({
      assumptionCount: (result as any).matrix.assumptions.length,
      unsupportedCount: 0,
      hasAssumptions: (result as any).matrix.assumptions.length > 0,
      hasUnsupported: false,
    })
    expect((result as any).matrix.summary).toMatchObject({
      rowCount: 2,
      mainFormulaCount: 1,
      sourceViewCount: 1,
      supportedCount: 2,
      unsupportedCount: 0,
      hasSourceViews: true,
      requirementSummary: {
        count: 2,
        satisfiedCount: 2,
        unsatisfiedCount: 0,
        hasUnsatisfied: false,
        groups: [
          {
            key: "panel-value",
            count: 1,
            satisfiedCount: 1,
            unsatisfiedCount: 0,
          },
          {
            key: "scenario-value",
            count: 1,
            satisfiedCount: 1,
            unsatisfiedCount: 0,
          },
        ],
      },
      caveatSummary: {
        assumptionCount: (result as any).matrix.assumptions.length,
        unsupportedCount: 0,
        hasAssumptions: (result as any).matrix.assumptions.length > 0,
        hasUnsupported: false,
      },
      diagnosticSummary: {
        count: 2,
        hasDiagnostics: true,
      },
      sourceNoteSummary: {
        count: 6,
        hasSourceNotes: true,
      },
      groups: [
        {
          key: "main-formula",
          caveatSummary: {
            assumptionCount: (result as any).matrix.rows[0].assumptions.length,
            unsupportedCount: 0,
            hasAssumptions:
              (result as any).matrix.rows[0].assumptions.length > 0,
            hasUnsupported: false,
          },
        },
        {
          key: "source-view",
          caveatSummary: {
            assumptionCount: (result as any).matrix.rows[1].assumptions.length,
            unsupportedCount: 0,
            hasAssumptions:
              (result as any).matrix.rows[1].assumptions.length > 0,
            hasUnsupported: false,
          },
        },
      ],
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
      requirementSummary: {
        count: 2,
        satisfiedCount: 2,
        unsatisfiedCount: 0,
        hasUnsatisfied: false,
        groups: [
          {
            key: "panel-value",
            count: 1,
            satisfiedCount: 1,
            unsatisfiedCount: 0,
          },
          {
            key: "scenario-value",
            count: 1,
            satisfiedCount: 1,
            unsatisfiedCount: 0,
          },
        ],
      },
      diagnosticSummary: {
        count: 0,
        hasDiagnostics: false,
        hasDefaultedInput: false,
        hasCoverageGap: false,
        hasUnsupportedEffect: false,
        hasFallback: false,
        kindGroups: [],
        ownerGroups: [],
      },
      sourceNoteSummary: {
        count: 3,
        hasSourceNotes: true,
        hasMissingInput: true,
        hasProcessOnly: true,
        hasResearchOnly: false,
        statusGroups: [
          { key: "missing-input", label: "缺少输入", count: 1 },
          { key: "process-only", label: "仅流程说明", count: 2 },
        ],
        ownerGroups: [
          { key: "resolvedSnapshot", count: 1 },
          { key: "process", count: 2 },
        ],
      },
    })
    expect(
      (result as any).matrix.rows[1].requirements.map((item: any) => item.kind),
    ).toEqual(expect.arrayContaining(["panel-value", "scenario-value"]))
  })
})
