import { describe, expect, it } from "vitest"

import { resolveBuildToolSourceDamageCoverageResponse } from "../src/mastra/tools/zzz/resolve-build-responses"
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
    expect((result as any).views.effectSummary).toEqual(
      (result as any).views.summary.effectSummary,
    )
    expect((result as any).views.summary.effectSummary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          effectId: "alice-state-polarity-assault-ratio",
          sourceName: "爱丽丝",
          label: "状态快照：[极性强击] 结算倍率",
          bucket: "技能倍率",
          value: "+150%",
          appliedEntryCount: 1,
          totalEntryCount: 1,
          appliesToAllEntries: true,
          condition: "当前条目全部生效",
        }),
      ]),
    )
    expect((result as any).views.summary.groups[0]?.effectSummary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          effectId: "alice-state-polarity-assault-ratio",
          appliedEntryCount: 1,
          totalEntryCount: 1,
          appliesToAllEntries: true,
        }),
      ]),
    )
    expect((result as any).views.entries[0]?.effectSummary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          effectId: "alice-state-polarity-assault-ratio",
          appliedEntryCount: 1,
          totalEntryCount: 1,
          appliesToAllEntries: true,
        }),
      ]),
    )
    expect((result as any).views.requirementSummary).toEqual({
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
    })
    expect((result as any).views.entries[0]?.assumptions).toBeUndefined()
    expect((result as any).views.entries[0]?.requirements).toBeUndefined()
    expect((result as any).views.diagnosticSummary).toEqual({
      count: 3,
      hasDiagnostics: true,
      hasDefaultedInput: true,
      hasCoverageGap: false,
      hasUnsupportedEffect: false,
      hasFallback: false,
      kindGroups: [{ key: "defaulted-input", label: "默认输入", count: 3 }],
      ownerGroups: [
        { key: "loadout", count: 2 },
        { key: "scenario", count: 1 },
      ],
    })
    expect((result as any).views.sourceNoteSummary).toEqual({
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
    expect((result as any).views.summary).toMatchObject({
      entryCount: 1,
      standaloneCount: 1,
      deltaCount: 0,
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
        kindGroups: [{ key: "defaulted-input", label: "默认输入", count: 3 }],
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
      groups: [
        {
          key: "standalone",
          label: "独立结算条目",
          count: 1,
          supportedCount: 1,
          unsupportedCount: 0,
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
    expect((result as any).views.entries[0]).toMatchObject({
      id: "alice-polarity-assault",
      supported: true,
      resolutionMode: "standalone",
      metadata: {
        canonicalLabel: "爱丽丝：[极性强击]",
        stableKey: "source-view:alice-polarity-assault",
        entryKind: "source-damage-view",
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
        count: 1,
        hasAssumptions: true,
      },
    })
    expect((result as any).views.entries[0].sourceNotes).toBeUndefined()
    expect((result as any).views.entries[0].diagnostics).toBeUndefined()
    expect((result as any).views.entries[0].damage.expected).toBeGreaterThan(0)
    expect((result as any).views.entries[0].summary.expectedTotal).toBeCloseTo(
      (result as any).views.entries[0].damage.expected,
      6,
    )
    expect((result as any).views.entries[0].build).toBeUndefined()
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
    expect((result as any).message).toContain("source-specific damage view")
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
    expect((result as any).supportedAgents).toEqual(
      expect.arrayContaining(["爱丽丝", "柏妮思", "雅", "爱芮", "薇薇安"]),
    )
  })

  it("uses source-damage-view scope labels for unsupported w-engines", async () => {
    const result = await runTool(resolveBuildSourceDamageViews, {
      agent: "爱丽丝",
      wEngine: "不存在的音擎",
      finalPanel: {
        attack: 2800,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 200,
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
    })

    expect((result as any).found).toBe(false)
    expect((result as any).message).toContain("source-specific damage view")
    expect((result as any).supportedWEngines).toContain("嵌合编译器")
  })

  it("returns Aria exflow as a covered delta source view", async () => {
    const result = await runTool(resolveBuildSourceDamageViews, {
      agent: "爱芮",
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
    expect((result as any).views.summary).toMatchObject({
      entryCount: 1,
      standaloneCount: 0,
      deltaCount: 1,
      supportedCount: 1,
      unsupportedCount: 0,
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
      diagnosticSummary: {
        count: 2,
        hasDiagnostics: true,
      },
      sourceNoteSummary: {
        count: 2,
        hasSourceNotes: true,
      },
      groups: [
        {
          key: "delta",
          label: "增量结算条目",
          count: 1,
          supportedCount: 1,
          unsupportedCount: 0,
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
      ],
    })
    expect((result as any).views.entries[0]).toMatchObject({
      id: "aria-exflow",
      supported: true,
      resolutionMode: "delta",
      metadata: {
        stableKey: "source-view:aria-exflow",
        entryKind: "source-damage-view",
      },
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
        ownerGroups: [{ key: "dynamicSnapshot", count: 2 }],
      },
    })
    expect((result as any).views.entries[0].sourceNotes).toBeUndefined()
  })

  it("returns Vivian exflow as a covered formula-derived delta source view", async () => {
    const result = await runTool(resolveBuildSourceDamageViews, {
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
    expect((result as any).views.summary).toMatchObject({
      entryCount: 1,
      standaloneCount: 0,
      deltaCount: 1,
      supportedCount: 1,
      unsupportedCount: 0,
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
    })
    expect((result as any).views.entries[0]).toMatchObject({
      id: "vivian-exflow",
      supported: true,
      resolutionMode: "delta",
      metadata: {
        canonicalLabel: "薇薇安：[异放]",
        stableKey: "source-view:vivian-exflow",
        entryKind: "source-damage-view",
      },
    })
    expect((result as any).views.entries[0].requirements).toBeUndefined()
    expect((result as any).views.entries[0].assumptionSummary).toMatchObject({
      hasAssumptions: true,
    })
  })

  it("builds source-damage coverage gaps through the shared helper", () => {
    const result = resolveBuildToolSourceDamageCoverageResponse({
      agentName: "猫又",
      supportedAgents: [
        {
          id: "1401",
          name: "爱丽丝",
          aliases: ["爱丽丝", "alice-thymefield"],
        },
      ],
    })

    expect(result.found).toBe(false)
    expect(result.message).toContain("source-specific damage view")
    expect(result.message).toContain("暂未覆盖代理人")
    expect(result.supportedAgents).toEqual(["爱丽丝"])
  })

  it("returns full source-damage requirements and build details only when explicitly requested", async () => {
    const result = await runTool(resolveBuildSourceDamageViews, {
      agent: "爱丽丝",
      includeDetails: true,
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
    expect(
      (result as any).views.entries[0].sourceNotes.some(
        (note: any) =>
          note.owner === "stateSnapshot" &&
          note.keys.includes(
            "scenario.stateSnapshot.values.alicePolarityAssaultDamageRatio",
          ),
      ),
    ).toBe(true)
    expect(
      (result as any).views.entries[0].diagnostics.some(
        (item: any) =>
          item.kind === "defaulted-input" &&
          item.owner === "scenario" &&
          item.keys.includes("scenario.extraAbilityActive"),
      ),
    ).toBe(true)
    expect((result as any).views.entries[0].build).toBeTruthy()
  })
})
