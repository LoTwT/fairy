import { z } from "zod"
import {
  agentSpecialtySchema,
  anomalyStatusSchema,
  attackTagSchema,
  attributeSchema,
  damageTypeSchema,
  enemyRankSchema,
  fieldOverrideSchema,
  fieldProvenanceMapSchema,
  localeSchema,
  manualEventKindSchema,
  resistanceAttributeSchema,
  sourceRefSchema,
} from "./common"
import { typedModifierSchema } from "./modifier"

export const battleContextSchema = z
  .object({
    gameMode: z
      .enum(["generic", "lostVoid", "defenseGameMode", "hollowZeroAssault"])
      .optional(),
    stageId: z.string().min(1).optional(),
    nodeId: z.string().min(1).optional(),
    phaseId: z.string().min(1).optional(),
    activeRuleIds: z.array(z.string().min(1)).optional(),
    resoniumIds: z.array(z.string().min(1)).optional(),
  })
  .strict()

export const agentPanelSnapshotSchema = z
  .object({
    attack: z.number().finite(),
    maxHp: z.number().finite(),
    defense: z.number().finite().optional(),
    impact: z.number().finite().optional(),
    critRate: z.number().finite().optional(),
    critDamage: z.number().finite().optional(),
    penetrationRate: z.number().finite().optional(),
    flatPenetration: z.number().finite().optional(),
    anomalyMastery: z.number().finite().optional(),
    anomalyProficiency: z.number().finite().optional(),
    sheerForce: z.number().finite().optional(),
    fireDamageBonus: z.number().finite().optional(),
    iceDamageBonus: z.number().finite().optional(),
    electricDamageBonus: z.number().finite().optional(),
    etherDamageBonus: z.number().finite().optional(),
    physicalDamageBonus: z.number().finite().optional(),
    sheerDamageBonus: z.number().finite().optional(),
    energyRegen: z.number().finite().optional(),
    energyGenerationRate: z.number().finite().optional(),
    maxEnergy: z.number().finite().optional(),
    adrenaline: z.number().finite().optional(),
    automaticAdrenalineAccumulation: z.number().finite().optional(),
    adrenalineGenerationRate: z.number().finite().optional(),
    maxAdrenaline: z.number().finite().optional(),
  })
  .strict()

export const wEngineSnapshotSchema = z
  .object({
    id: z.string().min(1),
    level: z.number().int().positive().optional(),
    phase: z.number().int().positive().optional(),
  })
  .strict()

export const driveDiscSnapshotSchema = z
  .object({
    id: z.string().min(1),
    slot: z.number().int().min(1).max(6).optional(),
    setId: z.string().min(1).optional(),
  })
  .strict()

export const agentSnapshotSchema = z
  .object({
    agentId: z.string().min(1),
    level: z.number().int().positive(),
    agentSpecialty: agentSpecialtySchema,
    attribute: attributeSchema,
    skillLevels: z.record(z.string(), z.number().int().nonnegative()).optional(),
    mindscapeCinema: z
      .object({ level: z.number().int().min(0).max(6) })
      .strict()
      .optional(),
    potentialActivations: z.array(z.record(z.string(), z.unknown())).optional(),
    wEngine: wEngineSnapshotSchema.optional(),
    driveDiscs: z.array(driveDiscSnapshotSchema).optional(),
    panel: agentPanelSnapshotSchema,
    fieldProvenance: fieldProvenanceMapSchema.optional(),
    overrides: z.array(fieldOverrideSchema).optional(),
    subordinate: z
      .object({
        kind: z.literal("bangboo").optional(),
        id: z.string().min(1).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()

export const anomalyContributionActorInputSchema = z
  .object({
    actorId: z.string().min(1),
    level: z.number().int().positive().optional(),
    anomalyMastery: z.number().finite().optional(),
    anomalyProficiency: z.number().finite().optional(),
    buildup: z.number().finite(),
    included: z.boolean(),
    excludedReason: z
      .enum(["bangboo", "overflowOnly", "notInSnapshot", "manualExclude"])
      .optional(),
    source: sourceRefSchema.optional(),
  })
  .strict()

export const anomalyContributionInputSchema = z
  .object({
    status: anomalyStatusSchema,
    triggerCountBefore: z.number().int().nonnegative().optional(),
    buildup: z.number().finite().optional(),
    thresholdOverride: z.number().finite().optional(),
    overflowBuildup: z.number().finite().optional(),
    remainingDurationSeconds: z.number().finite().nonnegative().optional(),
    contributors: z.array(anomalyContributionActorInputSchema).optional(),
  })
  .strict()

export const attackSegmentSchema = z
  .object({
    id: z.string().min(1),
    actorId: z.string().min(1).optional(),
    skillId: z.string().min(1).optional(),
    levelKey: z.string().min(1).optional(),
    multiplier: z.number().finite().optional(),
    baseDazeMultiplier: z.number().finite().optional(),
    attribute: attributeSchema,
    tags: z.array(attackTagSchema),
    damageType: damageTypeSchema,
    hitCount: z.number().int().positive().optional(),
    distanceDecay: z.number().finite().optional(),
    expectedCrit: z.boolean().optional(),
    anomalyContribution: anomalyContributionInputSchema.optional(),
    source: sourceRefSchema.optional(),
  })
  .strict()
  .superRefine((segment, ctx) => {
    if (
      (segment.damageType === "anomaly" || segment.damageType === "disorder")
      && segment.anomalyContribution?.status === undefined
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["anomalyContribution", "status"],
        message: "anomalyContribution.status is required for anomaly and disorder segments",
      })
    }
  })

export const enemySnapshotSchema = z
  .object({
    enemyId: z.string().min(1).optional(),
    level: z.number().int().positive(),
    rank: enemyRankSchema,
    maxHp: z.number().finite().optional(),
    defense: z.number().finite().optional(),
    baseDaze: z.number().finite().optional(),
    dazeCap: z.number().finite().optional(),
    resistance: z.partialRecord(resistanceAttributeSchema, z.number().finite()).optional(),
    dazeResistance: z.number().finite().optional(),
    anomalyBuildupResistance: z
      .partialRecord(resistanceAttributeSchema, z.number().finite())
      .optional(),
    anomalyTriggerCounts: z
      .partialRecord(anomalyStatusSchema, z.number().int().nonnegative())
      .optional(),
    states: z.array(z.string().min(1)).optional(),
    corruptedShield: z
      .object({
        active: z.boolean(),
        defenseMultiplier: z.number().finite().optional(),
      })
      .strict()
      .optional(),
    fieldProvenance: fieldProvenanceMapSchema.optional(),
    overrides: z.array(fieldOverrideSchema).optional(),
  })
  .strict()

const baseManualEventSchema = z.object({
  id: z.string().min(1),
  ruleId: z.string().min(1).optional(),
  source: sourceRefSchema.optional(),
  fieldProvenance: fieldProvenanceMapSchema.optional(),
  overrides: z.array(fieldOverrideSchema).optional(),
})

export const manualEventSchema = z.discriminatedUnion("kind", [
  baseManualEventSchema
    .extend({
      kind: z.literal("trueDamage"),
      basePath: z.enum(["enemy.maxHp", "custom"]),
      multiplier: z.number().finite().optional(),
      flatValue: z.number().finite().optional(),
      trueDamageRule: z.string().min(1).optional(),
    })
    .strict(),
  baseManualEventSchema
    .extend({
      kind: z.literal("corruptedShieldCleanse"),
      basePath: z.literal("enemy.maxHp"),
      multiplier: z.number().finite().optional(),
      trueDamageRule: z.union([
        z.enum([
          "default15Percent",
          "pre22CorruptionPriest3Percent",
          "post22ShieldBoss25Permille",
        ]),
        z.string().min(1),
      ]),
    })
    .strict(),
  baseManualEventSchema
    .extend({
      kind: z.literal("partBreak"),
      partId: z.string().min(1),
      partType: z.string().min(1).optional(),
      basePath: z.enum(["enemy.maxHp", "part.maxHp", "custom"]),
      multiplier: z.number().finite().optional(),
      flatValue: z.number().finite().optional(),
      trueDamageRule: z.string().min(1).optional(),
    })
    .strict(),
])

export const calculationOptionsSchema = z
  .object({
    resultMode: z.enum(["expected", "crit", "nonCrit"]).optional(),
    includeTrace: z.boolean().optional(),
    strictDataSource: z.boolean().optional(),
    lang: localeSchema.optional(),
  })
  .strict()

export const battleSnapshotSchema = z
  .object({
    schemaVersion: z.string().min(1),
    gameVersion: z.string().min(1),
    ruleSetVersion: z.string().min(1),
    dataVersion: z.string().min(1),
    sourceVersion: z.string().min(1),
    originalGameVersion: z.string().min(1).optional(),
    originalRuleSetVersion: z.string().min(1).optional(),
    originalDataVersion: z.string().min(1).optional(),
    originalSourceVersion: z.string().min(1).optional(),
    locale: localeSchema.optional(),
    context: battleContextSchema.optional(),
    team: z.union([
      z.tuple([agentSnapshotSchema]),
      z.tuple([agentSnapshotSchema, agentSnapshotSchema]),
      z.tuple([agentSnapshotSchema, agentSnapshotSchema, agentSnapshotSchema]),
    ]),
    activeActor: z.object({ agentId: z.string().min(1) }).strict(),
    attackSegments: z.array(attackSegmentSchema).min(1),
    enemy: enemySnapshotSchema,
    modifiers: z.array(typedModifierSchema).optional(),
    manualEvents: z.array(manualEventSchema).optional(),
    options: calculationOptionsSchema.optional(),
    fieldProvenance: fieldProvenanceMapSchema.optional(),
    overrides: z.array(fieldOverrideSchema).optional(),
  })
  .strict()
  .superRefine((snapshot, ctx) => {
    const teamAgentIds = new Set(snapshot.team.map(agent => agent.agentId))

    if (!teamAgentIds.has(snapshot.activeActor.agentId)) {
      ctx.addIssue({
        code: "custom",
        path: ["activeActor", "agentId"],
        message: "activeActor.agentId must reference a team agent",
      })
    }

    snapshot.attackSegments.forEach((segment, index) => {
      if (segment.actorId !== undefined && !teamAgentIds.has(segment.actorId)) {
        ctx.addIssue({
          code: "custom",
          path: ["attackSegments", index, "actorId"],
          message: "attackSegments[].actorId must reference a team agent when provided",
        })
      }
    })
  })

export type BattleContext = z.infer<typeof battleContextSchema>
export type AgentPanelSnapshot = z.infer<typeof agentPanelSnapshotSchema>
export type AgentSnapshot = z.infer<typeof agentSnapshotSchema>
export type AnomalyContributionInput = z.infer<typeof anomalyContributionInputSchema>
export type AttackSegment = z.infer<typeof attackSegmentSchema>
export type EnemySnapshot = z.infer<typeof enemySnapshotSchema>
export type ManualEvent = z.infer<typeof manualEventSchema>
export type BattleSnapshot = z.infer<typeof battleSnapshotSchema>
