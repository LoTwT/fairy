import { describe, expect, it } from "vitest"
import { calculate } from "./calculate"

const source = {
  sourceId: "fixture",
  sourceVersion: "rules-v0.1",
  sourceAnchor: "golden",
}

const baseSnapshot = {
  schemaVersion: "1.0.0",
  gameVersion: "ZZZ-2.2",
  ruleSetVersion: "rules-v0.1",
  dataVersion: "data-v0.1.0",
  sourceVersion: "source-v0.1.0",
  team: [
    {
      agentId: "yixuan",
      level: 60,
      agentSpecialty: "rupture",
      attribute: "ether",
      panel: {
        attack: 1000,
        maxHp: 12000,
        sheerForce: 1000,
        impact: 120,
        critRate: 0,
        critDamage: 0,
      },
    },
  ],
  activeActor: { agentId: "yixuan" },
  attackSegments: [
    {
      id: "seg-1",
      attribute: "ether",
      tags: ["basic"],
      damageType: "regular",
      multiplier: 1,
      source,
    },
  ],
  enemy: {
    level: 60,
    rank: "boss",
    maxHp: 1000000,
  },
}

describe("calculate", () => {
  it("computes the level 60 boss defense bucket for regular damage", () => {
    const result = calculate(baseSnapshot)
    const defense = result.buckets.find(bucket => bucket.bucketId === "defenseZone")

    expect(defense?.effectiveMultiplier).toBeCloseTo(0.454545, 5)
    expect(result.summary.rawTotalDamage).toBeCloseTo(454.545, 3)
    expect(result.summary.displayTotalDamage).toBe(455)
  })

  it("shows the corrupted shield sheer damage defense skip ratio", () => {
    const regular = calculate({
      ...baseSnapshot,
      enemy: {
        ...baseSnapshot.enemy,
        corruptedShield: { active: true, defenseMultiplier: 1.8 },
      },
    })
    const sheer = calculate({
      ...baseSnapshot,
      attackSegments: [
        {
          ...baseSnapshot.attackSegments[0]!,
          id: "seg-sheer",
          damageType: "sheer",
        },
      ],
      enemy: {
        ...baseSnapshot.enemy,
        corruptedShield: { active: true, defenseMultiplier: 1.8 },
      },
    })

    expect(regular.summary.rawTotalDamage).toBeCloseTo(237.342, 3)
    expect(sheer.summary.rawTotalDamage).toBeCloseTo(750, 3)
    expect(sheer.summary.rawTotalDamage / regular.summary.rawTotalDamage).toBeCloseTo(3.16, 3)
    expect(sheer.trace.some(event => event.displayValue === "defenseSkipped")).toBe(true)
  })

  it("sums display damage after per-segment ceiling", () => {
    const result = calculate({
      ...baseSnapshot,
      team: [
        {
          ...baseSnapshot.team[0]!,
          panel: {
            ...baseSnapshot.team[0]!.panel,
            sheerForce: 10,
          },
        },
      ],
      attackSegments: [
        {
          ...baseSnapshot.attackSegments[0]!,
          id: "seg-a",
          damageType: "sheer",
          multiplier: 0.11,
        },
        {
          ...baseSnapshot.attackSegments[0]!,
          id: "seg-b",
          damageType: "sheer",
          multiplier: 0.11,
        },
      ],
    })

    expect(result.summary.rawTotalDamage).toBeCloseTo(2.2, 5)
    expect(result.attackSegments.map(segment => segment.segmentDisplayDamage)).toEqual([2, 2])
    expect(result.summary.displayTotalDamage).toBe(4)
  })

  it("computes corrupted shield cleanse true damage manual events", () => {
    const result = calculate({
      ...baseSnapshot,
      manualEvents: [
        {
          id: "cleanse-1",
          kind: "corruptedShieldCleanse",
          basePath: "enemy.maxHp",
          trueDamageRule: "default15Percent",
          source,
        },
      ],
    })

    expect(result.events?.[0]?.rawDamage).toBe(150000)
    expect(result.summary.trueDamage).toBe(150000)
  })

  it("reports manual true damage events with missing base values as errors", () => {
    const result = calculate({
      ...baseSnapshot,
      enemy: {
        level: 60,
        rank: "boss",
      },
      manualEvents: [
        {
          id: "cleanse-1",
          kind: "corruptedShieldCleanse",
          basePath: "enemy.maxHp",
          trueDamageRule: "default15Percent",
          source,
        },
      ],
    })

    expect(result.events?.[0]?.rawDamage).toBe(0)
    expect(result.errors.some(item => item.key === "ERR-EVENT-001")).toBe(true)
  })

  it("keeps user modifiers without source calculable with sourceMissing diagnostics", () => {
    const result = calculate({
      ...baseSnapshot,
      modifiers: [
        {
          id: "tmp-bonus",
          handlerId: "damage-bonus",
          params: { value: 0.1 },
          appliesTo: { kind: "activeActor" },
        },
      ],
    })

    const contributor = result.buckets
      .find(bucket => bucket.bucketId === "damageBonusZone")
      ?.contributors.find(item => item.modifierId === "tmp-bonus")

    expect(result.warnings.some(item => item.key === "ERR-SRC-001")).toBe(true)
    expect(contributor?.sourceMissing).toBe(true)
    expect(contributor?.diagnosticRefs).toContain("ERR-SRC-001")
    expect(result.modifiers.find(item => item.id === "tmp-bonus")?.active).toBe(true)
  })

  it("evaluates Condition DSL field/op/value trees for modifier activation", () => {
    const result = calculate({
      ...baseSnapshot,
      enemy: {
        ...baseSnapshot.enemy,
        states: ["dazed"],
      },
      modifiers: [
        {
          id: "dazed-vulnerability",
          handlerId: "vulnerability-bonus",
          params: { value: 0.25 },
          appliesTo: { kind: "enemy" },
          when: { field: "enemy.states", op: "in", value: "dazed" },
          source,
        },
      ],
    })

    const modifier = result.modifiers.find(item => item.id === "dazed-vulnerability")
    const vulnerability = result.buckets.find(bucket => bucket.bucketId === "vulnerabilityZone")

    expect(modifier?.active).toBe(true)
    expect(vulnerability?.effectiveMultiplier).toBeCloseTo(1.25, 5)
  })

  it("emits bucket contribution trace refs for multiplier buckets", () => {
    const result = calculate(baseSnapshot)
    const defense = result.buckets.find(bucket => bucket.bucketId === "defenseZone")

    expect(defense?.traceRefs.length).toBeGreaterThan(0)
    expect(result.trace.some(event => event.kind === "bucketContribution" && event.path.includes("defenseZone"))).toBe(true)
    expect(result.trace.find(event => event.path === "attackSegments[0].rawDamage")?.refs?.length).toBeGreaterThan(0)
  })

  it("applies daze modifiers to regular attack segments with baseDazeMultiplier", () => {
    const result = calculate({
      ...baseSnapshot,
      attackSegments: [
        {
          ...baseSnapshot.attackSegments[0]!,
          baseDazeMultiplier: 1,
        },
      ],
      modifiers: [
        {
          id: "daze-inflict-up",
          handlerId: "daze-inflict-bonus",
          params: { value: 0.5 },
          appliesTo: { kind: "activeActor" },
          source,
        },
      ],
    })

    expect(result.attackSegments[0]?.dazeValue).toBe(180)
    expect(result.buckets.some(bucket => bucket.bucketId === "dazeInflictZone")).toBe(true)
  })

  it("does not emit trusted anomaly damage before TL-S3-4", () => {
    const result = calculate({
      ...baseSnapshot,
      team: [
        {
          ...baseSnapshot.team[0]!,
          panel: {
            ...baseSnapshot.team[0]!.panel,
            critRate: 0.5,
            critDamage: 1,
            anomalyProficiency: 600,
          },
        },
      ],
      attackSegments: [
        {
          ...baseSnapshot.attackSegments[0]!,
          id: "seg-anomaly",
          damageType: "anomaly",
          anomalyContribution: {
            status: "shock",
            buildup: 100,
          },
        },
      ],
    })

    expect(result.summary.rawTotalDamage).toBe(0)
    expect(result.warnings.some(item => item.key === "ERR-CALC-PENDING-ANOMALY")).toBe(true)
    expect(result.buckets.some(bucket => bucket.bucketId === "critZone")).toBe(false)
    expect(result.trace.some(event => event.displayValue === "pending-formula")).toBe(true)
  })

  it("does not emit trusted disorder damage before TL-S3-4", () => {
    const result = calculate({
      ...baseSnapshot,
      attackSegments: [
        {
          ...baseSnapshot.attackSegments[0]!,
          id: "seg-disorder",
          damageType: "disorder",
          anomalyContribution: {
            status: "disorder",
            buildup: 100,
          },
        },
      ],
    })

    expect(result.summary.rawTotalDamage).toBe(0)
    expect(result.warnings.some(item => item.key === "ERR-CALC-PENDING-DISORDER")).toBe(true)
  })
})
