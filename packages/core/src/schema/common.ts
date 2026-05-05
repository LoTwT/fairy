import { z } from "zod"

export const localeSchema = z.enum(["zh", "en"])

export const localizedLabelSchema = z
  .object({
    zh: z.string().optional(),
    en: z.string().optional(),
  })
  .strict()

export const sourceRefSchema = z
  .object({
    sourceId: z.string().min(1),
    sourceAnchor: z.string().min(1).optional(),
    sourceVersion: z.string().min(1).optional(),
    dataPath: z.string().min(1).optional(),
  })
  .strict()

export const sourceDocumentSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(["excel", "mihoyoWiki", "thirdPartySite", "manualReview"]),
    url: z.string().url().optional(),
    fileName: z.string().min(1).optional(),
    gameVersion: z.string().min(1).optional(),
    sourceVersion: z.string().min(1),
    fetchedAt: z.string().min(1).optional(),
    parsedAt: z.string().min(1),
    parserVersion: z.string().min(1),
    licenseNote: z.string().optional(),
  })
  .strict()

export const agentSpecialtySchema = z.enum([
  "attack",
  "stun",
  "anomaly",
  "support",
  "defense",
  "rupture",
])

export const attributeSchema = z.enum([
  "fire",
  "electric",
  "ice",
  "physical",
  "ether",
  "frost",
  "auricInk",
])

export const resistanceAttributeSchema = z.enum([
  "fire",
  "electric",
  "ice",
  "physical",
  "ether",
])

export const damageTypeSchema = z.enum([
  "regular",
  "sheer",
  "anomaly",
  "disorder",
  "trueDamage",
  "daze",
])

export const enemyRankSchema = z.enum(["normal", "elite", "boss", "special"])

export const attackTagSchema = z.enum([
  "basic",
  "dash",
  "dodgeCounter",
  "special",
  "exSpecial",
  "ultimate",
  "chain",
  "assistAssault",
  "parrySupportTag",
  "quickAssist",
  "evadeAssist",
  "heavyHit",
  "followUp",
])

export const anomalyStatusSchema = z.enum([
  "frozen",
  "frostbite",
  "assault",
  "flinch",
  "corruption",
  "shock",
  "burn",
  "disorder",
  "polarityDisorder",
])

export const manualEventKindSchema = z.enum([
  "trueDamage",
  "corruptedShieldCleanse",
  "partBreak",
])

export const roundingModeSchema = z.enum([
  "none",
  "ceilPerSegment",
  "floorForFormula",
  "floorForDisplay",
  "roundToDisplay",
])

export const fieldProvenanceSchema = z.enum([
  "panel",
  "stats",
  "data",
  "userOverride",
])

export const fieldProvenanceEntrySchema = z
  .object({
    provenance: fieldProvenanceSchema,
    source: sourceRefSchema.optional(),
    overriddenFromData: z.unknown().optional(),
    reason: z.string().optional(),
  })
  .strict()

export const fieldProvenanceMapSchema = z.record(
  z.string().min(1),
  fieldProvenanceEntrySchema,
)

export const fieldOverrideSchema = z
  .object({
    path: z.string().min(1),
    value: z.unknown(),
    overriddenFromData: z.unknown().optional(),
    reason: z.string().optional(),
    source: sourceRefSchema.optional(),
  })
  .strict()

export const diagnosticSchema = z
  .object({
    key: z.string().min(1),
    severity: z.enum(["info", "warning", "error"]),
    path: z.string().min(1).optional(),
    messageParams: z.record(z.string(), z.unknown()).optional(),
    source: sourceRefSchema.optional(),
  })
  .strict()

export const multiplierBucketSchema = z.enum([
  "baseDamageZone",
  "damageBonusZone",
  "critZone",
  "defenseZone",
  "resistanceZone",
  "vulnerabilityZone",
  "dazeVulnerabilityZone",
  "sheerDamageBonusZone",
  "anomalyProficiencyZone",
  "damageLevelZone",
  "anomalyDamageBonusZone",
  "anomalyCritZone",
  "disorderDazeLevelZone",
  "dazeValueZone",
  "dazeResistanceZone",
  "dazeInflictZone",
  "dazeReceiveZone",
  "specialZone",
])

export type Locale = z.infer<typeof localeSchema>
export type LocalizedLabel = z.infer<typeof localizedLabelSchema>
export type SourceRef = z.infer<typeof sourceRefSchema>
export type SourceDocument = z.infer<typeof sourceDocumentSchema>
export type AgentSpecialty = z.infer<typeof agentSpecialtySchema>
export type Attribute = z.infer<typeof attributeSchema>
export type ResistanceAttribute = z.infer<typeof resistanceAttributeSchema>
export type DamageType = z.infer<typeof damageTypeSchema>
export type EnemyRank = z.infer<typeof enemyRankSchema>
export type AttackTag = z.infer<typeof attackTagSchema>
export type AnomalyStatus = z.infer<typeof anomalyStatusSchema>
export type ManualEventKind = z.infer<typeof manualEventKindSchema>
export type RoundingMode = z.infer<typeof roundingModeSchema>
export type FieldProvenance = z.infer<typeof fieldProvenanceSchema>
export type FieldProvenanceEntry = z.infer<typeof fieldProvenanceEntrySchema>
export type FieldProvenanceMap = z.infer<typeof fieldProvenanceMapSchema>
export type FieldOverride = z.infer<typeof fieldOverrideSchema>
export type Diagnostic = z.infer<typeof diagnosticSchema>
export type MultiplierBucket = z.infer<typeof multiplierBucketSchema>
