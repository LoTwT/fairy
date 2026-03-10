import { describe, expect, it } from "vitest"

import { enemyCategoryCodes, isEnemyCategoryCode } from "../src"

describe("game-mode public contract", () => {
  it("exports currently observed raw enemy category codes", () => {
    expect(enemyCategoryCodes).toEqual([0, 1])
  })

  it("narrows known raw enemy category codes", () => {
    expect(isEnemyCategoryCode(0)).toBe(true)
    expect(isEnemyCategoryCode(1)).toBe(true)
    expect(isEnemyCategoryCode(2)).toBe(false)
  })
})
