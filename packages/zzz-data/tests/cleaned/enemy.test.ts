import { describe, expect, it } from "vitest"

import {
  buildEnemyDamageContext,
  getEnemyElementMultiplier,
  toElementMultiplierMap,
} from "../../src"

describe("cleaned enemy helpers", () => {
  const enemy = {
    id: "27300",
    name: "Sanguine Sweeper",
    image: "sanguine-sweeper",
    elementMult: [1, 1.2, 0.8, 0.8, 1] as const,
    stunMult: 150,
    stunTime: 15,
    hp: 250238491,
    def: 476,
    daze: 17876,
  }

  it("maps elementMult tuples to named buckets", () => {
    expect(toElementMultiplierMap(enemy)).toEqual({
      ice: 1,
      fire: 1.2,
      electric: 0.8,
      ether: 0.8,
      physical: 1,
    })
  })

  it("reads enemy multipliers via canonical or localized attributes", () => {
    expect(getEnemyElementMultiplier(enemy, "Auric Ink")).toBe(0.8)
    expect(getEnemyElementMultiplier(enemy, "凛刃")).toBe(1)
    expect(getEnemyElementMultiplier(enemy, "未知" as never)).toBeUndefined()
  })

  it("builds damage context from enemy stats and an attribute", () => {
    expect(buildEnemyDamageContext(enemy, "玄墨")).toEqual({
      enemyId: "27300",
      enemyName: "Sanguine Sweeper",
      baseDefense: 476,
      dazeGauge: 17876,
      dazeMultiplier: 150,
      dazeDuration: 15,
      resistanceBucket: "ether",
      elementMultiplier: 0.8,
      multipliers: {
        ice: 1,
        fire: 1.2,
        electric: 0.8,
        ether: 0.8,
        physical: 1,
      },
    })
  })
})
