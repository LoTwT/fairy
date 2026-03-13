import { describe, expect, it } from "vitest"

import {
  resolveStaticBuildSourceDamageViews,
  supportedStaticBuildSourceViewAgents,
} from "../../src"

describe("static build source damage views", () => {
  it("exports the current source-view support scope", () => {
    expect(
      supportedStaticBuildSourceViewAgents.map((item) => item.name),
    ).toEqual(
      expect.arrayContaining(["爱丽丝", "柏妮思", "雅", "爱芮", "薇薇安"]),
    )
    expect(supportedStaticBuildSourceViewAgents).toHaveLength(5)
  })

  it("returns an empty view list when the current loadout has no source-specific view coverage", () => {
    const result = resolveStaticBuildSourceDamageViews({
      loadout: {
        agentId: "1241",
        wEngineId: "14124",
        driveDiscSets: [{ id: "31000", pieces: 4 }],
      },
      panel: {
        attack: 3200,
        baseAttack: 1200,
        critRate: 0.55,
        critDamage: 1.4,
      },
      scenario: {
        damageType: "normal",
        skillTag: "basic",
        skillMultiplier: "350%",
        attribute: "以太",
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.mode).toBe("baseline")
    expect(result.loadout.agent.name).toBe("朱鸢")
    expect(result.summary).toEqual({
      entryCount: 0,
      standaloneCount: 0,
      deltaCount: 0,
      supportedCount: 0,
      unsupportedCount: 0,
      groups: [],
    })
    expect(result.entries).toEqual([])
    expect(result.assumptions).toEqual([])
  })

  it("resolves Alice polarity assault as a standalone source-specific view", () => {
    const result = resolveStaticBuildSourceDamageViews({
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

    expect(result.entries).toHaveLength(1)
    expect(result.summary).toMatchObject({
      entryCount: 1,
      standaloneCount: 1,
      deltaCount: 0,
      supportedCount: 1,
      unsupportedCount: 0,
      groups: [
        {
          key: "standalone",
          label: "独立结算条目",
          count: 1,
          supportedCount: 1,
          unsupportedCount: 0,
        },
      ],
    })
    expect(result.entries[0]).toMatchObject({
      id: "alice-polarity-assault",
      supported: true,
      resolutionMode: "standalone",
      metadata: {
        canonicalLabel: "爱丽丝：[极性强击]",
        stableKey: "source-view:alice-polarity-assault",
        entryKind: "source-damage-view",
        damageType: "anomaly",
        resolutionMode: "standalone",
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
    })
    expect(
      result.entries[0]?.build?.resolvedBuckets.skillMultiplierFactor,
    ).toBeCloseTo(2.5, 4)
    expect(result.entries[0]?.damage?.expected).toBeGreaterThan(0)
  })

  it("resolves Miyabi frostburn break as a standalone source-specific view", () => {
    const result = resolveStaticBuildSourceDamageViews({
      mode: "baseline",
      loadout: {
        agentId: "1091",
        wEngineId: "14109",
        agentLevel: 60,
      },
      panel: {
        attack: 2800,
        critRate: 0.4,
        critDamage: 1.1,
        anomalyProficiency: 180,
      },
      scenario: {
        damageType: "anomaly",
        skillTag: "special",
        damageMultiplier: "600%",
        attribute: "烈霜",
        stateSnapshot: {
          flags: {
            miyabiFrostburnBreakState: true,
          },
          values: {
            miyabiFrostburnBreakDamageRatio: 7.5,
          },
        },
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.entries).toHaveLength(1)
    expect(result.summary).toMatchObject({
      entryCount: 1,
      standaloneCount: 1,
      deltaCount: 0,
      supportedCount: 1,
      unsupportedCount: 0,
    })
    expect(result.entries[0]).toMatchObject({
      id: "miyabi-frostburn-break",
      supported: true,
      resolutionMode: "standalone",
      metadata: {
        stableKey: "source-view:miyabi-frostburn-break",
        entryKind: "source-damage-view",
        damageType: "anomaly",
      },
    })
    expect(result.entries[0]?.damage?.expected).toBeGreaterThan(0)
    expect(
      result.entries[0]?.assumptions.some((item) =>
        item.includes("不回写主公式"),
      ),
    ).toBe(true)
  })

  it("resolves Burnice ember as a delta source-specific view", () => {
    const result = resolveStaticBuildSourceDamageViews({
      mode: "full-buff",
      loadout: {
        agentId: "1171",
        agentLevel: 60,
      },
      panel: {
        attack: 3100,
        baseAttack: 1200,
        critRate: 0.2,
        critDamage: 0.5,
        anomalyProficiency: 160,
      },
      scenario: {
        damageType: "anomaly",
        skillTag: "enhancedSpecial",
        damageMultiplier: "520%",
        attribute: "火属性",
        dynamicSnapshot: {
          flags: {
            burniceEmberState: true,
          },
          counts: {
            burniceEmberExtraTriggers: 2,
          },
          values: {
            burniceEmberDamageRatio: 1.25,
          },
        },
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    expect(result.entries).toHaveLength(1)
    expect(result.summary).toMatchObject({
      entryCount: 1,
      standaloneCount: 0,
      deltaCount: 1,
      supportedCount: 1,
      unsupportedCount: 0,
      groups: [
        {
          key: "delta",
          label: "增量结算条目",
          count: 1,
          supportedCount: 1,
          unsupportedCount: 0,
        },
      ],
    })
    expect(result.entries[0]).toMatchObject({
      id: "burnice-ember",
      supported: true,
      resolutionMode: "delta",
      metadata: {
        stableKey: "source-view:burnice-ember",
        entryKind: "source-damage-view",
        damageType: "anomaly",
        resolutionMode: "delta",
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
        count: 1,
        hasSourceNotes: true,
        hasMissingInput: false,
        hasProcessOnly: false,
        hasResearchOnly: false,
        statusGroups: [{ key: "resolved", label: "已展开", count: 1 }],
        ownerGroups: [{ key: "dynamicSnapshot", count: 1 }],
      },
      requirementSummary: {
        count: 3,
        satisfiedCount: 3,
        unsatisfiedCount: 0,
        hasUnsatisfied: false,
        groups: [
          {
            key: "dynamic-flag",
            count: 1,
            satisfiedCount: 1,
            unsatisfiedCount: 0,
          },
          {
            key: "dynamic-count",
            count: 1,
            satisfiedCount: 1,
            unsatisfiedCount: 0,
          },
          {
            key: "dynamic-value",
            count: 1,
            satisfiedCount: 1,
            unsatisfiedCount: 0,
          },
        ],
      },
    })
    expect(
      result.entries[0]?.sourceNotes.some(
        (note) =>
          note.owner === "dynamicSnapshot" &&
          note.status === "resolved" &&
          note.keys.includes(
            "scenario.dynamicSnapshot.values.burniceEmberDamageRatio",
          ),
      ),
    ).toBe(true)
    expect(result.entries[0]?.build).toBeUndefined()
    expect(result.entries[0]?.damage?.expected).toBeGreaterThan(0)
  })

  it("resolves Aria exflow as a delta source-specific view", () => {
    const result = resolveStaticBuildSourceDamageViews({
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

    expect(result.entries).toHaveLength(1)
    expect(result.summary).toMatchObject({
      entryCount: 1,
      standaloneCount: 0,
      deltaCount: 1,
      supportedCount: 1,
      unsupportedCount: 0,
    })
    expect(result.entries[0]).toMatchObject({
      id: "aria-exflow",
      supported: true,
      resolutionMode: "delta",
      metadata: {
        canonicalLabel: "爱芮：[异放]",
        stableKey: "source-view:aria-exflow",
        entryKind: "source-damage-view",
        damageType: "disorder",
        resolutionMode: "delta",
      },
    })
    expect(
      result.entries[0]?.sourceNotes.some(
        (note) =>
          note.owner === "dynamicSnapshot" &&
          note.keys.includes(
            "scenario.dynamicSnapshot.values.ariaExflowDamageRatio",
          ),
      ),
    ).toBe(true)
    expect(result.entries[0]?.damage?.expected).toBeGreaterThan(0)
  })

  it("resolves Vivian exflow as a formula-derived delta source-specific view", () => {
    const result = resolveStaticBuildSourceDamageViews({
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

    expect(result.entries).toHaveLength(1)
    expect(result.entries[0]).toMatchObject({
      id: "vivian-exflow",
      supported: true,
      resolutionMode: "delta",
      metadata: {
        canonicalLabel: "薇薇安：[异放]",
        stableKey: "source-view:vivian-exflow",
        entryKind: "source-damage-view",
        damageType: "disorder",
        resolutionMode: "delta",
      },
      requirements: [
        {
          kind: "panel-value",
          key: "anomalyProficiency",
        },
        {
          kind: "scenario-value",
          key: "sourceAnomalyType",
        },
      ],
    })
    expect(
      result.entries[0]?.assumptions.some((item) =>
        item.includes("按 coreSkillLevel 与异常精通推导 [异放] 比例"),
      ),
    ).toBe(true)
    expect(
      result.entries[0]?.assumptions.some((item) =>
        item.includes("影画2将 [异放] 从异常精通中获得的收益提升至原本的 130%"),
      ),
    ).toBe(true)
    expect(result.entries[0]?.damage?.expected).toBeGreaterThan(0)
  })

  it("keeps specialty compatibility checks aligned with the main resolver", () => {
    expect(() =>
      resolveStaticBuildSourceDamageViews({
        loadout: {
          agentId: "1021",
          wEngineId: "14137",
        },
        panel: {
          attack: 2800,
          critRate: 0.5,
          critDamage: 1.1,
        },
        scenario: {
          damageType: "normal",
          skillTag: "basic",
          skillMultiplier: "300%",
          attribute: "物理",
          enemy: {
            defenderBaseDefense: 953,
            defenderResistance: 0.2,
          },
        },
      }),
    ).toThrow(/incompatible/)
  })
})
