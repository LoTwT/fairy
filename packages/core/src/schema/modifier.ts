import { z } from "zod"
import {
  diagnosticSchema,
  localizedLabelSchema,
  multiplierBucketSchema,
  sourceRefSchema,
} from "./common"

export const targetSelectorSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("self") }).strict(),
  z.object({ kind: z.literal("activeActor") }).strict(),
  z.object({ kind: z.literal("agent"), agentId: z.string().min(1) }).strict(),
  z.object({ kind: z.literal("team"), includeSelf: z.boolean().optional() }).strict(),
  z.object({ kind: z.literal("enemy") }).strict(),
  z.object({ kind: z.literal("segment") }).strict(),
  z.object({ kind: z.literal("global") }).strict(),
])

type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | {
      field: string
      op: "eq" | "neq" | "in" | "notIn" | "gt" | "gte" | "lt" | "lte" | "exists"
      value?: unknown
    }

export const conditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    z.object({ all: z.array(conditionSchema).min(1) }).strict(),
    z.object({ any: z.array(conditionSchema).min(1) }).strict(),
    z.object({ not: conditionSchema }).strict(),
    z
      .object({
        field: z.string().min(1),
        op: z.enum(["eq", "neq", "in", "notIn", "gt", "gte", "lt", "lte", "exists"]),
        value: z.unknown().optional(),
      })
      .strict(),
  ]),
)

export const typedModifierSchema = z
  .object({
    id: z.string().min(1),
    label: localizedLabelSchema.optional(),
    handlerId: z.string().min(1),
    bucket: multiplierBucketSchema.optional(),
    params: z.record(z.string(), z.unknown()),
    appliesTo: targetSelectorSchema,
    when: conditionSchema.optional(),
    priority: z.number().int().optional(),
    stackingKey: z.string().min(1).optional(),
    source: sourceRefSchema.optional(),
    active: z.boolean().optional(),
  })
  .strict()

export const modifierHandlerResultSchema = z
  .object({
    contributors: z.array(z.unknown()).optional(),
    events: z.array(z.unknown()).optional(),
    warnings: z.array(diagnosticSchema).optional(),
  })
  .strict()

export type TargetSelector = z.infer<typeof targetSelectorSchema>
export type ConditionAst = z.infer<typeof conditionSchema>
export type TypedModifier = z.infer<typeof typedModifierSchema>
