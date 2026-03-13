import { describe, expect, it } from "vitest"

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
    expect((result as any).views.summary).toMatchObject({
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
    expect((result as any).views.entries[0]).toMatchObject({
      id: "alice-polarity-assault",
      supported: true,
      resolutionMode: "standalone",
      metadata: {
        canonicalLabel: "爱丽丝：[极性强击]",
        stableKey: "source-view:alice-polarity-assault",
        entryKind: "source-damage-view",
      },
    })
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
    expect((result as any).views.entries[0].damage.expected).toBeGreaterThan(0)
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
    expect((result as any).views.entries[0]).toMatchObject({
      id: "aria-exflow",
      supported: true,
      resolutionMode: "delta",
      metadata: {
        stableKey: "source-view:aria-exflow",
        entryKind: "source-damage-view",
      },
    })
    expect(
      (result as any).views.entries[0].sourceNotes.some(
        (note: any) =>
          note.owner === "dynamicSnapshot" &&
          note.keys.includes(
            "scenario.dynamicSnapshot.values.ariaExflowDamageRatio",
          ),
      ),
    ).toBe(true)
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
    expect(
      (result as any).views.entries[0].requirements.map(
        (item: any) => item.kind,
      ),
    ).toEqual(expect.arrayContaining(["panel-value", "scenario-value"]))
    expect(
      (result as any).views.entries[0].assumptions.some((item: string) =>
        item.includes("按 coreSkillLevel 与异常精通推导 [异放] 比例"),
      ),
    ).toBe(true)
  })

  it("returns full source-damage build details only when explicitly requested", async () => {
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
    expect((result as any).views.entries[0].build).toBeTruthy()
  })
})
