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
    expect((result as any).views.assumptions).toBeUndefined()
    expect((result as any).views.assumptionSummary).toEqual({
      count: expect.any(Number),
      hasAssumptions: expect.any(Boolean),
    })
    expect((result as any).views.caveatSummary).toEqual({
      assumptionCount: (result as any).views.assumptionSummary.count,
      unsupportedCount: 0,
      hasAssumptions: (result as any).views.assumptionSummary.hasAssumptions,
      hasUnsupported: false,
    })
    expect((result as any).views.requirementSummary).toEqual({
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
    })
    expect((result as any).views.diagnosticSummary).toEqual({
      count: 0,
      hasDiagnostics: false,
      hasDefaultedInput: false,
      hasCoverageGap: false,
      hasUnsupportedEffect: false,
      hasFallback: false,
      kindGroups: [],
      ownerGroups: [],
    })
    expect((result as any).views.sourceNoteSummary).toEqual({
      count: 0,
      hasSourceNotes: false,
      hasMissingInput: false,
      hasProcessOnly: false,
      hasResearchOnly: false,
      statusGroups: [],
      ownerGroups: [],
    })
    expect((result as any).views.summary).toMatchObject({
      entryCount: 1,
      triggerCount: 1,
      rateCount: 0,
      supportedCount: 1,
      unsupportedCount: 0,
      caveatSummary: {
        assumptionCount: (result as any).views.assumptionSummary.count,
        unsupportedCount: 0,
        hasAssumptions: (result as any).views.assumptionSummary.hasAssumptions,
        hasUnsupported: false,
      },
      assumptionSummary: {
        count: (result as any).views.assumptionSummary.count,
        hasAssumptions: (result as any).views.assumptionSummary.hasAssumptions,
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
          effectSummary: [],
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
    expect((result as any).views.effectSummary).toEqual(
      (result as any).views.summary.effectSummary,
    )
    expect((result as any).views.summary.effectSummary).toEqual([])
    expect((result as any).views.summary.groups[0].effectSummary).toEqual([])
    expect((result as any).views.entries[0]).toMatchObject({
      id: "lunar-noviluna-energy-refund",
      metadata: {
        canonicalLabel: "「月相」-朔：[新月]",
        stableKey: "source-utility:lunar-noviluna-energy-refund",
        entryKind: "source-utility-view",
      },
      effectSummary: [],
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
    })
    expect((result as any).views.entries[0].requirements).toBeUndefined()
    expect((result as any).views.entries[0].assumptions).toBeUndefined()
    expect((result as any).views.entries[0].diagnostics).toBeUndefined()
    expect((result as any).views.entries[0].sourceNotes).toBeUndefined()
  })

  it("returns utility entry raw assumptions, requirements and detail arrays only when includeDetails is true", async () => {
    const result = await runTool(resolveBuildSourceUtilityViews, {
      agent: "猫又",
      wEngine: "「月相」-朔",
      wEngineRefinement: 1,
      includeDetails: true,
    })

    expect((result as any).found).toBe(true)
    expect(Array.isArray((result as any).views.assumptions)).toBe(true)
    expect(Array.isArray((result as any).views.entries[0].assumptions)).toBe(
      true,
    )
    expect(Array.isArray((result as any).views.entries[0].requirements)).toBe(
      true,
    )
    expect(Array.isArray((result as any).views.entries[0].diagnostics)).toBe(
      true,
    )
    expect(Array.isArray((result as any).views.entries[0].sourceNotes)).toBe(
      true,
    )
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
    expect((result as any).views.assumptions).toBeUndefined()
    expect((result as any).views.assumptionSummary).toEqual({
      count: expect.any(Number),
      hasAssumptions: expect.any(Boolean),
    })
    expect((result as any).views.caveatSummary).toEqual({
      assumptionCount: (result as any).views.assumptionSummary.count,
      unsupportedCount: 0,
      hasAssumptions: (result as any).views.assumptionSummary.hasAssumptions,
      hasUnsupported: false,
    })
    expect((result as any).views.summary).toMatchObject({
      entryCount: 8,
      triggerCount: 8,
      rateCount: 0,
      supportedCount: 8,
      unsupportedCount: 0,
      caveatSummary: {
        assumptionCount: (result as any).views.assumptionSummary.count,
        unsupportedCount: 0,
        hasAssumptions: (result as any).views.assumptionSummary.hasAssumptions,
        hasUnsupported: false,
      },
      assumptionSummary: {
        count: (result as any).views.assumptionSummary.count,
        hasAssumptions: (result as any).views.assumptionSummary.hasAssumptions,
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
          caveatSummary: {
            assumptionCount: 16,
            unsupportedCount: 0,
            hasAssumptions: true,
            hasUnsupported: false,
          },
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

  it("uses source-utility-view scope labels when w-engine input is missing", async () => {
    const result = await runTool(resolveBuildSourceUtilityViews, {
      agent: "猫又",
    })

    expect((result as any).found).toBe(false)
    expect((result as any).message).toContain("source-specific utility view")
    expect((result as any).supportedWEngines).toContain("「月相」-朔")
  })
})
