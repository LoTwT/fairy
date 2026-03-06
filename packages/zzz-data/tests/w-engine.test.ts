import { describe, expect, it } from "vitest"
import {
  calcWEngineBaseATK,
  calcWEngineSecondaryStat,
} from "../src/w-engine.js"

// Reference data from gachabase-w-engine-details.json
// S-rank lv60 star5: levels[60].baseStatGrowth=94090, stars[5].baseStatGrowth=44610, stars[5].advancedStatGrowth=15000

describe("calcWEngineBaseATK", () => {
  it("angel in the Shell (base=48) lv60 star5 → 713", () => {
    expect(calcWEngineBaseATK(48, 94090, 44610)).toBe(713)
  })

  it("fusion Compiler (base=46) lv60 star5 → 684", () => {
    expect(calcWEngineBaseATK(46, 94090, 44610)).toBe(684)
  })

  it("cloudcleave Radiance (base=50) lv60 star5 → 743", () => {
    expect(calcWEngineBaseATK(50, 94090, 44610)).toBe(743)
  })

  it("lv0 star0 returns base value", () => {
    expect(calcWEngineBaseATK(48, 0, 0)).toBe(48)
  })
})

describe("calcWEngineSecondaryStat", () => {
  it("anomaly Mastery (value=0.12) star5 → 0.30", () => {
    expect(calcWEngineSecondaryStat(0.12, 15000)).toBeCloseTo(0.3)
  })

  it("anomaly Mastery star0 → 0.12 (unchanged)", () => {
    expect(calcWEngineSecondaryStat(0.12, 0)).toBeCloseTo(0.12)
  })

  it("anomaly Proficiency (value=36) star5 → 90", () => {
    expect(calcWEngineSecondaryStat(36, 15000)).toBe(90)
  })

  it("anomaly Proficiency star0 → 36 (unchanged)", () => {
    expect(calcWEngineSecondaryStat(36, 0)).toBe(36)
  })
})
