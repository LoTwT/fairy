import { z } from "zod"
import {
  localizedLabelSchema,
  roundingModeSchema,
  sourceRefSchema,
} from "./common"

export const traceKindSchema = z.enum([
  "sourceResolution",
  "aliasMigration",
  "provenance",
  "modifierActivation",
  "bucketContribution",
  "formula",
  "rounding",
  "version",
  "warning",
  "error",
])

export const roundingTraceSchema = z
  .object({
    mode: roundingModeSchema,
    input: z.number().finite(),
    output: z.number().finite(),
    reason: z.string().min(1),
  })
  .strict()

export const traceEventSchema = z
  .object({
    id: z.string().min(1),
    kind: traceKindSchema,
    path: z.string().min(1),
    label: localizedLabelSchema.optional(),
    inputs: z.record(z.string(), z.unknown()).optional(),
    formula: z.string().min(1).optional(),
    rawValue: z.unknown().optional(),
    displayValue: z.unknown().optional(),
    rounding: roundingTraceSchema.optional(),
    source: sourceRefSchema.optional(),
    sourceAlias: z.string().min(1).optional(),
    sourceAnchor: z.string().min(1).optional(),
    active: z.boolean().optional(),
    inactiveReason: z.string().min(1).optional(),
    refs: z.array(z.string().min(1)).optional(),
  })
  .strict()

export type TraceKind = z.infer<typeof traceKindSchema>
export type RoundingTrace = z.infer<typeof roundingTraceSchema>
export type TraceEvent = z.infer<typeof traceEventSchema>
