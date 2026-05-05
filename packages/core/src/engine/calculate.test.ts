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
      enemy: {
        ...baseSnapshot.enemy,
        dazeCap: 1000,
      },
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
    expect(result.attackSegments[0]?.dazeRatioRaw).toBe(18)
    expect(result.attackSegments[0]?.dazeRatioDisplay).toBe(18)
    expect(result.buckets.some(bucket => bucket.bucketId === "dazeInflictZone")).toBe(true)
  })

  it("computes anomaly damage without the standard crit bucket", () => {
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

    expect(result.summary.rawTotalDamage).toBeCloseTo(5454.545, 3)
    expect(result.warnings.some(item => item.key === "ERR-CALC-PENDING-ANOMALY")).toBe(false)
    expect(result.buckets.some(bucket => bucket.bucketId === "critZone")).toBe(false)
    expect(result.buckets.find(bucket => bucket.bucketId === "anomalyProficiencyZone")?.effectiveMultiplier).toBe(6)
    expect(result.trace.some(event => event.path === "attackSegments[0].anomalyContribution.anomalyThreshold")).toBe(true)
  })

  it("traces the physical anomaly threshold by rank and trigger count", () => {
    const result = calculate({
      ...baseSnapshot,
      enemy: {
        ...baseSnapshot.enemy,
        anomalyTriggerCounts: { assault: 2 },
      },
      attackSegments: [
        {
          ...baseSnapshot.attackSegments[0]!,
          id: "seg-physical-anomaly",
          attribute: "physical",
          damageType: "anomaly",
          anomalyContribution: {
            status: "assault",
            buildup: 100,
          },
        },
      ],
    })
    const thresholdTrace = result.trace.find(event =>
      event.path === "attackSegments[0].anomalyContribution.anomalyThreshold",
    )

    expect(thresholdTrace?.inputs).toMatchObject({
      enemyRank: "boss",
      triggerCount: 2,
      status: "assault",
      physicalMultiplier: 1.2,
    })
    expect(thresholdTrace?.rawValue).toBeCloseTo(3745.2, 1)
  })

  it("floors anomaly mastery before emitting anomaly buildup", () => {
    const result = calculate({
      ...baseSnapshot,
      team: [
        {
          ...baseSnapshot.team[0]!,
          panel: {
            ...baseSnapshot.team[0]!.panel,
            anomalyMastery: 123.9,
          },
        },
      ],
      attackSegments: [
        {
          ...baseSnapshot.attackSegments[0]!,
          id: "seg-anomaly-buildup",
          damageType: "anomaly",
          anomalyContribution: {
            status: "shock",
            buildup: 100,
          },
        },
      ],
    })
    const buildupTrace = result.trace.find(event => event.path === "attackSegments[0].anomalyBuildup")

    expect(result.attackSegments[0]?.anomalyBuildup).toBe(123)
    expect(buildupTrace?.inputs).toMatchObject({
      anomalyMastery: 123.9,
      flooredAnomalyMastery: 123,
    })
    expect(buildupTrace?.displayValue).toBe("floorForFormula")
  })

  it("maps frost and auric ink anomaly buildup resistance to ice and ether", () => {
    const frost = calculate({
      ...baseSnapshot,
      team: [
        {
          ...baseSnapshot.team[0]!,
          panel: {
            ...baseSnapshot.team[0]!.panel,
            anomalyMastery: 100,
          },
        },
      ],
      enemy: {
        ...baseSnapshot.enemy,
        anomalyBuildupResistance: { ice: 0.15, ether: 0.35 },
      },
      attackSegments: [
        {
          ...baseSnapshot.attackSegments[0]!,
          id: "seg-frost-buildup",
          attribute: "frost",
          damageType: "anomaly",
          anomalyContribution: { status: "frozen", buildup: 100 },
        },
      ],
    })
    const auric = calculate({
      ...baseSnapshot,
      team: [
        {
          ...baseSnapshot.team[0]!,
          panel: {
            ...baseSnapshot.team[0]!.panel,
            anomalyMastery: 100,
          },
        },
      ],
      enemy: {
        ...baseSnapshot.enemy,
        anomalyBuildupResistance: { ice: 0.15, ether: 0.35 },
      },
      attackSegments: [
        {
          ...baseSnapshot.attackSegments[0]!,
          id: "seg-auric-buildup",
          attribute: "auricInk",
          damageType: "anomaly",
          anomalyContribution: { status: "corruption", buildup: 100 },
        },
      ],
    })

    expect(frost.attackSegments[0]?.anomalyBuildup).toBe(85)
    expect(auric.attackSegments[0]?.anomalyBuildup).toBe(65)
    expect(frost.trace.find(event => event.path === "attackSegments[0].anomalyBuildup")?.inputs).toMatchObject({
      resistanceAttribute: "ice",
      anomalyBuildupResistance: 0.15,
    })
    expect(auric.trace.find(event => event.path === "attackSegments[0].anomalyBuildup")?.inputs).toMatchObject({
      resistanceAttribute: "ether",
      anomalyBuildupResistance: 0.35,
    })
  })

  it("applies anomaly crit contributors without creating the standard crit bucket", () => {
    const result = calculate({
      ...baseSnapshot,
      team: [
        {
          ...baseSnapshot.team[0]!,
          panel: {
            ...baseSnapshot.team[0]!.panel,
            critRate: 1,
            critDamage: 2,
            anomalyProficiency: 100,
          },
        },
      ],
      attackSegments: [
        {
          ...baseSnapshot.attackSegments[0]!,
          id: "seg-anomaly-crit",
          damageType: "anomaly",
          anomalyContribution: {
            status: "shock",
            buildup: 100,
          },
        },
      ],
      modifiers: [
        {
          id: "exclusive-anomaly-crit",
          handlerId: "anomaly-crit-bonus",
          params: { value: 0.5 },
          appliesTo: { kind: "segment" },
          source,
        },
      ],
    })

    expect(result.buckets.some(bucket => bucket.bucketId === "critZone")).toBe(false)
    expect(result.buckets.find(bucket => bucket.bucketId === "anomalyCritZone")?.effectiveMultiplier).toBe(1.5)
    expect(result.summary.rawTotalDamage).toBeCloseTo(1363.636, 3)
  })

  it("builds virtual anomaly contributors from included buildup and overflow", () => {
    const result = calculate({
      ...baseSnapshot,
      team: [
        {
          ...baseSnapshot.team[0]!,
          panel: {
            ...baseSnapshot.team[0]!.panel,
            anomalyProficiency: 100,
            anomalyMastery: 100,
          },
        },
        {
          agentId: "nicole",
          level: 40,
          agentSpecialty: "support",
          attribute: "ether",
          panel: {
            attack: 2000,
            maxHp: 10000,
            impact: 80,
            anomalyProficiency: 300,
            anomalyMastery: 100,
          },
        },
      ],
      attackSegments: [
        {
          ...baseSnapshot.attackSegments[0]!,
          id: "seg-virtual-anomaly",
          damageType: "anomaly",
          anomalyContribution: {
            status: "shock",
            buildup: 120,
            overflowBuildup: 20,
            contributors: [
              { actorId: "yixuan", buildup: 60, included: true },
              { actorId: "nicole", buildup: 60, included: true },
              { actorId: "bangboo-a", buildup: 60, included: false, excludedReason: "bangboo" },
            ],
          },
        },
      ],
    })
    const virtualTrace = result.trace.find(event =>
      event.path === "attackSegments[0].anomalyContribution.virtualAgent",
    )
    const rows = (virtualTrace?.inputs as { virtualAgent?: Array<Record<string, unknown>> } | undefined)?.virtualAgent ?? []

    expect(result.summary.rawTotalDamage).toBeGreaterThan(0)
    expect(virtualTrace?.inputs).toMatchObject({
      flooredLevel: 52,
      overflowBuildup: 20,
    })
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ actorId: "yixuan", effectiveBuildup: 60, buildupContributionRatio: 0.6 }),
      expect.objectContaining({ actorId: "nicole", effectiveBuildup: 40, buildupContributionRatio: 0.4 }),
      expect.objectContaining({ actorId: "bangboo-a", effectiveBuildup: 0, excludedReason: "bangboo" }),
    ]))
  })

  it("computes shock disorder from remaining duration and disorder daze level", () => {
    const result = calculate({
      ...baseSnapshot,
      attackSegments: [
        {
          ...baseSnapshot.attackSegments[0]!,
          id: "seg-shock-disorder",
          attribute: "electric",
          damageType: "disorder",
          anomalyContribution: {
            status: "shock",
            buildup: 100,
            remainingDurationSeconds: 5,
          },
        },
      ],
    })
    const disorderTrace = result.trace.find(event => event.path === "attackSegments[0].disorderFormulaId")
    const disorderDazeBucket = result.buckets.find(bucket => bucket.bucketId === "disorderDazeLevelZone")
    const rawTrace = result.trace.find(event => event.path === "attackSegments[0].rawDamage")

    expect(result.summary.rawTotalDamage).toBeCloseTo(14170.455, 3)
    expect(result.summary.disorderDamage).toBeCloseTo(14170.455, 3)
    expect(result.attackSegments[0]?.dazeValue).toBe(348)
    expect(disorderDazeBucket?.effectiveMultiplier).toBe(1.45)
    expect(rawTrace?.formula).toContain("disorderDazeLevelZone")
    expect(rawTrace?.refs).toEqual(expect.arrayContaining(disorderDazeBucket?.traceRefs ?? []))
    expect(disorderTrace?.inputs).toMatchObject({
      disorderFormulaId: "disorder-shock",
      remainingDurationT: 5,
      sourceAnchor: "guide-3.4.1",
    })
    expect(disorderTrace?.rawValue).toBe(10.75)
    expect(result.warnings.some(item => item.key === "ERR-CALC-PENDING-DISORDER")).toBe(false)
  })

  it("rejects anomaly and disorder segments without anomaly status before calculation", () => {
    expect(() => calculate({
      ...baseSnapshot,
      attackSegments: [
        {
          ...baseSnapshot.attackSegments[0]!,
          id: "seg-anomaly-missing-status",
          damageType: "anomaly",
        },
      ],
    })).toThrow(/anomalyContribution\.status/)

    expect(() => calculate({
      ...baseSnapshot,
      attackSegments: [
        {
          ...baseSnapshot.attackSegments[0]!,
          id: "seg-disorder-missing-status",
          attribute: "electric",
          damageType: "disorder",
        },
      ],
    })).toThrow(/anomalyContribution\.status/)
  })

  it.each([
    ["burn", "fire", 2.5, "disorder-burn", 7],
    ["shock", "electric", 2, "disorder-shock", 7],
    ["corruption", "ether", 2.5, "disorder-corruption", 7.625],
    ["disorder", "auricInk", 2.5, "disorder-corruption", 7.625],
    ["frozen", "frost", 3, "disorder-frost", 8.25],
    ["frozen", "ice", 3, "disorder-physical-or-ice", 4.725],
    ["assault", "physical", 3, "disorder-physical-or-ice", 4.725],
    ["polarityDisorder", "electric", 4, "disorder-polarity", 1.425],
  ] as const)("traces %s/%s disorder multiplier", (status, attribute, remainingDurationSeconds, formulaId, multiplier) => {
    const result = calculate({
      ...baseSnapshot,
      attackSegments: [
        {
          ...baseSnapshot.attackSegments[0]!,
          id: `seg-${formulaId}`,
          attribute,
          damageType: "disorder",
          multiplier: status === "polarityDisorder" ? undefined : 1,
          anomalyContribution: {
            status,
            buildup: 100,
            remainingDurationSeconds,
          },
        },
      ],
    })
    const disorderTrace = result.trace.find(event => event.path === "attackSegments[0].disorderFormulaId")

    expect(disorderTrace?.displayValue).toBe(formulaId)
    expect(disorderTrace?.rawValue).toBeCloseTo(multiplier, 5)
  })

  it("traces three-agent polarity disorder providers and virtual shares", () => {
    const result = calculate({
      ...baseSnapshot,
      team: [
        baseSnapshot.team[0]!,
        {
          agentId: "nicole",
          level: 60,
          agentSpecialty: "support",
          attribute: "ether",
          panel: {
            attack: 800,
            maxHp: 10000,
            anomalyProficiency: 100,
          },
        },
        {
          agentId: "yanagi",
          level: 60,
          agentSpecialty: "anomaly",
          attribute: "electric",
          panel: {
            attack: 1600,
            maxHp: 10000,
            anomalyProficiency: 220,
          },
        },
      ],
      attackSegments: [
        {
          ...baseSnapshot.attackSegments[0]!,
          id: "seg-polarity-disorder",
          attribute: "electric",
          damageType: "disorder",
          multiplier: undefined,
          anomalyContribution: {
            status: "polarityDisorder",
            buildup: 100,
            remainingDurationSeconds: 5,
            contributors: [
              { actorId: "yixuan", buildup: 40, included: true },
              { actorId: "yanagi", buildup: 60, included: true },
            ],
          },
        },
      ],
      modifiers: [
        {
          id: "nicole-defense-reduction",
          handlerId: "defense-reduction",
          params: { value: 0.4 },
          appliesTo: { kind: "enemy" },
          source: { sourceId: "provider:Nicole", sourceVersion: "rules-v0.1" },
        },
        {
          id: "yanagi-anomaly-damage",
          handlerId: "anomaly-damage-bonus",
          params: { value: 0.2 },
          appliesTo: { kind: "segment" },
          source: { sourceId: "provider:Yanagi", sourceVersion: "rules-v0.1" },
        },
      ],
    })
    const disorderTrace = result.trace.find(event => event.path === "attackSegments[0].disorderFormulaId")
    const virtualTrace = result.trace.find(event =>
      event.path === "attackSegments[0].anomalyContribution.virtualAgent",
    )
    const rows = (virtualTrace?.inputs as { virtualAgent?: Array<Record<string, unknown>> } | undefined)?.virtualAgent ?? []
    const sourceIds = result.trace.map(event => event.source?.sourceId).filter(Boolean)

    expect(disorderTrace?.displayValue).toBe("disorder-polarity")
    expect(disorderTrace?.inputs).toMatchObject({
      status: "polarityDisorder",
      remainingDurationT: 5,
    })
    expect(disorderTrace?.rawValue).toBeCloseTo(1.6125, 4)
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ actorId: "yixuan", buildupContributionRatio: 0.4 }),
      expect.objectContaining({ actorId: "yanagi", buildupContributionRatio: 0.6 }),
    ]))
    expect(sourceIds).toEqual(expect.arrayContaining(["provider:Nicole", "provider:Yanagi"]))
  })
})
