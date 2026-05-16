import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  ARCHIVED_RUNTIME_SOURCE_IDS,
  assertNanokaRuntimeGameDataArtifact,
  getNanokaRuntimeGameData,
  getNanokaRuntimeSourcePolicy,
  nanokaRuntimeGameDataArtifact,
  NANOKA_RUNTIME_SOURCE_ID,
  NANOKA_RUNTIME_SOURCE_VERSION,
} from "./runtime"

const repoRoot = join(import.meta.dirname, "../../..")
const runtimeArtifactPath = join(repoRoot, "packages/data/cleaned/runtime/game-data.json")

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T
}

describe("nanoka runtime game data cutover", () => {
  it("passes offline verification for the generated runtime artifact", () => {
    execFileSync("tsx", ["scripts/nanoka-runtime-game-data.ts", "verify"], {
      cwd: join(repoRoot, "packages/data"),
      stdio: ["ignore", "pipe", "pipe"],
    })
  })

  it("exports a nanoka-only runtime GameData artifact", () => {
    assertNanokaRuntimeGameDataArtifact(nanokaRuntimeGameDataArtifact)

    const data = getNanokaRuntimeGameData()
    expect(nanokaRuntimeGameDataArtifact.runtimeCutoverReady).toBe(true)
    expect(data.sourceVersion).toBe("nanoka-zzz@2.8")
    expect(data.sources.map(source => source.id)).toEqual([NANOKA_RUNTIME_SOURCE_ID])
    expect(data.sources[0]?.sourceVersion).toBe(NANOKA_RUNTIME_SOURCE_VERSION)
    expect(Object.keys(data.agents)).toHaveLength(53)
    expect(Object.keys(data.agents)).toEqual(expect.arrayContaining(["1011", "1021", "1031", "1371", "1431", "1541"]))
    expect(Object.keys(data.wEngines)).toHaveLength(89)
    expect(Object.keys(data.wEngines)).toEqual(expect.arrayContaining(["12001", "13001", "14137", "14154"]))
    expect(Object.keys(data.driveDiscs)).toHaveLength(26)
    expect(Object.keys(data.driveDiscs)).toEqual(expect.arrayContaining(["31000", "31100", "33800"]))
    expect(Object.keys(data.enemies)).toHaveLength(269)
    expect(Object.keys(data.enemies)).toEqual(expect.arrayContaining(["10000", "10013", "30000", "990174"]))
    expect(Object.keys(data.deadlyAssaultPeriods)).toHaveLength(38)
    expect(Object.keys(data.deadlyAssaultPeriods)).toEqual(expect.arrayContaining(["69001", "69036", "69038"]))
    expect(Object.keys(data.historicalDAPeriods)).toHaveLength(505)
    expect(Object.keys(data.historicalDAPeriods)).toEqual(expect.arrayContaining([
      "2.8.12#69036",
      "2.8.12#69001",
      "3.0.1+15348292#690421",
      "3.0.2+15625449#69001",
    ]))
    expect(Object.keys(data.bangboos)).toHaveLength(39)
    expect(Object.keys(data.bangbooSkills)).toHaveLength(63)
    expect(Object.keys(data.bangboos)).toEqual(expect.arrayContaining(["53001", "53002", "54001", "54008", "54020"]))
    expect(data.agents["1371"]?.baseStatsByLevel?.["60"]).toMatchObject({
      maxHp: 7953.8621,
      attack: 872.5748,
      defense: 441.1145,
    })
    expect(data.agents["1091"]).toMatchObject({
      attribute: "frost",
      agentSpecialty: "anomaly",
    })
    expect(data.agents["1431"]).toMatchObject({
      attribute: "physical",
      agentSpecialty: "attack",
      skillIds: [],
    })
    expect(data.skills["1371001"]?.segments[0]).toMatchObject({
      multiplierByLevel: { "1": 0.458 },
      dazeMultiplierByLevel: { "1": 0.286 },
      resonanceRecoveryByLevel: { "1": 71.5 },
      adrenalineRecoveryByLevel: { "1": 0.52 },
    })
    expect(data.wEngines["14137"]?.baseStatsByLevel?.["60"]).toMatchObject({
      attack: 743.5,
      hpPercent: 0.3,
    })
    expect(data.wEngines["12011"]?.baseStatsByLevel?.["60"]).toMatchObject({
      attack: 475.84,
      anomalyProficiency: 60,
    })
    expect(data.driveDiscs["31000"]).toMatchObject({
      label: { zh: "啄木鸟电音", en: "Woodpecker Electro" },
      source: {
        sourceId: "nanoka-zzz",
        sourceVersion: "2.8",
        sourceAnchor: "packages/data/source/raw/nanoka/zzz/2.8/zh/equipment/31000.json",
      },
    })
    expect(data.enemies["30000"]).toMatchObject({
      label: { zh: "杜拉罕", en: "Dullahan" },
      rank: "elite",
      source: {
        sourceId: "nanoka-zzz",
        sourceVersion: "2.8",
        sourceAnchor: "packages/data/source/raw/nanoka/zzz/2.8/zh/monster/30000.json",
      },
    })
    expect(data.enemies["10013"]).toMatchObject({
      label: { zh: "OfficialName_", en: "OfficialName_" },
      rank: "normal",
      source: {
        sourceId: "nanoka-zzz",
        sourceVersion: "2.8",
        sourceAnchor: "packages/data/source/raw/nanoka/zzz/2.8/zh/monster/10013.json",
      },
    })
    expect(data.enemies["30000"]?.resistance).toBeUndefined()
    expect(data.enemies["30000"]?.specialRules).toBeUndefined()
    expect(data.deadlyAssaultPeriods["69036"]).toMatchObject({
      title: "危局强袭战",
      beginAt: "2026-05-08T04:00:00+08:00",
      endAt: "2026-05-22T03:59:59+08:00",
      source: {
        sourceId: "nanoka-zzz",
        sourceVersion: "2.8",
        sourceAnchor: "packages/data/source/raw/nanoka/zzz/2.8/zh/boss/69036.json",
      },
    })
    expect(data.deadlyAssaultPeriods["69036"]?.zones).toHaveLength(3)
    expect(data.deadlyAssaultPeriods["69036"]?.bossAdjustments).toHaveLength(59)
    expect(data.deadlyAssaultPeriods["69038"]?.beginAt).toBe("2026-06-05T04:00:00+08:00")
    expect(data.historicalDAPeriods["2.8.12#69001"]).toMatchObject({
      historicalKey: "2.8.12#69001",
      id: "69001",
      sourceVersion: "2.8.12",
      releaseVersion: "2.8.12",
      currentRuntime: false,
      scheduleStatus: "source-known",
      source: {
        sourceId: "nanoka-zzz",
        sourceVersion: "2.8.12",
        sourceAnchor: "packages/data/source/raw/nanoka/zzz/2.8.12/zh/boss/69001.json",
      },
    })
    expect(data.historicalDAPeriods["3.0.2+15625449#69001"]).toMatchObject({
      historicalKey: "3.0.2+15625449#69001",
      id: "69001",
      sourceVersion: "3.0.2+15625449",
      releaseVersion: "3.0.2+15625449",
      currentRuntime: false,
      scheduleStatus: "missing-in-historical-source",
    })
    expect(data.historicalDAPeriods["3.0.2+15625449#69001"]?.beginAt).toBeUndefined()
    expect(data.historicalDAPeriods["3.0.2+15625449#69001"]?.endAt).toBeUndefined()
    expect(data.bangboos["54008"]?.baseStatsByLevel?.["60"]).toMatchObject({
      maxHp: 4210.2983,
      attack: 8057.0996,
      defense: 723.8011,
      impact: 99,
      anomalyMastery: 132,
    })
    expect(data.bangbooSkills["5400801"]?.segments[0]).toMatchObject({
      multiplierByLevel: { "1": 5.12 },
      dazeMultiplierByLevel: { "1": 1.87 },
    })
    expect(data.bangbooSkills["5300201"]?.segments[0]).toMatchObject({
      multiplierByLevel: { "1": 6.16 },
      dazeMultiplierByLevel: { "1": 3.598 },
    })
    expect(data.bangbooSkills["54020-a"]?.segments[0]).toMatchObject({
      multiplierByLevel: { "1": 8.96 },
      dazeMultiplierByLevel: { "1": 3.27 },
    })
  })

  it("fails loud if runtime data references archived source ids", () => {
    const mutated = structuredClone(nanokaRuntimeGameDataArtifact)
    mutated.data.bangboos["53002"]!.source.sourceId = "lo-user-excel"

    expect(() => assertNanokaRuntimeGameDataArtifact(mutated)).toThrow(/archived source lo-user-excel/)
  })

  it("keeps the runtime source policy strict", () => {
    const policy = getNanokaRuntimeSourcePolicy()
    expect(policy.archivedSourcesRuntimeAllowed).toBe(false)
    expect(policy.deprecatedRuntimeSourceIds).toEqual(ARCHIVED_RUNTIME_SOURCE_IDS)

    const artifact = readJson<unknown>(runtimeArtifactPath)
    assertNanokaRuntimeGameDataArtifact(artifact)
  })

  it("records the full approved-live Bangboo batch audit", () => {
    const audit = readJson<{
      summary: {
        bangbooCount: number
        runtimeBangbooCount: number
        promotedSkillCount: number
        noRuntimeSkillBangbooIds: string[]
      }
    }>(join(repoRoot, "packages/data/cleaned/audit/nanoka-bangboo-batch-audit.json"))

    expect(audit.summary).toMatchObject({
      bangbooCount: 39,
      runtimeBangbooCount: 39,
      promotedSkillCount: 63,
      noRuntimeSkillBangbooIds: ["53003", "53008", "53012"],
    })
  })

  it("records the full approved-live character batch audit without promoting unresolved skills or passives", () => {
    const audit = readJson<{
      summary: {
        characterCount: number
        runtimeAgentCount: number
        promotedRuntimeSkillCount: number
        nonPromotedSkillAgentCount: number
        typedModifierPendingCount: number
        specialElementPromotedIds: string[]
        specialElementNotPromotedIds: string[]
      }
    }>(join(repoRoot, "packages/data/cleaned/audit/nanoka-character-batch-audit.json"))

    expect(audit.summary).toMatchObject({
      characterCount: 53,
      runtimeAgentCount: 53,
      promotedRuntimeSkillCount: 1,
      nonPromotedSkillAgentCount: 52,
      typedModifierPendingCount: 53,
      specialElementPromotedIds: ["1091", "1371"],
      specialElementNotPromotedIds: ["1431"],
    })
  })

  it("records the full approved-live W-Engine batch audit without promoting unresolved passives", () => {
    const audit = readJson<{
      summary: {
        wEngineCount: number
        runtimeWEngineCount: number
        passiveNotPromotedCount: number
        subStatCounts: Record<string, number>
      }
      wEngines: Array<{
        id: string
        passiveModifiers: {
          status: string
          talents: Array<{
            level: string
            name: string
            desc: string
            source: {
              sourceId: string
              sourceVersion: string
              sourceAnchor: string
              dataPath: string
            }
          }>
        }
      }>
    }>(join(repoRoot, "packages/data/cleaned/audit/nanoka-wengine-batch-audit.json"))

    expect(audit.summary).toMatchObject({
      wEngineCount: 89,
      runtimeWEngineCount: 89,
      passiveNotPromotedCount: 89,
    })
    expect(audit.summary.subStatCounts).toMatchObject({
      attackPercent: 23,
      hpPercent: 12,
      impact: 12,
      anomalyProficiency: 5,
    })

    const qingming = audit.wEngines.find(row => row.id === "14137")
    expect(qingming?.passiveModifiers).toMatchObject({
      status: "not-promoted",
    })
    expect(qingming?.passiveModifiers.talents).toHaveLength(5)
    expect(qingming?.passiveModifiers.talents[0]).toMatchObject({
      level: "1",
      name: "云流运转",
      source: {
        sourceId: "nanoka-zzz",
        sourceVersion: "2.8",
        sourceAnchor: "packages/data/source/raw/nanoka/zzz/2.8/zh/weapon/14137.json",
        dataPath: "/talents/1",
      },
    })
    expect(qingming?.passiveModifiers.talents[0]?.desc).toContain("暴击率提升")
  })

  it("records the full approved-live Drive Disc batch audit without promoting unresolved set modifiers", () => {
    const audit = readJson<{
      summary: {
        driveDiscCount: number
        runtimeDriveDiscCount: number
        retainedSetEffectTextCount: number
        typedModifierPendingCount: number
      }
      driveDiscs: Array<{
        id: string
        setEffects: {
          twoPiece: {
            status: string
            rawText: string
            source: {
              sourceId: string
              sourceVersion: string
              sourceAnchor: string
              dataPath: string
            }
          }
          fourPiece: {
            status: string
            rawText: string
            source: {
              sourceId: string
              sourceVersion: string
              sourceAnchor: string
              dataPath: string
            }
          }
        }
        slotAndSubstatTables: {
          status: string
        }
      }>
    }>(join(repoRoot, "packages/data/cleaned/audit/nanoka-drive-disc-batch-audit.json"))

    expect(audit.summary).toMatchObject({
      driveDiscCount: 26,
      runtimeDriveDiscCount: 26,
      retainedSetEffectTextCount: 52,
      typedModifierPendingCount: 26,
    })

    const woodpecker = audit.driveDiscs.find(row => row.id === "31000")
    expect(woodpecker?.setEffects.twoPiece).toMatchObject({
      status: "not-promoted",
      rawText: "暴击率+8%。",
      source: {
        sourceId: "nanoka-zzz",
        sourceVersion: "2.8",
        sourceAnchor: "packages/data/source/raw/nanoka/zzz/2.8/zh/equipment/31000.json",
        dataPath: "/desc2",
      },
    })
    expect(woodpecker?.setEffects.fourPiece.rawText).toContain("攻击力提升9%")
    expect(woodpecker?.slotAndSubstatTables.status).toBe("out-of-scope")
  })

  it("records the full approved-live enemy batch audit without promoting unresolved combat semantics", () => {
    const audit = readJson<{
      summary: {
        enemyCount: number
        runtimeEnemyCount: number
        selectedVariantCount: number
        missingSelectedVariantCount: number
        skippedVariantCount: number
        retainedTextRowCount: number
        rankCounts: Record<string, number>
      }
      enemies: Array<{
        id: string
        rank: string
        selectedVariant: {
          status: string
          reason?: string
          monsterInfoId?: number
          codeName?: string
          source?: {
            sourceId: string
            sourceVersion: string
            sourceAnchor: string
            dataPath: string
          }
          statsRaw?: {
            hp?: number
            stun?: number
            ice_damage_res?: number
            ether_damage_res?: number
          }
        }
        skippedVariants: Array<{
          status: string
          reason: string
        }>
        pendingPromotions: Record<string, { status: string, reason: string }>
      }>
    }>(join(repoRoot, "packages/data/cleaned/audit/nanoka-enemy-batch-audit.json"))

    expect(audit.summary).toMatchObject({
      enemyCount: 269,
      runtimeEnemyCount: 269,
      selectedVariantCount: 201,
      missingSelectedVariantCount: 68,
      skippedVariantCount: 372,
      retainedTextRowCount: 1076,
    })
    expect(audit.summary.rankCounts).toMatchObject({
      boss: 22,
      elite: 77,
      normal: 105,
      special: 65,
    })

    const dullahan = audit.enemies.find(row => row.id === "30000")
    expect(dullahan).toMatchObject({
      rank: "elite",
      selectedVariant: {
        status: "promoted",
        monsterInfoId: 11154,
        codeName: "Monster_DurahanGrey",
        source: {
          sourceId: "nanoka-zzz",
          sourceVersion: "2.8",
          sourceAnchor: "packages/data/source/raw/nanoka/zzz/2.8/zh/monster/30000.json",
          dataPath: "/monster_info/11154",
        },
      },
    })
    expect(dullahan?.selectedVariant.statsRaw).toMatchObject({
      hp: 7097,
      stun: 3502,
      ice_damage_res: -2000,
      ether_damage_res: -2000,
    })
    expect(dullahan?.skippedVariants).toHaveLength(4)
    expect(dullahan?.skippedVariants[0]).toMatchObject({
      status: "audit-only",
      reason: "non-selected-monster_info-variant",
    })

    const missingSelected = audit.enemies.find(row => row.id === "10013")
    expect(missingSelected?.selectedVariant).toMatchObject({
      status: "not-promoted",
      reason: "missing-selected-monster_info-variant",
      monsterInfoId: 0,
    })

    for (const row of [dullahan, missingSelected]) {
      expect(row?.pendingPromotions).toMatchObject({
        levelDefaults: {
          status: "not-promoted",
          reason: "field:enemy-level-formula-required",
        },
        resistance: {
          status: "not-promoted",
          reason: "field:resistance-unit-mapping-required",
        },
        anomalyThresholds: {
          status: "not-promoted",
          reason: "field:anomaly-threshold-mapping-required",
        },
        dazeRecovery: {
          status: "not-promoted",
          reason: "field:daze-recovery-semantic-mapping-required",
        },
        specialRules: {
          status: "not-promoted",
          reason: "typed-modifier-template-required",
        },
      })
    }
  })

  it("records the full approved-live current DA batch audit", () => {
    const audit = readJson<{
      summary: {
        periodCount: number
        runtimePeriodCount: number
        zoneCount: number
        bossAdjustmentCount: number
        scheduledFuturePeriodIds: string[]
      }
      historicalPeriodsIncluded: boolean
      historicalBucketPlanned: string
      periods: Array<{
        id: string
        status: string
        source: {
          sourceId: string
          sourceVersion: string
          sourceAnchor: string
          dataPath: string
        }
        zoneCount: number
        bossAdjustmentCount: number
      }>
    }>(join(repoRoot, "packages/data/cleaned/audit/nanoka-da-current-batch-audit.json"))

    expect(audit.summary).toMatchObject({
      periodCount: 38,
      runtimePeriodCount: 38,
      zoneCount: 114,
      bossAdjustmentCount: 2242,
      scheduledFuturePeriodIds: ["69037", "69038"],
    })
    expect(audit.historicalPeriodsIncluded).toBe(false)
    expect(audit.historicalBucketPlanned).toBe("historicalDAPeriods")

    const current = audit.periods.find(row => row.id === "69036")
    expect(current).toMatchObject({
      status: "configured-live-observed",
      source: {
        sourceId: "nanoka-zzz",
        sourceVersion: "2.8",
        sourceAnchor: "packages/data/source/raw/nanoka/zzz/2.8/zh/boss/69036.json",
        dataPath: "/",
      },
      zoneCount: 3,
      bossAdjustmentCount: 59,
    })
    expect(audit.periods.find(row => row.id === "69038")?.status).toBe("configured-live-scheduled")
  })

  it("records manifest-available historical DA periods in the dedicated non-current bucket", () => {
    const audit = readJson<{
      summary: {
        snapshotCount: number
        historicalRuntimePeriodCount: number
        uniquePeriodIdCount: number
        zoneCount: number
        bossAdjustmentCount: number
        scheduleKnownCount: number
        scheduleMissingCount: number
        sourceVersions: string[]
      }
      policy: {
        currentBucketVersionMustRemain: string
        historicalPeriodsAreNotCurrentRuntime: boolean
        noRuntimeFallbackToHistorical: boolean
        noVersionBumpInThisPr: boolean
      }
      snapshots: Array<{
        sourceVersion: string
        periodCount: number
        scheduleKnownCount: number
        scheduleMissingCount: number
      }>
      periods: Array<{
        historicalKey: string
        id: string
        releaseVersion: string
        currentRuntime: boolean
        scheduleStatus: string
      }>
    }>(join(repoRoot, "packages/data/cleaned/audit/nanoka-da-historical-batch-audit.json"))

    expect(audit.summary).toMatchObject({
      snapshotCount: 10,
      historicalRuntimePeriodCount: 505,
      uniquePeriodIdCount: 53,
      zoneCount: 1506,
      bossAdjustmentCount: 58445,
      scheduleKnownCount: 198,
      scheduleMissingCount: 307,
    })
    expect(audit.summary.sourceVersions).toEqual([
      "2.8.12",
      "3.0.1+15348292",
      "3.0.1+15370273",
      "3.0.1+15377279",
      "3.0.1+15390262",
      "3.0.2+15596677",
      "3.0.2+15597809",
      "3.0.2+15599986",
      "3.0.2+15602810",
      "3.0.2+15625449",
    ])
    expect(audit.policy).toMatchObject({
      currentBucketVersionMustRemain: "2.8",
      historicalPeriodsAreNotCurrentRuntime: true,
      noRuntimeFallbackToHistorical: true,
      noVersionBumpInThisPr: true,
    })
    expect(audit.snapshots).toHaveLength(10)
    expect(audit.snapshots[0]).toMatchObject({
      sourceVersion: "2.8.12",
      periodCount: 46,
      scheduleKnownCount: 39,
      scheduleMissingCount: 7,
    })
    expect(audit.snapshots.at(-1)).toMatchObject({
      sourceVersion: "3.0.2+15625449",
      periodCount: 50,
      scheduleKnownCount: 5,
      scheduleMissingCount: 45,
    })
    expect(audit.periods).toHaveLength(505)
    expect(audit.periods.find(row => row.historicalKey === "2.8.12#69001")).toMatchObject({
      id: "69001",
      releaseVersion: "2.8.12",
      currentRuntime: false,
      scheduleStatus: "source-known",
    })
    expect(audit.periods.find(row => row.historicalKey === "3.0.2+15625449#69001")).toMatchObject({
      id: "69001",
      releaseVersion: "3.0.2+15625449",
      currentRuntime: false,
      scheduleStatus: "missing-in-historical-source",
    })
  })
})
