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
    expect((result as any).views.entries[0]).toMatchObject({
      id: "lunar-noviluna-energy-refund",
      metadata: {
        canonicalLabel: "「月相」-朔：[新月]",
        stableKey: "source-utility:lunar-noviluna-energy-refund",
        entryKind: "source-utility-view",
      },
      utilityType: "energy-refund",
      value: 3,
      unit: "energy",
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
    expect((result as any).views.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "time-slice-dodgeCounter-decibel-gain",
          utilityType: "decibel-gain",
          unit: "decibel",
        }),
        expect.objectContaining({
          id: "time-slice-assistAttack-energy-refund",
          utilityType: "energy-refund",
          unit: "energy",
        }),
      ]),
    )
  })
})
