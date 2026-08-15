import { describe, expect, expectTypeOf, it } from "vitest"
import {
  calculateVirtualAgentSnapshot,
  type VirtualAgentContributionRecord,
  type VirtualAgentSnapshot,
} from "../src/index.ts"

const DEFAULT_RECORD: VirtualAgentContributionRecord = {
  effectiveAnomalyBuildup: 1,
  level: 60,
  anomalyProficiency: 100,
  finalAttack: 1_000,
  finalImpact: 100,
  penetrationRatio: 0,
  penetrationValue: 0,
  damageBonusFactorResult: 1,
  dazeDealtFactorResult: 1,
}

function createRecord(
  overrides: Partial<VirtualAgentContributionRecord> = {},
): VirtualAgentContributionRecord {
  return { ...DEFAULT_RECORD, ...overrides }
}

function float64Bits(value: number): string {
  const buffer = new ArrayBuffer(8)
  const view = new DataView(buffer)

  view.setFloat64(0, value, false)

  return view.getBigUint64(0, false).toString(16).padStart(16, "0")
}

function numberFromFloat64Bits(bits: string): number {
  const buffer = new ArrayBuffer(8)
  const view = new DataView(buffer)

  view.setBigUint64(0, BigInt(`0x${bits}`), false)

  return view.getFloat64(0, false)
}

describe("calculateVirtualAgentSnapshot", () => {
  it("exposes its public types", () => {
    expectTypeOf<VirtualAgentContributionRecord>().toEqualTypeOf<{
      readonly effectiveAnomalyBuildup: number
      readonly level: number
      readonly anomalyProficiency: number
      readonly finalAttack: number
      readonly finalImpact: number
      readonly penetrationRatio: number
      readonly penetrationValue: number
      readonly damageBonusFactorResult: number
      readonly dazeDealtFactorResult: number
    }>()
    expectTypeOf<VirtualAgentSnapshot>().toEqualTypeOf<{
      readonly level: number
      readonly anomalyProficiency: number
      readonly finalAttack: number
      readonly finalImpact: number
      readonly penetrationRatio: number
      readonly penetrationValue: number
      readonly damageBonusFactorResult: number
      readonly dazeDealtFactorResult: number
    }>()
    expectTypeOf(calculateVirtualAgentSnapshot).toEqualTypeOf<
      (
        contributionRecords: readonly VirtualAgentContributionRecord[],
      ) => VirtualAgentSnapshot
    >()
  })

  it("reproduces a single contribution record without its weight", () => {
    const record = createRecord({
      effectiveAnomalyBuildup: 123.5,
      level: 42,
      anomalyProficiency: 321,
      finalAttack: 2_345.5,
      finalImpact: 137.25,
      penetrationRatio: -0.125,
      penetrationValue: 17.5,
      damageBonusFactorResult: 2.25,
      dazeDealtFactorResult: 1.75,
    })

    expect(calculateVirtualAgentSnapshot([record])).toEqual({
      level: 42,
      anomalyProficiency: 321,
      finalAttack: 2_345.5,
      finalImpact: 137.25,
      penetrationRatio: -0.125,
      penetrationValue: 17.5,
      damageBonusFactorResult: 2.25,
      dazeDealtFactorResult: 1.75,
    })
  })

  it("weights every historical field and floors only the final level", () => {
    const snapshot = calculateVirtualAgentSnapshot([
      createRecord({
        effectiveAnomalyBuildup: 1,
        level: 1,
        anomalyProficiency: 100,
        finalAttack: 1_000,
        finalImpact: 100,
        penetrationRatio: -0.25,
        penetrationValue: -8,
        damageBonusFactorResult: 0,
        dazeDealtFactorResult: 0,
      }),
      createRecord({
        effectiveAnomalyBuildup: 3,
        level: 60,
        anomalyProficiency: 200,
        finalAttack: 2_000,
        finalImpact: 200,
        penetrationRatio: 0.25,
        penetrationValue: 8,
        damageBonusFactorResult: 4,
        dazeDealtFactorResult: 4,
      }),
    ])

    expect(snapshot).toEqual({
      level: 45,
      anomalyProficiency: 175,
      finalAttack: 1_750,
      finalImpact: 175,
      penetrationRatio: 0.125,
      penetrationValue: 4,
      damageBonusFactorResult: 3,
      dazeDealtFactorResult: 3,
    })
  })

  it("keeps separate records from the same agent snapshot period", () => {
    const snapshot = calculateVirtualAgentSnapshot([
      createRecord({ effectiveAnomalyBuildup: 2, finalAttack: 1_000 }),
      createRecord({ effectiveAnomalyBuildup: 2, finalAttack: 2_000 }),
    ])

    expect(snapshot.finalAttack).toBe(1_500)
  })

  it("uses overflow-cropped records after a Bangboo contribution", () => {
    const snapshot = calculateVirtualAgentSnapshot([
      createRecord({ effectiveAnomalyBuildup: 30, finalAttack: 100 }),
      createRecord({ effectiveAnomalyBuildup: 20, finalAttack: 200 }),
    ])

    // The Bangboo occupied 50 of the threshold before the second eligible
    // event, so the caller supplied only its effective 20.
    expect(snapshot.finalAttack).toBe(140)
  })

  it("uses filtered records after a non-participating agent effect", () => {
    const snapshot = calculateVirtualAgentSnapshot([
      createRecord({ effectiveAnomalyBuildup: 20, finalAttack: 100 }),
      createRecord({ effectiveAnomalyBuildup: 20, finalAttack: 300 }),
    ])

    // The excluded agent effect occupied 60 of the threshold before the
    // second eligible event, so the caller supplied only its effective 20.
    expect(snapshot.finalAttack).toBe(200)
  })

  it("floors the exact weighted level at an integer boundary", () => {
    const snapshot = calculateVirtualAgentSnapshot([
      createRecord({ effectiveAnomalyBuildup: 1, level: 1 }),
      createRecord({ effectiveAnomalyBuildup: 6, level: 15 }),
    ])

    expect(snapshot.level).toBe(13)
  })

  it("preserves a finite cross-extreme continuous contribution", () => {
    const snapshot = calculateVirtualAgentSnapshot([
      createRecord({
        effectiveAnomalyBuildup: 1e308,
        finalAttack: 1e-300,
      }),
      createRecord({
        effectiveAnomalyBuildup: 1e-300,
        finalAttack: 1e308,
      }),
    ])

    expect(snapshot.finalAttack).toBe(2e-300)
    expect(float64Bits(snapshot.finalAttack)).toBe("01b56e1fc2f8f359")
  })

  it("preserves cross-extreme subnormal contributions", () => {
    const snapshot = calculateVirtualAgentSnapshot([
      createRecord({
        effectiveAnomalyBuildup: Number.MIN_VALUE,
        finalAttack: Number.MAX_VALUE,
      }),
      createRecord({
        effectiveAnomalyBuildup: Number.MAX_VALUE,
        finalAttack: Number.MIN_VALUE,
      }),
    ])

    expect(float64Bits(snapshot.finalAttack)).toBe("0000000000000002")
  })

  it.each([
    {
      name: "a normal tie toward the even lower value",
      weights: [1, 1],
      values: [1, 1 + Number.EPSILON],
      expectedBits: "3ff0000000000000",
    },
    {
      name: "a normal tie toward the even upper value",
      weights: [1, 1],
      values: [1 + Number.EPSILON, 1 + 2 * Number.EPSILON],
      expectedBits: "3ff0000000000002",
    },
    {
      name: "a non-power-of-two rational",
      weights: [1, 2],
      values: [0, 1],
      expectedBits: "3fe5555555555555",
    },
    {
      name: "a positive subnormal tie to zero",
      weights: [1, 1],
      values: [0, Number.MIN_VALUE],
      expectedBits: "0000000000000000",
    },
    {
      name: "a negative subnormal tie to negative zero",
      weights: [1, 1],
      values: [-Number.MIN_VALUE, -0],
      expectedBits: "8000000000000000",
    },
    {
      name: "exact cancellation to positive zero",
      weights: [1, 1],
      values: [-Number.MIN_VALUE, Number.MIN_VALUE],
      expectedBits: "0000000000000000",
    },
    {
      name: "the normal and subnormal boundary",
      weights: [1, 1],
      values: [
        numberFromFloat64Bits("000fffffffffffff"),
        numberFromFloat64Bits("0010000000000000"),
      ],
      expectedBits: "0010000000000000",
    },
    {
      name: "the maximum finite boundary",
      weights: [Number.MAX_VALUE, Number.MAX_VALUE],
      values: [numberFromFloat64Bits("7feffffffffffffe"), Number.MAX_VALUE],
      expectedBits: "7feffffffffffffe",
    },
  ])(
    "rounds $name with roundTiesToEven",
    ({ weights, values, expectedBits }) => {
      const snapshot = calculateVirtualAgentSnapshot(
        weights.map((effectiveAnomalyBuildup, index) =>
          createRecord({
            effectiveAnomalyBuildup,
            penetrationValue: values[index],
          }),
        ),
      )

      expect(float64Bits(snapshot.penetrationValue)).toBe(expectedBits)
    },
  )

  it("reads and validates records by ascending numeric index", () => {
    const readIndexes: number[] = []
    const records = [createRecord(), createRecord(), createRecord()]

    for (const index of records.keys()) {
      Object.defineProperty(records, index, {
        configurable: true,
        enumerable: true,
        get: () => {
          readIndexes.push(index)

          return createRecord({ finalAttack: index + 1 })
        },
      })
    }

    expect(calculateVirtualAgentSnapshot(records).finalAttack).toBe(2)
    expect(readIndexes).toEqual([0, 1, 2])
  })

  it("ignores a custom array iterator", () => {
    const records = [
      createRecord({ finalAttack: 1_000 }),
      createRecord({ finalAttack: 2_000 }),
    ]

    Object.defineProperty(records, Symbol.iterator, {
      value: function* () {
        yield createRecord({ finalAttack: 999 })
        throw new Error("custom iterator must not be called")
      },
    })

    expect(calculateVirtualAgentSnapshot(records).finalAttack).toBe(1_500)
  })

  it("does not modify or freeze inputs and returns isolated frozen snapshots", () => {
    const mutableRecord = { ...DEFAULT_RECORD, finalAttack: 1_000 }
    const mutableRecords = [mutableRecord]
    const firstSnapshot = calculateVirtualAgentSnapshot(mutableRecords)

    expect(Object.isFrozen(firstSnapshot)).toBe(true)
    expect(Object.isFrozen(mutableRecord)).toBe(false)
    expect(Object.isFrozen(mutableRecords)).toBe(false)

    mutableRecord.finalAttack = 2_000
    const secondSnapshot = calculateVirtualAgentSnapshot(mutableRecords)

    expect(firstSnapshot.finalAttack).toBe(1_000)
    expect(secondSnapshot.finalAttack).toBe(2_000)
    expect(secondSnapshot).not.toBe(firstSnapshot)

    const frozenRecord = Object.freeze(createRecord())
    const frozenRecords = Object.freeze([frozenRecord])

    expect(() => calculateVirtualAgentSnapshot(frozenRecords)).not.toThrow()
    expect(Object.isFrozen(frozenRecord)).toBe(true)
    expect(Object.isFrozen(frozenRecords)).toBe(true)
  })

  it("rejects inputs that are not arrays", () => {
    for (const input of [null, {}, new Set([createRecord()])]) {
      expect(() =>
        calculateVirtualAgentSnapshot(
          input as unknown as readonly VirtualAgentContributionRecord[],
        ),
      ).toThrow(TypeError)
    }
  })

  it("rejects an empty array", () => {
    expect(() => calculateVirtualAgentSnapshot([])).toThrow(RangeError)
  })

  it("rejects a sparse array hole instead of reading an inherited record", () => {
    const inheritedRecords = Object.assign(Object.create(Array.prototype), {
      0: createRecord(),
    })
    const records: VirtualAgentContributionRecord[] = []

    records.length = 1
    Object.setPrototypeOf(records, inheritedRecords)

    expect(() => calculateVirtualAgentSnapshot(records)).toThrow(TypeError)
  })

  it("snapshots the array length before reading indexed getters", () => {
    const firstRecord = createRecord({ finalAttack: 1_000 })
    const appendedRecord = createRecord({ finalAttack: 2_000 })
    const records: VirtualAgentContributionRecord[] = []

    Object.defineProperty(records, 0, {
      configurable: true,
      get: () => {
        records.push(appendedRecord)
        return firstRecord
      },
    })

    expect(calculateVirtualAgentSnapshot(records).finalAttack).toBe(1_000)
    expect(records).toHaveLength(2)
  })

  it.each([null, 1, "record", [], true])(
    "rejects the invalid record %s",
    (record) => {
      expect(() =>
        calculateVirtualAgentSnapshot([
          record as unknown as VirtualAgentContributionRecord,
        ]),
      ).toThrow(TypeError)
    },
  )

  it.each(
    Object.keys(DEFAULT_RECORD) as (keyof VirtualAgentContributionRecord)[],
  )("rejects a missing or undefined %s field", (field) => {
    const missingRecord: Partial<VirtualAgentContributionRecord> = {
      ...DEFAULT_RECORD,
    }
    const undefinedRecord = {
      ...DEFAULT_RECORD,
      [field]: undefined,
    }

    delete missingRecord[field]

    for (const record of [missingRecord, undefinedRecord]) {
      expect(() =>
        calculateVirtualAgentSnapshot([
          record as VirtualAgentContributionRecord,
        ]),
      ).toThrow(TypeError)
    }
  })

  it.each(
    Object.keys(DEFAULT_RECORD) as (keyof VirtualAgentContributionRecord)[],
  )("rejects a non-number %s field", (field) => {
    expect(() =>
      calculateVirtualAgentSnapshot([
        {
          ...DEFAULT_RECORD,
          [field]: "invalid",
        } as unknown as VirtualAgentContributionRecord,
      ]),
    ).toThrow(TypeError)
  })

  it.each(
    Object.keys(DEFAULT_RECORD) as (keyof VirtualAgentContributionRecord)[],
  )("rejects a non-finite %s field", (field) => {
    expect(() =>
      calculateVirtualAgentSnapshot([{ ...DEFAULT_RECORD, [field]: NaN }]),
    ).toThrow(RangeError)
  })

  it.each([Infinity, -Infinity])(
    "rejects the non-finite signed value %s",
    (penetrationValue) => {
      expect(() =>
        calculateVirtualAgentSnapshot([createRecord({ penetrationValue })]),
      ).toThrow(RangeError)
    },
  )

  it.each([0, -0, -Number.MIN_VALUE, -1])(
    "rejects the non-positive effective buildup %s",
    (effectiveAnomalyBuildup) => {
      expect(() =>
        calculateVirtualAgentSnapshot([
          createRecord({ effectiveAnomalyBuildup }),
        ]),
      ).toThrow(RangeError)
    },
  )

  it.each([0, 61, 1.5, 59.99999999999999])(
    "rejects the invalid level %s",
    (level) => {
      expect(() =>
        calculateVirtualAgentSnapshot([createRecord({ level })]),
      ).toThrow(RangeError)
    },
  )

  it.each(["anomalyProficiency", "finalAttack", "finalImpact"] as const)(
    "rejects a negative %s",
    (field) => {
      expect(() =>
        calculateVirtualAgentSnapshot([
          createRecord({ [field]: -Number.MIN_VALUE }),
        ]),
      ).toThrow(RangeError)
    },
  )

  it.each([
    ["damageBonusFactorResult", -Number.MIN_VALUE],
    ["damageBonusFactorResult", 6.000000000000001],
    ["dazeDealtFactorResult", -Number.MIN_VALUE],
    ["dazeDealtFactorResult", 4.000000000000001],
  ] as const)("rejects the out-of-range %s value %s", (field, value) => {
    expect(() =>
      calculateVirtualAgentSnapshot([createRecord({ [field]: value })]),
    ).toThrow(RangeError)
  })
})
