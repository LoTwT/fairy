import { describe, expect, it } from "vitest"

import { resolveStaticBuildSourceEntries } from "../../src"

describe("static build source entries", () => {
  it("returns utility-only entries without requiring a scenario", () => {
    const result = resolveStaticBuildSourceEntries({
      loadout: {
        agentId: "1021",
        wEngineId: "12003",
        wEngineRefinement: 1,
      },
    })

    expect(result.summary).toMatchObject({
      entryCount: 1,
      sourceDamageViewCount: 0,
      sourceUtilityViewCount: 1,
      supportedCount: 1,
      unsupportedCount: 0,
      isUtilityOnly: true,
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
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0]).toMatchObject({
      id: "lunar-noviluna-energy-refund",
      metadata: {
        entryKind: "source-utility-view",
        stableKey: "source-utility:lunar-noviluna-energy-refund",
      },
    })
    expect(result.assumptions).toEqual([])
  })

  it("returns utility and source-damage entries together for covered disorder loadouts", () => {
    const result = resolveStaticBuildSourceEntries({
      mode: "full-buff",
      loadout: {
        agentId: "1501",
        wEngineId: "14117",
        agentLevel: 60,
        wEngineRefinement: 1,
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
    expect(result.assumptionSummary).toEqual({
      count: result.assumptions.length,
      hasAssumptions: result.assumptions.length > 0,
    })

    expect(result.summary).toMatchObject({
      entryCount: 2,
      sourceDamageViewCount: 1,
      sourceUtilityViewCount: 1,
      supportedCount: 2,
      unsupportedCount: 0,
      isUtilityOnly: false,
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
    expect(result.caveatSummary).toEqual({
      assumptionCount: result.assumptions.length,
      unsupportedCount: 0,
      hasAssumptions: result.assumptions.length > 0,
      hasUnsupported: false,
    })
    expect(result.entries).toHaveLength(2)
    expect(result.entries[0]?.metadata.entryKind).toBe("source-damage-view")
    expect(result.entries[1]?.metadata.entryKind).toBe("source-utility-view")
    expect(result.entries[0]?.summary?.expectedTotal).toBeGreaterThan(0)
    expect(result.entries[0]?.requirementSummary).toEqual({
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
    })
    expect(result.entries[0]?.sourceNoteSummary).toEqual({
      count: 2,
      hasSourceNotes: true,
      hasMissingInput: false,
      hasProcessOnly: false,
      hasResearchOnly: false,
      statusGroups: [{ key: "resolved", label: "已展开", count: 2 }],
      ownerGroups: [{ key: "dynamicSnapshot", count: 2 }],
    })
    expect(result.entries.map((entry) => entry.metadata.entryKind)).toEqual(
      expect.arrayContaining(["source-damage-view", "source-utility-view"]),
    )
    expect(result.entries.map((entry) => entry.id)).toEqual(
      expect.arrayContaining([
        "aria-exflow",
        "flamemaker-shaker-offfield-energy-regen",
      ]),
    )
  })

  it("collects Vivian exflow together with utility-only anomaly engines", () => {
    const result = resolveStaticBuildSourceEntries({
      mode: "full-buff",
      loadout: {
        agentId: "1331",
        wEngineId: "12012",
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

    expect(result.summary).toMatchObject({
      entryCount: 2,
      sourceDamageViewCount: 1,
      sourceUtilityViewCount: 1,
      isUtilityOnly: false,
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
    expect(result.summary.groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "source-damage-view",
          caveatSummary: expect.objectContaining({
            assumptionCount: 2,
            unsupportedCount: 0,
            hasAssumptions: true,
            hasUnsupported: false,
          }),
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
          caveatSummary: expect.objectContaining({
            assumptionCount: 1,
            unsupportedCount: 0,
            hasAssumptions: true,
            hasUnsupported: false,
          }),
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
    expect(result.entries).toHaveLength(2)
    expect(result.entries[0]?.metadata.entryKind).toBe("source-damage-view")
    expect(result.entries[1]?.metadata.entryKind).toBe("source-utility-view")
    expect(result.entries.map((entry) => entry.id)).toEqual(
      expect.arrayContaining([
        "vivian-exflow",
        "magnetic-storm-charlie-energy-refund",
      ]),
    )
    const vivianEntry = result.entries.find(
      (entry) => entry.id === "vivian-exflow",
    )
    const utilityEntry = result.entries.find(
      (entry) => entry.id === "magnetic-storm-charlie-energy-refund",
    )
    expect(vivianEntry?.metadata.entryKind).toBe("source-damage-view")
    expect(utilityEntry?.metadata.entryKind).toBe("source-utility-view")
  })

  it("keeps utility-only behavior for normal scenarios", () => {
    const result = resolveStaticBuildSourceEntries({
      loadout: {
        agentId: "1021",
        wEngineId: "12003",
        wEngineRefinement: 1,
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

    expect(result.summary).toMatchObject({
      sourceDamageViewCount: 0,
      sourceUtilityViewCount: 1,
      isUtilityOnly: true,
      caveatSummary: {
        assumptionCount: result.assumptions.length,
        unsupportedCount: 0,
        hasAssumptions: result.assumptions.length > 0,
        hasUnsupported: false,
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
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0]?.metadata.entryKind).toBe("source-utility-view")
    expect(result.assumptions).toContain(
      "当前 source-entry collection 在 normal / sheer 场景下只返回 utility entries，不展开 source damage views。",
    )
  })

  it("collects time-slice utility entries for support agents without requiring a damage scenario", () => {
    const result = resolveStaticBuildSourceEntries({
      loadout: {
        agentId: "1031",
        wEngineId: "13002",
        wEngineRefinement: 1,
      },
    })

    expect(result.summary).toMatchObject({
      entryCount: 8,
      sourceDamageViewCount: 0,
      sourceUtilityViewCount: 8,
      isUtilityOnly: true,
      caveatSummary: {
        assumptionCount: result.assumptions.length,
        unsupportedCount: 0,
        hasAssumptions: result.assumptions.length > 0,
        hasUnsupported: false,
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
          key: "source-utility-view",
          label: "回能 / utility 条目",
          count: 8,
        },
      ],
    })
    expect(result.loadout.agent.name).toBe("妮可")
    expect(result.entries).toHaveLength(8)
    expect(result.entries.map((entry) => entry.metadata.entryKind)).toEqual([
      "source-utility-view",
      "source-utility-view",
      "source-utility-view",
      "source-utility-view",
      "source-utility-view",
      "source-utility-view",
      "source-utility-view",
      "source-utility-view",
    ])
    expect(result.entries.map((entry) => entry.id)).toEqual(
      expect.arrayContaining([
        "time-slice-dodgeCounter-decibel-gain",
        "time-slice-chainAttack-energy-refund",
      ]),
    )
  })

  it("requires a full panel when collecting anomaly source entries", () => {
    expect(() =>
      resolveStaticBuildSourceEntries({
        loadout: {
          agentId: "1401",
        },
        scenario: {
          damageType: "anomaly",
          skillTag: "enhancedSpecial",
          damageMultiplier: "500%",
          attribute: "物理",
          enemy: {
            defenderBaseDefense: 953,
            defenderResistance: 0.2,
          },
        },
      }),
    ).toThrow(/panel is required/)
  })
})
