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
const rootRuntimePath = join(repoRoot, "data/cleaned/runtime/game-data.json")
const packageRuntimePath = join(repoRoot, "packages/data/cleaned/runtime/game-data.json")

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
        sourceAnchor: "data/source/raw/nanoka/zzz/2.8/zh/equipment/31000.json",
      },
    })
    expect(data.enemies["30000"]).toMatchObject({
      label: { zh: "杜拉罕", en: "Dullahan" },
      rank: "elite",
      source: {
        sourceId: "nanoka-zzz",
        sourceVersion: "2.8",
        sourceAnchor: "data/source/raw/nanoka/zzz/2.8/zh/monster/30000.json",
      },
    })
    expect(data.enemies["10013"]).toMatchObject({
      label: { zh: "OfficialName_", en: "OfficialName_" },
      rank: "normal",
      source: {
        sourceId: "nanoka-zzz",
        sourceVersion: "2.8",
        sourceAnchor: "data/source/raw/nanoka/zzz/2.8/zh/monster/10013.json",
      },
    })
    expect(data.enemies["30000"]?.resistance).toBeUndefined()
    expect(data.enemies["30000"]?.specialRules).toBeUndefined()
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

  it("keeps the runtime source policy strict and mirrored", () => {
    const policy = getNanokaRuntimeSourcePolicy()
    expect(policy.archivedSourcesRuntimeAllowed).toBe(false)
    expect(policy.deprecatedRuntimeSourceIds).toEqual(ARCHIVED_RUNTIME_SOURCE_IDS)
    expect(readFileSync(rootRuntimePath, "utf8")).toBe(readFileSync(packageRuntimePath, "utf8"))

    const rootArtifact = readJson<unknown>(rootRuntimePath)
    assertNanokaRuntimeGameDataArtifact(rootArtifact)
  })

  it("records the full approved-live Bangboo batch audit", () => {
    const audit = readJson<{
      summary: {
        bangbooCount: number
        runtimeBangbooCount: number
        promotedSkillCount: number
        noRuntimeSkillBangbooIds: string[]
      }
    }>(join(repoRoot, "data/cleaned/audit/nanoka-bangboo-batch-audit.json"))

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
    }>(join(repoRoot, "data/cleaned/audit/nanoka-character-batch-audit.json"))

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
    }>(join(repoRoot, "data/cleaned/audit/nanoka-wengine-batch-audit.json"))

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
        sourceAnchor: "data/source/raw/nanoka/zzz/2.8/zh/weapon/14137.json",
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
    }>(join(repoRoot, "data/cleaned/audit/nanoka-drive-disc-batch-audit.json"))

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
        sourceAnchor: "data/source/raw/nanoka/zzz/2.8/zh/equipment/31000.json",
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
    }>(join(repoRoot, "data/cleaned/audit/nanoka-enemy-batch-audit.json"))

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
          sourceAnchor: "data/source/raw/nanoka/zzz/2.8/zh/monster/30000.json",
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
})
