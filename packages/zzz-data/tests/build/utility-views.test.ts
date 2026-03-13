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
    expect(result.entries[0]).toMatchObject({
      id: "lunar-noviluna-energy-refund",
      metadata: {
        canonicalLabel: "「月相」-朔：[新月]",
        stableKey: "source-utility:lunar-noviluna-energy-refund",
        entryKind: "source-utility-view",
      },
      utilityType: "energy-refund",
      resolutionMode: "trigger",
      targetScope: "self",
      value: 3,
      unit: "energy",
      cooldownSeconds: 12,
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
    expect(result.entries[0]).toMatchObject({
      id: "magnetic-storm-charlie-energy-refund",
      metadata: {
        stableKey: "source-utility:magnetic-storm-charlie-energy-refund",
        entryKind: "source-utility-view",
      },
      utilityType: "energy-refund",
      resolutionMode: "trigger",
      targetScope: "self",
      value: 3.5,
      unit: "energy",
      cooldownSeconds: 12,
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
    expect(result.entries[0]).toMatchObject({
      id: "flamemaker-shaker-offfield-energy-regen",
      metadata: {
        stableKey: "source-utility:flamemaker-shaker-offfield-energy-regen",
        entryKind: "source-utility-view",
        utilityType: "energy-regen-rate",
      },
      utilityType: "energy-regen-rate",
      resolutionMode: "rate",
      targetScope: "self",
      value: 0.6,
      unit: "energy-per-second",
      conditionLabel: "位于后场时",
    })
  })
})
