import { describe, expect, expectTypeOf, it } from "vitest"
import { defineFactor, type Factor, type FactorParams } from "../src/index.ts"

interface ValueInput {
  readonly value: number
}

describe("defineFactor", () => {
  it("defines a typed factor and calculates a finite result", () => {
    const params: FactorParams<ValueInput> = {
      factorId: "value",
      calculate: (input) => input.value,
    }
    const factor = defineFactor(params)

    expectTypeOf(factor).toEqualTypeOf<Factor<ValueInput>>()
    expect(factor.factorId).toBe("value")
    expect(factor.calculate({ value: 5 })).toBe(5)
  })

  it("freezes the returned Factor", () => {
    const factor = defineFactor<ValueInput>({
      factorId: "frozen-factor",
      calculate: () => 1,
    })

    expect(Object.isFrozen(factor)).toBe(true)
    expect(() => {
      ;(factor as { factorId: string }).factorId = "changed-factor"
    }).toThrow(TypeError)
    expect(factor.factorId).toBe("frozen-factor")
  })

  it("snapshots mutable FactorParams", () => {
    const params: FactorParams<ValueInput> = {
      factorId: "original-factor",
      calculate: () => 1,
    }
    const factor = defineFactor(params)

    params.factorId = "changed-factor"
    params.calculate = () => 2

    expect(Object.isFrozen(params)).toBe(false)
    expect(factor.factorId).toBe("original-factor")
    expect(factor.calculate({ value: 0 })).toBe(1)
  })

  it.each(["", " \n\t"])("rejects an empty factorId %#", (factorId) => {
    expect(() =>
      defineFactor<ValueInput>({
        factorId,
        calculate: () => 1,
      }),
    ).toThrow(TypeError)
  })

  it("rejects a non-string factorId even when it provides trim", () => {
    expect(() =>
      defineFactor({
        factorId: { trim: () => "object-factor" },
        calculate: () => 1,
      } as unknown as FactorParams<ValueInput>),
    ).toThrow(TypeError)
  })

  it("rejects a non-function calculate value", () => {
    expect(() =>
      defineFactor({
        factorId: "invalid-calculation",
        calculate: {},
      } as unknown as FactorParams<ValueInput>),
    ).toThrow(TypeError)
  })

  it.each([NaN, Infinity, -Infinity])(
    "rejects the non-finite result %s",
    (result) => {
      const factor = defineFactor<ValueInput>({
        factorId: "invalid-result",
        calculate: () => result,
      })

      expect(() => factor.calculate({ value: 0 })).toThrow(RangeError)
    },
  )

  it.each([0, -1, Number.MIN_VALUE, Number.MAX_VALUE])(
    "accepts the finite result %s",
    (result) => {
      const factor = defineFactor<ValueInput>({
        factorId: "finite-result",
        calculate: () => result,
      })

      expect(factor.calculate({ value: 0 })).toBe(result)
    },
  )

  it("does not impose a common runtime shape on FactorInput", () => {
    const factor = defineFactor<ReadonlySet<number>>({
      factorId: "set-size",
      calculate: (input) => input.size,
    })

    expect(factor.calculate(new Set([1, 2]))).toBe(2)
  })

  it("propagates errors from the provided calculation function", () => {
    const expectedError = new Error("invalid input")
    const factor = defineFactor<ValueInput>({
      factorId: "throwing-factor",
      calculate: () => {
        throw expectedError
      },
    })
    let actualError: unknown

    try {
      factor.calculate({ value: 0 })
    } catch (error) {
      actualError = error
    }

    expect(actualError).toBe(expectedError)
  })

  it("passes the input through without copying or freezing it", () => {
    const input: ValueInput = { value: 1 }
    let receivedInput: ValueInput | undefined
    const factor = defineFactor<ValueInput>({
      factorId: "input-identity",
      calculate: (currentInput) => {
        receivedInput = currentInput
        return currentInput.value
      },
    })

    expect(factor.calculate(input)).toBe(1)
    expect(receivedInput).toBe(input)
    expect(Object.isFrozen(input)).toBe(false)
  })
})
