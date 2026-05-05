import { z } from "zod"
import {
  attackTagSchema,
  attributeSchema,
  damageTypeSchema,
  diagnosticSchema,
  localeSchema,
  localizedLabelSchema,
  manualEventKindSchema,
  multiplierBucketSchema,
  roundingModeSchema,
  sourceRefSchema,
} from "./common"
import { targetSelectorSchema } from "./modifier"
import { traceEventSchema } from "./trace"

export const calcSummarySchema = z
  .object({
    activeActorId: z.string().min(1),
    enemyId: z.string().min(1).optional(),
    damageType: damageTypeSchema,
    rawTotalDamage: z.number().finite(),
    displayTotalDamage: z.number().finite(),
    expectedDamage: z.number().finite().optional(),
    critDamage: z.number().finite().optional(),
    nonCritDamage: z.number().finite().optional(),
    dazeValue: z.number().finite().optional(),
    anomalyBuildup: z.number().finite().optional(),
    disorderDamage: z.number().finite().optional(),
    trueDamage: z.number().finite().optional(),
  })
  .strict()

export const segmentResultSchema = z
  .object({
    id: z.string().min(1),
    actorId: z.string().min(1),
    attribute: attributeSchema,
    tags: z.array(attackTagSchema),
    damageType: damageTypeSchema,
    rawDamage: z.number().finite(),
    segmentDisplayDamage: z.number().finite(),
    roundingMode: roundingModeSchema,
    baseDamage: z.number().finite().optional(),
    baseDaze: z.number().finite().optional(),
    expectedDamage: z.number().finite().optional(),
    critDamage: z.number().finite().optional(),
    nonCritDamage: z.number().finite().optional(),
    dazeValue: z.number().finite().optional(),
    anomalyBuildup: z.number().finite().optional(),
    traceRefs: z.array(z.string().min(1)),
  })
  .strict()

export const bucketContributorSchema = z
  .object({
    id: z.string().min(1),
    source: sourceRefSchema.optional(),
    sourceMissing: z.boolean().optional(),
    sourceAnchor: z.string().min(1).optional(),
    value: z.number().finite(),
    operation: z.enum(["add", "multiply", "replace", "min", "max", "ignore"]),
    active: z.boolean(),
    inactiveReason: z.string().min(1).optional(),
    modifierId: z.string().min(1).optional(),
    diagnosticRefs: z.array(z.string().min(1)).optional(),
  })
  .strict()
  .superRefine((contributor, ctx) => {
    if (contributor.source !== undefined)
      return

    if (contributor.sourceMissing !== true) {
      ctx.addIssue({
        code: "custom",
        path: ["sourceMissing"],
        message: "sourceMissing must be true when source is omitted",
      })
    }

    if (contributor.diagnosticRefs === undefined || contributor.diagnosticRefs.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["diagnosticRefs"],
        message: "diagnosticRefs must reference a warning when source is omitted",
      })
    }
  })

export const bucketResultSchema = z
  .object({
    bucketId: multiplierBucketSchema,
    label: localizedLabelSchema.optional(),
    before: z.number().finite(),
    after: z.number().finite(),
    effectiveMultiplier: z.number().finite(),
    contributors: z.array(bucketContributorSchema),
    traceRefs: z.array(z.string().min(1)),
  })
  .strict()

export const modifierResultSchema = z
  .object({
    id: z.string().min(1),
    handlerId: z.string().min(1),
    active: z.boolean(),
    appliesTo: targetSelectorSchema,
    bucket: multiplierBucketSchema.optional(),
    source: sourceRefSchema.optional(),
    sourceMissing: z.boolean().optional(),
    inactiveReason: z.string().min(1).optional(),
    producedContributors: z.array(z.string().min(1)).optional(),
    traceRefs: z.array(z.string().min(1)),
  })
  .strict()

export const manualEventResultSchema = z
  .object({
    id: z.string().min(1),
    kind: manualEventKindSchema,
    ruleId: z.string().min(1).optional(),
    source: sourceRefSchema.optional(),
    basePath: z.string().min(1).optional(),
    baseValue: z.number().finite().optional(),
    multiplier: z.number().finite().optional(),
    flatValue: z.number().finite().optional(),
    rawDamage: z.number().finite(),
    displayDamage: z.number().finite(),
    traceRefs: z.array(z.string().min(1)),
  })
  .strict()

export const calcResultSchema = z
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
    snapshotId: z.string().min(1).optional(),
    calculationId: z.string().min(1),
    locale: localeSchema.optional(),
    summary: calcSummarySchema,
    attackSegments: z.array(segmentResultSchema),
    buckets: z.array(bucketResultSchema),
    modifiers: z.array(modifierResultSchema),
    events: z.array(manualEventResultSchema).optional(),
    trace: z.array(traceEventSchema),
    warnings: z.array(diagnosticSchema),
    errors: z.array(diagnosticSchema),
  })
  .strict()

export type CalcSummary = z.infer<typeof calcSummarySchema>
export type SegmentResult = z.infer<typeof segmentResultSchema>
export type BucketContributor = z.infer<typeof bucketContributorSchema>
export type BucketResult = z.infer<typeof bucketResultSchema>
export type ModifierResult = z.infer<typeof modifierResultSchema>
export type ManualEventResult = z.infer<typeof manualEventResultSchema>
export type CalcResult = z.infer<typeof calcResultSchema>
