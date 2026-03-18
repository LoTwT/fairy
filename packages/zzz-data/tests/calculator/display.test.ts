import { describe, expect, it } from "vitest"
import { ceilDisplayDamage, sumDisplayedSegments } from "../../src/index.js"

describe("ceilDisplayDamage", () => {
  it("rounds a single damage value up for display", () => {
    expect(ceilDisplayDamage(228.01)).toBe(229)
  })
})

describe("sumDisplayedSegments", () => {
  it("rounds each segment up before summing", () => {
    expect(sumDisplayedSegments([114.01, 114.01])).toBe(230)
  })
})
