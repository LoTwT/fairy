import { describe, expect, it } from "vitest"

import { resolveBuildSourceEntries } from "../src/mastra/tools/zzz/resolve-build-source-entries"
import { runTool } from "./shared"

describe("resolveBuildSourceEntries tool", () => {
  it("returns utility-only entries without requiring a scenario", async () => {
    const result = await runTool(resolveBuildSourceEntries, {
      agent: "猫又",
      wEngine: "「月相」-朔",
      wEngineRefinement: 1,
    })

    expect((result as any).found).toBe(true)
    expect((result as any).collection.assumptionSummary).toEqual({
      count: (result as any).collection.assumptions.length,
      hasAssumptions: (result as any).collection.assumptions.length > 0,
    })
    expect((result as any).collection.summary).toMatchObject({
      entryCount: 1,
      sourceDamageViewCount: 0,
      sourceUtilityViewCount: 1,
      supportedCount: 1,
      unsupportedCount: 0,
      isUtilityOnly: true,
      caveatSummary: {
        assumptionCount: (result as any).collection.assumptions.length,
        unsupportedCount: 0,
        hasAssumptions: (result as any).collection.assumptions.length > 0,
        hasUnsupported: false,
      },
      assumptionSummary: {
        count: (result as any).collection.assumptions.length,
        hasAssumptions: (result as any).collection.assumptions.length > 0,
      },
      sourceDamageRequirementSummary: {
        count: 0,
        satisfiedCount: 0,
        unsatisfiedCount: 0,
        hasUnsatisfied: false,
        groups: [],
      },
      sourceUtilityRequirementSummary: {
        count: 2,
        satisfiedCount: 2,
        unsatisfiedCount: 0,
        hasUnsatisfied: false,
        groups: [
          {
            key: "trigger",
            count: 1,
            satisfiedCount: 1,
            unsatisfiedCount: 0,
          },
          {
            key: "cooldown",
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
        count: 0,
        hasSourceNotes: false,
        hasMissingInput: false,
        hasProcessOnly: false,
        hasResearchOnly: false,
        statusGroups: [],
        ownerGroups: [],
      },
      groups: [
        {
          key: "source-utility-view",
          label: "回能 / utility 条目",
          count: 1,
          caveatSummary: {
            assumptionCount: 1,
            unsupportedCount: 0,
            hasAssumptions: true,
            hasUnsupported: false,
          },
          assumptionSummary: {
            count: 1,
            hasAssumptions: true,
          },
          sourceDamageRequirementSummary: {
            count: 0,
            satisfiedCount: 0,
            unsatisfiedCount: 0,
            hasUnsatisfied: false,
            groups: [],
          },
          sourceUtilityRequirementSummary: {
            count: 2,
            satisfiedCount: 2,
            unsatisfiedCount: 0,
            hasUnsatisfied: false,
            groups: [
              {
                key: "trigger",
                count: 1,
                satisfiedCount: 1,
                unsatisfiedCount: 0,
              },
              {
                key: "cooldown",
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
            count: 0,
            hasSourceNotes: false,
            hasMissingInput: false,
            hasProcessOnly: false,
            hasResearchOnly: false,
            statusGroups: [],
            ownerGroups: [],
          },
        },
      ],
    })
    expect((result as any).collection.caveatSummary).toEqual({
      assumptionCount: (result as any).collection.assumptions.length,
      unsupportedCount: 0,
      hasAssumptions: (result as any).collection.assumptions.length > 0,
      hasUnsupported: false,
    })
    expect((result as any).collection.sourceDamageRequirementSummary).toEqual(
      (result as any).collection.summary.sourceDamageRequirementSummary,
    )
    expect((result as any).collection.sourceUtilityRequirementSummary).toEqual(
      (result as any).collection.summary.sourceUtilityRequirementSummary,
    )
    expect((result as any).collection.diagnosticSummary).toEqual({
      count: 0,
      hasDiagnostics: false,
      hasDefaultedInput: false,
      hasCoverageGap: false,
      hasUnsupportedEffect: false,
      hasFallback: false,
      kindGroups: [],
      ownerGroups: [],
    })
    expect((result as any).collection.sourceNoteSummary).toEqual({
      count: 0,
      hasSourceNotes: false,
      hasMissingInput: false,
      hasProcessOnly: false,
      hasResearchOnly: false,
      statusGroups: [],
      ownerGroups: [],
    })
    expect((result as any).collection.entries[0]).toMatchObject({
      id: "lunar-noviluna-energy-refund",
      metadata: {
        entryKind: "source-utility-view",
        stableKey: "source-utility:lunar-noviluna-energy-refund",
      },
      summary: {
        value: 3,
        unit: "energy",
        resolutionMode: "trigger",
        targetScope: "self",
        requirementCount: 2,
        hasUnsatisfiedRequirements: false,
        diagnosticCount: 0,
        sourceNoteCount: 0,
        assumptionCount: 1,
        hasUnsupported: false,
      },
      assumptionSummary: {
        count: 1,
        hasAssumptions: true,
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
      caveatSummary: {
        assumptionCount: 1,
        unsupportedCount: 0,
        hasAssumptions: true,
        hasUnsupported: false,
      },
      value: 3,
      unit: "energy",
    })
  })

  it("returns damage and utility entries together for covered disorder loadouts", async () => {
    const result = await runTool(resolveBuildSourceEntries, {
      agent: "爱芮",
      wEngine: "灼心摇壶",
      mode: "full-buff",
      finalPanel: {
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

    expect((result as any).found).toBe(true)
    expect((result as any).collection.assumptionSummary).toEqual({
      count: (result as any).collection.assumptions.length,
      hasAssumptions: (result as any).collection.assumptions.length > 0,
    })
    expect((result as any).collection.summary).toMatchObject({
      entryCount: 2,
      sourceDamageViewCount: 1,
      sourceUtilityViewCount: 1,
      supportedCount: 2,
      unsupportedCount: 0,
      isUtilityOnly: false,
      caveatSummary: {
        assumptionCount: (result as any).collection.assumptions.length,
        unsupportedCount: 0,
        hasAssumptions: (result as any).collection.assumptions.length > 0,
        hasUnsupported: false,
      },
      assumptionSummary: {
        count: (result as any).collection.assumptions.length,
        hasAssumptions: (result as any).collection.assumptions.length > 0,
      },
      sourceDamageRequirementSummary: {
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
      sourceUtilityRequirementSummary: {
        count: 1,
        satisfiedCount: 1,
        unsatisfiedCount: 0,
        hasUnsatisfied: false,
        groups: [
          {
            key: "condition",
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
        kindGroups: [{ key: "defaulted-input", label: "默认输入", count: 2 }],
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
        ownerGroups: [{ key: "dynamicSnapshot", count: 2 }],
      },
      groups: [
        {
          key: "source-damage-view",
          label: "额外结算条目",
          count: 1,
          caveatSummary: {
            assumptionCount: 1,
            unsupportedCount: 0,
            hasAssumptions: true,
            hasUnsupported: false,
          },
          assumptionSummary: {
            count: 1,
            hasAssumptions: true,
          },
          sourceDamageRequirementSummary: {
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
          sourceUtilityRequirementSummary: {
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
            ownerGroups: [{ key: "dynamicSnapshot", count: 2 }],
          },
        },
        {
          key: "source-utility-view",
          label: "回能 / utility 条目",
          count: 1,
          caveatSummary: {
            assumptionCount: 1,
            unsupportedCount: 0,
            hasAssumptions: true,
            hasUnsupported: false,
          },
          assumptionSummary: {
            count: 1,
            hasAssumptions: true,
          },
          sourceDamageRequirementSummary: {
            count: 0,
            satisfiedCount: 0,
            unsatisfiedCount: 0,
            hasUnsatisfied: false,
            groups: [],
          },
          sourceUtilityRequirementSummary: {
            count: 1,
            satisfiedCount: 1,
            unsatisfiedCount: 0,
            hasUnsatisfied: false,
            groups: [
              {
                key: "condition",
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
            count: 0,
            hasSourceNotes: false,
            hasMissingInput: false,
            hasProcessOnly: false,
            hasResearchOnly: false,
            statusGroups: [],
            ownerGroups: [],
          },
        },
      ],
    })
    expect((result as any).collection.caveatSummary).toEqual({
      assumptionCount: (result as any).collection.assumptions.length,
      unsupportedCount: 0,
      hasAssumptions: (result as any).collection.assumptions.length > 0,
      hasUnsupported: false,
    })
    expect((result as any).collection.sourceDamageRequirementSummary).toEqual(
      (result as any).collection.summary.sourceDamageRequirementSummary,
    )
    expect((result as any).collection.sourceUtilityRequirementSummary).toEqual(
      (result as any).collection.summary.sourceUtilityRequirementSummary,
    )
    expect((result as any).collection.diagnosticSummary).toEqual({
      count: 2,
      hasDiagnostics: true,
      hasDefaultedInput: true,
      hasCoverageGap: false,
      hasUnsupportedEffect: false,
      hasFallback: false,
      kindGroups: [{ key: "defaulted-input", label: "默认输入", count: 2 }],
      ownerGroups: [
        { key: "loadout", count: 1 },
        { key: "scenario", count: 1 },
      ],
    })
    expect((result as any).collection.sourceNoteSummary).toEqual({
      count: 2,
      hasSourceNotes: true,
      hasMissingInput: false,
      hasProcessOnly: false,
      hasResearchOnly: false,
      statusGroups: [{ key: "resolved", label: "已展开", count: 2 }],
      ownerGroups: [{ key: "dynamicSnapshot", count: 2 }],
    })
    expect(
      (result as any).collection.entries.map((entry: any) => entry.id),
    ).toEqual(
      expect.arrayContaining([
        "aria-exflow",
        "flamemaker-shaker-offfield-energy-regen",
      ]),
    )
    const ariaEntry = (result as any).collection.entries.find(
      (entry: any) => entry.id === "aria-exflow",
    )
    expect(ariaEntry).toMatchObject({
      id: "aria-exflow",
      metadata: {
        entryKind: "source-damage-view",
        stableKey: "source-view:aria-exflow",
      },
      assumptionSummary: {
        count: 1,
        hasAssumptions: true,
      },
      diagnosticSummary: {
        count: 2,
        hasDiagnostics: true,
        hasDefaultedInput: true,
        hasCoverageGap: false,
        hasUnsupportedEffect: false,
        hasFallback: false,
        kindGroups: [{ key: "defaulted-input", label: "默认输入", count: 2 }],
        ownerGroups: [
          { key: "loadout", count: 1 },
          { key: "scenario", count: 1 },
        ],
      },
      caveatSummary: {
        assumptionCount: 1,
        unsupportedCount: 0,
        hasAssumptions: true,
        hasUnsupported: false,
      },
    })
    expect(ariaEntry.summary.expectedTotal).toBeGreaterThan(0)
    expect(ariaEntry.build).toBeUndefined()
  })

  it("returns Vivian exflow together with utility-only anomaly engines", async () => {
    const result = await runTool(resolveBuildSourceEntries, {
      agent: "薇薇安",
      wEngine: "「电磁暴」-叁式",
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
    expect((result as any).collection.summary).toMatchObject({
      entryCount: 2,
      sourceDamageViewCount: 1,
      sourceUtilityViewCount: 1,
      isUtilityOnly: false,
      caveatSummary: {
        assumptionCount: (result as any).collection.assumptions.length,
        unsupportedCount: 0,
        hasAssumptions: (result as any).collection.assumptions.length > 0,
        hasUnsupported: false,
      },
      sourceDamageRequirementSummary: {
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
      sourceUtilityRequirementSummary: {
        count: 2,
        satisfiedCount: 2,
        unsatisfiedCount: 0,
        hasUnsatisfied: false,
        groups: [
          {
            key: "trigger",
            count: 1,
            satisfiedCount: 1,
            unsatisfiedCount: 0,
          },
          {
            key: "cooldown",
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
        kindGroups: [{ key: "defaulted-input", label: "默认输入", count: 1 }],
        ownerGroups: [{ key: "scenario", count: 1 }],
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
    expect((result as any).collection.summary.groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "source-damage-view",
          sourceDamageRequirementSummary: expect.objectContaining({
            count: 2,
            hasUnsatisfied: false,
          }),
          sourceUtilityRequirementSummary: expect.objectContaining({
            count: 0,
            hasUnsatisfied: false,
          }),
          diagnosticSummary: expect.objectContaining({
            count: 1,
            hasDiagnostics: true,
          }),
          sourceNoteSummary: expect.objectContaining({
            count: 3,
            hasSourceNotes: true,
          }),
        }),
        expect.objectContaining({
          key: "source-utility-view",
          sourceDamageRequirementSummary: expect.objectContaining({
            count: 0,
            hasUnsatisfied: false,
          }),
          sourceUtilityRequirementSummary: expect.objectContaining({
            count: 2,
            hasUnsatisfied: false,
          }),
          diagnosticSummary: expect.objectContaining({
            count: 0,
            hasDiagnostics: false,
          }),
          sourceNoteSummary: expect.objectContaining({
            count: 0,
            hasSourceNotes: false,
          }),
        }),
      ]),
    )
    expect(
      (result as any).collection.entries.map((entry: any) => entry.id),
    ).toEqual(
      expect.arrayContaining([
        "vivian-exflow",
        "magnetic-storm-charlie-energy-refund",
      ]),
    )
    expect((result as any).collection.entries[0].requirementSummary).toEqual({
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
    })
    expect((result as any).collection.entries[0].sourceNoteSummary).toEqual({
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
    })
  })

  it("returns full build details only when includeDetails is true", async () => {
    const result = await runTool(resolveBuildSourceEntries, {
      agent: "爱丽丝",
      wEngine: "「电磁暴」-叁式",
      includeDetails: true,
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

    const sourceDamageEntry = (result as any).collection.entries.find(
      (entry: any) => entry.metadata.entryKind === "source-damage-view",
    )
    expect(sourceDamageEntry.build).toBeTruthy()
  })

  it("surfaces collection summary for utility-only support entries", async () => {
    const result = await runTool(resolveBuildSourceEntries, {
      agent: "妮可",
      wEngine: "时光切片",
      wEngineRefinement: 1,
    })

    expect((result as any).found).toBe(true)
    expect((result as any).collection.summary).toMatchObject({
      entryCount: 8,
      sourceDamageViewCount: 0,
      sourceUtilityViewCount: 8,
      isUtilityOnly: true,
      diagnosticSummary: {
        count: 0,
        hasDiagnostics: false,
        kindGroups: [],
        ownerGroups: [],
      },
      sourceNoteSummary: {
        count: 0,
        hasSourceNotes: false,
        statusGroups: [],
        ownerGroups: [],
      },
      groups: [
        {
          key: "source-utility-view",
          count: 8,
        },
      ],
    })
  })

  it("returns support scope when the current request has no available source entries", async () => {
    const result = await runTool(resolveBuildSourceEntries, {
      agent: "猫又",
    })

    expect((result as any).found).toBe(false)
    expect((result as any).message).toContain(
      "utility entries 目前只覆盖音擎来源",
    )
    expect((result as any).supportedUtilityWEngines).toContain("「月相」-朔")
  })
})
