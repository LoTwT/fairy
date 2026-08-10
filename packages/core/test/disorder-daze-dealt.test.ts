import { describe, expect, expectTypeOf, it } from "vitest"
import {
  DISORDER_DAZE_DEALT_FACTOR_ID,
  DEFAULT_DISORDER_DAZE_DEALT_FACTOR_INPUT,
  disorderDazeDealtFactor,
  type DisorderDazeDealtFactorInput,
  type Factor,
} from "../src/index.ts"

describe("disorderDazeDealtFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<DisorderDazeDealtFactorInput>().toEqualTypeOf<number>()
    expectTypeOf(
      DISORDER_DAZE_DEALT_FACTOR_ID,
    ).toEqualTypeOf<"disorder_daze_dealt">()
    expectTypeOf(
      DEFAULT_DISORDER_DAZE_DEALT_FACTOR_INPUT,
    ).toEqualTypeOf<DisorderDazeDealtFactorInput>()
    expectTypeOf(disorderDazeDealtFactor).toEqualTypeOf<
      Factor<DisorderDazeDealtFactorInput>
    >()

    expect(DISORDER_DAZE_DEALT_FACTOR_ID).toBe("disorder_daze_dealt")
    expect(disorderDazeDealtFactor.factorId).toBe(DISORDER_DAZE_DEALT_FACTOR_ID)
    expect(Object.isFrozen(disorderDazeDealtFactor)).toBe(true)
  })

  it("provides an immutable primitive default input with an identity result", () => {
    expect(DEFAULT_DISORDER_DAZE_DEALT_FACTOR_INPUT).toBe(1)
    expect(
      disorderDazeDealtFactor.calculate(
        DEFAULT_DISORDER_DAZE_DEALT_FACTOR_INPUT,
      ),
    ).toBe(1)
  })

  it.each([0, 1, 1.23456789, 4])(
    "returns the in-range multiplier %s unchanged",
    (input) => {
      expect(disorderDazeDealtFactor.calculate(input)).toBe(input)
    },
  )

  it.each([
    ["string", "1"],
    ["boolean", true],
    ["null", null],
    ["undefined", undefined],
    ["object", { multiplier: 1 }],
    ["array", [1]],
  ])("rejects a non-number %s input", (_name, input) => {
    expect(() =>
      disorderDazeDealtFactor.calculate(
        input as unknown as DisorderDazeDealtFactorInput,
      ),
    ).toThrow(TypeError)
  })

  it.each([NaN, Infinity, -Infinity])(
    "rejects the non-finite input %s",
    (input) => {
      expect(() => disorderDazeDealtFactor.calculate(input)).toThrow(RangeError)
    },
  )

  it.each([-Number.EPSILON, -1, 4.000000000000001, 5])(
    "rejects the out-of-range input %s",
    (input) => {
      expect(() => disorderDazeDealtFactor.calculate(input)).toThrow(RangeError)
    },
  )
})
