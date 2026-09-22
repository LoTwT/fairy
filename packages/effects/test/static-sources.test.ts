import { describe, expect, it } from "vitest"
import { calculateStaticDamage } from "../src/index.ts"
import { inputFor } from "./static-fixtures.ts"

describe("static attribute ownership", () => {
  it("reads an item's saved source without requiring the current actor's attack", () => {
    const input = inputFor()
    const actor = input.world.entities[0]!
    if (actor.kind !== "actor") throw new Error("actor fixture")
    const result = calculateStaticDamage({
      ...input,
      world: {
        ...input.world,
        entities: [{ ...actor, generalStats: {} }, input.world.entities[1]!],
      },
      snapshots: [
        {
          snapshotId: "snapshot:saved",
          atSeconds: 0,
          world: input.world,
          attributes: [
            {
              entityId: "entity:attacker",
              stat: "attack",
              stage: "current",
              value: { unit: "attack-points", value: 2500 },
            },
          ],
        },
      ],
      hit: {
        ...input.hit,
        damageItems: [
          {
            itemId: "attack",
            damageMultiplier: 2,
            stat: "attack",
            statSource: {
              entityId: "entity:attacker",
              snapshotId: "snapshot:saved",
            },
          },
        ],
      },
    })
    expect(result.ok).toBe(true)
    if (result.ok)
      expect(result.value.factors.nonCritical["baseDamage"]).toBe(5000)
  })

  it("does not substitute a current value when a historical attribute is missing", () => {
    const input = inputFor()
    const result = calculateStaticDamage({
      ...input,
      hit: {
        ...input.hit,
        damageItems: [
          {
            itemId: "attack",
            damageMultiplier: 2,
            stat: "attack",
            statSource: {
              entityId: "entity:attacker",
              snapshotId: "snapshot:missing",
            },
          },
        ],
      },
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.issues[0].code).toBe("MISSING_SNAPSHOT")
  })

  it("uses a settled refringe multiplier directly", () => {
    const input = inputFor()
    if (input.damage.kind !== "regular") throw new Error("regular fixture")
    const result = calculateStaticDamage({
      ...input,
      damage: {
        ...input.damage,
        kind: "anomaly",
        anomalyCriticalRate: 0,
        anomalyCriticalDamage: [],
        anomalyDamageBonus: [],
        refringe: { settledMultiplier: 1.38 },
      },
    })
    expect(result.ok).toBe(true)
    if (result.ok)
      expect(result.value.factors.nonCritical["refringe"]).toBe(1.38)
  })
})
