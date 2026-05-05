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
    corePassiveModifiers: z.array(typedModifierSchema).optional(),
    sourceAliases: z.array(z.string().min(1)).optional(),
  })
  .strict()

export const skillSegmentDataSchema = z
  .object({
    id: z.string().min(1),
    levelKey: z.string().min(1),
    multiplierByLevel: numberTableSchema.optional(),
    dazeMultiplierByLevel: numberTableSchema.optional(),
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

export const wEngineDataSchema = z
  .object({
    id: z.string().min(1),
    label: localizedLabelSchema,
    source: sourceRefSchema,
    baseStatsByLevel: z.record(z.string(), z.record(z.string(), z.number().finite())).optional(),
    passiveModifiers: z.array(typedModifierSchema).optional(),
    sourceAliases: z.array(z.string().min(1)).optional(),
  })
  .strict()

export const driveDiscDataSchema = z
  .object({
    id: z.string().min(1),
    label: localizedLabelSchema,
    source: sourceRefSchema,
    twoPieceModifiers: z.array(typedModifierSchema).optional(),
    fourPieceModifiers: z.array(typedModifierSchema).optional(),
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
    modifiers: z.array(typedModifierSchema).optional(),
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
    specialRules: z.array(typedModifierSchema).optional(),
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
    wEngines: z.record(z.string(), wEngineDataSchema),
    driveDiscs: z.record(z.string(), driveDiscDataSchema),
    enemies: z.record(z.string(), enemyDataSchema),
    resonium: z.record(z.string(), resoniumDataSchema),
    modifiers: z.record(z.string(), typedModifierSchema),
    rules: z.record(z.string(), z.unknown()),
    aliases: sourceAliasTableSchema,
  })
  .strict()

export type AgentData = z.infer<typeof agentDataSchema>
export type SkillData = z.infer<typeof skillDataSchema>
export type WEngineData = z.infer<typeof wEngineDataSchema>
export type DriveDiscData = z.infer<typeof driveDiscDataSchema>
export type ResoniumData = z.infer<typeof resoniumDataSchema>
export type EnemyData = z.infer<typeof enemyDataSchema>
export type GameData = z.infer<typeof gameDataSchema>
