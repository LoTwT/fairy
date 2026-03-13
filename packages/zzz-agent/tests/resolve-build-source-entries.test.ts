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
    expect((result as any).collection.summary).toMatchObject({
      entryCount: 1,
      sourceDamageViewCount: 0,
      sourceUtilityViewCount: 1,
      supportedCount: 1,
      unsupportedCount: 0,
      isUtilityOnly: true,
      groups: [
        {
          key: "source-utility-view",
          label: "回能 / utility 条目",
          count: 1,
        },
      ],
    })
    expect((result as any).collection.entries[0]).toMatchObject({
      id: "lunar-noviluna-energy-refund",
      metadata: {
        entryKind: "source-utility-view",
        stableKey: "source-utility:lunar-noviluna-energy-refund",
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
    expect((result as any).collection.summary).toMatchObject({
      entryCount: 2,
      sourceDamageViewCount: 1,
      sourceUtilityViewCount: 1,
      supportedCount: 2,
      unsupportedCount: 0,
      isUtilityOnly: false,
      groups: [
        {
          key: "source-damage-view",
          label: "额外结算条目",
          count: 1,
        },
        {
          key: "source-utility-view",
          label: "回能 / utility 条目",
          count: 1,
        },
      ],
    })
    expect(
      (result as any).collection.entries.map((entry: any) => entry.id),
    ).toEqual(
      expect.arrayContaining([
        "aria-exflow",
        "flamemaker-shaker-offfield-energy-regen",
      ]),
    )
    expect(
      (result as any).collection.entries.find(
        (entry: any) => entry.id === "aria-exflow",
      ).build,
    ).toBeUndefined()
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
    })
    expect(
      (result as any).collection.entries.map((entry: any) => entry.id),
    ).toEqual(
      expect.arrayContaining([
        "vivian-exflow",
        "magnetic-storm-charlie-energy-refund",
      ]),
    )
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
