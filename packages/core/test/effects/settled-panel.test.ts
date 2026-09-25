import { describe, expect, it } from "vitest"
import { calculateStaticDamage } from "../../src/effects/index.ts"
import { general, inputFor, literal, rule } from "./static-fixtures.ts"

const settled = (value: number) => ({
  settledInitialValue: value,
  finalPercentage: [],
  finalFixed: [],
})

describe("settled initial stats", () => {
  it("uses the settled initial value as the battle percentage baseline", () => {
    const input = inputFor([
      rule("attack", {
        kind: "stat-adjustment",
        stat: "attack",
        stage: "final-percentage",
        value: literal("ratio", 0.2),
      }),
    ])
    const actor = input.world.entities[0]!
    if (actor.kind !== "actor") throw new Error("Expected actor")
    const result = calculateStaticDamage({
      ...input,
      world: {
        ...input.world,
        entities: [
          {
            ...actor,
            generalStats: {
              ...actor.generalStats,
              attack: {
                settledInitialValue: 2500,
                finalPercentage: [],
                finalFixed: [],
              },
            },
          },
          input.world.entities[1]!,
        ],
      },
    })
    expect(result.ok).toBe(true)
    if (result.ok)
      expect(result.value.evaluation.hit!.damageItems[0]!.finalStat).toBe(3000)
  })

  it("adds only new health/attack conversion to settled sheer force", () => {
    const input = inputFor([
      rule("health", {
        kind: "stat-adjustment",
        stat: "health",
        stage: "final-fixed",
        value: literal("health-points", 1000),
      }),
      rule("attack", {
        kind: "stat-adjustment",
        stat: "attack",
        stage: "final-percentage",
        value: literal("ratio", 0.2),
      }),
    ])
    const actor = input.world.entities[0]!
    if (actor.kind !== "actor" || input.damage.kind !== "regular")
      throw new Error("Expected fixture")
    const { defense: _defense, ...damage } = input.damage
    const result = calculateStaticDamage({
      ...input,
      world: {
        ...input.world,
        entities: [
          {
            ...actor,
            deriveSheerForce: true,
            generalStats: {
              health: settled(24000),
              attack: settled(2000),
              sheerForce: settled(3500),
            },
          },
          input.world.entities[1]!,
        ],
      },
      hit: {
        ...input.hit,
        damageItems: [
          { itemId: "sheer", stat: "sheerForce", damageMultiplier: 1 },
        ],
      },
      damage: { ...damage, kind: "sheer", sheerDamageBonus: [] },
    })
    expect(result.ok).toBe(true)
    if (result.ok)
      expect(result.value.evaluation.hit!.damageItems[0]!.finalStat).toBe(3720)
  })

  it("does not invent a missing base value needed by a selected effect", () => {
    const input = inputFor([
      rule("base-read", {
        kind: "stat-adjustment",
        stat: "attack",
        stage: "final-fixed",
        value: {
          kind: "stat",
          unit: "attack-points",
          entity: { role: "holder" },
          stat: "attack",
          stage: "base",
          at: "evaluation",
        },
      }),
    ])
    const actor = input.world.entities[0]!
    if (actor.kind !== "actor") throw new Error("Expected actor")
    const result = calculateStaticDamage({
      ...input,
      world: {
        ...input.world,
        entities: [
          {
            ...actor,
            generalStats: {
              ...actor.generalStats,
              attack: {
                settledInitialValue: 2500,
                finalPercentage: [],
                finalFixed: [],
              },
              health: general(10000),
            },
          },
          input.world.entities[1]!,
        ],
      },
    })
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(
        result.issues.some(
          (issue) =>
            issue.code === "MISSING_FACT" &&
            issue.message.includes("Base stat"),
        ),
      ).toBe(true)
  })
})
