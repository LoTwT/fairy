import type { EnemyBase, FlattenedEnemyView } from "../../src"

import { describe, expect, it } from "vitest"

import {
  buildEncounterDamageContext,
  selectEncounterByEnemyName,
} from "../../src"

describe("cleaned encounter helpers", () => {
  type TestEnemy = EnemyBase & {
    weaknesses?: string[]
    resistances?: string[]
    mechanics?: string
  }

  const encounters: Array<FlattenedEnemyView<TestEnemy>> = [
    {
      node: 1,
      side: 1,
      wave: 1,
      enemyIndex: 1,
      count: 1,
      sideElementMultRaw: [1, 1.2, 0.8, 1, 1],
      sideElementMult: {
        ice: 1,
        fire: 1.2,
        electric: 0.8,
        ether: 1,
        physical: 1,
      },
      enemy: {
        id: "1",
        name: "Patrol Jaeger",
        image: "patrol-jaeger",
        elementMult: [1, 1, 0.8, 1, 1],
        stunMult: 125,
        stunTime: 6.5,
        hp: 390684,
        def: 633,
        daze: 1728,
        weaknesses: ["Fire"],
        resistances: ["Electric"],
        mechanics: "Escort unit",
      },
    },
    {
      node: 1,
      side: 1,
      wave: 1,
      enemyIndex: 2,
      count: 1,
      enemy: {
        id: "2",
        name: "Patrol Guard",
        image: "patrol-guard",
        elementMult: [1, 1, 1, 1, 1],
        stunMult: 100,
        stunTime: 5,
        hp: 1000,
        def: 100,
        daze: 100,
      },
    },
  ]

  it("returns ambiguous candidate names instead of guessing", () => {
    expect(selectEncounterByEnemyName(encounters, "Patrol")).toEqual({
      matches: encounters,
      candidates: ["Patrol Jaeger", "Patrol Guard"],
    })
  })

  it("builds encounter damage context with side metadata", () => {
    const selection = selectEncounterByEnemyName(encounters, "Jaeger")

    expect(buildEncounterDamageContext(selection.selected, "火属性")).toEqual({
      enemyId: "1",
      enemyName: "Patrol Jaeger",
      baseDefense: 633,
      dazeGauge: 1728,
      dazeMultiplier: 125,
      dazeDuration: 6.5,
      resistanceBucket: "fire",
      elementMultiplier: 1,
      multipliers: {
        ice: 1,
        fire: 1,
        electric: 0.8,
        ether: 1,
        physical: 1,
      },
      node: 1,
      side: 1,
      wave: 1,
      enemyIndex: 1,
      weaknesses: ["Fire"],
      resistances: ["Electric"],
      mechanics: "Escort unit",
      sideMultipliers: {
        ice: 1,
        fire: 1.2,
        electric: 0.8,
        ether: 1,
        physical: 1,
      },
      sideElementMultiplier: 1.2,
    })
  })
})
