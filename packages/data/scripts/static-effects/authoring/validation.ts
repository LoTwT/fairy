import {
  DAMAGE_ELEMENTS,
  SKILL_CATEGORIES,
  STAT_UNIT_MAP,
  type FactorChannelUnitMap,
} from "@randomplay/shared"
import {
  AUTHORING_COVERAGE_POSITION_KINDS,
  AUTHORING_COVERAGE_STATUSES,
  AUTHORING_FACTOR_CHANNELS,
  AUTHORING_MECHANISM_KINDS,
  AUTHORING_SUPPLEMENTAL_KINDS,
  AUTHORING_SUPPLEMENTAL_STATUSES,
  type AuthoringFactorChannel,
  type EffectAuthoringRecord,
} from "./types.ts"

export interface AuthoringValidationIssue {
  readonly path: string
  readonly message: string
}

export type AuthoringValidationResult =
  | { readonly ok: true; readonly records: readonly EffectAuthoringRecord[] }
  | { readonly ok: false; readonly issues: readonly AuthoringValidationIssue[] }

/**
 * 正式 effectId 的实体前缀通常等于 source identity kind；驱动盘是唯一例外：
 * identity kind 为 `drive-disc`，正式 ID 前缀沿用 `disc`（与 stableIds 一致）。
 */
const EFFECT_ID_PREFIX_OVERRIDES: Readonly<Record<string, string>> = {
  "drive-disc": "disc",
}

const CONDITION_KINDS = [
  "constant",
  "all",
  "any",
  "compare-number",
  "one-of",
] as const

const EXPRESSION_KINDS = [
  "literal",
  "parameter",
  "stat",
  "configuration-number",
  "input",
  "convert",
  "add",
  "minimum",
  "maximum",
  "multiply",
] as const

const OPERATION_KINDS = [
  "factor-contribution",
  "stat-adjustment",
  "hit-adjustment",
  "astra-yao-m4-quick-assist-damage",
  "guaranteed-critical",
] as const

const CATALOG_MECHANISM_KINDS = [
  "complete-state",
  "holder-level",
  "independent-settlement",
  "declared-teammate-beneficiary",
  "squad-unique",
  "windswept-direct",
  "element-buff-inputs",
  "luminize-proficiency-mapping",
] as const

const OPERATORS = ["eq", "neq", "lt", "lte", "gt", "gte"] as const
const READ_MOMENTS = ["activation", "evaluation", "action-start"] as const
const ENTITY_ROLES = [
  "holder",
  "entity",
  "triggerActor",
  "entryActor",
  "supportActor",
  "beneficiary",
  "hitActor",
  "hitTarget",
] as const
const CONFIGURATION_FIELDS = [
  "mindscapeRank",
  "coreSkillLevel",
  "refinement",
  "setPieces",
  "specialSkillLevel",
  "potentialLevel",
] as const
const COVERAGE_REASONS = [
  "missing-identity",
  "missing-rank-evidence",
  "missing-parameter",
  "semantic-conflict",
  "formula-out-of-scope",
] as const
const SOURCE_KINDS = [
  "agent",
  "drive-disc",
  "w-engine",
  "bangboo",
  "monster",
  "environment",
] as const
const DAMAGE_KINDS = [
  "regular",
  "sheer",
  "sharpen",
  "anomaly",
  "disorder",
  "vortex",
  "anomaly-settlement",
  "luminize",
] as const
const TARGET_STATES = ["stunned", "not-stunned"] as const

const DIRECT_STATS = new Set([
  "criticalRate",
  "criticalDamage",
  "penetrationRatio",
  "sharpCriticalDamage",
])

const FACTOR_CHANNEL_UNITS = {
  "damage-bonus": "ratio",
  "anomaly-damage-bonus": "ratio",
  "attacker-resistance-ignore": "ratio",
  "target-resistance-reduction": "ratio",
  "stun-damage-adjustment": "multiplier",
  "sheer-damage-bonus": "ratio",
  "windswept-direct-damage-coefficient-increase": "ratio",
  "luminize-proficiency-input": "anomaly-proficiency-points",
} as const satisfies {
  readonly [C in AuthoringFactorChannel]: FactorChannelUnitMap[C]
}

const ALLOWED_UNITS = new Set<string>([
  ...Object.values(STAT_UNIT_MAP),
  "multiplier",
  "energy-points",
  "seconds",
  "meters",
  "count",
  "anomaly-proficiency-points",
])

const STAT_NAMES = new Set(Object.keys(STAT_UNIT_MAP))

type JsonObject = Record<string, unknown>

class Collector {
  readonly issues: AuthoringValidationIssue[] = []

  add(path: string, message: string): void {
    this.issues.push({ path, message })
  }
}

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function objectAt(
  value: unknown,
  path: string,
  collector: Collector,
): JsonObject | undefined {
  if (!isObject(value)) {
    collector.add(path, "expected an object")
    return undefined
  }
  return value
}

function arrayAt(
  value: unknown,
  path: string,
  collector: Collector,
): readonly unknown[] | undefined {
  if (!Array.isArray(value)) {
    collector.add(path, "expected an array")
    return undefined
  }
  return value
}

function stringAt(
  value: unknown,
  path: string,
  collector: Collector,
): string | undefined {
  if (typeof value !== "string") {
    collector.add(path, "expected a string")
    return undefined
  }
  return value
}

function nonEmptyStringAt(
  value: unknown,
  path: string,
  collector: Collector,
): string | undefined {
  const text = stringAt(value, path, collector)
  if (text !== undefined && text.length === 0)
    collector.add(path, "expected a non-empty string")
  return text
}

function numberAt(
  value: unknown,
  path: string,
  collector: Collector,
): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    collector.add(path, "expected a finite number")
    return undefined
  }
  return value
}

function integerAt(
  value: unknown,
  path: string,
  collector: Collector,
): number | undefined {
  const number = numberAt(value, path, collector)
  if (number === undefined) return undefined
  if (!Number.isInteger(number)) {
    collector.add(path, "expected an integer")
    return undefined
  }
  return number
}

function booleanAt(
  value: unknown,
  path: string,
  collector: Collector,
): boolean | undefined {
  if (typeof value !== "boolean") {
    collector.add(path, "expected a boolean")
    return undefined
  }
  return value
}

function enumAt<T extends string>(
  value: unknown,
  values: readonly T[],
  path: string,
  collector: Collector,
): T | undefined {
  if (typeof value !== "string" || !values.includes(value as T)) {
    collector.add(path, `expected one of: ${values.join(", ")}`)
    return undefined
  }
  return value as T
}

function stringArrayAt(
  value: unknown,
  path: string,
  collector: Collector,
): readonly string[] | undefined {
  const array = arrayAt(value, path, collector)
  if (array === undefined) return undefined
  return array.map((entry, index) =>
    stringAt(entry, `${path}[${index}]`, collector),
  ) as readonly string[]
}

function nonEmptyArrayAt(
  value: unknown,
  path: string,
  collector: Collector,
): readonly unknown[] | undefined {
  const array = arrayAt(value, path, collector)
  if (array === undefined) return undefined
  if (array.length === 0) collector.add(path, "expected a non-empty array")
  return array
}

function unitAt(
  value: unknown,
  path: string,
  collector: Collector,
): string | undefined {
  const unit = stringAt(value, path, collector)
  if (unit === undefined) return undefined
  if (!ALLOWED_UNITS.has(unit)) {
    collector.add(path, `unknown unit "${unit}"`)
    return undefined
  }
  return unit
}

function validateEntityReference(
  value: unknown,
  path: string,
  collector: Collector,
): void {
  const reference = objectAt(value, path, collector)
  if (!reference) return
  const role = enumAt(
    reference["role"],
    ENTITY_ROLES,
    `${path}/role`,
    collector,
  )
  if (role === "entity")
    stringAt(reference["entityId"], `${path}/entityId`, collector)
}

function validateExpression(
  value: unknown,
  path: string,
  expectedUnit: string | undefined,
  collector: Collector,
): void {
  const expression = objectAt(value, path, collector)
  if (!expression) return
  const kind = enumAt(
    expression["kind"],
    EXPRESSION_KINDS,
    `${path}/kind`,
    collector,
  )
  if (kind === undefined) return

  if (kind === "configuration-number") {
    const unit = unitAt(expression["unit"], `${path}/unit`, collector)
    if (unit !== undefined && unit !== "count")
      collector.add(`${path}/unit`, `expected "count"`)
    if (expectedUnit !== undefined && expectedUnit !== "count")
      collector.add(path, `expected unit "${expectedUnit}"`)
    enumAt(
      expression["field"],
      CONFIGURATION_FIELDS,
      `${path}/field`,
      collector,
    )
    return
  }

  if (kind === "literal") {
    const unit = unitAt(expression["unit"], `${path}/unit`, collector)
    numberAt(expression["value"], `${path}/value`, collector)
    checkExpectedUnit(unit, expectedUnit, path, collector)
    return
  }

  if (kind === "parameter" || kind === "input") {
    const unit = unitAt(expression["unit"], `${path}/unit`, collector)
    stringAt(expression["name"], `${path}/name`, collector)
    checkExpectedUnit(unit, expectedUnit, path, collector)
    return
  }

  if (kind === "stat") {
    const unit = unitAt(expression["unit"], `${path}/unit`, collector)
    const stat = stringAt(expression["stat"], `${path}/stat`, collector)
    if (stat !== undefined && !STAT_NAMES.has(stat))
      collector.add(`${path}/stat`, `unknown stat "${stat}"`)
    if (stat !== undefined && STAT_NAMES.has(stat) && unit !== undefined) {
      const statUnit = STAT_UNIT_MAP[stat as keyof typeof STAT_UNIT_MAP]
      if (unit !== statUnit)
        collector.add(
          `${path}/unit`,
          `expected "${statUnit}" for stat "${stat}"`,
        )
    }
    enumAt(
      expression["stage"],
      ["base", "initial", "current"] as const,
      `${path}/stage`,
      collector,
    )
    if (stat !== undefined && DIRECT_STATS.has(stat)) {
      const stage = expression["stage"]
      if (stage !== "current")
        collector.add(`${path}/stage`, "direct stats must read current")
    }
    enumAt(expression["at"], READ_MOMENTS, `${path}/at`, collector)
    validateEntityReference(expression["entity"], `${path}/entity`, collector)
    checkExpectedUnit(unit, expectedUnit, path, collector)
    return
  }

  if (kind === "convert") {
    const unit = unitAt(expression["unit"], `${path}/unit`, collector)
    validateExpression(
      expression["input"],
      `${path}/input`,
      undefined,
      collector,
    )
    validateExpression(
      expression["rate"],
      `${path}/rate`,
      "multiplier",
      collector,
    )
    checkExpectedUnit(unit, expectedUnit, path, collector)
    return
  }

  if (kind === "add" || kind === "minimum" || kind === "maximum") {
    const unit = unitAt(expression["unit"], `${path}/unit`, collector)
    const operands = nonEmptyArrayAt(
      expression["operands"],
      `${path}/operands`,
      collector,
    )
    for (const [index, operand] of (operands ?? []).entries())
      validateExpression(operand, `${path}/operands[${index}]`, unit, collector)
    checkExpectedUnit(unit, expectedUnit, path, collector)
    return
  }

  if (kind === "multiply") {
    const unit = unitAt(expression["unit"], `${path}/unit`, collector)
    validateExpression(expression["value"], `${path}/value`, unit, collector)
    validateExpression(
      expression["coefficient"],
      `${path}/coefficient`,
      undefined,
      collector,
    )
    if (isObject(expression["coefficient"])) {
      const coefficientUnit = expression["coefficient"]["unit"]
      if (coefficientUnit !== "ratio" && coefficientUnit !== "multiplier")
        collector.add(
          `${path}/coefficient/unit`,
          'expected "ratio" or "multiplier"',
        )
    }
    checkExpectedUnit(unit, expectedUnit, path, collector)
  }
}

function checkExpectedUnit(
  unit: string | undefined,
  expected: string | undefined,
  path: string,
  collector: Collector,
): void {
  if (unit !== undefined && expected !== undefined && unit !== expected)
    collector.add(`${path}/unit`, `expected "${expected}" but found "${unit}"`)
}

function validateCondition(
  value: unknown,
  path: string,
  phase: "configuration" | "contribution",
  collector: Collector,
): void {
  const condition = objectAt(value, path, collector)
  if (!condition) return
  const kind = enumAt(
    condition["kind"],
    CONDITION_KINDS,
    `${path}/kind`,
    collector,
  )
  if (kind === undefined) return

  if (kind === "constant") {
    booleanAt(condition["value"], `${path}/value`, collector)
    return
  }

  if (kind === "all" || kind === "any") {
    const conditions = arrayAt(
      condition["conditions"],
      `${path}/conditions`,
      collector,
    )
    for (const [index, nested] of (conditions ?? []).entries())
      validateCondition(
        nested,
        `${path}/conditions[${index}]`,
        phase,
        collector,
      )
    return
  }

  if (kind === "one-of") {
    if (phase === "configuration") {
      collector.add(path, "one-of is not valid in configuration conditions")
      return
    }
    const fact = stringAt(condition["fact"], `${path}/fact`, collector)
    const values = nonEmptyArrayAt(
      condition["values"],
      `${path}/values`,
      collector,
    )
    if (fact !== undefined && !isContributionFact(fact))
      collector.add(`${path}/fact`, `unknown contribution fact "${fact}"`)
    for (const [index, entry] of (values ?? []).entries()) {
      const entryPath = `${path}/values[${index}]`
      if (entry === null) {
        if (fact !== "hit.originEffectId")
          collector.add(entryPath, "null is only valid for hit.originEffectId")
        continue
      }
      const text = stringAt(entry, entryPath, collector)
      if (text !== undefined && fact !== undefined)
        validateFactValue(fact, text, entryPath, collector)
    }
    return
  }

  if (kind === "compare-number") {
    const unit = unitAt(condition["unit"], `${path}/unit`, collector)
    enumAt(condition["operator"], OPERATORS, `${path}/operator`, collector)
    validateExpression(condition["left"], `${path}/left`, unit, collector)
    validateExpression(condition["right"], `${path}/right`, unit, collector)
  }
}

const CONTRIBUTION_FACTS = new Set([
  "hit.actionId",
  "hit.skillCategory",
  "hit.originEffectId",
  "hit.element",
  "hit.damageKind",
  "hit.skillTag",
  "hit.targetState",
])

function isContributionFact(fact: string): boolean {
  return CONTRIBUTION_FACTS.has(fact)
}

/** entity scope 不能读取命中作用域事实；用于避免写出无效的规则集。 */
function containsHitFact(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsHitFact)
  if (!isObject(value)) return false
  if (typeof value["fact"] === "string" && value["fact"].startsWith("hit."))
    return true
  const entity = value["entity"]
  if (
    isObject(entity) &&
    (entity["role"] === "hitActor" || entity["role"] === "hitTarget")
  )
    return true
  return Object.values(value).some(containsHitFact)
}

function validateFactValue(
  fact: string,
  value: string,
  path: string,
  collector: Collector,
): void {
  if (
    fact === "hit.skillCategory" &&
    !SKILL_CATEGORIES.includes(value as never)
  )
    collector.add(path, `unknown skill category "${value}"`)
  if (fact === "hit.element" && !DAMAGE_ELEMENTS.includes(value as never))
    collector.add(path, `unknown damage element "${value}"`)
  if (fact === "hit.damageKind" && !DAMAGE_KINDS.includes(value as never))
    collector.add(path, `unknown damage kind "${value}"`)
  if (fact === "hit.targetState" && !TARGET_STATES.includes(value as never))
    collector.add(path, `unknown target state "${value}"`)
}

function validateParameter(
  value: unknown,
  path: string,
  collector: Collector,
): void {
  const parameter = objectAt(value, path, collector)
  if (!parameter) return
  const kind = enumAt(
    parameter["kind"],
    ["constant", "by-rank"] as const,
    `${path}/kind`,
    collector,
  )
  const unit = unitAt(parameter["unit"], `${path}/unit`, collector)
  if (kind === "constant") {
    numberAt(parameter["value"], `${path}/value`, collector)
    return
  }
  if (kind !== "by-rank") return
  const rank = enumAt(
    parameter["rank"],
    [
      "coreSkillLevel",
      "mindscapeRank",
      "refinement",
      "specialSkillLevel",
      "potentialLevel",
    ] as const,
    `${path}/rank`,
    collector,
  )
  const values = objectAt(parameter["values"], `${path}/values`, collector)
  if (!values) return
  const entries = Object.entries(values)
  if (entries.length === 0)
    collector.add(`${path}/values`, "expected at least one rank")
  for (const [key, entry] of entries) {
    const entryPath = `${path}/values/${key}`
    if (!isValidRankKey(rank, key))
      collector.add(
        entryPath,
        `rank key "${key}" is not valid for ${rank ?? "unknown rank"}`,
      )
    numberAt(entry, entryPath, collector)
  }
  if (unit === undefined) collector.add(`${path}/unit`, "missing unit")
}

function isValidRankKey(rank: string | undefined, key: string): boolean {
  if (!/^\d+$/u.test(key)) return false
  const value = Number(key)
  if (rank === "coreSkillLevel") return value >= 1 && value <= 7
  if (rank === "mindscapeRank") return value >= 0 && value <= 6
  if (rank === "refinement") return value >= 1 && value <= 5
  if (rank === "specialSkillLevel") return value >= 1 && value <= 16
  if (rank === "potentialLevel") return value >= 0 && value <= 6
  return false
}

function validateActivation(
  value: unknown,
  path: string,
  collector: Collector,
): void {
  const activation = objectAt(value, path, collector)
  if (!activation) return
  const kind = enumAt(
    activation["kind"],
    ["supplied"] as const,
    `${path}/kind`,
    collector,
  )
  if (kind !== "supplied") return
  if (Object.hasOwn(activation, "maximumLayers"))
    validateExpression(
      activation["maximumLayers"],
      `${path}/maximumLayers`,
      "count",
      collector,
    )
  if (Object.hasOwn(activation, "exclusiveGroup"))
    stringAt(activation["exclusiveGroup"], `${path}/exclusiveGroup`, collector)
}

function validateTargetSelector(
  value: unknown,
  path: string,
  collector: Collector,
): void {
  const target = objectAt(value, path, collector)
  if (!target) return
  enumAt(
    target["kind"],
    [
      "holder",
      "team",
      "team-except-holder",
      "holder-and-trigger-actor",
    ] as const,
    `${path}/kind`,
    collector,
  )
}

function validateOperation(
  value: unknown,
  path: string,
  collector: Collector,
): void {
  const operation = objectAt(value, path, collector)
  if (!operation) return
  const kind = enumAt(
    operation["kind"],
    OPERATION_KINDS,
    `${path}/kind`,
    collector,
  )
  if (kind === "factor-contribution") {
    const channel = enumAt(
      operation["channel"],
      AUTHORING_FACTOR_CHANNELS,
      `${path}/channel`,
      collector,
    )
    const unit =
      channel === undefined ? undefined : FACTOR_CHANNEL_UNITS[channel]
    validateExpression(operation["value"], `${path}/value`, unit, collector)
    return
  }
  if (kind === "stat-adjustment") {
    const stat = stringAt(operation["stat"], `${path}/stat`, collector)
    if (stat !== undefined && !STAT_NAMES.has(stat))
      collector.add(`${path}/stat`, `unknown stat "${stat}"`)
    const stage = stringAt(operation["stage"], `${path}/stage`, collector)
    const validStages = DIRECT_STATS.has(stat ?? "")
      ? ["direct"]
      : [
          "initial-percentage",
          "final-percentage",
          "initial-fixed",
          "final-fixed",
        ]
    if (stage !== undefined && !validStages.includes(stage))
      collector.add(
        `${path}/stage`,
        `expected one of: ${validStages.join(", ")}`,
      )
    const unit =
      stat === undefined
        ? undefined
        : stage === "direct" || stage?.endsWith("-percentage")
          ? "ratio"
          : STAT_UNIT_MAP[stat as keyof typeof STAT_UNIT_MAP]
    validateExpression(operation["value"], `${path}/value`, unit, collector)
    return
  }
  if (kind === "hit-adjustment") {
    enumAt(
      operation["field"],
      ["damageMultiplier"] as const,
      `${path}/field`,
      collector,
    )
    enumAt(
      operation["operator"],
      ["add", "scale"] as const,
      `${path}/operator`,
      collector,
    )
    if (Object.hasOwn(operation, "itemIds")) {
      const itemIds = nonEmptyArrayAt(
        operation["itemIds"],
        `${path}/itemIds`,
        collector,
      )
      for (const [index, itemId] of (itemIds ?? []).entries())
        stringAt(itemId, `${path}/itemIds[${index}]`, collector)
    }
    validateExpression(
      operation["value"],
      `${path}/value`,
      "multiplier",
      collector,
    )
    return
  }
  if (kind === "astra-yao-m4-quick-assist-damage") {
    const multiplier = objectAt(
      operation["multiplier"],
      `${path}/multiplier`,
      collector,
    )
    if (multiplier) {
      unitAt(multiplier["unit"], `${path}/multiplier/unit`, collector)
      const value = numberAt(
        multiplier["value"],
        `${path}/multiplier/value`,
        collector,
      )
      if (value !== undefined && value !== 3)
        collector.add(`${path}/multiplier/value`, "expected the literal 3")
    }
    return
  }
  if (kind === "guaranteed-critical")
    stringAt(operation["itemId"], `${path}/itemId`, collector)
}

function validateReference(
  value: unknown,
  path: string,
  collector: Collector,
): void {
  const reference = objectAt(value, path, collector)
  if (!reference) return
  stringAt(reference["sourceId"], `${path}/sourceId`, collector)
  stringAt(reference["version"], `${path}/version`, collector)
  enumAt(
    reference["locale"],
    ["zh", "en"] as const,
    `${path}/locale`,
    collector,
  )
  stringAt(reference["resourcePath"], `${path}/resourcePath`, collector)
  const pointer = stringAt(reference["pointer"], `${path}/pointer`, collector)
  if (pointer !== undefined && pointer !== "" && !pointer.startsWith("/"))
    collector.add(
      `${path}/pointer`,
      'expected "" or a JSON Pointer starting with "/"',
    )
}

function validateInputRequirement(
  value: unknown,
  path: string,
  collector: Collector,
): void {
  const input = objectAt(value, path, collector)
  if (!input) return
  stringAt(input["name"], `${path}/name`, collector)
  unitAt(input["unit"], `${path}/unit`, collector)
  stringAt(input["description"], `${path}/description`, collector)
  if (Object.hasOwn(input, "preset"))
    numberAt(input["preset"], `${path}/preset`, collector)
}

function validateConfiguration(
  value: unknown,
  path: string,
  collector: Collector,
): void {
  const configuration = objectAt(value, path, collector)
  if (!configuration) return
  const allowed = new Set([
    "minimumMindscape",
    "refinements",
    "minimumSetPieces",
    "coreSkillLevels",
    "specialSkillLevels",
    "potentialLevels",
  ])
  for (const key of Object.keys(configuration))
    if (!allowed.has(key))
      collector.add(`${path}/${key}`, "unknown configuration field")
  for (const key of ["minimumMindscape", "minimumSetPieces"] as const) {
    if (!Object.hasOwn(configuration, key)) continue
    const minimum = integerAt(configuration[key], `${path}/${key}`, collector)
    if (minimum !== undefined && (minimum < 0 || minimum > 6))
      collector.add(`${path}/${key}`, "expected 0—6")
  }
  for (const [key, range] of [
    ["refinements", [1, 5]],
    ["coreSkillLevels", [1, 7]],
    ["specialSkillLevels", [1, 16]],
    ["potentialLevels", [0, 6]],
  ] as const) {
    if (!Object.hasOwn(configuration, key)) continue
    const values = arrayAt(configuration[key], `${path}/${key}`, collector)
    if (!values) continue
    if (values.length === 0)
      collector.add(`${path}/${key}`, "expected at least one rank")
    for (const [index, entry] of values.entries()) {
      const rank = integerAt(entry, `${path}/${key}[${index}]`, collector)
      if (rank !== undefined && (rank < range[0] || rank > range[1]))
        collector.add(
          `${path}/${key}[${index}]`,
          `expected ${range[0]}—${range[1]}`,
        )
    }
  }
}

function validateApplicability(
  value: unknown,
  path: string,
  collector: Collector,
): void {
  const applicability = objectAt(value, path, collector)
  if (!applicability) return
  const allowed = new Set([
    "beneficiaryProfession",
    "excludedBeneficiaryProfession",
    "beneficiaryElements",
    "otherTeammateProfessions",
    "teamProfession",
  ])
  for (const key of Object.keys(applicability))
    if (!allowed.has(key))
      collector.add(`${path}/${key}`, "unknown applicability field")
  if (Object.hasOwn(applicability, "beneficiaryProfession"))
    stringAt(
      applicability["beneficiaryProfession"],
      `${path}/beneficiaryProfession`,
      collector,
    )
  if (Object.hasOwn(applicability, "excludedBeneficiaryProfession"))
    stringAt(
      applicability["excludedBeneficiaryProfession"],
      `${path}/excludedBeneficiaryProfession`,
      collector,
    )
  if (Object.hasOwn(applicability, "beneficiaryElements")) {
    const elements = arrayAt(
      applicability["beneficiaryElements"],
      `${path}/beneficiaryElements`,
      collector,
    )
    for (const [index, element] of (elements ?? []).entries())
      enumAt(
        element,
        DAMAGE_ELEMENTS,
        `${path}/beneficiaryElements[${index}]`,
        collector,
      )
  }
  if (Object.hasOwn(applicability, "otherTeammateProfessions"))
    stringArrayAt(
      applicability["otherTeammateProfessions"],
      `${path}/otherTeammateProfessions`,
      collector,
    )
  if (Object.hasOwn(applicability, "teamProfession")) {
    const team = objectAt(
      applicability["teamProfession"],
      `${path}/teamProfession`,
      collector,
    )
    if (team) {
      stringAt(
        team["profession"],
        `${path}/teamProfession/profession`,
        collector,
      )
      const counts = arrayAt(
        team["counts"],
        `${path}/teamProfession/counts`,
        collector,
      )
      for (const [index, count] of (counts ?? []).entries())
        integerAt(count, `${path}/teamProfession/counts[${index}]`, collector)
    }
  }
}

function validateCatalogMechanism(
  value: unknown,
  path: string,
  collector: Collector,
): void {
  const mechanism = objectAt(value, path, collector)
  if (!mechanism) return
  const kind = enumAt(
    mechanism["kind"],
    CATALOG_MECHANISM_KINDS,
    `${path}/kind`,
    collector,
  )
  if (kind === undefined) return
  const only = (keys: readonly string[]) => {
    for (const key of Object.keys(mechanism))
      if (!keys.includes(key))
        collector.add(`${path}/${key}`, "unknown catalog mechanism field")
  }
  switch (kind) {
    case "complete-state":
      only(["kind", "layerCountInputName"])
      stringAt(
        mechanism["layerCountInputName"],
        `${path}/layerCountInputName`,
        collector,
      )
      return
    case "holder-level":
      only(["kind", "holderLevelInputName"])
      stringAt(
        mechanism["holderLevelInputName"],
        `${path}/holderLevelInputName`,
        collector,
      )
      return
    case "independent-settlement": {
      only([
        "kind",
        "damageItemRequirements",
        "isolateDamageItems",
        "completeState",
      ])
      const requirements = nonEmptyArrayAt(
        mechanism["damageItemRequirements"],
        `${path}/damageItemRequirements`,
        collector,
      )
      for (const [index, requirement] of (requirements ?? []).entries())
        validateDamageItem(
          requirement,
          `${path}/damageItemRequirements[${index}]`,
          collector,
        )
      if (
        Object.hasOwn(mechanism, "isolateDamageItems") &&
        mechanism["isolateDamageItems"] !== true
      )
        collector.add(
          `${path}/isolateDamageItems`,
          "only literal true is accepted",
        )
      if (Object.hasOwn(mechanism, "completeState")) {
        const bridge = objectAt(
          mechanism["completeState"],
          `${path}/completeState`,
          collector,
        )
        if (bridge) {
          for (const key of Object.keys(bridge))
            if (key !== "layerCountInputName")
              collector.add(
                `${path}/completeState/${key}`,
                "unknown complete-state bridge field",
              )
          stringAt(
            bridge["layerCountInputName"],
            `${path}/completeState/layerCountInputName`,
            collector,
          )
        }
      }
      return
    }
    case "declared-teammate-beneficiary":
    case "squad-unique":
      only(["kind"])
      return
    case "windswept-direct": {
      only(["kind", "metadata"])
      const metadata = objectAt(
        mechanism["metadata"],
        `${path}/metadata`,
        collector,
      )
      if (!metadata) return
      for (const key of Object.keys(metadata))
        if (
          ![
            "applicabilityInputName",
            "applierTeam",
            "singleActiveSourceGroup",
          ].includes(key)
        )
          collector.add(
            `${path}/metadata/${key}`,
            "unknown windswept metadata field",
          )
      stringAt(
        metadata["applicabilityInputName"],
        `${path}/metadata/applicabilityInputName`,
        collector,
      )
      enumAt(
        metadata["applierTeam"],
        ["holder"] as const,
        `${path}/metadata/applierTeam`,
        collector,
      )
      if (Object.hasOwn(metadata, "singleActiveSourceGroup"))
        stringAt(
          metadata["singleActiveSourceGroup"],
          `${path}/metadata/singleActiveSourceGroup`,
          collector,
        )
      return
    }
    case "element-buff-inputs": {
      only(["kind", "inputs"])
      const inputs = nonEmptyArrayAt(
        mechanism["inputs"],
        `${path}/inputs`,
        collector,
      )
      for (const [index, entry] of (inputs ?? []).entries()) {
        const input = objectAt(entry, `${path}/inputs[${index}]`, collector)
        if (!input) continue
        for (const key of Object.keys(input))
          if (key !== "element" && key !== "inputName")
            collector.add(
              `${path}/inputs[${index}]/${key}`,
              "unknown element-buff field",
            )
        enumAt(
          input["element"],
          DAMAGE_ELEMENTS,
          `${path}/inputs[${index}]/element`,
          collector,
        )
        stringAt(
          input["inputName"],
          `${path}/inputs[${index}]/inputName`,
          collector,
        )
      }
      return
    }
    case "luminize-proficiency-mapping": {
      only(["kind", "mapping"])
      const mapping = objectAt(
        mechanism["mapping"],
        `${path}/mapping`,
        collector,
      )
      if (!mapping) return
      for (const key of Object.keys(mapping))
        if (!["kind", "rate", "source", "inputName"].includes(key))
          collector.add(
            `${path}/mapping/${key}`,
            "unknown parameter mapping field",
          )
      enumAt(
        mapping["kind"],
        ["luminize-proficiency"] as const,
        `${path}/mapping/kind`,
        collector,
      )
      numberAt(mapping["rate"], `${path}/mapping/rate`, collector)
      enumAt(
        mapping["source"],
        ["holder-current", "holder-initial", "input"] as const,
        `${path}/mapping/source`,
        collector,
      )
      if (Object.hasOwn(mapping, "inputName"))
        stringAt(mapping["inputName"], `${path}/mapping/inputName`, collector)
    }
  }
}

function validateOptionVariant(
  value: unknown,
  path: string,
  collector: Collector,
): void {
  const variant = objectAt(value, path, collector)
  if (!variant) return
  validateConfiguration(
    variant["configuration"],
    `${path}/configuration`,
    collector,
  )
  const references = nonEmptyArrayAt(
    variant["references"],
    `${path}/references`,
    collector,
  )
  for (const [index, reference] of (references ?? []).entries())
    validateReference(reference, `${path}/references[${index}]`, collector)
  const maximumLayers = integerAt(
    variant["maximumLayers"],
    `${path}/maximumLayers`,
    collector,
  )
  if (maximumLayers !== undefined && maximumLayers < 0)
    collector.add(`${path}/maximumLayers`, "expected a non-negative integer")
  const inputs = arrayAt(variant["inputs"], `${path}/inputs`, collector)
  for (const [index, input] of (inputs ?? []).entries())
    validateInputRequirement(input, `${path}/inputs[${index}]`, collector)
  validateApplicability(
    variant["applicability"],
    `${path}/applicability`,
    collector,
  )
  if (Object.hasOwn(variant, "catalogMechanism"))
    validateCatalogMechanism(
      variant["catalogMechanism"],
      `${path}/catalogMechanism`,
      collector,
    )
  const effectKeys = stringArrayAt(
    variant["effectKeys"],
    `${path}/effectKeys`,
    collector,
  )
  if (effectKeys && new Set(effectKeys).size !== effectKeys.length)
    collector.add(`${path}/effectKeys`, "effect keys must be unique")
  if (Object.hasOwn(variant, "target"))
    enumAt(
      variant["target"],
      ["self", "team"] as const,
      `${path}/target`,
      collector,
    )
}

function validateOption(
  value: unknown,
  path: string,
  collector: Collector,
): void {
  const option = objectAt(value, path, collector)
  if (!option) return
  stringAt(option["optionId"], `${path}/optionId`, collector)
  stringAt(option["catalogEntityId"], `${path}/catalogEntityId`, collector)
  stringAt(option["name"], `${path}/name`, collector)
  stringAt(
    option["conditionDescription"],
    `${path}/conditionDescription`,
    collector,
  )
  enumAt(
    option["target"],
    ["self", "team"] as const,
    `${path}/target`,
    collector,
  )
  if (Object.hasOwn(option, "exclusiveGroup"))
    stringAt(option["exclusiveGroup"], `${path}/exclusiveGroup`, collector)
  const variants = nonEmptyArrayAt(
    option["variants"],
    `${path}/variants`,
    collector,
  )
  for (const [index, variant] of (variants ?? []).entries())
    validateOptionVariant(variant, `${path}/variants[${index}]`, collector)
}

function validateDamageItem(
  value: unknown,
  path: string,
  collector: Collector,
): void {
  const item = objectAt(value, path, collector)
  if (!item) return
  stringAt(item["itemId"], `${path}/itemId`, collector)
  const stat = stringAt(item["stat"], `${path}/stat`, collector)
  if (stat !== undefined && !STAT_NAMES.has(stat))
    collector.add(`${path}/stat`, `unknown stat "${stat}"`)
  enumAt(
    item["role"],
    ["base", "settlement"] as const,
    `${path}/role`,
    collector,
  )
  const allowedModes = nonEmptyArrayAt(
    item["allowedModes"],
    `${path}/allowedModes`,
    collector,
  )
  for (const [index, mode] of (allowedModes ?? []).entries())
    enumAt(
      mode,
      ["direct", "standard-disorder", "standard-vortex"] as const,
      `${path}/allowedModes[${index}]`,
      collector,
    )
  if (Object.hasOwn(item, "source"))
    enumAt(
      item["source"],
      ["holder-current", "anomaly-source"] as const,
      `${path}/source`,
      collector,
    )
  if (Object.hasOwn(item, "requiredDirectMultiplier")) {
    const multiplier = numberAt(
      item["requiredDirectMultiplier"],
      `${path}/requiredDirectMultiplier`,
      collector,
    )
    if (multiplier !== undefined && multiplier !== 0)
      collector.add(`${path}/requiredDirectMultiplier`, "expected 0")
  }
  if (Object.hasOwn(item, "requiredSkillCategory"))
    enumAt(
      item["requiredSkillCategory"],
      SKILL_CATEGORIES,
      `${path}/requiredSkillCategory`,
      collector,
    )
  if (Object.hasOwn(item, "requiredCriticalRateDeclaration"))
    booleanAt(
      item["requiredCriticalRateDeclaration"],
      `${path}/requiredCriticalRateDeclaration`,
      collector,
    )
  if (Object.hasOwn(item, "originalAnomalyAttribute"))
    enumAt(
      item["originalAnomalyAttribute"],
      DAMAGE_ELEMENTS,
      `${path}/originalAnomalyAttribute`,
      collector,
    )
}

function validateSkillTarget(
  value: unknown,
  path: string,
  collector: Collector,
): void {
  const target = objectAt(value, path, collector)
  if (!target) return
  stringAt(target["targetId"], `${path}/targetId`, collector)
  if (target["upstreamId"] !== null)
    stringAt(target["upstreamId"], `${path}/upstreamId`, collector)
  if (target["agentEntityId"] !== null)
    stringAt(target["agentEntityId"], `${path}/agentEntityId`, collector)
  stringAt(target["category"], `${path}/category`, collector)
  stringAt(target["name"], `${path}/name`, collector)
  booleanAt(target["countsAsFollowUp"], `${path}/countsAsFollowUp`, collector)
}

function validateUniqueness(
  value: unknown,
  path: string,
  collector: Collector,
): void {
  const policy = objectAt(value, path, collector)
  if (!policy) return
  for (const key of Object.keys(policy))
    if (!["key", "scope", "select"].includes(key))
      collector.add(`${path}/${key}`, "unknown uniqueness field")
  stringAt(policy["key"], `${path}/key`, collector)
  enumAt(
    policy["scope"],
    ["team", "global"] as const,
    `${path}/scope`,
    collector,
  )
  const select = objectAt(policy["select"], `${path}/select`, collector)
  if (!select) return
  const kind = enumAt(
    select["kind"],
    [
      "single-source-only",
      "highest-value",
      "latest-activation",
      "priority",
    ] as const,
    `${path}/select/kind`,
    collector,
  )
  for (const key of Object.keys(select))
    if (key !== "kind" && key !== "priority")
      collector.add(`${path}/select/${key}`, "unknown uniqueness selector")
  if (kind === "priority")
    validateExpression(
      select["priority"],
      `${path}/select/priority`,
      "count",
      collector,
    )
  else if (Object.hasOwn(select, "priority"))
    collector.add(
      `${path}/select/priority`,
      "only a priority selector may declare priority",
    )
}

function validateMechanism(
  value: unknown,
  path: string,
  collector: Collector,
): void {
  const mechanism = objectAt(value, path, collector)
  if (!mechanism) return
  const kind = enumAt(
    mechanism["kind"],
    AUTHORING_MECHANISM_KINDS,
    `${path}/kind`,
    collector,
  )
  if (kind !== "independent-settlement") return
  if (Object.hasOwn(mechanism, "skillTarget"))
    validateSkillTarget(
      mechanism["skillTarget"],
      `${path}/skillTarget`,
      collector,
    )
  validateDamageItem(mechanism["damageItem"], `${path}/damageItem`, collector)
  if (Object.hasOwn(mechanism, "exclusiveDamageItem")) {
    const exclusive = booleanAt(
      mechanism["exclusiveDamageItem"],
      `${path}/exclusiveDamageItem`,
      collector,
    )
    if (exclusive === false)
      collector.add(
        `${path}/exclusiveDamageItem`,
        "only literal true is accepted",
      )
  }
}

function validateCoverage(
  value: unknown,
  path: string,
  collector: Collector,
): void {
  const coverage = objectAt(value, path, collector)
  if (!coverage) return
  const status = enumAt(
    coverage["status"],
    AUTHORING_COVERAGE_STATUSES,
    `${path}/status`,
    collector,
  )
  stringArrayAt(coverage["differenceIds"], `${path}/differenceIds`, collector)
  if (Object.hasOwn(coverage, "reason"))
    enumAt(coverage["reason"], COVERAGE_REASONS, `${path}/reason`, collector)
  if (Object.hasOwn(coverage, "explanation"))
    stringAt(coverage["explanation"], `${path}/explanation`, collector)
  const positions = arrayAt(
    coverage["positions"],
    `${path}/positions`,
    collector,
  )
  for (const [index, position] of (positions ?? []).entries()) {
    const positionPath = `${path}/positions[${index}]`
    const entry = objectAt(position, positionPath, collector)
    if (!entry) continue
    const pointer = stringAt(
      entry["pointer"],
      `${positionPath}/pointer`,
      collector,
    )
    if (pointer !== undefined && !pointer.startsWith("/"))
      collector.add(
        `${positionPath}/pointer`,
        'expected a JSON Pointer starting with "/"',
      )
    integerAt(entry["rank"], `${positionPath}/rank`, collector)
    enumAt(
      entry["rankKind"],
      AUTHORING_COVERAGE_POSITION_KINDS,
      `${positionPath}/rankKind`,
      collector,
    )
    stringAt(entry["stat"], `${positionPath}/stat`, collector)
    stringArrayAt(
      entry["normalizationChanges"],
      `${positionPath}/normalizationChanges`,
      collector,
    )
    numberAt(entry["rawValue"], `${positionPath}/rawValue`, collector)
    numberAt(
      entry["normalizedValue"],
      `${positionPath}/normalizedValue`,
      collector,
    )
  }
  if (status === "unsupported") {
    if (!Object.hasOwn(coverage, "reason"))
      collector.add(`${path}/reason`, "required for unsupported coverage")
    if (!Object.hasOwn(coverage, "explanation"))
      collector.add(`${path}/explanation`, "required for unsupported coverage")
  } else if (
    status !== undefined &&
    (Object.hasOwn(coverage, "reason") ||
      Object.hasOwn(coverage, "explanation"))
  ) {
    collector.add(
      path,
      "reason/explanation are only valid for unsupported coverage",
    )
  }
}

function validateSupplementalRecord(
  value: unknown,
  path: string,
  owningOptionId: string | undefined,
  collector: Collector,
): void {
  const record = objectAt(value, path, collector)
  if (!record) return
  nonEmptyStringAt(record["supplementId"], `${path}/supplementId`, collector)
  nonEmptyStringAt(record["source"], `${path}/source`, collector)
  enumAt(
    record["kind"],
    AUTHORING_SUPPLEMENTAL_KINDS,
    `${path}/kind`,
    collector,
  )
  const optionId = nonEmptyStringAt(
    record["optionId"],
    `${path}/optionId`,
    collector,
  )
  if (
    optionId !== undefined &&
    owningOptionId !== undefined &&
    optionId !== owningOptionId
  )
    collector.add(
      `${path}/optionId`,
      "must equal the owning record's ids.optionId",
    )
  if (Object.hasOwn(record, "effectIds")) {
    const effectIds = arrayAt(
      record["effectIds"],
      `${path}/effectIds`,
      collector,
    )
    for (const [index, effectId] of (effectIds ?? []).entries())
      nonEmptyStringAt(effectId, `${path}/effectIds[${index}]`, collector)
  }
  nonEmptyStringAt(
    record["supportedRanks"],
    `${path}/supportedRanks`,
    collector,
  )
  nonEmptyStringAt(
    record["computationTarget"],
    `${path}/computationTarget`,
    collector,
  )
  enumAt(
    record["status"],
    AUTHORING_SUPPLEMENTAL_STATUSES,
    `${path}/status`,
    collector,
  )
}

function validateRecord(
  value: unknown,
  path: string,
  collector: Collector,
): void {
  const record = objectAt(value, path, collector)
  if (!record) return
  const key = stringAt(record["key"], `${path}/key`, collector)
  if (key !== undefined && key.length === 0)
    collector.add(`${path}/key`, "expected a non-empty key")

  const entity = objectAt(record["entity"], `${path}/entity`, collector)
  if (!entity) collector.add(`${path}/entity`, "required")
  if (entity) {
    enumAt(
      entity["sourceId"],
      ["zzz-hp", "nanoka-integrated"] as const,
      `${path}/entity/sourceId`,
      collector,
    )
    stringAt(
      entity["catalogEntityId"],
      `${path}/entity/catalogEntityId`,
      collector,
    )
    const identity = objectAt(
      entity["identity"],
      `${path}/entity/identity`,
      collector,
    )
    if (identity) {
      enumAt(
        identity["kind"],
        SOURCE_KINDS,
        `${path}/entity/identity/kind`,
        collector,
      )
      stringAt(
        identity["entityId"],
        `${path}/entity/identity/entityId`,
        collector,
      )
    }
  }

  const ids = objectAt(record["ids"], `${path}/ids`, collector)
  if (!ids) collector.add(`${path}/ids`, "required")
  if (ids) {
    stringAt(ids["optionId"], `${path}/ids/optionId`, collector)
    const effectId = stringAt(
      ids["effectId"],
      `${path}/ids/effectId`,
      collector,
    )
    const identityKindValue =
      entity && isObject(entity["identity"])
        ? entity["identity"]["kind"]
        : undefined
    const identityKind =
      typeof identityKindValue === "string" ? identityKindValue : undefined
    const expectedEffectIdPrefix =
      identityKind === undefined
        ? undefined
        : (EFFECT_ID_PREFIX_OVERRIDES[identityKind] ?? identityKind)
    if (
      effectId !== undefined &&
      expectedEffectIdPrefix !== undefined &&
      !effectId.startsWith(`${expectedEffectIdPrefix}:`)
    )
      collector.add(
        `${path}/ids/effectId`,
        `expected an effect ID starting with "${expectedEffectIdPrefix}:"`,
      )
  }

  if (Object.hasOwn(record, "supplementalRecords")) {
    const supplements = arrayAt(
      record["supplementalRecords"],
      `${path}/supplementalRecords`,
      collector,
    )
    const owningOptionId =
      ids && typeof ids["optionId"] === "string" ? ids["optionId"] : undefined
    for (const [index, supplement] of (supplements ?? []).entries())
      validateSupplementalRecord(
        supplement,
        `${path}/supplementalRecords[${index}]`,
        owningOptionId,
        collector,
      )
  }

  const option = objectAt(record["option"], `${path}/option`, collector)
  if (!option) collector.add(`${path}/option`, "required")
  if (option) {
    validateOption(option, `${path}/option`, collector)
    if (ids) {
      const optionId = ids["optionId"]
      if (
        typeof optionId === "string" &&
        typeof option["optionId"] === "string" &&
        optionId !== option["optionId"]
      )
        collector.add(`${path}/option/optionId`, "must equal ids.optionId")
    }
    if (entity) {
      const catalogEntityId = entity["catalogEntityId"]
      if (
        typeof catalogEntityId === "string" &&
        typeof option["catalogEntityId"] === "string" &&
        catalogEntityId !== option["catalogEntityId"]
      )
        collector.add(
          `${path}/option/catalogEntityId`,
          "must equal entity.catalogEntityId",
        )
    }
  }

  const coverage = objectAt(record["coverage"], `${path}/coverage`, collector)
  if (!coverage) collector.add(`${path}/coverage`, "required")
  if (coverage) validateCoverage(coverage, `${path}/coverage`, collector)

  const mechanism = objectAt(
    record["mechanism"],
    `${path}/mechanism`,
    collector,
  )
  if (!mechanism) collector.add(`${path}/mechanism`, "required")
  if (mechanism) validateMechanism(mechanism, `${path}/mechanism`, collector)

  const mechanismKind =
    mechanism && typeof mechanism["kind"] === "string"
      ? mechanism["kind"]
      : undefined
  const coverageStatus =
    coverage && typeof coverage["status"] === "string"
      ? coverage["status"]
      : undefined

  if (mechanismKind === "unsupported") {
    if (coverageStatus !== undefined && coverageStatus !== "unsupported")
      collector.add(
        `${path}/coverage/status`,
        "unsupported mechanism requires unsupported coverage",
      )
    for (const field of [
      "section",
      "references",
      "config",
      "activation",
      "beneficiary",
      "scope",
      "when",
      "operation",
      "parameters",
      "uniqueness",
    ]) {
      if (Object.hasOwn(record, field))
        collector.add(`${path}/${field}`, "not valid for an unsupported record")
    }
    return
  }

  if (mechanismKind !== undefined && coverageStatus === "unsupported")
    collector.add(
      `${path}/coverage/status`,
      "unsupported coverage requires the unsupported mechanism",
    )

  stringAt(record["section"], `${path}/section`, collector)
  const references = nonEmptyArrayAt(
    record["references"],
    `${path}/references`,
    collector,
  )
  for (const [index, reference] of (references ?? []).entries())
    validateReference(reference, `${path}/references[${index}]`, collector)
  if (Object.hasOwn(record, "config"))
    validateCondition(
      record["config"],
      `${path}/config`,
      "configuration",
      collector,
    )
  else collector.add(`${path}/config`, "required for a rule record")
  if (Object.hasOwn(record, "activation"))
    validateActivation(record["activation"], `${path}/activation`, collector)
  else collector.add(`${path}/activation`, "required for a rule record")
  if (Object.hasOwn(record, "beneficiary"))
    validateTargetSelector(
      record["beneficiary"],
      `${path}/beneficiary`,
      collector,
    )
  else collector.add(`${path}/beneficiary`, "required for a rule record")
  if (Object.hasOwn(record, "scope"))
    enumAt(
      record["scope"],
      ["entity", "hit"] as const,
      `${path}/scope`,
      collector,
    )
  else collector.add(`${path}/scope`, "required for a rule record")
  if (Object.hasOwn(record, "when"))
    validateCondition(record["when"], `${path}/when`, "contribution", collector)
  else collector.add(`${path}/when`, "required for a rule record")
  if (Object.hasOwn(record, "operation"))
    validateOperation(record["operation"], `${path}/operation`, collector)
  else collector.add(`${path}/operation`, "required for a rule record")
  const scope = record["scope"]
  const operation = record["operation"]
  if (
    scope === "entity" &&
    isObject(operation) &&
    operation["kind"] === "hit-adjustment"
  )
    collector.add(`${path}/operation/kind`, "hit-adjustment requires hit scope")
  if (
    scope === "entity" &&
    Object.hasOwn(record, "when") &&
    containsHitFact(record["when"])
  )
    collector.add(`${path}/when`, "entity scope cannot read hit facts")
  if (Object.hasOwn(record, "parameters")) {
    const parameters = objectAt(
      record["parameters"],
      `${path}/parameters`,
      collector,
    )
    for (const [name, parameter] of Object.entries(parameters ?? {}))
      validateParameter(parameter, `${path}/parameters/${name}`, collector)
  } else collector.add(`${path}/parameters`, "required for a rule record")
  if (Object.hasOwn(record, "uniqueness"))
    validateUniqueness(record["uniqueness"], `${path}/uniqueness`, collector)
}

/**
 * 运行时校验作者记录。与 TypeScript 类型共同拒绝未知 operation、
 * condition 与 mechanism；返回带字段路径的问题，不抛裸异常。
 */
export function validateAuthoringRecords(
  value: unknown,
): AuthoringValidationResult {
  const collector = new Collector()
  if (!Array.isArray(value)) {
    collector.add("", "expected an array of authoring records")
    return { ok: false, issues: collector.issues }
  }
  const keys = new Set<string>()
  const supplementIds = new Set<string>()
  for (const [index, record] of value.entries()) {
    validateRecord(record, `[${index}]`, collector)
    if (isObject(record) && typeof record["key"] === "string") {
      if (keys.has(record["key"]))
        collector.add(
          `[${index}]/key`,
          `duplicate authoring key "${record["key"]}"`,
        )
      keys.add(record["key"])
    }
    if (isObject(record) && Array.isArray(record["supplementalRecords"])) {
      for (const [supplementIndex, supplement] of record[
        "supplementalRecords"
      ].entries()) {
        if (
          !isObject(supplement) ||
          typeof supplement["supplementId"] !== "string"
        )
          continue
        const supplementId = supplement["supplementId"]
        if (supplementIds.has(supplementId))
          collector.add(
            `[${index}]/supplementalRecords[${supplementIndex}]/supplementId`,
            `duplicate supplement ID "${supplementId}"`,
          )
        supplementIds.add(supplementId)
      }
    }
  }
  if (collector.issues.length > 0)
    return { ok: false, issues: collector.issues }
  return { ok: true, records: value as readonly EffectAuthoringRecord[] }
}
