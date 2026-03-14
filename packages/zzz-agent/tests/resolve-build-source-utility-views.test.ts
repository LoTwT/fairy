import { describe, expect, it } from "vitest"

import { resolveBuildSourceUtilityViews } from "../src/mastra/tools/zzz/resolve-build-source-utility-views"
import { runTool } from "./shared"

describe("resolveBuildSourceUtilityViews tool", () => {
  it("returns utility views for covered utility w-engines", async () => {
    const result = await runTool(resolveBuildSourceUtilityViews, {
      agent: "猫又",
      wEngine: "「月相」-朔",
      wEngineRefinement: 1,
    })

    expect((result as any).found).toBe(true)
    expect((result as any).views.assumptionSummary).toEqual({
      count: (result as any).views.assumptions.length,
      hasAssumptions: (result as any).views.assumptions.length > 0,
    })
    expect((result as any).views.caveatSummary).toEqual({
      assumptionCount: (result as any).views.assumptions.length,
      unsupportedCount: 0,
      hasAssumptions: (result as any).views.assumptions.length > 0,
      hasUnsupported: false,
    })
    expect((result as any).views.summary).toMatchObject({
      entryCount: 1,
      triggerCount: 1,
      rateCount: 0,
      supportedCount: 1,
      unsupportedCount: 0,
      caveatSummary: {
        assumptionCount: (result as any).views.assumptions.length,
        unsupportedCount: 0,
        hasAssumptions: (result as any).views.assumptions.length > 0,
        hasUnsupported: false,
      },
      assumptionSummary: {
        count: (result as any).views.assumptions.length,
        hasAssumptions: (result as any).views.assumptions.length > 0,
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
    expect((result as any).views.entries[0]).toMatchObject({
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
      value: 3,
      unit: "energy",
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

  it("rejects specialty-incompatible utility w-engines", async () => {
    const result = await runTool(resolveBuildSourceUtilityViews, {
      agent: "猫又",
      wEngine: "「电磁暴」-叁式",
    })

    expect((result as any).found).toBe(false)
    expect((result as any).message).toContain("无法使用")
    expect((result as any).supportedWEngines).toContain("「月相」-朔")
  })

  it("returns utility-view support scope when the current w-engine has no utility coverage", async () => {
    const result = await runTool(resolveBuildSourceUtilityViews, {
      agent: "猫又",
      wEngine: "钢铁肉垫",
    })

    expect((result as any).found).toBe(false)
    expect((result as any).message).toContain("暂未覆盖音擎")
    expect((result as any).supportedWEngines).toContain("「月相」-朔")
  })

  it("accepts support agents on the utility-only path before concrete coverage is added", async () => {
    const result = await runTool(resolveBuildSourceUtilityViews, {
      agent: "妮可",
      wEngine: "时光切片",
    })

    expect((result as any).found).toBe(true)
    expect((result as any).views.assumptionSummary).toEqual({
      count: (result as any).views.assumptions.length,
      hasAssumptions: (result as any).views.assumptions.length > 0,
    })
    expect((result as any).views.caveatSummary).toEqual({
      assumptionCount: (result as any).views.assumptions.length,
      unsupportedCount: 0,
      hasAssumptions: (result as any).views.assumptions.length > 0,
      hasUnsupported: false,
    })
    expect((result as any).views.summary).toMatchObject({
      entryCount: 8,
      triggerCount: 8,
      rateCount: 0,
      supportedCount: 8,
      unsupportedCount: 0,
      caveatSummary: {
        assumptionCount: (result as any).views.assumptions.length,
        unsupportedCount: 0,
        hasAssumptions: (result as any).views.assumptions.length > 0,
        hasUnsupported: false,
      },
      assumptionSummary: {
        count: (result as any).views.assumptions.length,
        hasAssumptions: (result as any).views.assumptions.length > 0,
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
      groups: [
        {
          key: "trigger",
          label: "按次触发条目",
          count: 8,
          assumptionSummary: {
            count: 16,
            hasAssumptions: true,
          },
          supportedCount: 8,
          unsupportedCount: 0,
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
        },
      ],
    })
    expect((result as any).views.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "time-slice-dodgeCounter-decibel-gain",
          utilityType: "decibel-gain",
          requirementSummary: expect.objectContaining({
            count: 2,
            satisfiedCount: 2,
          }),
          unit: "decibel",
          diagnosticSummary: expect.objectContaining({
            count: 0,
            hasDiagnostics: false,
          }),
          sourceNoteSummary: expect.objectContaining({
            count: 0,
            hasSourceNotes: false,
          }),
        }),
        expect.objectContaining({
          id: "time-slice-assistAttack-energy-refund",
          utilityType: "energy-refund",
          unit: "energy",
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
  })
})
