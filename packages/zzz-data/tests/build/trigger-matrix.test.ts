import { describe, expect, it } from "vitest"

import {
  resolveStaticBuildTriggerMatrix,
  supportedStaticBuildTriggerMatrixAgents,
} from "../../src"

describe("static build trigger matrix", () => {
  it("exports the current trigger-matrix support scope", () => {
    expect(
      supportedStaticBuildTriggerMatrixAgents.map((item) => item.name),
    ).toEqual(
      expect.arrayContaining(["爱丽丝", "柏妮思", "雅", "爱芮", "薇薇安"]),
    )
    expect(supportedStaticBuildTriggerMatrixAgents).toHaveLength(5)
  })

  it("resolves an anomaly trigger-entry matrix for Alice", () => {
    const result = resolveStaticBuildTriggerMatrix({
      mode: "baseline",
      loadout: {
        agentId: "1401",
        agentLevel: 60,
      },
      panel: {
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
    const mainFormulaRows = result.rows.filter(
      (row) => row.metadata.entryKind === "main-formula",
    )
    const sourceViewRows = result.rows.filter(
      (row) => row.metadata.entryKind === "source-view",
    )
    const mainFormulaAssumptionCount = mainFormulaRows.flatMap(
      (row) => row.assumptions,
    ).length
    const sourceViewAssumptionCount = sourceViewRows.flatMap(
      (row) => row.assumptions,
    ).length
    expect(result.rows[0]?.summary?.expectedTotal).toBeCloseTo(
      result.rows[0]?.damage?.expected ?? 0,
      6,
    )

    expect(result.rows).toHaveLength(2)
    expect(result.caveatSummary).toEqual({
      assumptionCount: result.assumptions.length,
      unsupportedCount: 0,
      hasAssumptions: result.assumptions.length > 0,
      hasUnsupported: false,
    })
    expect(result.assumptionSummary).toEqual({
      count: result.assumptions.length,
      hasAssumptions: result.assumptions.length > 0,
    })
    expect(result.summary).toMatchObject({
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
        assumptionCount: result.assumptions.length,
        unsupportedCount: 0,
        hasAssumptions: result.assumptions.length > 0,
        hasUnsupported: false,
      },
      assumptionSummary: {
        count: result.assumptions.length,
        hasAssumptions: result.assumptions.length > 0,
      },
      diagnosticSummary: {
        count: 4,
        hasDiagnostics: true,
        hasDefaultedInput: true,
        hasCoverageGap: false,
        hasUnsupportedEffect: false,
        hasFallback: false,
        kindGroups: [{ key: "defaulted-input", label: "默认输入", count: 4 }],
        ownerGroups: [
          { key: "loadout", count: 2 },
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
            count: 2,
            hasDiagnostics: true,
            hasDefaultedInput: true,
            hasCoverageGap: false,
            hasUnsupportedEffect: false,
            hasFallback: false,
            kindGroups: [
              { key: "defaulted-input", label: "默认输入", count: 2 },
            ],
            ownerGroups: [
              { key: "loadout", count: 1 },
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
            count: 2,
            hasDiagnostics: true,
            hasDefaultedInput: true,
            hasCoverageGap: false,
            hasUnsupportedEffect: false,
            hasFallback: false,
            kindGroups: [
              { key: "defaulted-input", label: "默认输入", count: 2 },
            ],
            ownerGroups: [
              { key: "loadout", count: 1 },
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
    expect(result.rows[0]).toMatchObject({
      id: "main-formula:anomaly",
      supported: true,
      metadata: {
        stableKey: "main-formula:anomaly",
        entryKind: "main-formula",
        templateSource: "main-formula",
        damageType: "anomaly",
      },
      requirementSummary: {
        count: 0,
        satisfiedCount: 0,
        unsatisfiedCount: 0,
        hasUnsatisfied: false,
        groups: [],
      },
      diagnosticSummary: {
        count: 2,
        hasDiagnostics: true,
        hasDefaultedInput: true,
        hasCoverageGap: false,
        hasUnsupportedEffect: false,
        hasFallback: false,
        kindGroups: [
          {
            key: "defaulted-input",
            label: "默认输入",
            count: 2,
          },
        ],
        ownerGroups: [
          {
            key: "loadout",
            count: 1,
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
      caveatSummary: {
        assumptionCount: result.rows[0]?.assumptions.length ?? 0,
        unsupportedCount: 0,
        hasAssumptions: (result.rows[0]?.assumptions.length ?? 0) > 0,
        hasUnsupported: false,
      },
      assumptionSummary: {
        count: result.rows[0]?.assumptions.length,
        hasAssumptions: (result.rows[0]?.assumptions.length ?? 0) > 0,
      },
    })
    expect(result.rows[1]).toMatchObject({
      id: "source-view:alice-polarity-assault",
      supported: true,
      metadata: {
        stableKey: "source-view:alice-polarity-assault",
        entryKind: "source-view",
        templateSource: "source-view",
        damageType: "anomaly",
        sourceType: "agent",
        sourceId: "1401",
        sourceStableKey: "source-view:alice-polarity-assault",
        sourceViewId: "alice-polarity-assault",
        sourceViewResolutionMode: "standalone",
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
        count: 2,
        hasDiagnostics: true,
        hasDefaultedInput: true,
        hasCoverageGap: false,
        hasUnsupportedEffect: false,
        hasFallback: false,
        kindGroups: [
          {
            key: "defaulted-input",
            label: "默认输入",
            count: 2,
          },
        ],
        ownerGroups: [
          {
            key: "loadout",
            count: 1,
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
      caveatSummary: {
        assumptionCount: result.rows[1]?.assumptions.length ?? 0,
        unsupportedCount: 0,
        hasAssumptions: (result.rows[1]?.assumptions.length ?? 0) > 0,
        hasUnsupported: false,
      },
      assumptionSummary: {
        count: result.rows[1]?.assumptions.length,
        hasAssumptions: (result.rows[1]?.assumptions.length ?? 0) > 0,
      },
    })
    expect(result.rows[1]?.damage?.expected).toBeGreaterThan(0)
    expect(result.rows[1]?.summary?.expectedTotal).toBeCloseTo(
      result.rows[1]?.damage?.expected ?? 0,
      6,
    )
  })

  it("resolves a disorder trigger-entry matrix for Aria", () => {
    const result = resolveStaticBuildTriggerMatrix({
      mode: "full-buff",
      loadout: {
        agentId: "1501",
        agentLevel: 60,
      },
      panel: {
        attack: 2950,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 150,
      },
      scenario: {
        damageType: "disorder",
        skillTag: "enhancedSpecial",
        anomalyType: "ether",
        remainingTime: 5,
        attribute: "以太",
        dynamicSnapshot: {
          values: {
            ariaExflowDamageRatio: 0.45,
            ariaStunnedDamageRatio: 0.2,
          },
        },
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
          isStunned: true,
        },
      },
    })

    expect(result.rows).toHaveLength(2)
    expect(result.caveatSummary).toEqual({
      assumptionCount: result.assumptions.length,
      unsupportedCount: 0,
      hasAssumptions: result.assumptions.length > 0,
      hasUnsupported: false,
    })
    expect(result.summary).toMatchObject({
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
            key: "dynamic-value",
            count: 2,
            satisfiedCount: 2,
            unsatisfiedCount: 0,
          },
        ],
      },
      caveatSummary: {
        assumptionCount: result.assumptions.length,
        unsupportedCount: 0,
        hasAssumptions: result.assumptions.length > 0,
        hasUnsupported: false,
      },
      diagnosticSummary: {
        count: 4,
        hasDiagnostics: true,
        hasDefaultedInput: true,
        hasCoverageGap: false,
      },
      sourceNoteSummary: {
        count: 4,
        hasSourceNotes: true,
        hasMissingInput: false,
      },
      groups: [
        {
          key: "main-formula",
          caveatSummary: {
            assumptionCount: result.rows[0]?.assumptions.length ?? 0,
            unsupportedCount: 0,
            hasAssumptions: (result.rows[0]?.assumptions.length ?? 0) > 0,
            hasUnsupported: false,
          },
        },
        {
          key: "source-view",
          caveatSummary: {
            assumptionCount: result.rows[1]?.assumptions.length ?? 0,
            unsupportedCount: 0,
            hasAssumptions: (result.rows[1]?.assumptions.length ?? 0) > 0,
            hasUnsupported: false,
          },
        },
      ],
    })
    expect(result.rows[0]?.metadata.damageType).toBe("disorder")
    expect(result.rows[1]).toMatchObject({
      id: "source-view:aria-exflow",
      metadata: {
        entryKind: "source-view",
        templateSource: "source-view",
        sourceType: "agent",
        sourceId: "1501",
        sourceStableKey: "source-view:aria-exflow",
        sourceViewId: "aria-exflow",
        sourceViewResolutionMode: "delta",
      },
      caveatSummary: {
        assumptionCount: result.rows[1]?.assumptions.length ?? 0,
        unsupportedCount: 0,
        hasAssumptions: (result.rows[1]?.assumptions.length ?? 0) > 0,
        hasUnsupported: false,
      },
    })
    expect(
      result.rows[1]?.sourceNotes.some(
        (note) => note.owner === "dynamicSnapshot",
      ),
    ).toBe(true)
  })

  it("resolves a disorder trigger-entry matrix for Vivian", () => {
    const result = resolveStaticBuildTriggerMatrix({
      mode: "full-buff",
      loadout: {
        agentId: "1331",
        wEngineId: "14133",
        agentLevel: 60,
        agentMindscape: 2,
        coreSkillLevel: 7,
        wEngineRefinement: 1,
      },
      panel: {
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

    expect(result.rows).toHaveLength(2)
    expect(result.caveatSummary).toEqual({
      assumptionCount: result.assumptions.length,
      unsupportedCount: 0,
      hasAssumptions: result.assumptions.length > 0,
      hasUnsupported: false,
    })
    expect(result.summary).toMatchObject({
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
        assumptionCount: result.assumptions.length,
        unsupportedCount: 0,
        hasAssumptions: result.assumptions.length > 0,
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
            assumptionCount: result.rows[0]?.assumptions.length ?? 0,
            unsupportedCount: 0,
            hasAssumptions: (result.rows[0]?.assumptions.length ?? 0) > 0,
            hasUnsupported: false,
          },
        },
        {
          key: "source-view",
          caveatSummary: {
            assumptionCount: result.rows[1]?.assumptions.length ?? 0,
            unsupportedCount: 0,
            hasAssumptions: (result.rows[1]?.assumptions.length ?? 0) > 0,
            hasUnsupported: false,
          },
        },
      ],
    })
    expect(result.rows[0]?.metadata.damageType).toBe("disorder")
    expect(result.rows[1]).toMatchObject({
      id: "source-view:vivian-exflow",
      metadata: {
        canonicalLabel: "薇薇安：[异放]",
        entryKind: "source-view",
        templateSource: "source-view",
        sourceType: "agent",
        sourceId: "1331",
        sourceStableKey: "source-view:vivian-exflow",
        sourceViewId: "vivian-exflow",
        sourceViewResolutionMode: "delta",
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
        count: 1,
        hasDiagnostics: true,
        hasDefaultedInput: true,
        hasCoverageGap: false,
        hasUnsupportedEffect: false,
        hasFallback: false,
        kindGroups: [
          {
            key: "defaulted-input",
            label: "默认输入",
            count: 1,
          },
        ],
        ownerGroups: [
          {
            key: "scenario",
            count: 1,
          },
        ],
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
      caveatSummary: {
        assumptionCount: result.rows[1]?.assumptions.length ?? 0,
        unsupportedCount: 0,
        hasAssumptions: (result.rows[1]?.assumptions.length ?? 0) > 0,
        hasUnsupported: false,
      },
    })
    expect(result.rows[1]?.requirements.map((item) => item.kind)).toEqual(
      expect.arrayContaining(["panel-value", "scenario-value"]),
    )
    expect(result.rows[1]?.damage?.expected).toBeGreaterThan(0)
  })

  it("sorts trigger-entry rows by group and stable key", () => {
    const result = resolveStaticBuildTriggerMatrix({
      mode: "full-buff",
      loadout: {
        agentId: "1501",
        agentLevel: 60,
      },
      panel: {
        attack: 2950,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 150,
      },
      scenario: {
        damageType: "disorder",
        skillTag: "enhancedSpecial",
        anomalyType: "ether",
        remainingTime: 5,
        attribute: "以太",
        dynamicSnapshot: {
          values: {
            ariaExflowDamageRatio: 0.45,
            ariaStunnedDamageRatio: 0.2,
          },
        },
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
          isStunned: true,
        },
      },
    })

    expect(result.rows.map((row) => row.metadata.stableKey)).toEqual([
      "main-formula:disorder",
      "source-view:aria-exflow",
    ])
  })
})
