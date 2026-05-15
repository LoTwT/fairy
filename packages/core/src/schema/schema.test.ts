import { describe, expect, it } from "vitest"
import {
  battleSnapshotSchema,
  calcResultSchema,
  conditionSchema,
  gameDataSchema,
} from "./index"

const source = {
  sourceId: "guide",
  sourceVersion: "rules-v0.1",
  sourceAnchor: "PART-01",
}

const minimalAgent = {
  agentId: "yixuan",
  level: 60,
  agentSpecialty: "rupture",
  attribute: "auricInk",
  panel: {
    attack: 3000,
    maxHp: 18000,
    critRate: 0.5,
    critDamage: 1.2,
    sheerForce: 2423,
  },
}

describe("BattleSnapshot schema", () => {
  it("accepts the TL-3 static snapshot shape", () => {
    const result = battleSnapshotSchema.safeParse({
      schemaVersion: "1.0.0",
      gameVersion: "ZZZ-2.2",
      ruleSetVersion: "rules-v0.1",
      dataVersion: "data-v0.1.0",
      sourceVersion: "source-v0.1.0",
      locale: "zh",
      context: {
        gameMode: "lostVoid",
        resoniumIds: ["critical-example"],
      },
      team: [minimalAgent],
      activeActor: { agentId: "yixuan" },
      attackSegments: [
        {
          id: "seg-1",
          attribute: "auricInk",
          tags: ["exSpecial"],
          damageType: "sheer",
          multiplier: 3.2,
          source,
          anomalyContribution: {
            status: "corruption",
            overflowBuildup: 12,
            contributors: [
              {
                actorId: "yixuan",
                buildup: 120,
                included: true,
                source,
              },
            ],
          },
        },
      ],
      enemy: {
        enemyId: "corrupted-priest",
        level: 60,
        rank: "boss",
        maxHp: 1000000,
        resistance: {
          ether: 0.1,
        },
        corruptedShield: { active: true, defenseMultiplier: 1.8 },
      },
      manualEvents: [
        {
          id: "purge-1",
          kind: "corruptedShieldCleanse",
          basePath: "enemy.maxHp",
          trueDamageRule: "default15Percent",
          source,
        },
      ],
      fieldProvenance: {
        "attackSegments[0].multiplier": {
          provenance: "userOverride",
          overriddenFromData: 3,
          reason: "golden fixture",
        },
      },
      overrides: [
        {
          path: "attackSegments[0].multiplier",
          value: 3.2,
          overriddenFromData: 3,
        },
      ],
    })

    expect(result.success).toBe(true)
  })

  it("rejects legacy singular attackSegment", () => {
    const result = battleSnapshotSchema.safeParse({
      schemaVersion: "1.0.0",
      gameVersion: "ZZZ-2.2",
      ruleSetVersion: "rules-v0.1",
      dataVersion: "data-v0.1.0",
      sourceVersion: "source-v0.1.0",
      team: [minimalAgent],
      activeActor: { agentId: "yixuan" },
      attackSegment: {
        id: "legacy",
        attribute: "auricInk",
        tags: ["exSpecial"],
        damageType: "sheer",
      },
      enemy: {
        level: 60,
        rank: "boss",
      },
    })

    expect(result.success).toBe(false)
  })

  it("rejects an activeActor outside the team", () => {
    const result = battleSnapshotSchema.safeParse({
      schemaVersion: "1.0.0",
      gameVersion: "ZZZ-2.2",
      ruleSetVersion: "rules-v0.1",
      dataVersion: "data-v0.1.0",
      sourceVersion: "source-v0.1.0",
      team: [minimalAgent],
      activeActor: { agentId: "yanagi" },
      attackSegments: [
        {
          id: "seg-1",
          attribute: "auricInk",
          tags: ["exSpecial"],
          damageType: "sheer",
        },
      ],
      enemy: {
        level: 60,
        rank: "boss",
      },
    })

    expect(result.success).toBe(false)
  })

  it("rejects an attack segment actor outside the team", () => {
    const result = battleSnapshotSchema.safeParse({
      schemaVersion: "1.0.0",
      gameVersion: "ZZZ-2.2",
      ruleSetVersion: "rules-v0.1",
      dataVersion: "data-v0.1.0",
      sourceVersion: "source-v0.1.0",
      team: [minimalAgent],
      activeActor: { agentId: "yixuan" },
      attackSegments: [
        {
          id: "seg-1",
          actorId: "yanagi",
          attribute: "auricInk",
          tags: ["exSpecial"],
          damageType: "sheer",
        },
      ],
      enemy: {
        level: 60,
        rank: "boss",
      },
    })

    expect(result.success).toBe(false)
  })

  it("accepts explicit Bangboo attack segments", () => {
    const result = battleSnapshotSchema.safeParse({
      schemaVersion: "1.0.0",
      gameVersion: "ZZZ-2.2",
      ruleSetVersion: "rules-v0.1",
      dataVersion: "data-v0.1.0",
      sourceVersion: "source-v0.1.0",
      team: [minimalAgent],
      activeActor: { agentId: "yixuan" },
      bangboo: {
        bangbooId: "penguinboo",
        level: 60,
        panel: {
          attack: 6198.0006,
          maxHp: 3827.5423,
          defense: 723.8011,
          impact: 90,
          critRate: 0.5,
          critDamage: 1,
          anomalyMastery: 120,
        },
      },
      attackSegments: [
        {
          id: "penguinboo-active",
          actor: { kind: "bangboo", bangbooId: "penguinboo" },
          attribute: "ice",
          tags: ["special"],
          damageType: "regular",
          multiplier: 4.62,
          baseDazeMultiplier: 2.7,
          anomalyContribution: { status: "frozen", buildup: 346 },
        },
      ],
      enemy: {
        level: 60,
        rank: "boss",
      },
    })

    expect(result.success).toBe(true)
  })

  it("rejects conflicting top-level Bangboo and team subordinate aliases", () => {
    const result = battleSnapshotSchema.safeParse({
      schemaVersion: "1.0.0",
      gameVersion: "ZZZ-2.2",
      ruleSetVersion: "rules-v0.1",
      dataVersion: "data-v0.1.0",
      sourceVersion: "source-v0.1.0",
      team: [
        {
          ...minimalAgent,
          subordinate: { kind: "bangboo", id: "sharkboo" },
        },
      ],
      activeActor: { agentId: "yixuan" },
      bangboo: {
        bangbooId: "penguinboo",
        panel: { attack: 6198.0006, maxHp: 3827.5423 },
      },
      attackSegments: [
        {
          id: "seg-1",
          attribute: "auricInk",
          tags: ["exSpecial"],
          damageType: "sheer",
        },
      ],
      enemy: {
        level: 60,
        rank: "boss",
      },
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues.some(issue =>
      issue.path.join(".") === "bangboo.bangbooId",
    )).toBe(true)
  })

  it("rejects legacy panel aliases outside migration", () => {
    const result = battleSnapshotSchema.safeParse({
      schemaVersion: "1.0.0",
      gameVersion: "ZZZ-2.2",
      ruleSetVersion: "rules-v0.1",
      dataVersion: "data-v0.1.0",
      sourceVersion: "source-v0.1.0",
      team: [
        {
          ...minimalAgent,
          panel: {
            ...minimalAgent.panel,
            breachForce: 2423,
            hpMax: 18000,
          },
        },
      ],
      activeActor: { agentId: "yixuan" },
      attackSegments: [
        {
          id: "seg-1",
          attribute: "auricInk",
          tags: ["exSpecial"],
          damageType: "sheer",
        },
      ],
      enemy: {
        level: 60,
        rank: "boss",
      },
    })

    expect(result.success).toBe(false)
  })

  it("requires anomaly status for anomaly and disorder segments", () => {
    const result = battleSnapshotSchema.safeParse({
      schemaVersion: "1.0.0",
      gameVersion: "ZZZ-2.2",
      ruleSetVersion: "rules-v0.1",
      dataVersion: "data-v0.1.0",
      sourceVersion: "source-v0.1.0",
      team: [minimalAgent],
      activeActor: { agentId: "yixuan" },
      attackSegments: [
        {
          id: "seg-1",
          attribute: "electric",
          tags: ["exSpecial"],
          damageType: "disorder",
        },
      ],
      enemy: {
        level: 60,
        rank: "boss",
      },
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues.some(issue =>
      issue.path.join(".") === "attackSegments.0.anomalyContribution.status",
    )).toBe(true)
  })

  it("rejects polarity disorder without an explicit provider and supported skill level", () => {
    const yanagi = {
      agentId: "yanagi",
      level: 60,
      agentSpecialty: "anomaly",
      attribute: "electric",
      skillLevels: { special: 12 },
      panel: {
        attack: 1600,
        maxHp: 10000,
        anomalyProficiency: 300,
      },
    }
    const base = {
      schemaVersion: "1.0.0",
      gameVersion: "ZZZ-2.2",
      ruleSetVersion: "rules-v0.1",
      dataVersion: "data-v0.1.0",
      sourceVersion: "source-v0.1.0",
      team: [minimalAgent, yanagi],
      activeActor: { agentId: "yixuan" },
      attackSegments: [
        {
          id: "seg-polarity",
          attribute: "electric",
          tags: ["exSpecial"],
          damageType: "disorder",
          anomalyContribution: {
            status: "polarityDisorder",
            remainingDurationSeconds: 5,
            polarityDisorder: {
              providerActorId: "yanagi",
              skillLevelKey: "special",
              originalDisorderDamageRatio: 0.15,
              anomalyProficiencyBasePercent: 5,
              anomalyProficiencyPerSkillLevelPercent: 2.25,
            },
          },
        },
      ],
      enemy: {
        level: 60,
        rank: "boss",
      },
    }

    expect(battleSnapshotSchema.safeParse(base).success).toBe(true)

    const missingProvider = battleSnapshotSchema.safeParse({
      ...base,
      team: [minimalAgent],
    })
    expect(missingProvider.success).toBe(false)
    expect(missingProvider.error?.issues.some(issue =>
      issue.path.join(".") === "attackSegments.0.anomalyContribution.polarityDisorder.providerActorId",
    )).toBe(true)

    const missingSkillLevel = battleSnapshotSchema.safeParse({
      ...base,
      team: [
        minimalAgent,
        {
          ...yanagi,
          skillLevels: {},
        },
      ],
    })
    expect(missingSkillLevel.success).toBe(false)
    expect(missingSkillLevel.error?.issues.some(issue =>
      issue.path.join(".") === "attackSegments.0.anomalyContribution.polarityDisorder.skillLevelKey",
    )).toBe(true)

    const outOfRangeSkillLevel = battleSnapshotSchema.safeParse({
      ...base,
      team: [
        minimalAgent,
        {
          ...yanagi,
          skillLevels: { special: 17 },
        },
      ],
    })
    expect(outOfRangeSkillLevel.success).toBe(false)
    expect(outOfRangeSkillLevel.error?.issues.some(issue =>
      issue.message === "polarityDisorder provider skill level must be between 1 and 16",
    )).toBe(true)

    const missingAnomalyProficiency = battleSnapshotSchema.safeParse({
      ...base,
      team: [
        minimalAgent,
        {
          ...yanagi,
          panel: {
            attack: 1600,
            maxHp: 10000,
          },
        },
      ],
    })
    expect(missingAnomalyProficiency.success).toBe(false)
    expect(missingAnomalyProficiency.error?.issues.some(issue =>
      issue.path.join(".") === "team.1.panel.anomalyProficiency",
    )).toBe(true)
  })
})

describe("CalcResult schema", () => {
  it("accepts unsourced user contributors when sourceMissing and diagnosticRefs are present", () => {
    const result = calcResultSchema.safeParse({
      schemaVersion: "1.0.0",
      gameVersion: "ZZZ-2.2",
      ruleSetVersion: "rules-v0.1",
      dataVersion: "data-v0.1.0",
      sourceVersion: "source-v0.1.0",
      calculationId: "calc-1",
      summary: {
        activeActorId: "yixuan",
        damageType: "sheer",
        lanes: {
          nonCrit: { rawDamage: 10.2, displayDamage: 11 },
          crit: { rawDamage: 10.2, displayDamage: 11 },
        },
        rawTotalDamage: 10.2,
        displayTotalDamage: 11,
      },
      attackSegments: [
        {
          id: "seg-1",
          actorId: "yixuan",
          attribute: "auricInk",
          tags: ["exSpecial"],
          damageType: "sheer",
          rawDamage: 10.2,
          segmentDisplayDamage: 11,
          roundingMode: "ceilPerSegment",
          traceRefs: ["trace-rounding-1"],
        },
      ],
      buckets: [
        {
          bucketId: "sheerDamageBonusZone",
          before: 1,
          after: 1.2,
          effectiveMultiplier: 1.2,
          contributors: [
            {
              id: "manual-bonus",
              sourceMissing: true,
              value: 0.2,
              operation: "add",
              active: true,
              diagnosticRefs: ["warn-src-1"],
            },
          ],
          traceRefs: ["trace-bucket-1"],
        },
      ],
      modifiers: [],
      trace: [],
      warnings: [
        {
          key: "ERR-SRC-001",
          severity: "warning",
          path: "modifiers[0]",
        },
      ],
      errors: [],
    })

    expect(result.success).toBe(true)
  })

  it("rejects unsourced bucket contributors without warning trace", () => {
    const result = calcResultSchema.safeParse({
      schemaVersion: "1.0.0",
      gameVersion: "ZZZ-2.2",
      ruleSetVersion: "rules-v0.1",
      dataVersion: "data-v0.1.0",
      sourceVersion: "source-v0.1.0",
      calculationId: "calc-1",
      summary: {
        activeActorId: "yixuan",
        damageType: "sheer",
        lanes: {
          nonCrit: { rawDamage: 10.2, displayDamage: 11 },
          crit: { rawDamage: 10.2, displayDamage: 11 },
        },
        rawTotalDamage: 10.2,
        displayTotalDamage: 11,
      },
      attackSegments: [
        {
          id: "seg-1",
          actorId: "yixuan",
          attribute: "auricInk",
          tags: ["exSpecial"],
          damageType: "sheer",
          rawDamage: 10.2,
          segmentDisplayDamage: 11,
          roundingMode: "ceilPerSegment",
          traceRefs: ["trace-rounding-1"],
        },
      ],
      buckets: [
        {
          bucketId: "sheerDamageBonusZone",
          before: 1,
          after: 1.2,
          effectiveMultiplier: 1.2,
          contributors: [
            {
              id: "manual-bonus",
              value: 0.2,
              operation: "add",
              active: true,
            },
          ],
          traceRefs: ["trace-bucket-1"],
        },
      ],
      modifiers: [],
      trace: [],
      warnings: [],
      errors: [],
    })

    expect(result.success).toBe(false)
  })
})

describe("Condition schema", () => {
  it("accepts nested condition DSL trees", () => {
    const result = conditionSchema.safeParse({
      all: [
        { field: "segment.tags", op: "in", value: "exSpecial" },
        { not: { field: "enemy.states", op: "in", value: "dazed" } },
      ],
    })

    expect(result.success).toBe(true)
  })
})

describe("GameData schema", () => {
  it("accepts source-derived cleaned data envelopes", () => {
    const result = gameDataSchema.safeParse({
      schemaVersion: "1.0.0",
      gameVersion: "ZZZ-2.2",
      dataVersion: "data-v0.1.0",
      sourceVersion: "source-v0.1.0",
      generatedAt: "2026-05-05T00:00:00.000Z",
      sources: [
        {
          id: "excel-1",
          kind: "excel",
          fileName: "source.xlsx",
          sourceVersion: "source-v0.1.0",
          parsedAt: "2026-05-05T00:00:00.000Z",
          parserVersion: "parser-v0.1.0",
        },
      ],
      agents: {},
      skills: {},
      bangboos: {
        penguinboo: {
          id: "penguinboo",
          label: { zh: "企鹅布", en: "Penguinboo" },
          source,
          baseStatsByLevel: {
            "60": {
              attack: 6198.0006,
              maxHp: 3827.5423,
              defense: 723.8011,
              impact: 90,
              critRate: 0.5,
              critDamage: 1,
              anomalyMastery: 120,
            },
          },
          skillIds: ["penguinboo-active"],
        },
      },
      bangbooSkills: {
        "penguinboo-active": {
          id: "penguinboo-active",
          bangbooId: "penguinboo",
          label: { zh: "主动技能：冰刀舞" },
          source,
          tags: ["special"],
          segments: [
            {
              id: "penguinboo-active-hit",
              levelKey: "default",
              multiplierByLevel: { "1": 4.62 },
              dazeMultiplierByLevel: { "1": 2.7 },
              resonanceRecoveryByLevel: { "1": 47.025 },
              adrenalineRecoveryByLevel: { "1": 0 },
              damageType: "regular",
              defaultTags: ["special"],
              source,
            },
          ],
        },
      },
      wEngines: {},
      driveDiscs: {},
      enemies: {},
      deadlyAssaultPeriods: {
        "69036": {
          id: "69036",
          title: "危局强袭战",
          sourceVersion: "source-v0.1.0",
          beginAt: "2026-05-08T04:00:00+08:00",
          endAt: "2026-05-22T03:59:59+08:00",
          source,
          zones: [
            {
              zoneId: "1",
              stageNumber: 1,
              name: "Deadly Assault Zone",
              monsterLevel: 60,
              goalType: 1,
              rankGoals: { s: 20000, a: 10000, b: 5000 },
              layerBuffs: [
                {
                  id: "buff-1",
                  title: "Buff",
                  description: "Damage increased.",
                  source,
                },
              ],
              selectableBuffs: [],
              rooms: [
                {
                  roomId: "1",
                  waves: 1,
                  source,
                  monsters: [
                    {
                      slotId: "1",
                      monsterId: 11154,
                      name: "Dullahan",
                      elementProfile: { physical: 0, wind: 0 },
                      weaknessAttributes: ["electric"],
                      stats: {
                        hp: 1000,
                        attack: 100,
                        defense: 50,
                        daze: 100,
                        anomalyBuildupResistance: 120,
                      },
                      source,
                    },
                  ],
                },
              ],
              source,
            },
          ],
          bossAdjustments: [
            {
              id: "1",
              hpAdjustmentRaw: 10000,
              attackAdjustmentRaw: 10000,
              operationScorePoints: 3000,
              source,
            },
          ],
        },
      },
      resonium: {},
      modifiers: {},
      rules: {},
      aliases: {
        fields: { breachForce: "sheerForce" },
        enumValues: {},
        sourceTerms: { resonia: "resonium" },
      },
    })

    expect(result.success).toBe(true)
  })

  it("rejects formal data modifiers without source", () => {
    const result = gameDataSchema.safeParse({
      schemaVersion: "1.0.0",
      gameVersion: "ZZZ-2.2",
      dataVersion: "data-v0.1.0",
      sourceVersion: "source-v0.1.0",
      generatedAt: "2026-05-05T00:00:00.000Z",
      sources: [
        {
          id: "excel-1",
          kind: "excel",
          fileName: "source.xlsx",
          sourceVersion: "source-v0.1.0",
          parsedAt: "2026-05-05T00:00:00.000Z",
          parserVersion: "parser-v0.1.0",
        },
      ],
      agents: {},
      skills: {},
      bangboos: {},
      bangbooSkills: {},
      wEngines: {},
      driveDiscs: {},
      enemies: {},
      deadlyAssaultPeriods: {},
      resonium: {},
      modifiers: {
        unsourcedFormalModifier: {
          id: "unsourced-formal-modifier",
          handlerId: "damage-bonus",
          bucket: "damageBonusZone",
          params: { value: 0.1 },
          appliesTo: { kind: "activeActor" },
        },
      },
      rules: {},
      aliases: {
        fields: {},
        enumValues: {},
        sourceTerms: {},
      },
    })

    expect(result.success).toBe(false)
  })
})
