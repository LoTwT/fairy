import { describe, expect, it } from "vitest"
import {
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../../core/src/index.ts"
import type { StaticEffectCatalog } from "../../core/src/index.ts"
import definitionsJson from "../definitions/effects/static.json" with { type: "json" }
import catalogJson from "../definitions/effects/static-catalog.json" with { type: "json" }
import { makeAriaAbloomRequest } from "./fixtures/aria-abloom-consumer.ts"

const parsed = parseEffectRuleSet(definitionsJson)
if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues))
const definitions = parsed.value
const catalog = catalogJson as unknown as StaticEffectCatalog

describe("Aria core-7 exact per-mastery Abloom", () => {
  // Independent inputs: Nanoka /passive/level/1501055/desc/0; original proc
  // bases from the archived mechanics guide (see spec revision 42). Wind keeps
  // its existing 1250% model; this test does not establish that game's base.
  it.each([
    ["ether", 27.5, 0.625],
    ["electric", 14.3, 1.25],
    ["fire", 35.7, 0.5],
    ["physical", 2.5, 7.13],
    ["ice", 3.6, 5],
    ["wind", 1.4, 12.5],
  ] as const)(
    "%s uses one original proc and applies the stun ratio once",
    (element, percent, base) => {
      for (const stunned of [false, true]) {
        const input = makeAriaAbloomRequest(
          definitions,
          catalog,
          element,
          196.3,
          stunned,
        )
        const result = calculateStaticDamageFromCatalog(input)
        expect(result.ok, JSON.stringify(result)).toBe(true)
        if (!result.ok) throw new Error(JSON.stringify(result.issues))
        const flooredMastery = Math.floor(196.3)
        const multiplier =
          (percent / 100 / 10) * base * flooredMastery * (stunned ? 1.5 : 1)
        expect(
          result.value.evaluation.hit!.damageItems[0]!.damageMultiplier,
        ).toBeCloseTo(multiplier, 12)
        expect(result.value.evaluation.hit!.damageItems[0]!.finalStat).toBe(
          1000,
        )
        expect(result.value.nonCritical).toBeCloseTo(
          1000 * multiplier * 2 * (stunned ? 2 : 1),
          9,
        )
        expect(result.value.criticalRate).toBe(0)
      }
    },
  )

  it("retains continuous initial AM, M1-only crit and the probability cap", () => {
    for (const [mastery, expected] of [
      [100, 0.25],
      [196.3, 0.73],
      [250, 1],
      [400, 1],
    ]) {
      const result = calculateStaticDamageFromCatalog(
        makeAriaAbloomRequest(
          definitions,
          catalog,
          "ether",
          mastery,
          false,
          true,
        ),
      )
      expect(result.ok, JSON.stringify(result)).toBe(true)
      if (!result.ok) throw new Error(JSON.stringify(result.issues))
      expect(result.value.criticalRate).toBeCloseTo(expected!, 12)
      expect(result.value.expected).toBeCloseTo(
        result.value.nonCritical * (1 + expected! * 0.25),
        9,
      )
    }
  })
})
