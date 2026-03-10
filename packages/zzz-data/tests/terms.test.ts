import { describe, expect, it } from "vitest"
import {
  ATTRIBUTE_TO_BASE_RESISTANCE,
  ELEMENT_MULT_ORDER,
  getElementMultIndex,
  toAgentAttribute,
  toAgentSpecialty,
  toAttackType,
  toBaseResistanceAttribute,
} from "../src"

describe("terminology helpers", () => {
  it("normalizes specialty labels to canonical values", () => {
    expect(toAgentSpecialty("强攻")).toBe("Attack")
    expect(toAgentSpecialty("Rupture")).toBe("Rupture")
    expect(toAgentSpecialty("未知")).toBeUndefined()
  })

  it("normalizes attribute labels and base resistance buckets", () => {
    expect(toAgentAttribute("玄墨")).toBe("Auric Ink")
    expect(toAgentAttribute("Honed Edge")).toBe("Honed Edge")
    expect(toBaseResistanceAttribute("烈霜")).toBe("ice")
    expect(toBaseResistanceAttribute("玄墨")).toBe("ether")
    expect(toBaseResistanceAttribute("凛刃")).toBe("physical")
    expect(getElementMultIndex("冰属性")).toBe(0)
    expect(getElementMultIndex("Electric")).toBe(2)
    expect(ELEMENT_MULT_ORDER).toEqual([
      "ice",
      "fire",
      "electric",
      "ether",
      "physical",
    ])
    expect(ATTRIBUTE_TO_BASE_RESISTANCE["Auric Ink"]).toBe("ether")
  })

  it("normalizes attack type labels to canonical values", () => {
    expect(toAttackType("斩击")).toBe("Slash")
    expect(toAttackType("Strike")).toBe("Strike")
    expect(toAttackType("未知")).toBeUndefined()
  })
})
