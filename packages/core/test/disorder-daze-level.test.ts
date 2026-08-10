import { describe, expect, expectTypeOf, it } from "vitest"
import {
  DISORDER_DAZE_LEVEL_FACTOR_ID,
  disorderDazeLevelFactor,
  type DisorderDazeLevelFactorInput,
  type Factor,
} from "../src/index.ts"

describe("disorderDazeLevelFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<DisorderDazeLevelFactorInput>().toEqualTypeOf<number>()
    expectTypeOf(
      DISORDER_DAZE_LEVEL_FACTOR_ID,
    ).toEqualTypeOf<"disorder_daze_level">()
    expectTypeOf(disorderDazeLevelFactor).toEqualTypeOf<
      Factor<DisorderDazeLevelFactorInput>
    >()

    expect(DISORDER_DAZE_LEVEL_FACTOR_ID).toBe("disorder_daze_level")
    expect(disorderDazeLevelFactor.factorId).toBe(DISORDER_DAZE_LEVEL_FACTOR_ID)
    expect(Object.isFrozen(disorderDazeLevelFactor)).toBe(true)
  })

  it.each([
    [1, 1.0075],
    [20, 1.15],
    [40, 1.3],
    [60, 1.45],
  ])("calculates the multiplier for level %i", (level, multiplier) => {
    expect(disorderDazeLevelFactor.calculate(level)).toBe(multiplier)
  })

  it.each([
    ["string", "1"],
    ["boolean", true],
    ["null", null],
    ["undefined", undefined],
    ["object", { level: 1 }],
    ["array", [1]],
  ])("rejects a non-number %s input", (_name, input) => {
    expect(() =>
      disorderDazeLevelFactor.calculate(
        input as unknown as DisorderDazeLevelFactorInput,
      ),
    ).toThrow(TypeError)
  })

  it.each([NaN, Infinity, -Infinity])(
    "rejects the non-finite input %s",
    (input) => {
      expect(() => disorderDazeLevelFactor.calculate(input)).toThrow(RangeError)
    },
  )

  it.each([1.5, 59.9999])("rejects the non-integer input %s", (input) => {
    expect(() => disorderDazeLevelFactor.calculate(input)).toThrow(RangeError)
  })

  it.each([0, -1, 61])("rejects the out-of-range input %s", (input) => {
    expect(() => disorderDazeLevelFactor.calculate(input)).toThrow(RangeError)
  })
})
