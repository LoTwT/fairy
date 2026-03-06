import { describe, expect, it } from "vitest"
import { calcAgentStat } from "../../src/gachabase/agent.js"

// Reference: agent 1521 (Nicole), data from gachabase-agent-details.json
// Verified at lv60, promotion 6 (maxLevel=60), coreSkill level 6 (all unlocked)

describe("calcAgentStat", () => {
  it("hP lv60 promotion6 no coreSkill boost → 7673", () => {
    // value=617, growthPerLevel=83.7238, promotionBoost=2117, coreSkillBoost=0
    expect(calcAgentStat(617, 83.7238, 60, 2117, 0)).toBe(7673)
  })

  it("aTK lv60 promotion6 coreSkill-level7 → 938", () => {
    // value=135, growthPerLevel=8.2578, promotionBoost=241, coreSkillBoost=75
    expect(calcAgentStat(135, 8.2578, 60, 241, 75)).toBe(938)
  })

  it("lv1 no boosts returns base value", () => {
    expect(calcAgentStat(617, 83.7238, 1, 0, 0)).toBe(617)
  })
})
