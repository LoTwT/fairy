import { describe, expect, it } from "vitest"

import {
  compactStaticBuildResult,
  compactStaticBuildSkillMatrixResult,
  compactStaticBuildSourceDamageViewsResult,
  compactStaticBuildSourceEntryCollection,
  compactStaticBuildSourceUtilityViewsResult,
  compactStaticBuildTriggerMatrixResult,
  resolveStaticBuildDamage,
  resolveStaticBuildSkillMatrix,
  resolveStaticBuildSourceDamageViews,
  resolveStaticBuildSourceEntries,
  resolveStaticBuildSourceUtilityViews,
  resolveStaticBuildTriggerMatrix,
} from "../../src"

describe("static build compact helpers", () => {
  it("compacts single-build results and keeps trace only when requested", () => {
    const build = resolveStaticBuildDamage({
      loadout: {
        agentId: "1241",
        wEngineId: "14124",
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
        combatTags: ["suppressionMode"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    const compact = compactStaticBuildResult(build)
    const full = compactStaticBuildResult(build, true)

    expect(compact.profile).toEqual(build.profile)
    expect(compact.mode).toBe(build.mode)
    expect(compact.manualBaseMode).toBe(build.manualBaseMode)
    expect(compact.summary).toEqual(build.summary)
    expect(compact.effectSummary).toEqual(build.effectSummary)
    expect(compact.loadout).toEqual(build.loadout)
    expect(compact.damage.expected.total).toBeGreaterThan(0)
    expect(compact.resolvedPanel).toEqual(build.resolvedPanel)
    expect(compact.resolvedBuckets).toEqual(build.resolvedBuckets)
    expect(compact.damage).toEqual(build.damage)
    expect(compact.assumptions).toBeUndefined()
    expect(compact.unsupportedEffects).toBeUndefined()
    expect(compact.diagnostics).toBeUndefined()
    expect(compact.sourceNotes).toBeUndefined()
    expect(compact.damageParams).toBeUndefined()
    expect(compact.trace).toBeUndefined()
    expect(full.assumptions).toEqual(build.assumptions)
    expect(full.unsupportedEffects).toEqual(build.unsupportedEffects)
    expect(full.diagnostics).toEqual(build.diagnostics)
    expect(full.sourceNotes).toEqual(build.sourceNotes)
    expect(full.damageParams).toEqual(build.damageParams)
    expect(full.trace).toEqual(build.trace)
  })

  it("compacts skill matrix rows without build details by default", () => {
    const matrix = resolveStaticBuildSkillMatrix({
      loadout: {
        agentId: "1241",
        wEngineId: "14124",
      },
      panel: {
        attack: 3200,
        baseAttack: 1200,
        critRate: 0.55,
        critDamage: 1.4,
      },
      context: {
        combatTags: ["suppressionMode"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    const compact = compactStaticBuildSkillMatrixResult(matrix)

    expect(compact.profile).toEqual(matrix.profile)
    expect(compact.mode).toBe(matrix.mode)
    expect(compact.manualBaseMode).toBe(matrix.manualBaseMode)
    expect(compact.loadout).toEqual(matrix.loadout)
    expect(compact.rows).toHaveLength(21)
    expect(compact.requirementSummary).toEqual({
      count: 0,
      satisfiedCount: 0,
      unsatisfiedCount: 0,
      hasUnsatisfied: false,
      groups: [],
    })
    expect(compact.summary.requirementSummary).toEqual(
      compact.requirementSummary,
    )
    expect(compact.assumptions).toBeUndefined()
    expect(compact.unsupportedEffects).toBeUndefined()
    expect(compact.rows[0]?.metadata).toEqual(matrix.rows[0]?.metadata)
    expect(compact.rows[0]?.build).toBeUndefined()
    expect(compact.rows[0]?.assumptions).toBeUndefined()
    expect(compact.rows[0]?.unsupportedEffects).toBeUndefined()
    expect(compact.rows[0]?.diagnostics).toBeUndefined()
    expect(compact.rows[0]?.sourceNotes).toBeUndefined()
    expect(compact.summary.groups[0]?.assumptions).toBeUndefined()
    expect(compact.summary.groups[0]?.unsupportedEffects).toBeUndefined()
    expect(compact.rows[0]?.requirementSummary).toEqual({
      count: 0,
      satisfiedCount: 0,
      unsatisfiedCount: 0,
      hasUnsatisfied: false,
      groups: [],
    })
    expect(compact.rows[0]?.damage.expected).toBeGreaterThan(0)
    expect(compact.rows[0]?.resolvedBuckets).toEqual(
      matrix.rows[0]?.resolvedBuckets,
    )
  })

  it("keeps skill matrix row assumptions, unsupportedEffects, diagnostics and source notes only when requested", () => {
    const matrix = resolveStaticBuildSkillMatrix({
      loadout: {
        agentId: "1241",
        wEngineId: "14124",
      },
      panel: {
        attack: 3200,
        baseAttack: 1200,
        critRate: 0.55,
        critDamage: 1.4,
      },
      context: {
        combatTags: ["suppressionMode"],
        enemy: {
          defenderBaseDefense: 953,
          defenderResistance: 0.2,
        },
      },
    })

    const compact = compactStaticBuildSkillMatrixResult(matrix, true)

    expect(compact.assumptions).toEqual(matrix.assumptions)
    expect(compact.unsupportedEffects).toEqual(matrix.unsupportedEffects)
    expect(compact.summary.groups[0]?.assumptions).toEqual(
      matrix.summary.groups[0]?.assumptions,
    )
    expect(compact.summary.groups[0]?.unsupportedEffects).toEqual(
      matrix.summary.groups[0]?.unsupportedEffects,
    )
    expect(compact.rows[0]?.assumptions).toEqual(matrix.rows[0]?.assumptions)
    expect(compact.rows[0]?.unsupportedEffects).toEqual(
      matrix.rows[0]?.unsupportedEffects,
    )
    expect(compact.rows[0]?.diagnostics).toEqual(matrix.rows[0]?.diagnostics)
    expect(compact.rows[0]?.sourceNotes).toEqual(matrix.rows[0]?.sourceNotes)
    expect(compact.rows[0]?.build).toEqual(
      matrix.rows[0]?.build
        ? compactStaticBuildResult(matrix.rows[0].build, true)
        : undefined,
    )
  })

  it("compacts trigger matrix rows without row details by default", () => {
    const matrix = resolveStaticBuildTriggerMatrix({
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

    const compact = compactStaticBuildTriggerMatrixResult(matrix)

    expect(compact.profile).toEqual(matrix.profile)
    expect(compact.mode).toBe(matrix.mode)
    expect(compact.manualBaseMode).toBe(matrix.manualBaseMode)
    expect(compact.loadout).toEqual(matrix.loadout)
    expect(compact.assumptions).toBeUndefined()
    expect(compact.rows[0]?.metadata).toEqual(matrix.rows[0]?.metadata)
    expect(compact.rows[0]?.damage).toEqual(matrix.rows[0]?.damage)
    expect(compact.rows[0]?.assumptions).toBeUndefined()
    expect(compact.rows[0]?.requirements).toBeUndefined()
    expect(compact.rows[0]?.diagnostics).toBeUndefined()
    expect(compact.rows[0]?.sourceNotes).toBeUndefined()
    expect(compact.rows[0]?.build).toBeUndefined()
  })

  it("compacts trigger matrix rows and keeps raw assumptions and requirements only when requested", () => {
    const matrix = resolveStaticBuildTriggerMatrix({
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

    const compact = compactStaticBuildTriggerMatrixResult(matrix, true)

    expect(compact.rows).toHaveLength(2)
    expect(compact.assumptions).toEqual(matrix.assumptions)
    expect(compact.rows[0]?.assumptions).toEqual(matrix.rows[0]?.assumptions)
    expect(compact.rows[0]?.requirements).toEqual(matrix.rows[0]?.requirements)
    expect(compact.rows[0]?.diagnostics).toEqual(matrix.rows[0]?.diagnostics)
    expect(compact.rows[0]?.sourceNotes).toEqual(matrix.rows[0]?.sourceNotes)
    expect(compact.rows[0]?.build).toEqual(
      matrix.rows[0]?.build
        ? compactStaticBuildResult(matrix.rows[0].build, true)
        : undefined,
    )
    expect(compact.rows[1]?.metadata.entryKind).toBe("source-view")
    expect(compact.rows[0]?.diagnosticSummary).toEqual({
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
    })
    expect(compact.rows[0]?.sourceNoteSummary).toEqual({
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
    expect(compact.rows[1]?.requirementSummary).toEqual({
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
    expect(compact.rows[1]?.diagnosticSummary).toEqual({
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
    })
    expect(compact.rows[1]?.sourceNoteSummary).toEqual({
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
  })

  it("compacts source-damage-view entries without entry details by default", () => {
    const views = resolveStaticBuildSourceDamageViews({
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

    const compact = compactStaticBuildSourceDamageViewsResult(views)

    expect(compact.mode).toBe(views.mode)
    expect(compact.manualBaseMode).toBe(views.manualBaseMode)
    expect(compact.loadout).toEqual(views.loadout)
    expect(compact.assumptions).toBeUndefined()
    expect(compact.entries[0]?.metadata).toEqual(views.entries[0]?.metadata)
    expect(compact.entries[0]?.damage).toEqual(views.entries[0]?.damage)
    expect(compact.entries[0]?.assumptions).toBeUndefined()
    expect(compact.entries[0]?.diagnostics).toBeUndefined()
    expect(compact.entries[0]?.sourceNotes).toBeUndefined()
    expect(compact.entries[0]?.build).toBeUndefined()
    expect(compact.entries[0]?.requirements).toBeUndefined()
  })

  it("keeps source-damage-view entry raw assumptions, requirements and details only when requested", () => {
    const views = resolveStaticBuildSourceDamageViews({
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

    const compact = compactStaticBuildSourceDamageViewsResult(views, true)

    expect(compact.assumptions).toEqual(views.assumptions)
    expect(compact.entries[0]?.assumptions).toEqual(
      views.entries[0]?.assumptions,
    )
    expect(compact.entries[0]?.requirements).toEqual(
      views.entries[0]?.requirements,
    )
    expect(compact.entries[0]?.diagnostics).toEqual(
      views.entries[0]?.diagnostics,
    )
    expect(compact.entries[0]?.sourceNotes).toEqual(
      views.entries[0]?.sourceNotes,
    )
    expect(compact.entries[0]?.build).toEqual(
      views.entries[0]?.build
        ? compactStaticBuildResult(views.entries[0].build, true)
        : undefined,
    )
  })

  it("compacts source-entry collections for mixed damage and utility entries", () => {
    const collection = resolveStaticBuildSourceEntries({
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

    const compact = compactStaticBuildSourceEntryCollection(collection)

    expect(compact.loadout).toEqual(collection.loadout)
    expect(compact.assumptions).toBeUndefined()
    expect(compact.entries[0]?.metadata).toEqual(
      collection.entries[0]?.metadata,
    )
    expect(compact.summary.entryCount).toBe(2)
    expect(compact.entries.map((entry) => entry.metadata.entryKind)).toEqual(
      expect.arrayContaining(["source-damage-view", "source-utility-view"]),
    )
    const damageEntry = compact.entries.find(
      (entry) => entry.metadata.entryKind === "source-damage-view",
    )
    const utilityEntry = compact.entries.find(
      (entry) => entry.metadata.entryKind === "source-utility-view",
    )
    expect(damageEntry?.damage).toBeTruthy()
    expect(
      (damageEntry as { requirementSummary?: unknown } | undefined)
        ?.requirementSummary,
    ).toEqual({
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
    expect(
      (damageEntry as { diagnosticSummary?: unknown } | undefined)
        ?.diagnosticSummary,
    ).toEqual({
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
    })
    expect(
      (damageEntry as { sourceNoteSummary?: unknown } | undefined)
        ?.sourceNoteSummary,
    ).toEqual({
      count: 2,
      hasSourceNotes: true,
      hasMissingInput: false,
      hasProcessOnly: false,
      hasResearchOnly: false,
      statusGroups: [{ key: "resolved", label: "已展开", count: 2 }],
      ownerGroups: [{ key: "dynamicSnapshot", count: 2 }],
    })
    expect(
      (damageEntry as { diagnostics?: unknown } | undefined)?.diagnostics,
    ).toBeUndefined()
    expect(
      (damageEntry as { sourceNotes?: unknown } | undefined)?.sourceNotes,
    ).toBeUndefined()
    expect(
      (damageEntry as { requirements?: unknown } | undefined)?.requirements,
    ).toBeUndefined()
    expect(
      (damageEntry as { assumptions?: unknown } | undefined)?.assumptions,
    ).toBeUndefined()
    expect("build" in (damageEntry ?? {})).toBe(false)
    expect(
      (utilityEntry as { assumptions?: unknown } | undefined)?.assumptions,
    ).toBeUndefined()
    expect(
      (utilityEntry as { requirements?: unknown } | undefined)?.requirements,
    ).toBeUndefined()
    expect(
      (utilityEntry as { diagnostics?: unknown } | undefined)?.diagnostics,
    ).toBeUndefined()
    expect(
      (utilityEntry as { sourceNotes?: unknown } | undefined)?.sourceNotes,
    ).toBeUndefined()
    expect("build" in (utilityEntry ?? {})).toBe(false)
  })

  it("keeps mixed source-entry details only when requested", () => {
    const collection = resolveStaticBuildSourceEntries({
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

    const compact = compactStaticBuildSourceEntryCollection(collection, true)
    expect(compact.assumptions).toEqual(collection.assumptions)
    const damageEntry = compact.entries.find(
      (entry) => entry.metadata.entryKind === "source-damage-view",
    )
    const utilityEntry = compact.entries.find(
      (entry) => entry.metadata.entryKind === "source-utility-view",
    )

    expect(damageEntry?.assumptions).toEqual(expect.any(Array))
    expect(damageEntry?.requirements).toEqual(expect.any(Array))
    expect(damageEntry?.diagnostics).toEqual(expect.any(Array))
    expect(damageEntry?.sourceNotes).toEqual(expect.any(Array))
    expect(damageEntry?.build).toBeUndefined()
    expect(utilityEntry?.assumptions).toEqual(expect.any(Array))
    expect(utilityEntry?.requirements).toEqual(expect.any(Array))
    expect(utilityEntry?.diagnostics).toEqual(expect.any(Array))
    expect(utilityEntry?.sourceNotes).toEqual(expect.any(Array))
    expect(utilityEntry?.build).toBeUndefined()
  })

  it("compacts source-damage views without build details by default", () => {
    const views = resolveStaticBuildSourceDamageViews({
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

    const compact = compactStaticBuildSourceDamageViewsResult(views)

    expect(compact.entries).toHaveLength(1)
    expect(compact.entries[0]?.damage?.expected).toBeGreaterThan(0)
    expect(compact.entries[0]?.requirementSummary).toEqual({
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
    expect(compact.entries[0]?.diagnosticSummary).toEqual({
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
    })
    expect(compact.entries[0]?.sourceNoteSummary).toEqual({
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
    expect("build" in (compact.entries[0] ?? {})).toBe(false)
  })

  it("compacts source-utility views into the same public shape used by high-level tools", () => {
    const views = resolveStaticBuildSourceUtilityViews({
      loadout: {
        agentId: "1021",
        wEngineId: "12003",
        wEngineRefinement: 1,
      },
    })

    const compact = compactStaticBuildSourceUtilityViewsResult(views)

    expect(compact.loadout).toEqual(views.loadout)
    expect(compact.assumptions).toBeUndefined()
    expect(compact.entries[0]?.metadata).toEqual(views.entries[0]?.metadata)
    expect(compact.entries).toHaveLength(1)
    expect(compact.effectSummary).toEqual([])
    expect(compact.summary.effectSummary).toEqual([])
    expect(compact.summary.groups[0]?.effectSummary).toEqual([])
    expect(compact.entries[0]).toMatchObject({
      id: "lunar-noviluna-energy-refund",
      metadata: {
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
    })
    expect(compact.entries[0]?.assumptions).toBeUndefined()
    expect(compact.entries[0]?.diagnostics).toBeUndefined()
    expect(compact.entries[0]?.sourceNotes).toBeUndefined()
    expect(compact.entries[0]?.requirements).toBeUndefined()
  })

  it("keeps source-utility entry raw assumptions, requirements and details only when requested", () => {
    const views = resolveStaticBuildSourceUtilityViews({
      loadout: {
        agentId: "1021",
        wEngineId: "12003",
        wEngineRefinement: 1,
      },
    })

    const compact = compactStaticBuildSourceUtilityViewsResult(views, true)

    expect(compact.assumptions).toEqual(views.assumptions)
    expect(compact.entries[0]?.assumptions).toEqual(
      views.entries[0]?.assumptions,
    )
    expect(compact.entries[0]?.requirements).toEqual(
      views.entries[0]?.requirements,
    )
    expect(compact.entries[0]?.diagnostics).toEqual(
      views.entries[0]?.diagnostics,
    )
    expect(compact.entries[0]?.sourceNotes).toEqual(
      views.entries[0]?.sourceNotes,
    )
  })
})
