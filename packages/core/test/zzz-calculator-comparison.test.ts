import { readFileSync } from "node:fs"
import { beforeAll, describe, expect, it } from "vitest"
import {
  anomalyDamageFormula,
  anomalyProficiencyFactor,
  calculateStandardDisorderDamageMultiplier,
  calculateTargetEffectiveDefense,
  damageBonusFactor,
  DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT,
  regularDamageFormula,
  sharpenDamageFormula,
  sharpCriticalFactor,
  sheerDamageFormula,
  type ResistanceFactorInput,
} from "../src/index.ts"

interface ComparisonInput {
  kind: "regular" | "sheer" | "sharpen" | "anomaly"
  basis: number
  skill: number
  damageBonus: number[]
  criticalRate: number
  criticalDamage: number
  defense: {
    levelBase: number
    base: number
    reduction: number
    flatReduction: number
    penetrationRatio: number
    penetrationValue: number
  }
  resistance: ResistanceFactorInput
  stun: {
    active: boolean
    base: number
    bonus: number
    always: number
    cap: number
  }
  scale: number
  specialBonus?: number
  proficiency?: number
  level?: number
  anomalyBonus?: number
  refringe?: number
}

interface DamageValues {
  nonCritical: number
  critical: number
  expected: number
}

interface ComparisonCase {
  source: string
  call: number
  event: string
  input: ComparisonInput
  expected: Partial<DamageValues>
  knownDifference?: "resistance-floor"
}

const reference = JSON.parse(
  readFileSync(
    new URL("./fixtures/zzz-calculator-reference.json", import.meta.url),
    "utf8",
  ),
) as {
  provenance: { repository: string; commit: string; fairyCommit: string }
  cases: ComparisonCase[]
}

function calculateDamage(input: ComparisonInput): DamageValues {
  const defense = input.defense
  const targetEffectiveDefense = calculateTargetEffectiveDefense({
    targetBaseDefense: Math.max(
      0,
      defense.base * (1 - defense.reduction) - defense.flatReduction,
    ),
    defensePercentageAdjustments: [],
    penetrationRatios: [defense.penetrationRatio],
    penetrationValues: [defense.penetrationValue],
  })
  const stun = input.stun
  const shared = {
    baseDamage: [{ damageMultiplier: input.skill, finalStat: input.basis }],
    damageBonus: input.damageBonus,
    defense: {
      attackerLevelBase: defense.levelBase,
      targetEffectiveDefense,
    },
    resistance: input.resistance,
    damageTaken: DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT,
    stunDamage: {
      isTargetStunned: stun.active,
      targetBaseStunDamageMultiplier:
        stun.cap > 0
          ? Math.min(stun.base + stun.bonus + stun.always, 1 + stun.cap)
          : stun.active
            ? stun.base
            : 1,
      targetStunDamageMultiplierAdjustments:
        stun.cap > 0 ? [] : [stun.active ? stun.bonus : 0, stun.always],
    },
  }
  const calculateBranch = (isCritical: boolean): number => {
    const critical = {
      isCritical,
      criticalDamageContributions: [input.criticalDamage],
    }
    switch (input.kind) {
      case "regular":
        return regularDamageFormula.calculate({ ...shared, critical }).value
      case "sheer":
        return sheerDamageFormula.calculate({
          ...shared,
          critical,
          sheerDamageBonus: [input.specialBonus!],
        }).value
      case "sharpen":
        return sharpenDamageFormula.calculate({
          ...shared,
          sharpCritical: {
            isSharpCritical: isCritical,
            criticalRate: input.criticalRate,
            sharpCriticalDamageContributions: [input.criticalDamage],
          },
          sharpenDamageBonus: [input.specialBonus!],
        }).value
      case "anomaly":
        return anomalyDamageFormula.calculate({
          ...shared,
          damageBonus: damageBonusFactor.calculate(input.damageBonus),
          anomalyProficiency: input.proficiency!,
          anomalyDamageLevel: input.level!,
          anomalyDamageBonus: [input.anomalyBonus!],
          refringe: input.refringe!,
          anomalyCritical: {
            isAnomalyCritical: isCritical,
            anomalyCriticalDamageContributions: [input.criticalDamage],
          },
        }).value
    }
  }
  const nonCritical = calculateBranch(false) * input.scale
  const critical = calculateBranch(true) * input.scale
  const probability = Math.min(1, Math.max(0, input.criticalRate))
  return {
    nonCritical,
    critical,
    expected: nonCritical * (1 - probability) + critical * probability,
  }
}

describe("ZZZ Calculator d58e276 numerical cases", () => {
  // The fixture freezes selected events, resolved panels and matching modifiers.
  // It does not test upstream equipment assembly or automatic effect selection.
  beforeAll(() => {
    expect(reference.provenance).toMatchObject({
      repository: "https://github.com/ZztIsolation/zzz_calculator",
      commit: "d58e276973c3df944bc36fc81a783f3d17018708",
      fairyCommit: "7584a2ff99bfb80fefde7325d884a3d3192ec89a",
    })
    expect(reference.cases).toHaveLength(230)
    expect(reference.cases.filter((entry) => entry.knownDifference)).toEqual([
      expect.objectContaining({
        source: "tests/damage-whitebox.test.js",
        call: 67,
        event: "direct-1",
        knownDifference: "resistance-floor",
      }),
    ])
  })

  for (const entry of reference.cases) {
    it(`${entry.source} call ${entry.call}: ${entry.event}`, () => {
      const actual = calculateDamage(entry.input)
      if (entry.knownDifference === "resistance-floor") {
        expect(entry.input.resistance.targetResistance).toBe(1.5)
        expect(entry.expected).toEqual({
          nonCritical: 11.46005151688609,
          critical: 22.690902003434456,
          expected: 13.638836511276473,
        })
        expect(actual).toEqual({ nonCritical: 0, critical: 0, expected: 0 })
        return
      }
      const expectedBranches = Object.keys(
        entry.expected,
      ) as (keyof DamageValues)[]
      expect(expectedBranches.length).toBeGreaterThan(0)
      for (const key of expectedBranches) {
        const expected = entry.expected[key]!
        expect(Number.isFinite(expected)).toBe(true)
        expect(Number.isFinite(actual[key])).toBe(true)
        expect(Math.abs(actual[key] - expected)).toBeLessThanOrEqual(
          1e-8 * Math.max(1, Math.abs(expected)),
        )
      }
    })
  }

  it.each([
    [0, 1],
    [50, 1.75],
    [100, 2.5],
    [132.3, 3.71125],
    [150, 4.375],
    [200, 6.25],
    [220, 6.25],
  ])(
    "ports sharp-damage.test.js expected CRIT at %s%%",
    (percent, expected) => {
      const critical = sharpCriticalFactor.calculate({
        isSharpCritical: true,
        criticalRate: percent / 100,
        sharpCriticalDamageContributions: [1.5],
      })
      const probability = Math.min(1, percent / 100)
      expect(1 - probability + probability * critical).toBeCloseTo(expected, 10)
    },
  )

  it("distinguishes conditional Sharp CRIT from upstream deterministic modes", () => {
    // Upstream sharpCrit = 2.5, lacerationCrit = 6.25 at 150% CRIT Rate.
    // Fairy guarantees the first trial and keeps the second trial probabilistic.
    const result = sharpCriticalFactor.calculate({
      isSharpCritical: true,
      criticalRate: 1.5,
      sharpCriticalDamageContributions: [1.5],
    })
    expect(result).toBe(4.375)
    expect(result).not.toBe(2.5)
    expect(result).not.toBe(6.25)
  })

  it("keeps the proficiency cap absent from upstream's AP / 100 formula", () => {
    expect(anomalyProficiencyFactor.calculate(1200)).toBe(10)
    expect(anomalyProficiencyFactor.calculate(1200)).not.toBe(12)
  })

  it.each([
    ["fire", 10, 14.5],
    ["fire", 7, 11.5],
    ["fire", 0, 4.5],
    ["electric", 10, 17],
    ["electric", 5, 10.75],
    ["ether", 10, 17],
    ["ice", 10, 5.25],
    ["ice", 5, 4.875],
    ["frost", 20, 21],
    ["frost", 17, 18.75],
    ["frost", 15, 17.25],
    ["physical", 10, 5.25],
    ["physical", 5, 4.875],
  ] as const)(
    "ports anomaly-damage.test.js normalized %s Disorder with %s seconds left",
    (originalAnomalyAttribute, remainingAnomalyDurationInSeconds, expected) => {
      expect(
        calculateStandardDisorderDamageMultiplier({
          originalAnomalyAttribute,
          remainingAnomalyDurationInSeconds,
        }),
      ).toBeCloseTo(expected, 10)
    },
  )

  it("does not apply upstream's elapsed-time rounding to Fairy duration inputs", () => {
    // Upstream rounds elapsed 3.2 to 3.0, then settles 7 seconds: 11.5.
    expect(
      calculateStandardDisorderDamageMultiplier({
        originalAnomalyAttribute: "fire",
        remainingAnomalyDurationInSeconds: 10 - 3.2,
      }),
    ).toBe(11)
  })
})
