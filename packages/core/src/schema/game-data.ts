import { z } from "zod"
import {
  agentSpecialtySchema,
  attackTagSchema,
  attributeSchema,
  damageTypeSchema,
  enemyRankSchema,
  localizedLabelSchema,
  resistanceAttributeSchema,
  sourceDocumentSchema,
  sourceRefSchema,
} from "./common"
import { typedModifierSchema } from "./modifier"

const numberTableSchema = z.record(z.string(), z.number().finite())
const formalModifierSchema = typedModifierSchema.superRefine((modifier, ctx) => {
  if (modifier.source !== undefined)
    return

  ctx.addIssue({
    code: "custom",
    path: ["source"],
    message: "formal data modifiers require source",
  })
})

export const agentDataSchema = z
  .object({
    id: z.string().min(1),
    label: localizedLabelSchema,
    source: sourceRefSchema,
    attribute: attributeSchema,
    agentSpecialty: agentSpecialtySchema,
    baseStatsByLevel: z.record(z.string(), z.record(z.string(), z.number().finite())).optional(),
    skillIds: z.array(z.string().min(1)),
    mindscapeCinema: z.record(z.string(), z.unknown()).optional(),
    potentialActivation: z.record(z.string(), z.unknown()).optional(),
    corePassiveModifiers: z.array(formalModifierSchema).optional(),
    sourceAliases: z.array(z.string().min(1)).optional(),
  })
  .strict()

export const skillSegmentDataSchema = z
  .object({
    id: z.string().min(1),
    levelKey: z.string().min(1),
    multiplierByLevel: numberTableSchema.optional(),
    dazeMultiplierByLevel: numberTableSchema.optional(),
    resonanceRecoveryByLevel: numberTableSchema.optional(),
    adrenalineRecoveryByLevel: numberTableSchema.optional(),
    damageType: damageTypeSchema.optional(),
    hitCount: z.number().int().positive().optional(),
    defaultTags: z.array(attackTagSchema).optional(),
    source: sourceRefSchema,
  })
  .strict()

export const skillDataSchema = z
  .object({
    id: z.string().min(1),
    agentId: z.string().min(1),
    label: localizedLabelSchema,
    source: sourceRefSchema,
    tags: z.array(attackTagSchema),
    attribute: attributeSchema.optional(),
    segments: z.array(skillSegmentDataSchema),
  })
  .strict()

export const bangbooPanelDataSchema = z
  .object({
    attack: z.number().finite().optional(),
    maxHp: z.number().finite().optional(),
    defense: z.number().finite().optional(),
    impact: z.number().finite().optional(),
    critRate: z.number().finite().optional(),
    critDamage: z.number().finite().optional(),
    anomalyMastery: z.number().finite().optional(),
  })
  .strict()

export const bangbooDataSchema = z
  .object({
    id: z.string().min(1),
    label: localizedLabelSchema,
    source: sourceRefSchema,
    baseStatsByLevel: z.record(z.string(), bangbooPanelDataSchema).optional(),
    skillIds: z.array(z.string().min(1)),
    sourceAliases: z.array(z.string().min(1)).optional(),
  })
  .strict()

export const bangbooSkillDataSchema = z
  .object({
    id: z.string().min(1),
    bangbooId: z.string().min(1),
    label: localizedLabelSchema,
    source: sourceRefSchema,
    tags: z.array(attackTagSchema),
    segments: z.array(skillSegmentDataSchema),
  })
  .strict()

export const wEngineDataSchema = z
  .object({
    id: z.string().min(1),
    label: localizedLabelSchema,
    source: sourceRefSchema,
    baseStatsByLevel: z.record(z.string(), z.record(z.string(), z.number().finite())).optional(),
    passiveModifiers: z.array(formalModifierSchema).optional(),
    sourceAliases: z.array(z.string().min(1)).optional(),
  })
  .strict()

export const driveDiscDataSchema = z
  .object({
    id: z.string().min(1),
    label: localizedLabelSchema,
    source: sourceRefSchema,
    twoPieceModifiers: z.array(formalModifierSchema).optional(),
    fourPieceModifiers: z.array(formalModifierSchema).optional(),
    sourceAliases: z.array(z.string().min(1)).optional(),
  })
  .strict()

export const resoniumDataSchema = z
  .object({
    id: z.string().min(1),
    label: localizedLabelSchema,
    sourceMode: z.literal("lostVoid"),
    category: z.string().min(1).optional(),
    source: sourceRefSchema,
    modifiers: z.array(formalModifierSchema).optional(),
    sourceAliases: z.array(z.string().min(1)).optional(),
  })
  .strict()

export const enemyDataSchema = z
  .object({
    id: z.string().min(1),
    label: localizedLabelSchema,
    source: sourceRefSchema,
    rank: enemyRankSchema,
    levelDefaults: z.record(z.string(), z.record(z.string(), z.number().finite())).optional(),
    resistance: z.partialRecord(resistanceAttributeSchema, z.number().finite()).optional(),
    anomalyBuildupResistance: z
      .partialRecord(resistanceAttributeSchema, z.number().finite())
      .optional(),
    dazeRecovery: z.record(z.string(), z.unknown()).optional(),
    specialRules: z.array(formalModifierSchema).optional(),
    sourceAliases: z.array(z.string().min(1)).optional(),
  })
  .strict()

export const deadlyAssaultAttributeSchema = z.enum([
  "physical",
  "fire",
  "ice",
  "electric",
  "ether",
  "wind",
])

export const deadlyAssaultBuffDataSchema = z
  .object({
    id: z.string().min(1),
    title: z.string(),
    description: z.string(),
    source: sourceRefSchema,
  })
  .strict()

export const deadlyAssaultMonsterDataSchema = z
  .object({
    slotId: z.string().min(1),
    monsterId: z.number().int().positive(),
    name: z.string().min(1),
    elementProfile: z.partialRecord(deadlyAssaultAttributeSchema, z.number().finite()),
    weaknessAttributes: z.array(deadlyAssaultAttributeSchema),
    stats: z
      .object({
        hp: z.number().finite(),
        attack: z.number().finite(),
        defense: z.number().finite(),
        daze: z.number().finite(),
        anomalyBuildupResistance: z.number().finite(),
      })
      .strict(),
    source: sourceRefSchema,
  })
  .strict()

export const deadlyAssaultRoomDataSchema = z
  .object({
    roomId: z.string().min(1),
    waves: z.number().int().positive(),
    monsters: z.array(deadlyAssaultMonsterDataSchema),
    source: sourceRefSchema,
  })
  .strict()

export const deadlyAssaultBossAdjustmentDataSchema = z
  .object({
    id: z.string().min(1),
    hpAdjustmentRaw: z.number().finite(),
    attackAdjustmentRaw: z.number().finite(),
    operationScorePoints: z.number().finite(),
    source: sourceRefSchema,
  })
  .strict()

export const deadlyAssaultZoneDataSchema = z
  .object({
    zoneId: z.string().min(1),
    stageNumber: z.number().int().positive(),
    name: z.string().min(1),
    monsterLevel: z.number().int().positive(),
    goalType: z.number().int(),
    rankGoals: z
      .object({
        s: z.number().finite(),
        a: z.number().finite(),
        b: z.number().finite(),
      })
      .strict(),
    layerBuffs: z.array(deadlyAssaultBuffDataSchema),
    selectableBuffs: z.array(deadlyAssaultBuffDataSchema),
    rooms: z.array(deadlyAssaultRoomDataSchema),
    source: sourceRefSchema,
  })
  .strict()

export const deadlyAssaultPeriodDataSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    sourceVersion: z.string().min(1),
    beginAt: z.string().min(1),
    endAt: z.string().min(1),
    source: sourceRefSchema,
    zones: z.array(deadlyAssaultZoneDataSchema),
    bossAdjustments: z.array(deadlyAssaultBossAdjustmentDataSchema),
    sourceAliases: z.array(z.string().min(1)).optional(),
  })
  .strict()

export const sourceAliasTableSchema = z
  .object({
    fields: z.record(z.string(), z.string()),
    enumValues: z.record(z.string(), z.string()),
    sourceTerms: z.record(z.string(), z.string()),
  })
  .strict()

export const gameDataSchema = z
  .object({
    schemaVersion: z.string().min(1),
    gameVersion: z.string().min(1),
    dataVersion: z.string().min(1),
    sourceVersion: z.string().min(1),
    generatedAt: z.string().min(1),
    sources: z.array(sourceDocumentSchema),
    agents: z.record(z.string(), agentDataSchema),
    skills: z.record(z.string(), skillDataSchema),
    bangboos: z.record(z.string(), bangbooDataSchema),
    bangbooSkills: z.record(z.string(), bangbooSkillDataSchema),
    wEngines: z.record(z.string(), wEngineDataSchema),
    driveDiscs: z.record(z.string(), driveDiscDataSchema),
    enemies: z.record(z.string(), enemyDataSchema),
    deadlyAssaultPeriods: z.record(z.string(), deadlyAssaultPeriodDataSchema),
    resonium: z.record(z.string(), resoniumDataSchema),
    modifiers: z.record(z.string(), formalModifierSchema),
    rules: z.record(z.string(), z.unknown()),
    aliases: sourceAliasTableSchema,
  })
  .strict()

export type AgentData = z.infer<typeof agentDataSchema>
export type SkillData = z.infer<typeof skillDataSchema>
export type BangbooData = z.infer<typeof bangbooDataSchema>
export type BangbooSkillData = z.infer<typeof bangbooSkillDataSchema>
export type WEngineData = z.infer<typeof wEngineDataSchema>
export type DriveDiscData = z.infer<typeof driveDiscDataSchema>
export type ResoniumData = z.infer<typeof resoniumDataSchema>
export type EnemyData = z.infer<typeof enemyDataSchema>
export type DeadlyAssaultPeriodData = z.infer<typeof deadlyAssaultPeriodDataSchema>
export type GameData = z.infer<typeof gameDataSchema>
