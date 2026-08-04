import { describe, expect, expectTypeOf, it } from "vitest"
import { defineFactor, type Factor, type FactorParams } from "../src/index.ts"

interface ValueInput {
  readonly value: number
}

describe("defineFactor", () => {
  it("defines a typed factor and calculates a finite result", () => {
    const params: FactorParams<ValueInput> = {
      factorId: "value-sum",
      calculate: (inputs) =>
        inputs.reduce((sum, input) => sum + input.value, 0),
    }
    const factor = defineFactor(params)

    expectTypeOf(factor).toEqualTypeOf<Factor<ValueInput>>()
    expect(factor.factorId).toBe("value-sum")
    expect(factor.calculate([{ value: 2 }, { value: 3 }])).toBe(5)
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
    expect(factor.calculate([])).toBe(1)
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

      expect(() => factor.calculate([])).toThrow(RangeError)
    },
  )

  it.each([0, -1, Number.MIN_VALUE, Number.MAX_VALUE])(
    "accepts the finite result %s",
    (result) => {
      const factor = defineFactor<ValueInput>({
        factorId: "finite-result",
        calculate: () => result,
      })

      expect(factor.calculate([])).toBe(result)
    },
  )

  it("rejects a non-array input without calling the calculation", () => {
    let calculationCalled = false
    const factor = defineFactor<ValueInput>({
      factorId: "array-input",
      calculate: () => {
        calculationCalled = true
        return 1
      },
    })

    expect(() =>
      factor.calculate(
        new Set<ValueInput>() as unknown as readonly ValueInput[],
      ),
    ).toThrow(TypeError)
    expect(calculationCalled).toBe(false)
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
      factor.calculate([])
    } catch (error) {
      actualError = error
    }

    expect(actualError).toBe(expectedError)
  })

  it("passes the input array through without copying or freezing it", () => {
    const inputs: ValueInput[] = [{ value: 1 }]
    let receivedInputs: readonly ValueInput[] | undefined
    const factor = defineFactor<ValueInput>({
      factorId: "input-identity",
      calculate: (currentInputs) => {
        receivedInputs = currentInputs
        return currentInputs.length
      },
    })

    expect(factor.calculate(inputs)).toBe(1)
    expect(receivedInputs).toBe(inputs)
    expect(Object.isFrozen(inputs)).toBe(false)
  })
})
