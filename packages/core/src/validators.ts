import type { z } from "zod"
import { battleSnapshotSchema } from "./schema/battle-snapshot"
import { calcResultSchema } from "./schema/calc-result"
import { gameDataSchema } from "./schema/game-data"

export function parseWithSchema<TSchema extends z.ZodType>(
  schema: TSchema,
  input: unknown,
): z.infer<TSchema> {
  return schema.parse(input)
}

export function safeParseWithSchema<TSchema extends z.ZodType>(
  schema: TSchema,
  input: unknown,
) {
  return schema.safeParse(input)
}

export function parseBattleSnapshot(input: unknown) {
  return parseWithSchema(battleSnapshotSchema, input)
}

export function parseGameData(input: unknown) {
  return parseWithSchema(gameDataSchema, input)
}

export function parseCalcResult(input: unknown) {
  return parseWithSchema(calcResultSchema, input)
}
