import { describe, expect, it } from "vitest"

import {
  addZone,
  anomalyPipeline,
  computeDamage,
  computeMultiHitDamage,
  damageLevelMultiplier,
  disorderMultiplier,
  regularPipeline,
  removeZone,
  replaceZone,
  sheerPipeline,
  upsertZone,
  type DamageContext,
  type ZoneSpec,
} from "../src/index.js"

const neutralContext: DamageContext = {
  basic: {
    entries: [{ multiplier: 1, stat: 1 }],
    stat: 1,
  },
  boost: { values: [] },
  crit: {
    expectation: false,
    isCrit: false,
    rate: 0,
    damage: 0,
  },
  defence: {
    attackerLevelBase: 794,
    effectiveDef: 952.8,
  },
  resist: {
    value: 0,
    down: 0,
    ignore: 0,
  },
  vulnerability: {
    value: 0,
    damageReduction: 0,
  },
  stun: {
    staggered: false,
    targetHasStaggerBar: true,
    vulnerability: 0,
    unstaggeredVulnerability: 0,
  },
  sheerBoost: { values: [] },
  anomaly: { mastery: 100 },
  anomalyBoost: { values: [] },
  anomalyCrit: {
    expectation: false,
    isCrit: false,
    rate: 0,
    damage: 0,
  },
  damageLevel: { level: 1 },
}

describe("damage pipeline contract", () => {
  it("uses the PART01 defence multiplier and exposes raw breakdown", () => {
    const result = computeDamage(regularPipeline(), neutralContext)

    expect(result.breakdown.defence?.raw).toBeCloseTo(0.4545454545, 10)
    expect(result.breakdown.defence?.clamped).toBeCloseTo(0.4545454545, 10)
    expect(result.breakdown.defence?.clampApplied).toBe(false)
    expect(result.rawTotal).toBeCloseTo(0.4545454545, 10)
    expect(result.total).toBe(1)
  })

  it("keeps regular defence and sheer boost mutually exclusive", () => {
    const regular = computeDamage(regularPipeline(), {
      ...neutralContext,
      basic: { entries: [{ multiplier: 100, stat: 1 }] },
    })
    const sheer = computeDamage(sheerPipeline(), {
      ...neutralContext,
      basic: { entries: [{ multiplier: 100, stat: 1 }] },
      sheerBoost: { values: [0.25] },
    })

    expect(regular.breakdown.defence).toBeDefined()
    expect(regular.breakdown.sheerBoost).toBeUndefined()
    expect(sheer.breakdown.defence).toBeUndefined()
    expect(sheer.breakdown.sheerBoost?.clamped).toBe(1.25)
    expect(sheer.rawTotal).toBeCloseTo(125, 10)
    expect(regular.rawTotal).toBeLessThan(sheer.rawTotal)
  })

  it("ceilings each hit before summing multi-hit totals", () => {
    const hitPipeline = [constantZone("basic", 10, 1.1)]
    const result = computeMultiHitDamage([
      { pipeline: hitPipeline },
      { pipeline: hitPipeline },
    ])

    expect(result.rawTotal).toBeCloseTo(2.2, 10)
    expect(result.total).toBe(4)
    expect(result.hits.map((hit) => hit.total)).toEqual([2, 2])
  })

  it("records clamp boundaries in breakdown entries", () => {
    expect(
      singleZone("boost", "additive-one-plus", { values: [-2] }, [0, 6]),
    ).toMatchObject({ raw: -1, clamped: 0, clampApplied: true })
    expect(singleZone("crit", "crit", critParams(10), [1, 6])).toMatchObject({
      raw: 11,
      clamped: 6,
      clampApplied: true,
    })
    expect(singleZone("resist", "resist", { resist: 2 }, [0, 2])).toMatchObject(
      { raw: -1, clamped: 0, clampApplied: true },
    )
    expect(
      singleZone(
        "vulnerability",
        "vulnerability",
        { vulnerability: 2 },
        [0.2, 2],
      ),
    ).toMatchObject({ raw: 3, clamped: 2, clampApplied: true })
    expect(
      singleZone("sheerBoost", "additive-one-plus", { values: [-1] }, [0.2, 9]),
    ).toMatchObject({ raw: 0, clamped: 0.2, clampApplied: true })
    expect(
      singleZone(
        "anomalyMastery",
        "anomaly-mastery",
        {
          anomalyMastery: 1200,
        },
        [0, 10],
      ),
    ).toMatchObject({ raw: 12, clamped: 10, clampApplied: true })
    expect(
      singleZone("damageLevel", "damage-level", { level: 100 }, [1, 2]),
    ).toMatchObject({ clamped: 2, clampApplied: true })
    expect(
      singleZone("anomalyBoost", "anomaly-boost", { values: [3] }, [0, 3]),
    ).toMatchObject({ raw: 4, clamped: 3, clampApplied: true })
    expect(
      singleZone("anomalyCrit", "anomaly-crit", critParams(10), [1, 3]),
    ).toMatchObject({ raw: 11, clamped: 3, clampApplied: true })
  })

  it("uses the StunVulnZone branch-specific clamps", () => {
    const pipeline = regularPipeline()

    expect(
      computeDamage(pipeline, withStun({ staggered: false, value: -2 }))
        .breakdown.stunVulnerability,
    ).toMatchObject({ raw: -1, clamped: 1, clampApplied: true })
    expect(
      computeDamage(pipeline, withStun({ staggered: false, value: 10 }))
        .breakdown.stunVulnerability,
    ).toMatchObject({ raw: 11, clamped: 3, clampApplied: true })
    expect(
      computeDamage(pipeline, withStun({ staggered: true, value: -2 }))
        .breakdown.stunVulnerability,
    ).toMatchObject({ raw: -1, clamped: 0.2, clampApplied: true })
    expect(
      computeDamage(pipeline, withStun({ staggered: true, value: 10 }))
        .breakdown.stunVulnerability,
    ).toMatchObject({ raw: 11, clamped: 5, clampApplied: true })
    expect(
      computeDamage(pipeline, {
        ...withStun({ staggered: true, value: 10 }),
        stun: {
          staggered: true,
          targetHasStaggerBar: false,
          vulnerability: 10,
          unstaggeredVulnerability: 10,
        },
      }).breakdown.stunVulnerability,
    ).toMatchObject({ raw: 1, clamped: 1, clampApplied: false })
  })

  it("keeps custom zones traceable and removes by rawTotal divide-out", () => {
    const basePipeline = regularPipeline()
    const custom = constantZone("custom:test", 110, 1.25)
    const withCustom = addZone(basePipeline, custom)
    const before = computeDamage(withCustom, neutralContext)
    const after = computeDamage(
      removeZone(withCustom, "custom:test"),
      neutralContext,
    )

    expect(before.breakdown["custom:test"]).toMatchObject({
      raw: 1.25,
      clamped: 1.25,
      clampApplied: false,
    })
    expect(after.rawTotal).toBeCloseTo(before.rawTotal / 1.25, 10)
    expect(after.breakdown["custom:test"]).toBeUndefined()
  })

  it("fails loud on invalid pipeline edits and does not mutate presets", () => {
    const preset = regularPipeline()
    const replacement = constantZone("boost", 20, 2)

    expect(() => addZone(preset, preset[0]!)).toThrow(/already exists/)
    expect(() =>
      replaceZone(preset, "missing", constantZone("missing", 120, 1)),
    ).toThrow(/does not exist/)
    expect(() =>
      replaceZone(preset, "boost", constantZone("other", 20, 1)),
    ).toThrow(/Replacement key mismatch/)
    expect(() => removeZone(preset, "missing")).toThrow(/does not exist/)

    const replaced = replaceZone(preset, "boost", replacement)
    const upserted = upsertZone(preset, constantZone("custom:new", 120, 1.1))
    const removed = removeZone(preset, "boost")

    expect(preset.some((zone) => zone.key === "boost")).toBe(true)
    expect(preset.some((zone) => zone.key === "custom:new")).toBe(false)
    expect(replaced.find((zone) => zone.key === "boost")).toBe(replacement)
    expect(upserted.some((zone) => zone.key === "custom:new")).toBe(true)
    expect(removed.some((zone) => zone.key === "boost")).toBe(false)
  })

  it("applies anomaly-only crit and ignores regular crit fields", () => {
    const base = {
      ...neutralContext,
      anomaly: { mastery: 250 },
      damageLevel: { level: 30 },
      anomalyCrit: {
        expectation: true,
        isCrit: false,
        rate: 0.5,
        damage: 1,
      },
    }
    const withNormalCrit = {
      ...base,
      crit: {
        expectation: true,
        isCrit: false,
        rate: 1,
        damage: 5,
      },
    }

    const baseResult = computeDamage(anomalyPipeline(), base)
    const normalCritResult = computeDamage(anomalyPipeline(), withNormalCrit)

    expect(baseResult.rawTotal).toBeCloseTo(normalCritResult.rawTotal, 10)
    expect(baseResult.breakdown.crit).toBeUndefined()
    expect(baseResult.breakdown.anomalyCrit?.clamped).toBe(1.5)
    expect(baseResult.breakdown.anomalyMastery?.clamped).toBe(2.5)
    expect(baseResult.breakdown.damageLevel?.clamped).toBe(1.4915)
    expect(damageLevelMultiplier(1)).toBe(1)
    expect(damageLevelMultiplier(30)).toBe(1.4915)
    expect(damageLevelMultiplier(60)).toBe(2)
  })

  it("locks disorder multiplier values and floor boundaries", () => {
    expect(disorderMultiplier("burn", 10)).toBe(14.5)
    expect(disorderMultiplier("shock", 10)).toBe(17)
    expect(disorderMultiplier("etherCorruption", 10)).toBe(17)
    expect(disorderMultiplier("iceFrostbite", 10)).toBe(5.25)
    expect(disorderMultiplier("physicalFlinch", 10)).toBe(5.25)
    expect(disorderMultiplier("auricInkCorruption", 10)).toBe(17)
    expect(disorderMultiplier("frostFrostbite", 20)).toBe(21)
    expect(disorderMultiplier("burn", 9.99)).toBe(14)
  })
})

function singleZone(
  key: string,
  mode: ZoneSpec["mode"],
  params: ZoneSpec["params"],
  clamp?: ZoneSpec["clamp"],
) {
  const result = computeDamage([
    {
      key,
      order: 10,
      mode,
      params,
      ...(clamp ? { clamp } : {}),
    },
  ])

  return result.breakdown[key]
}

function constantZone(key: string, order: number, value: number): ZoneSpec {
  return {
    key,
    order,
    mode: "constant",
    params: { value },
  }
}

function critParams(critDmg: number) {
  return {
    expectation: true,
    critRate: 1,
    critDmg,
  }
}

function withStun({
  staggered,
  value,
}: {
  readonly staggered: boolean
  readonly value: number
}): DamageContext {
  return {
    ...neutralContext,
    stun: {
      staggered,
      targetHasStaggerBar: true,
      vulnerability: staggered ? value : 0,
      unstaggeredVulnerability: staggered ? 0 : value,
    },
  }
}
