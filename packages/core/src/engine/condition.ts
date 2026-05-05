import type {
  AgentSnapshot,
  AttackSegment,
  BattleSnapshot,
  ConditionAst,
  EnemySnapshot,
  TypedModifier,
} from "../schema"

export interface ConditionContext {
  snapshot: BattleSnapshot
  activeActor: AgentSnapshot
  target?: unknown
  enemy: EnemySnapshot
  segment: AttackSegment
  modifier: TypedModifier
}

const missing = Symbol("missing")

export function evaluateCondition(condition: ConditionAst, context: ConditionContext): boolean {
  if ("all" in condition)
    return condition.all.every(child => evaluateCondition(child, context))

  if ("any" in condition)
    return condition.any.some(child => evaluateCondition(child, context))

  if ("not" in condition)
    return !evaluateCondition(condition.not, context)

  const resolved = resolveConditionPath(condition.field, context)
  const exists = resolved !== missing && resolved !== null

  if (condition.op === "exists")
    return exists

  if (!exists)
    return false

  switch (condition.op) {
    case "eq":
      return deepEqual(resolved, condition.value)
    case "neq":
      return !deepEqual(resolved, condition.value)
    case "in":
      return valueIn(resolved, condition.value)
    case "notIn":
      return !valueIn(resolved, condition.value)
    case "gt":
      return compareNumber(resolved, condition.value, (left, right) => left > right)
    case "gte":
      return compareNumber(resolved, condition.value, (left, right) => left >= right)
    case "lt":
      return compareNumber(resolved, condition.value, (left, right) => left < right)
    case "lte":
      return compareNumber(resolved, condition.value, (left, right) => left <= right)
  }
}

function resolveConditionPath(path: string, context: ConditionContext): unknown | typeof missing {
  const [root, ...segments] = path.split(".")
  const roots: Record<string, unknown> = {
    snapshot: context.snapshot,
    activeActor: context.activeActor,
    target: context.target,
    enemy: context.enemy,
    segment: context.segment,
    modifier: context.modifier,
  }

  if (root === undefined || !(root in roots))
    return missing

  let current = roots[root]
  for (const segment of segments) {
    if (current === null || current === undefined)
      return missing

    if (Array.isArray(current) && isArrayIndex(segment)) {
      const index = Number(segment)
      current = current[index]
      continue
    }

    if (typeof current !== "object")
      return missing

    const record = current as Record<string, unknown>
    if (!(segment in record))
      return missing

    current = record[segment]
  }

  return current
}

function valueIn(resolved: unknown, expected: unknown): boolean {
  if (Array.isArray(resolved))
    return resolved.some(item => deepEqual(item, expected))

  if (Array.isArray(expected))
    return expected.some(item => deepEqual(item, resolved))

  return false
}

function compareNumber(
  resolved: unknown,
  expected: unknown,
  comparator: (left: number, right: number) => boolean,
): boolean {
  return typeof resolved === "number"
    && typeof expected === "number"
    && comparator(resolved, expected)
}

function deepEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function isArrayIndex(value: string): boolean {
  return /^\d+$/.test(value)
}
