import { describe, expect, it } from "vitest"

import {
  resolveStaticBuildSourceUtilityViews,
  supportedStaticBuildSourceUtilityViewWEngines,
} from "../../src"

describe("static build source utility views", () => {
  it("exports the current utility-view support scope", () => {
    expect(
      supportedStaticBuildSourceUtilityViewWEngines.map((item) => item.name),
    ).toEqual(
      expect.arrayContaining([
        "「月相」-朔",
        "「电磁暴」-叁式",
        "家政员",
        "灼心摇壶",
      ]),
    )
  })

  it("resolves lunar noviluna as an energy refund trigger", () => {
    const result = resolveStaticBuildSourceUtilityViews({
      loadout: {
        agentId: "1021",
        wEngineId: "12003",
        wEngineRefinement: 1,
      },
    })

    expect(result.entries).toHaveLength(1)
    expect(result.assumptionSummary).toEqual({
      count: result.assumptions.length,
      hasAssumptions: result.assumptions.length > 0,
    })
    expect(result.summary).toMatchObject({
      entryCount: 1,
      triggerCount: 1,
      rateCount: 0,
      supportedCount: 1,
      unsupportedCount: 0,
      assumptionSummary: {
        count: result.assumptions.length,
        hasAssumptions: result.assumptions.length > 0,
      },
      requirementSummary: {
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
          key: "trigger",
          label: "按次触发条目",
          count: 1,
          assumptionSummary: {
            count: 1,
            hasAssumptions: true,
          },
          supportedCount: 1,
          unsupportedCount: 0,
          requirementSummary: {
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
    expect(result.entries[0]).toMatchObject({
      id: "lunar-noviluna-energy-refund",
      metadata: {
        canonicalLabel: "「月相」-朔：[新月]",
        stableKey: "source-utility:lunar-noviluna-energy-refund",
        entryKind: "source-utility-view",
      },
      requirements: [
        { kind: "trigger", key: "发动[强化特殊技]", satisfied: true },
        { kind: "cooldown", key: "12s", satisfied: true },
      ],
      requirementSummary: {
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
      utilityType: "energy-refund",
      resolutionMode: "trigger",
      targetScope: "self",
      value: 3,
      unit: "energy",
      cooldownSeconds: 12,
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
      assumptionSummary: {
        count: 1,
        hasAssumptions: true,
      },
    })
  })

  it("resolves magnetic storm charlie as an anomaly-trigger energy refund", () => {
    const result = resolveStaticBuildSourceUtilityViews({
      loadout: {
        agentId: "1181",
        wEngineId: "12012",
        wEngineRefinement: 1,
      },
    })

    expect(result.entries).toHaveLength(1)
    expect(result.assumptionSummary).toEqual({
      count: result.assumptions.length,
      hasAssumptions: result.assumptions.length > 0,
    })
    expect(result.entries[0]).toMatchObject({
      id: "magnetic-storm-charlie-energy-refund",
      metadata: {
        stableKey: "source-utility:magnetic-storm-charlie-energy-refund",
        entryKind: "source-utility-view",
      },
      requirementSummary: {
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
      utilityType: "energy-refund",
      resolutionMode: "trigger",
      targetScope: "self",
      value: 3.5,
      unit: "energy",
      cooldownSeconds: 12,
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
      assumptionSummary: {
        count: 1,
        hasAssumptions: true,
      },
    })
  })

  it("resolves flamemaker shaker as an off-field energy regeneration rate", () => {
    const result = resolveStaticBuildSourceUtilityViews({
      loadout: {
        agentId: "1171",
        wEngineId: "14117",
        wEngineRefinement: 1,
      },
    })

    expect(result.entries).toHaveLength(1)
    expect(result.assumptionSummary).toEqual({
      count: result.assumptions.length,
      hasAssumptions: result.assumptions.length > 0,
    })
    expect(result.summary).toMatchObject({
      entryCount: 1,
      triggerCount: 0,
      rateCount: 1,
      supportedCount: 1,
      unsupportedCount: 0,
      assumptionSummary: {
        count: result.assumptions.length,
        hasAssumptions: result.assumptions.length > 0,
      },
      requirementSummary: {
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
          key: "rate",
          label: "按速率条目",
          count: 1,
          assumptionSummary: {
            count: 1,
            hasAssumptions: true,
          },
          supportedCount: 1,
          unsupportedCount: 0,
          requirementSummary: {
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
    expect(result.entries[0]).toMatchObject({
      id: "flamemaker-shaker-offfield-energy-regen",
      metadata: {
        stableKey: "source-utility:flamemaker-shaker-offfield-energy-regen",
        entryKind: "source-utility-view",
        utilityType: "energy-regen-rate",
      },
      requirements: [{ kind: "condition", key: "位于后场时", satisfied: true }],
      requirementSummary: {
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
      utilityType: "energy-regen-rate",
      resolutionMode: "rate",
      targetScope: "self",
      value: 0.6,
      unit: "energy-per-second",
      conditionLabel: "位于后场时",
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
    })
  })

  it("accepts support agents in the utility-only resolver path", () => {
    const result = resolveStaticBuildSourceUtilityViews({
      loadout: {
        agentId: "1031",
        wEngineId: "13002",
        wEngineRefinement: 1,
      },
    })

    expect(result.loadout.agent.name).toBe("妮可")
    expect(result.loadout.wEngine?.name).toBe("时光切片")
    expect(result.entries).toHaveLength(8)
    expect(result.summary).toMatchObject({
      entryCount: 8,
      triggerCount: 8,
      rateCount: 0,
      supportedCount: 8,
      unsupportedCount: 0,
      assumptionSummary: {
        count: result.assumptions.length,
        hasAssumptions: result.assumptions.length > 0,
      },
      requirementSummary: {
        count: 16,
        satisfiedCount: 16,
        unsatisfiedCount: 0,
        hasUnsatisfied: false,
        groups: [
          {
            key: "trigger",
            count: 8,
            satisfiedCount: 8,
            unsatisfiedCount: 0,
          },
          {
            key: "cooldown",
            count: 8,
            satisfiedCount: 8,
            unsatisfiedCount: 0,
          },
        ],
      },
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
    })
    expect(result.assumptions).toEqual([])
  })

  it("resolves time slice into per-trigger decibel and energy entries", () => {
    const result = resolveStaticBuildSourceUtilityViews({
      loadout: {
        agentId: "1031",
        wEngineId: "13002",
        wEngineRefinement: 1,
      },
    })

    expect(result.entries).toHaveLength(8)
    expect(result.entries[0]?.requirementSummary).toMatchObject({
      count: 2,
      satisfiedCount: 2,
      unsatisfiedCount: 0,
      hasUnsatisfied: false,
    })
    expect(result.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "time-slice-dodgeCounter-decibel-gain",
          utilityType: "decibel-gain",
          targetScope: "team",
          value: 20,
          unit: "decibel",
          cooldownSeconds: 12,
        }),
        expect.objectContaining({
          id: "time-slice-chainAttack-energy-refund",
          utilityType: "energy-refund",
          targetScope: "self",
          value: 0.7,
          unit: "energy",
          cooldownSeconds: 12,
        }),
      ]),
    )
  })
})
