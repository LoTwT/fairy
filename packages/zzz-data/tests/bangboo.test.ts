import { describe, expect, it } from "vitest"
import { calcBangbooStat } from "../src/bangboo.js"

// Reference: bangboo 54010 (Biggest Fan), data from gachabase-bangboo.json
// Verified at lv60, optimization level 6 (maxLevel=60)
// Website values: HP=5095, ATK=7896, DEF=666, Impact=110

describe("calcBangbooStat", () => {
  it("hP lv60 opt6 → 5095", () => {
    // value=479, growthPerLevel=57.0196, optimizationBoost=1252
    expect(calcBangbooStat(479, 57.0196, 60, 1252)).toBe(5095)
  })

  it("aTK lv60 opt6 → 7896", () => {
    // value=64, growthPerLevel=32.1091, optimizationBoost=5938
    expect(calcBangbooStat(64, 32.1091, 60, 5938)).toBe(7896)
  })

  it("dEF lv60 opt6 → 666", () => {
    // value=28, growthPerLevel=7.8871, optimizationBoost=173
    expect(calcBangbooStat(28, 7.8871, 60, 173)).toBe(666)
  })

  it("impact (null growth) lv60 opt6 no boost → 110", () => {
    // value=110, growthPerLevel=null, optimizationBoost=0
    expect(calcBangbooStat(110, null, 60, 0)).toBe(110)
  })

  it("lv1 no boost returns base value", () => {
    expect(calcBangbooStat(479, 57.0196, 1, 0)).toBe(479)
  })
})
