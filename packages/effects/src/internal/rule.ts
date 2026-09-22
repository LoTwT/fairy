import type {
  AnyParameter,
  ContributionRule,
  EffectRule,
  EntityId,
  InstantRule,
  Issue,
  ModificationRule,
  NonEmpty,
  RuleSet,
  RuleSource,
  SourceBinding,
  SourceIdentity,
  Stat,
  Unit,
} from "../types.ts"
import {
  expectLiteral,
  expectNonEmptyArray,
  expectNonEmptyString,
  expectObject,
  rejectUnknownFields,
  reportMissing,
  type FieldChecks,
} from "./checks.ts"
import {
  EVENT_KINDS,
  validateCondition,
  validateEntityReferenceValue,
  validateNumericExpression,
  validateParameter,
  type ExpressionContext,
} from "./expression.ts"
import type { IssueCollector } from "./issues.ts"
import {
  DIRECT_STATS,
  FACTOR_CHANNELS,
  FACTOR_CHANNEL_UNITS,
  SOURCE_CONFIGURATION_FIELDS,
  isEffectId,
  SOURCE_KINDS,
  STAT_UNIT_MAP,
  UNITS,
  isCoreSkillLevel,
  isMindscapeRank,
  isRefinementRank,
  isSetPieceCount,
} from "./vocabulary.ts"

const TARGET_SELECTOR_KINDS = [
  "holder",
  "team",
  "team-except-holder",
  "holder-and-trigger-actor",
] as const

const COOLDOWN_PARTITIONS = [
  "binding",
  "holder",
  "trigger-actor",
  "team",
  "global",
] as const

const LAYERING_KEYS = ["trigger-actor", "skill-category"] as const

/** 待目标解析后校验的修改规则；保留原始输入与已验证的参数表。 */
export interface PendingModification {
  readonly pointer: string
  readonly entry: Record<string, unknown>
  readonly effectId: string
  readonly sourceKind: SourceIdentity["kind"]
  readonly parameters: ReadonlyMap<string, Unit>
  readonly phase: "configuration" | "activation" | "contribution"
  readonly targetKind: "effect" | "state"
  readonly targetEffectId?: string | undefined
  readonly targetStateId?: string | undefined
}

export interface ValidatedRuleSet {
  readonly ruleSet: RuleSet
  readonly effectKinds: ReadonlyMap<
    string,
    "contribution" | "instant" | "modification"
  >
  readonly entriesByEffectId: ReadonlyMap<string, Record<string, unknown>>
  readonly statesById: ReadonlyMap<string, Record<string, unknown>>
  readonly knownStates: ReadonlySet<string>
  readonly knownActions: ReadonlySet<string>
  readonly pendingModifications: readonly PendingModification[]
}

function validateSourceIdentity(
  value: unknown,
  checks: FieldChecks,
): SourceIdentity | undefined {
  const object = expectObject(value, checks, "source identity")
  if (object === undefined) {
    return undefined
  }
  const kind = expectLiteral(
    object["kind"],
    [...SOURCE_KINDS],
    checks,
    "source kind",
  )
  const entityId = expectNonEmptyString(
    object["entityId"],
    { ...checks, pointer: `${checks.pointer}/entityId` },
    "source entityId",
  )
  if (kind === undefined || entityId === undefined) {
    return undefined
  }
  rejectUnknownFields(object, ["kind", "entityId"], checks, "source identity")
  return { kind, entityId }
}

function validateSourceReference(value: unknown, checks: FieldChecks): boolean {
  const object = expectObject(value, checks, "source reference")
  if (object === undefined) {
    return false
  }
  let valid = true
  for (const field of ["sourceId", "version", "resourcePath"]) {
    const text = expectNonEmptyString(
      object[field],
      { ...checks, pointer: `${checks.pointer}/${field}` },
      field,
    )
    if (text === undefined) {
      valid = false
    }
  }
  if (
    expectLiteral(object["locale"], ["zh", "en"], checks, "locale") ===
    undefined
  ) {
    valid = false
  }
  const pointer = object["pointer"]
  if (
    typeof pointer !== "string" ||
    (pointer !== "" && !pointer.startsWith("/"))
  ) {
    checks.collector.report(
      checks.structureCode,
      `${checks.pointer}/pointer`,
      'pointer must be "" or start with "/"',
    )
    valid = false
  }
  rejectUnknownFields(
    object,
    ["sourceId", "version", "locale", "resourcePath", "pointer"],
    checks,
    "source reference",
  )
  return valid
}

function validateRuleSource(
  value: unknown,
  checks: FieldChecks,
): RuleSource | undefined {
  const object = expectObject(value, checks, "source")
  if (object === undefined) {
    return undefined
  }
  const identity = validateSourceIdentity(object["identity"], {
    ...checks,
    pointer: `${checks.pointer}/identity`,
  })
  if (identity === undefined) {
    return undefined
  }
  const section = expectNonEmptyString(
    object["section"],
    { ...checks, pointer: `${checks.pointer}/section` },
    "source section",
  )
  if (section === undefined) {
    return undefined
  }
  const references = expectNonEmptyArray(
    object["references"],
    { ...checks, pointer: `${checks.pointer}/references` },
    "source references",
  )
  if (references === undefined) {
    return undefined
  }
  let referencesValid = true
  for (const [index, reference] of references.entries()) {
    if (
      !validateSourceReference(reference, {
        ...checks,
        pointer: `${checks.pointer}/references/${index}`,
      })
    ) {
      referencesValid = false
    }
  }
  if (!referencesValid) {
    return undefined
  }
  rejectUnknownFields(
    object,
    ["identity", "section", "references"],
    checks,
    "source",
  )
  return {
    identity,
    section,
    references: references as unknown as NonEmpty<never>,
  }
}

function validateTargetSelector(value: unknown, checks: FieldChecks): boolean {
  const object = expectObject(value, checks, "target selector")
  if (object === undefined) {
    return false
  }
  const kind = expectLiteral(
    object["kind"],
    TARGET_SELECTOR_KINDS,
    checks,
    "target selector kind",
  )
  if (kind === undefined) {
    return false
  }
  rejectUnknownFields(object, ["kind"], checks, "target selector")
  return true
}

export interface RuleFields {
  readonly effectId: string
  readonly source: RuleSource
  readonly parameters: ReadonlyMap<string, Unit>
  readonly rawParameters: Record<string, AnyParameter>
}

function validateRuleBase(
  object: Record<string, unknown>,
  checks: FieldChecks,
  knownStates: ReadonlySet<string>,
  knownActions: ReadonlySet<string>,
): RuleFields | undefined {
  const effectId = object["effectId"]
  if (!isEffectId(effectId)) {
    checks.collector.report(
      checks.structureCode,
      `${checks.pointer}/effectId`,
      "effectId must be a non-empty effect identity (agent:, disc:, w-engine:, bangboo:, monster:, or environment:)",
    )
    return undefined
  }
  const source = validateRuleSource(object["source"], {
    ...checks,
    pointer: `${checks.pointer}/source`,
  })
  if (source === undefined) {
    return undefined
  }
  if (object["config"] === undefined) {
    reportMissing(checks, "config")
    return undefined
  }
  const parametersPointer = `${checks.pointer}/parameters`
  const parametersObject = expectObject(
    object["parameters"],
    { ...checks, pointer: parametersPointer },
    "parameters",
  )
  if (parametersObject === undefined) {
    return undefined
  }
  const baseContext: ExpressionContext = {
    collector: checks.collector,
    structureCode: checks.structureCode,
    phase: "configuration",
    hitScope: false,
    parameters: new Map(),
    sourceKind: source.identity.kind,
    knownStates,
    knownActions,
  }
  const parameters = new Map<string, Unit>()
  const rawParameters: Record<string, AnyParameter> = {}
  let parametersValid = true
  for (const [name, rawParameter] of Object.entries(parametersObject)) {
    if (name.length === 0) {
      checks.collector.report(
        checks.structureCode,
        `${parametersPointer}/`,
        "Parameter names must be non-empty",
      )
      parametersValid = false
      continue
    }
    const parameter = validateParameter(
      rawParameter,
      { ...baseContext, pointer: `${parametersPointer}/${name}` } as never,
      `${parametersPointer}/${name}`,
    )
    if (parameter === undefined) {
      parametersValid = false
      continue
    }
    parameters.set(name, parameter.unit)
    rawParameters[name] = parameter
  }
  if (!parametersValid) {
    return undefined
  }
  return { effectId, source, parameters, rawParameters }
}

function expressionContextFor(
  fields: RuleFields,
  collector: IssueCollector,
  phase: "configuration" | "trigger" | "contribution",
  hitScope: boolean,
  knownStates: ReadonlySet<string>,
  knownActions: ReadonlySet<string>,
): ExpressionContext {
  return {
    collector,
    structureCode: "INVALID_DEFINITION",
    phase,
    hitScope,
    parameters: fields.parameters,
    sourceKind: fields.source.identity.kind,
    knownStates,
    knownActions,
    effectId: fields.effectId as EffectRule["effectId"],
  }
}

function validateTriggerBlock(
  value: unknown,
  fields: RuleFields,
  collector: IssueCollector,
  pointer: string,
  knownStates: ReadonlySet<string>,
  knownActions: ReadonlySet<string>,
): boolean {
  const checks: FieldChecks = {
    collector,
    structureCode: "INVALID_DEFINITION",
    pointer,
  }
  const object = expectObject(value, checks, "trigger")
  if (object === undefined) {
    return false
  }
  const eventKinds = expectNonEmptyArray(
    object["eventKinds"],
    { ...checks, pointer: `${pointer}/eventKinds` },
    "eventKinds",
  )
  if (eventKinds === undefined) {
    return false
  }
  let eventKindsValid = true
  for (const [index, kind] of eventKinds.entries()) {
    if (typeof kind !== "string" || !EVENT_KINDS.includes(kind as never)) {
      checks.collector.report(
        checks.structureCode,
        `${pointer}/eventKinds/${index}`,
        `eventKind must be one of: ${EVENT_KINDS.join(", ")}`,
      )
      eventKindsValid = false
    }
  }
  if (!eventKindsValid) {
    return false
  }
  if (object["when"] === undefined) {
    reportMissing({ ...checks, pointer: `${pointer}` }, "when")
    return false
  }
  if (
    validateCondition(
      object["when"],
      expressionContextFor(
        fields,
        collector,
        "trigger",
        false,
        knownStates,
        knownActions,
      ),
      `${pointer}/when`,
    ) === undefined
  ) {
    return false
  }
  if (object["cooldown"] !== undefined) {
    const cooldownChecks: FieldChecks = {
      ...checks,
      pointer: `${pointer}/cooldown`,
    }
    const cooldown = expectObject(
      object["cooldown"],
      cooldownChecks,
      "cooldown",
    )
    if (cooldown === undefined) {
      return false
    }
    const groupId = expectNonEmptyString(
      cooldown["groupId"],
      { ...cooldownChecks, pointer: `${cooldownChecks.pointer}/groupId` },
      "cooldown groupId",
    )
    const partition = expectLiteral(
      cooldown["partition"],
      COOLDOWN_PARTITIONS,
      cooldownChecks,
      "cooldown partition",
    )
    if (groupId === undefined || partition === undefined) {
      return false
    }
    const seconds = validateNumericExpression(
      cooldown["seconds"],
      expressionContextFor(
        fields,
        collector,
        "trigger",
        false,
        knownStates,
        knownActions,
      ),
      `${pointer}/cooldown/seconds`,
      "seconds",
    )
    if (seconds === undefined) {
      return false
    }
    if (seconds.kind === "literal" && seconds.value < 0) {
      cooldownChecks.collector.report(
        "INVALID_DEFINITION",
        `${cooldownChecks.pointer}/seconds/value`,
        "Cooldown seconds must be non-negative",
      )
      return false
    }
    rejectUnknownFields(
      cooldown,
      ["groupId", "partition", "seconds"],
      cooldownChecks,
      "cooldown",
    )
  }
  rejectUnknownFields(
    object,
    ["eventKinds", "when", "cooldown"],
    checks,
    "trigger",
  )
  return true
}

function validateLayering(
  value: unknown,
  fields: RuleFields,
  collector: IssueCollector,
  pointer: string,
  knownStates: ReadonlySet<string>,
  knownActions: ReadonlySet<string>,
): boolean {
  const checks: FieldChecks = {
    collector,
    structureCode: "INVALID_DEFINITION",
    pointer,
  }
  const object = expectObject(value, checks, "layering")
  if (object === undefined) {
    return false
  }
  const recipientPartition = expectLiteral(
    object["recipientPartition"],
    ["individual", "selected-set"],
    checks,
    "recipientPartition",
  )
  if (recipientPartition === undefined) {
    return false
  }
  const keys = object["keys"]
  if (!Array.isArray(keys)) {
    checks.collector.report(
      checks.structureCode,
      `${pointer}/keys`,
      "layering keys must be an array",
    )
    return false
  }
  const seenKeys = new Set<string>()
  let keysValid = true
  for (const [index, key] of keys.entries()) {
    if (
      typeof key !== "string" ||
      !LAYERING_KEYS.includes(key as (typeof LAYERING_KEYS)[number])
    ) {
      checks.collector.report(
        checks.structureCode,
        `${pointer}/keys/${index}`,
        `layering key must be one of: ${LAYERING_KEYS.join(", ")}`,
      )
      keysValid = false
      continue
    }
    if (seenKeys.has(key)) {
      checks.collector.report(
        "INVALID_DEFINITION",
        `${pointer}/keys/${index}`,
        `layering key "${key}" is declared more than once`,
      )
      keysValid = false
      continue
    }
    seenKeys.add(key)
  }
  if (!keysValid) {
    return false
  }
  const maximum = validateNumericExpression(
    object["maximum"],
    expressionContextFor(
      fields,
      collector,
      "configuration",
      false,
      knownStates,
      knownActions,
    ),
    `${pointer}/maximum`,
    "count",
  )
  if (maximum === undefined) {
    return false
  }
  if (
    maximum.kind === "literal" &&
    (!Number.isInteger(maximum.value) || maximum.value <= 0)
  ) {
    checks.collector.report(
      "INVALID_DEFINITION",
      `${pointer}/maximum/value`,
      "Layer maximum must be a positive integer",
    )
    return false
  }
  const onRetrigger = expectLiteral(
    object["onRetrigger"],
    ["add-layer", "keep-count"],
    checks,
    "onRetrigger",
  )
  const atCapacity = expectLiteral(
    object["atCapacity"],
    ["ignore-new-layer", "replace-oldest-layer"],
    checks,
    "atCapacity",
  )
  if (onRetrigger === undefined || atCapacity === undefined) {
    return false
  }
  if (onRetrigger === "keep-count" && atCapacity !== "ignore-new-layer") {
    checks.collector.report(
      "INVALID_DEFINITION",
      `${pointer}/atCapacity`,
      "keep-count only allows ignore-new-layer",
    )
    return false
  }
  rejectUnknownFields(
    object,
    ["recipientPartition", "keys", "maximum", "onRetrigger", "atCapacity"],
    checks,
    "layering",
  )
  return true
}

function validateActivation(
  value: unknown,
  fields: RuleFields,
  collector: IssueCollector,
  pointer: string,
  knownStates: ReadonlySet<string>,
  knownActions: ReadonlySet<string>,
): "continuous" | "supplied" | "triggered" | undefined {
  const checks: FieldChecks = {
    collector,
    structureCode: "INVALID_DEFINITION",
    pointer,
  }
  const object = expectObject(value, checks, "activation")
  if (object === undefined) {
    return undefined
  }
  const kind = expectLiteral(
    object["kind"],
    ["continuous", "supplied", "triggered"],
    checks,
    "activation kind",
  )
  if (kind === undefined) {
    return undefined
  }
  if (kind !== "triggered") {
    for (const forbidden of ["trigger", "lifetime", "layering"]) {
      if (object[forbidden] !== undefined) {
        checks.collector.report(
          "INVALID_DEFINITION",
          `${pointer}/${forbidden}`,
          `Activation "${kind}" must not declare "${forbidden}"`,
        )
        return undefined
      }
    }
    if (kind === "supplied") {
      if (
        object["maximumLayers"] !== undefined &&
        validateNumericExpression(
          object["maximumLayers"],
          expressionContextFor(
            fields,
            collector,
            "configuration",
            false,
            knownStates,
            knownActions,
          ),
          `${pointer}/maximumLayers`,
          "count",
        ) === undefined
      )
        return undefined
      if (
        object["exclusiveGroup"] !== undefined &&
        expectNonEmptyString(
          object["exclusiveGroup"],
          { ...checks, pointer: `${pointer}/exclusiveGroup` },
          "exclusive group",
        ) === undefined
      )
        return undefined
    }
    rejectUnknownFields(
      object,
      kind === "supplied"
        ? ["kind", "maximumLayers", "exclusiveGroup"]
        : ["kind"],
      checks,
      "activation",
    )
    return kind
  }
  for (const required of ["trigger", "lifetime", "layering"]) {
    if (object[required] === undefined) {
      reportMissing(checks, required)
      return undefined
    }
  }
  if (
    !validateTriggerBlock(
      object["trigger"],
      fields,
      collector,
      `${pointer}/trigger`,
      knownStates,
      knownActions,
    )
  ) {
    return undefined
  }
  const lifetimeChecks: FieldChecks = {
    ...checks,
    pointer: `${pointer}/lifetime`,
  }
  const lifetime = expectObject(object["lifetime"], lifetimeChecks, "lifetime")
  if (lifetime === undefined) {
    return undefined
  }
  const lifetimeKind = expectLiteral(
    lifetime["kind"],
    ["timed", "state-bound"],
    lifetimeChecks,
    "lifetime kind",
  )
  if (lifetimeKind === undefined) {
    return undefined
  }
  if (lifetimeKind === "timed") {
    const seconds = validateNumericExpression(
      lifetime["seconds"],
      expressionContextFor(
        fields,
        collector,
        "trigger",
        false,
        knownStates,
        knownActions,
      ),
      `${lifetimeChecks.pointer}/seconds`,
      "seconds",
    )
    if (seconds === undefined) {
      return undefined
    }
    if (seconds.kind === "literal" && seconds.value <= 0) {
      lifetimeChecks.collector.report(
        "INVALID_DEFINITION",
        `${lifetimeChecks.pointer}/seconds/value`,
        "Actual duration must be strictly positive",
      )
      return undefined
    }
    const clock = expectLiteral(
      lifetime["clock"],
      ["shared", "per-layer"],
      lifetimeChecks,
      "clock",
    )
    if (clock === undefined) {
      return undefined
    }
    const onRetriggerChecks: FieldChecks = {
      ...checks,
      pointer: `${lifetimeChecks.pointer}/onRetrigger`,
    }
    const onRetrigger = expectObject(
      lifetime["onRetrigger"],
      onRetriggerChecks,
      "onRetrigger",
    )
    if (onRetrigger === undefined) {
      return undefined
    }
    const clockUpdateKind = expectLiteral(
      onRetrigger["kind"],
      ["keep", "refresh", "extend"],
      onRetriggerChecks,
      "clock update kind",
    )
    if (clockUpdateKind === undefined) {
      return undefined
    }
    if (clockUpdateKind === "extend") {
      const limitChecks: FieldChecks = {
        ...checks,
        pointer: `${onRetriggerChecks.pointer}/limit`,
      }
      const limit = expectObject(
        onRetrigger["limit"],
        limitChecks,
        "extend limit",
      )
      if (limit === undefined) {
        return undefined
      }
      const limitKind = expectLiteral(
        limit["kind"],
        ["none", "remaining", "since-first-activation"],
        limitChecks,
        "extend limit kind",
      )
      if (limitKind === undefined) {
        return undefined
      }
      if (limitKind !== "none") {
        const maximum = validateNumericExpression(
          limit["maximum"],
          expressionContextFor(
            fields,
            collector,
            "trigger",
            false,
            knownStates,
            knownActions,
          ),
          `${limitChecks.pointer}/maximum`,
          "seconds",
        )
        if (maximum === undefined) {
          return undefined
        }
        if (maximum.kind === "literal" && maximum.value <= 0) {
          limitChecks.collector.report(
            "INVALID_DEFINITION",
            `${limitChecks.pointer}/maximum/value`,
            "Extension maximum must be strictly positive",
          )
          return undefined
        }
        rejectUnknownFields(
          limit,
          ["kind", "maximum"],
          limitChecks,
          "extend limit",
        )
      } else {
        rejectUnknownFields(limit, ["kind"], limitChecks, "extend limit")
      }
      rejectUnknownFields(
        onRetrigger,
        ["kind", "limit"],
        onRetriggerChecks,
        "onRetrigger",
      )
    } else {
      rejectUnknownFields(
        onRetrigger,
        ["kind"],
        onRetriggerChecks,
        "onRetrigger",
      )
    }
    const refreshExisting = expectLiteral(
      lifetime["refreshExisting"],
      ["all", "newest", "none"],
      lifetimeChecks,
      "refreshExisting",
    )
    if (refreshExisting === undefined) {
      return undefined
    }
    if (clock === "shared" && refreshExisting !== "all") {
      lifetimeChecks.collector.report(
        "INVALID_DEFINITION",
        `${lifetimeChecks.pointer}/refreshExisting`,
        'A shared clock requires refreshExisting "all"',
      )
      return undefined
    }
    if (
      clock === "per-layer" &&
      clockUpdateKind === "keep" &&
      refreshExisting !== "none"
    ) {
      lifetimeChecks.collector.report(
        "INVALID_DEFINITION",
        `${lifetimeChecks.pointer}/refreshExisting`,
        'per-layer with keep requires refreshExisting "none"',
      )
      return undefined
    }
    rejectUnknownFields(
      lifetime,
      ["kind", "seconds", "clock", "onRetrigger", "refreshExisting"],
      lifetimeChecks,
      "timed lifetime",
    )
  } else {
    const stateId = lifetime["stateId"]
    if (
      typeof stateId !== "string" ||
      !stateId.startsWith("state:") ||
      stateId.length <= "state:".length
    ) {
      lifetimeChecks.collector.report(
        lifetimeChecks.structureCode,
        `${lifetimeChecks.pointer}/stateId`,
        "state-bound lifetime stateId must be a non-empty state: identity",
      )
      return undefined
    }
    if (!knownStates.has(stateId)) {
      lifetimeChecks.collector.report(
        "MISSING_REFERENCE",
        `${lifetimeChecks.pointer}/stateId`,
        `State "${stateId}" is not registered by the rule set`,
      )
      return undefined
    }
    const stateOwnerContext = expressionContextFor(
      fields,
      collector,
      "trigger",
      false,
      knownStates,
      knownActions,
    )
    if (
      validateEntityReferenceValue(
        lifetime["stateOwner"],
        stateOwnerContext,
        `${lifetimeChecks.pointer}/stateOwner`,
      ) === undefined
    ) {
      return undefined
    }
    rejectUnknownFields(
      lifetime,
      ["kind", "stateId", "stateOwner"],
      lifetimeChecks,
      "state-bound lifetime",
    )
  }
  if (
    !validateLayering(
      object["layering"],
      fields,
      collector,
      `${pointer}/layering`,
      knownStates,
      knownActions,
    )
  ) {
    return undefined
  }
  rejectUnknownFields(
    object,
    ["kind", "trigger", "lifetime", "layering"],
    checks,
    "activation",
  )
  return "triggered"
}

function validateContributionOperation(
  value: unknown,
  scope: "entity" | "hit",
  fields: RuleFields,
  collector: IssueCollector,
  pointer: string,
  knownStates: ReadonlySet<string>,
  knownActions: ReadonlySet<string>,
): boolean {
  const checks: FieldChecks = {
    collector,
    structureCode: "INVALID_DEFINITION",
    pointer,
  }
  const object = expectObject(value, checks, "operation")
  if (object === undefined) {
    return false
  }
  const kind = expectLiteral(
    object["kind"],
    ["stat-adjustment", "factor-contribution", "hit-adjustment"],
    checks,
    "operation kind",
  )
  if (kind === undefined) {
    return false
  }
  if (kind === "hit-adjustment" && scope !== "hit") {
    checks.collector.report(
      "INVALID_DEFINITION",
      pointer,
      'hit-adjustment requires scope "hit"',
    )
    return false
  }
  const hitScope = scope === "hit"
  switch (kind) {
    case "stat-adjustment": {
      const stat = expectLiteral(
        object["stat"],
        Object.keys(STAT_UNIT_MAP) as Stat[],
        checks,
        "stat",
      )
      if (stat === undefined) {
        return false
      }
      const direct = DIRECT_STATS.has(stat as "criticalRate")
      const stage = object["stage"]
      const stageAllowed = direct
        ? stage === "direct"
        : stage === "initial-percentage" ||
          stage === "final-percentage" ||
          stage === "initial-fixed" ||
          stage === "final-fixed"
      if (!stageAllowed) {
        checks.collector.report(
          checks.structureCode,
          `${pointer}/stage`,
          direct
            ? `Direct stat "${stat}" requires stage "direct"`
            : `Stat "${stat}" requires a general stage`,
        )
        return false
      }
      const expectedUnit: Unit =
        stage === "initial-percentage" || stage === "final-percentage"
          ? "ratio"
          : direct
            ? "ratio"
            : STAT_UNIT_MAP[stat]
      if (
        validateNumericExpression(
          object["value"],
          expressionContextFor(
            fields,
            collector,
            "contribution",
            hitScope,
            knownStates,
            knownActions,
          ),
          `${pointer}/value`,
          expectedUnit,
        ) === undefined
      ) {
        return false
      }
      rejectUnknownFields(
        object,
        ["kind", "stat", "stage", "value"],
        checks,
        "stat-adjustment",
      )
      return true
    }
    case "factor-contribution": {
      const channel = expectLiteral(
        object["channel"],
        FACTOR_CHANNELS,
        checks,
        "factor channel",
      )
      if (channel === undefined) {
        return false
      }
      if (
        validateNumericExpression(
          object["value"],
          expressionContextFor(
            fields,
            collector,
            "contribution",
            hitScope,
            knownStates,
            knownActions,
          ),
          `${pointer}/value`,
          FACTOR_CHANNEL_UNITS[channel],
        ) === undefined
      ) {
        return false
      }
      rejectUnknownFields(
        object,
        ["kind", "channel", "value"],
        checks,
        "factor-contribution",
      )
      return true
    }
    case "hit-adjustment": {
      if (object["field"] !== "damageMultiplier") {
        checks.collector.report(
          checks.structureCode,
          `${pointer}/field`,
          'hit-adjustment field must be "damageMultiplier"',
        )
        return false
      }
      if (object["operator"] !== "scale" && object["operator"] !== "add") {
        checks.collector.report(
          checks.structureCode,
          `${pointer}/operator`,
          'hit-adjustment operator must be "add" or "scale"',
        )
        return false
      }
      const multiplier = validateNumericExpression(
        object["value"],
        expressionContextFor(
          fields,
          collector,
          "contribution",
          true,
          knownStates,
          knownActions,
        ),
        `${pointer}/value`,
        "multiplier",
      )
      if (multiplier === undefined) {
        return false
      }
      if (
        object["operator"] === "scale" &&
        multiplier.kind === "literal" &&
        multiplier.value < 0
      ) {
        checks.collector.report(
          "INVALID_DEFINITION",
          `${pointer}/value/value`,
          "Hit multipliers must be non-negative",
        )
        return false
      }
      if (object["itemIds"] !== undefined) {
        const itemIds = expectNonEmptyArray(
          object["itemIds"],
          { ...checks, pointer: `${pointer}/itemIds` },
          "damage item identities",
        )
        if (itemIds === undefined) return false
        const seen = new Set<string>()
        for (const [index, itemId] of itemIds.entries()) {
          const id = expectNonEmptyString(
            itemId,
            { ...checks, pointer: `${pointer}/itemIds/${index}` },
            "damage item identity",
          )
          if (id === undefined) return false
          if (seen.has(id))
            collector.report(
              "DUPLICATE_ID",
              `${pointer}/itemIds/${index}`,
              `Duplicate damage item identity "${id}"`,
            )
          seen.add(id)
        }
      }
      rejectUnknownFields(
        object,
        ["kind", "field", "operator", "itemIds", "value"],
        checks,
        "hit-adjustment",
      )
      return true
    }
  }
}

function validateContributionRule(
  object: Record<string, unknown>,
  fields: RuleFields,
  checks: FieldChecks,
  knownStates: ReadonlySet<string>,
  knownActions: ReadonlySet<string>,
): boolean {
  for (const forbidden of ["phase", "modifications"]) {
    if (object[forbidden] !== undefined) {
      checks.collector.report(
        "INVALID_DEFINITION",
        `${checks.pointer}/${forbidden}`,
        `Contribution rules must not declare "${forbidden}"`,
      )
      return false
    }
  }
  for (const required of [
    "activation",
    "beneficiary",
    "when",
    "scope",
    "operation",
  ]) {
    if (object[required] === undefined) {
      reportMissing(checks, required)
      return false
    }
  }
  const activation = validateActivation(
    object["activation"],
    fields,
    checks.collector,
    `${checks.pointer}/activation`,
    knownStates,
    knownActions,
  )
  if (activation === undefined) {
    return false
  }
  if (
    !validateTargetSelector(object["beneficiary"], {
      ...checks,
      pointer: `${checks.pointer}/beneficiary`,
    })
  ) {
    return false
  }
  const scope = expectLiteral(
    object["scope"],
    ["entity", "hit"],
    checks,
    "scope",
  )
  if (scope === undefined) {
    return false
  }
  if (
    validateCondition(
      object["when"],
      expressionContextFor(
        fields,
        checks.collector,
        "contribution",
        scope === "hit",
        knownStates,
        knownActions,
      ),
      `${checks.pointer}/when`,
    ) === undefined
  ) {
    return false
  }
  if (
    !validateContributionOperation(
      object["operation"],
      scope,
      fields,
      checks.collector,
      `${checks.pointer}/operation`,
      knownStates,
      knownActions,
    )
  ) {
    return false
  }
  if (object["uniqueness"] !== undefined) {
    const uniquenessChecks: FieldChecks = {
      ...checks,
      pointer: `${checks.pointer}/uniqueness`,
    }
    const uniqueness = expectObject(
      object["uniqueness"],
      uniquenessChecks,
      "uniqueness",
    )
    if (uniqueness === undefined) {
      return false
    }
    if (
      expectNonEmptyString(
        uniqueness["key"],
        { ...uniquenessChecks, pointer: `${uniquenessChecks.pointer}/key` },
        "uniqueness key",
      ) === undefined
    ) {
      return false
    }
    if (
      expectLiteral(
        uniqueness["scope"],
        ["team", "global"],
        uniquenessChecks,
        "uniqueness scope",
      ) === undefined
    ) {
      return false
    }
    const selectChecks: FieldChecks = {
      ...checks,
      pointer: `${uniquenessChecks.pointer}/select`,
    }
    const select = expectObject(
      uniqueness["select"],
      selectChecks,
      "uniqueness select",
    )
    if (select === undefined) {
      return false
    }
    const selectKind = expectLiteral(
      select["kind"],
      ["single-source-only", "highest-value", "latest-activation", "priority"],
      selectChecks,
      "uniqueness select kind",
    )
    if (selectKind === undefined) {
      return false
    }
    if (selectKind === "latest-activation" && activation === "continuous") {
      uniquenessChecks.collector.report(
        "INVALID_DEFINITION",
        `${selectChecks.pointer}/kind`,
        "latest-activation cannot select among continuous rules",
      )
      return false
    }
    if (selectKind === "priority") {
      if (
        validateNumericExpression(
          select["priority"],
          expressionContextFor(
            fields,
            checks.collector,
            "configuration",
            false,
            knownStates,
            knownActions,
          ),
          `${selectChecks.pointer}/priority`,
          "count",
        ) === undefined
      ) {
        return false
      }
      rejectUnknownFields(
        select,
        ["kind", "priority"],
        selectChecks,
        "uniqueness select",
      )
    } else {
      rejectUnknownFields(select, ["kind"], selectChecks, "uniqueness select")
    }
    rejectUnknownFields(
      uniqueness,
      ["key", "scope", "select"],
      uniquenessChecks,
      "uniqueness",
    )
  }
  rejectUnknownFields(
    object,
    [
      "kind",
      "effectId",
      "source",
      "config",
      "parameters",
      "activation",
      "beneficiary",
      "when",
      "uniqueness",
      "scope",
      "operation",
    ],
    checks,
    "contribution rule",
  )
  return true
}

function validateInstantRule(
  object: Record<string, unknown>,
  fields: RuleFields,
  checks: FieldChecks,
  knownStates: ReadonlySet<string>,
  knownActions: ReadonlySet<string>,
): boolean {
  for (const forbidden of [
    "activation",
    "uniqueness",
    "phase",
    "modifications",
    "scope",
  ]) {
    if (object[forbidden] !== undefined) {
      checks.collector.report(
        "INVALID_DEFINITION",
        `${checks.pointer}/${forbidden}`,
        `Instant rules must not declare "${forbidden}"`,
      )
      return false
    }
  }
  for (const required of ["trigger", "beneficiary", "operation"]) {
    if (object[required] === undefined) {
      reportMissing(checks, required)
      return false
    }
  }
  if (
    !validateTriggerBlock(
      object["trigger"],
      fields,
      checks.collector,
      `${checks.pointer}/trigger`,
      knownStates,
      knownActions,
    )
  ) {
    return false
  }
  if (
    !validateTargetSelector(object["beneficiary"], {
      ...checks,
      pointer: `${checks.pointer}/beneficiary`,
    })
  ) {
    return false
  }
  const operationChecks: FieldChecks = {
    ...checks,
    pointer: `${checks.pointer}/operation`,
  }
  const operation = expectObject(
    object["operation"],
    operationChecks,
    "instant operation",
  )
  if (operation === undefined) {
    return false
  }
  const operationKind = expectLiteral(
    operation["kind"],
    ["resource-generation", "action-request"],
    operationChecks,
    "instant operation kind",
  )
  if (operationKind === undefined) {
    return false
  }
  if (operationKind === "resource-generation") {
    if (operation["resource"] !== "energy") {
      operationChecks.collector.report(
        operationChecks.structureCode,
        `${operationChecks.pointer}/resource`,
        'resource-generation resource must be "energy"',
      )
      return false
    }
    const amount = validateNumericExpression(
      operation["amount"],
      expressionContextFor(
        fields,
        checks.collector,
        "trigger",
        false,
        knownStates,
        knownActions,
      ),
      `${operationChecks.pointer}/amount`,
      "energy-points",
    )
    if (amount === undefined) {
      return false
    }
    if (amount.kind === "literal" && amount.value < 0) {
      operationChecks.collector.report(
        "INVALID_DEFINITION",
        `${operationChecks.pointer}/amount/value`,
        "Resource generation must be non-negative",
      )
      return false
    }
    rejectUnknownFields(
      operation,
      ["kind", "resource", "amount"],
      operationChecks,
      "resource-generation",
    )
  } else {
    const actions = expectNonEmptyArray(
      operation["actions"],
      { ...operationChecks, pointer: `${operationChecks.pointer}/actions` },
      "action-request actions",
    )
    if (actions === undefined) {
      return false
    }
    let actionsValid = true
    for (const [index, entry] of actions.entries()) {
      const entryPointer = `${operationChecks.pointer}/actions/${index}`
      const actionObject = expectObject(
        entry,
        { ...operationChecks, pointer: entryPointer },
        "action request entry",
      )
      if (actionObject === undefined) {
        actionsValid = false
        continue
      }
      const actionId = actionObject["actionId"]
      if (
        typeof actionId !== "string" ||
        !actionId.startsWith("action:") ||
        actionId.length <= "action:".length
      ) {
        operationChecks.collector.report(
          operationChecks.structureCode,
          `${entryPointer}/actionId`,
          "actionId must be a non-empty action: identity",
        )
        actionsValid = false
        continue
      }
      if (!knownActions.has(actionId)) {
        operationChecks.collector.report(
          "MISSING_REFERENCE",
          `${entryPointer}/actionId`,
          `Action "${actionId}" is not registered by the rule set`,
        )
        actionsValid = false
        continue
      }
      const count = validateNumericExpression(
        actionObject["count"],
        expressionContextFor(
          fields,
          checks.collector,
          "trigger",
          false,
          knownStates,
          knownActions,
        ),
        `${entryPointer}/count`,
        "count",
      )
      if (count === undefined) {
        actionsValid = false
        continue
      }
      if (
        count.kind === "literal" &&
        (!Number.isInteger(count.value) || count.value <= 0)
      ) {
        operationChecks.collector.report(
          "INVALID_DEFINITION",
          `${entryPointer}/count/value`,
          "Action counts must be positive integers",
        )
        actionsValid = false
        continue
      }
      rejectUnknownFields(
        actionObject,
        ["actionId", "count"],
        { ...operationChecks, pointer: entryPointer },
        "action request entry",
      )
    }
    if (!actionsValid) {
      return false
    }
    rejectUnknownFields(
      operation,
      ["kind", "actions"],
      operationChecks,
      "action-request",
    )
  }
  rejectUnknownFields(
    object,
    [
      "kind",
      "effectId",
      "source",
      "config",
      "parameters",
      "trigger",
      "beneficiary",
      "operation",
    ],
    checks,
    "instant rule",
  )
  return true
}

function validateModificationRuleShell(
  object: Record<string, unknown>,
  fields: RuleFields,
  checks: FieldChecks,
  knownStates: ReadonlySet<string>,
): PendingModification | undefined {
  for (const forbidden of [
    "operation",
    "activation",
    "beneficiary",
    "uniqueness",
    "scope",
  ]) {
    if (object[forbidden] !== undefined) {
      checks.collector.report(
        "INVALID_DEFINITION",
        `${checks.pointer}/${forbidden}`,
        `Modification rules must not declare "${forbidden}"`,
      )
      return undefined
    }
  }
  for (const required of ["phase", "target", "modifications"]) {
    if (object[required] === undefined) {
      reportMissing(checks, required)
      return undefined
    }
  }
  const phase = expectLiteral(
    object["phase"],
    ["configuration", "activation", "contribution"],
    checks,
    "modification phase",
  )
  if (phase === undefined) {
    return undefined
  }
  const targetChecks: FieldChecks = {
    ...checks,
    pointer: `${checks.pointer}/target`,
  }
  const target = expectObject(object["target"], targetChecks, "target")
  if (target === undefined) {
    return undefined
  }
  const targetKind = expectLiteral(
    target["kind"],
    ["effect", "state"],
    targetChecks,
    "target kind",
  )
  if (targetKind === undefined) {
    return undefined
  }
  let targetEffectId: string | undefined
  let targetStateId: string | undefined
  if (targetKind === "effect") {
    targetEffectId = target["effectId"] as string
    if (!isEffectId(targetEffectId)) {
      targetChecks.collector.report(
        targetChecks.structureCode,
        `${targetChecks.pointer}/effectId`,
        "Effect target effectId must be a non-empty effect identity",
      )
      return undefined
    }
  } else {
    targetStateId = target["stateId"] as string
    if (
      typeof targetStateId !== "string" ||
      !targetStateId.startsWith("state:") ||
      targetStateId.length <= "state:".length
    ) {
      targetChecks.collector.report(
        targetChecks.structureCode,
        `${targetChecks.pointer}/stateId`,
        "State target stateId must be a non-empty state: identity",
      )
      return undefined
    }
    if (!knownStates.has(targetStateId)) {
      targetChecks.collector.report(
        "MISSING_REFERENCE",
        `${targetChecks.pointer}/stateId`,
        `State "${targetStateId}" is not registered by the rule set`,
      )
      return undefined
    }
    if (phase !== "configuration") {
      targetChecks.collector.report(
        "INVALID_MODIFICATION",
        `${targetChecks.pointer}/kind`,
        "Only configuration-phase modifications may target states",
      )
      return undefined
    }
  }
  if (phase === "activation" && targetKind !== "effect") {
    targetChecks.collector.report(
      "INVALID_MODIFICATION",
      `${targetChecks.pointer}/kind`,
      "Activation-phase modifications must target effects",
    )
    return undefined
  }
  if (
    !expectNonEmptyArray(
      object["modifications"],
      { ...checks, pointer: `${checks.pointer}/modifications` },
      "modifications",
    )
  ) {
    return undefined
  }
  const rawWhen = object["when"]
  if (phase === "configuration") {
    if (rawWhen !== undefined) {
      checks.collector.report(
        "INVALID_DEFINITION",
        `${checks.pointer}/when`,
        'Configuration-phase modifications must not declare "when"',
      )
      return undefined
    }
  } else if (rawWhen === undefined) {
    reportMissing(checks, "when")
    return undefined
  }
  rejectUnknownFields(
    object,
    [
      "kind",
      "effectId",
      "source",
      "config",
      "parameters",
      "phase",
      "target",
      "when",
      "modifications",
    ],
    checks,
    "modification rule",
  )
  return {
    pointer: checks.pointer,
    entry: object,
    effectId: fields.effectId,
    sourceKind: fields.source.identity.kind,
    parameters: fields.parameters,
    phase,
    targetKind,
    targetEffectId,
    targetStateId,
  }
}

function validateStateDefinition(
  value: unknown,
  checks: FieldChecks,
  knownStates: ReadonlySet<string>,
  knownActions: ReadonlySet<string>,
): boolean {
  const object = expectObject(value, checks, "state definition")
  if (object === undefined) {
    return false
  }
  const stateId = object["stateId"]
  if (
    typeof stateId !== "string" ||
    !stateId.startsWith("state:") ||
    stateId.length <= "state:".length
  ) {
    checks.collector.report(
      checks.structureCode,
      `${checks.pointer}/stateId`,
      "stateId must be a non-empty state: identity",
    )
    return false
  }
  if (
    validateRuleSource(object["source"], {
      ...checks,
      pointer: `${checks.pointer}/source`,
    }) === undefined
  ) {
    return false
  }
  if (object["input"] !== "observed") {
    checks.collector.report(
      checks.structureCode,
      `${checks.pointer}/input`,
      'State input must be "observed"',
    )
    return false
  }
  const parametersPointer = `${checks.pointer}/parameters`
  const parametersObject = expectObject(
    object["parameters"],
    { ...checks, pointer: parametersPointer },
    "state parameters",
  )
  if (parametersObject === undefined) {
    return false
  }
  const context: ExpressionContext = {
    collector: checks.collector,
    structureCode: checks.structureCode,
    phase: "configuration",
    hitScope: false,
    parameters: new Map(),
    sourceKind: (object["source"] as { identity: { kind: never } })["identity"]
      .kind,
    knownStates,
    knownActions,
  }
  for (const [name, rawParameter] of Object.entries(parametersObject)) {
    if (
      validateParameter(
        rawParameter,
        { ...context, pointer: `${parametersPointer}/${name}` } as never,
        `${parametersPointer}/${name}`,
      ) === undefined
    ) {
      return false
    }
  }
  rejectUnknownFields(
    object,
    ["stateId", "source", "parameters", "input"],
    checks,
    "state definition",
  )
  return true
}

function validateActionEntry(value: unknown, checks: FieldChecks): boolean {
  const object = expectObject(value, checks, "action entry")
  if (object === undefined) {
    return false
  }
  const actionId = object["actionId"]
  if (
    typeof actionId !== "string" ||
    !actionId.startsWith("action:") ||
    actionId.length <= "action:".length
  ) {
    checks.collector.report(
      checks.structureCode,
      `${checks.pointer}/actionId`,
      "actionId must be a non-empty action: identity",
    )
    return false
  }
  if (
    validateRuleSource(object["source"], {
      ...checks,
      pointer: `${checks.pointer}/source`,
    }) === undefined
  ) {
    return false
  }
  rejectUnknownFields(object, ["actionId", "source"], checks, "action entry")
  return true
}

/** 规则集结构校验：状态、动作先登记，再逐条校验规则；修改规则内容延迟到目标解析后。 */
export function validateRuleSetStructure(
  input: unknown,
  collector: IssueCollector,
): ValidatedRuleSet | undefined {
  const checks: FieldChecks = {
    collector,
    structureCode: "INVALID_DEFINITION",
    pointer: "",
  }
  const object = expectObject(input, checks, "rule set")
  if (object === undefined) {
    return undefined
  }
  for (const required of [
    "schemaVersion",
    "ruleSetId",
    "revision",
    "effects",
    "states",
    "actions",
  ]) {
    if (object[required] === undefined) {
      reportMissing(checks, required)
    }
  }
  if (object["schemaVersion"] !== 1) {
    collector.report(
      "INVALID_DEFINITION",
      "/schemaVersion",
      "schemaVersion must be 1",
    )
  }
  const ruleSetId = expectNonEmptyString(
    object["ruleSetId"],
    { ...checks, pointer: "/ruleSetId" },
    "ruleSetId",
  )
  const revision = expectNonEmptyString(
    object["revision"],
    { ...checks, pointer: "/revision" },
    "revision",
  )
  const statesArray = expectStringArray(object, "states", collector)
  const actionsArray = expectStringArray(object, "actions", collector)
  const effectsArray = expectStringArray(object, "effects", collector)
  if (
    ruleSetId === undefined ||
    revision === undefined ||
    statesArray === undefined ||
    actionsArray === undefined ||
    effectsArray === undefined
  ) {
    return undefined
  }
  rejectUnknownFields(
    object,
    ["schemaVersion", "ruleSetId", "revision", "effects", "states", "actions"],
    checks,
    "rule set",
  )

  const knownStates = new Set<string>()
  for (const [index, entry] of statesArray.entries()) {
    const pointer = `/states/${index}`
    if (
      !validateStateDefinition(
        entry,
        { ...checks, pointer },
        knownStates,
        new Set(),
      )
    ) {
      continue
    }
    const stateId = (entry as { stateId: string })["stateId"]
    if (knownStates.has(stateId)) {
      collector.report(
        "DUPLICATE_ID",
        `${pointer}/stateId`,
        `State "${stateId}" is registered more than once`,
      )
      continue
    }
    knownStates.add(stateId)
  }

  const knownActions = new Set<string>()
  for (const [index, entry] of actionsArray.entries()) {
    const pointer = `/actions/${index}`
    if (!validateActionEntry(entry, { ...checks, pointer })) {
      continue
    }
    const actionId = (entry as { actionId: string })["actionId"]
    if (knownActions.has(actionId)) {
      collector.report(
        "DUPLICATE_ID",
        `${pointer}/actionId`,
        `Action "${actionId}" is registered more than once`,
      )
      continue
    }
    knownActions.add(actionId)
  }

  const effectIds = new Set<string>()
  const effectKinds = new Map<
    string,
    "contribution" | "instant" | "modification"
  >()
  const entriesByEffectId = new Map<string, Record<string, unknown>>()
  const effects: EffectRule[] = []
  const pendingModifications: PendingModification[] = []
  for (const [index, entry] of effectsArray.entries()) {
    const pointer = `/effects/${index}`
    const ruleChecks: FieldChecks = { ...checks, pointer }
    const ruleObject = expectObject(entry, ruleChecks, "effect rule")
    if (ruleObject === undefined) {
      continue
    }
    const kind = expectLiteral(
      ruleObject["kind"],
      ["contribution", "instant", "modification"],
      ruleChecks,
      "rule kind",
    )
    if (kind === undefined) {
      continue
    }
    const fields = validateRuleBase(
      ruleObject,
      ruleChecks,
      knownStates,
      knownActions,
    )
    if (fields === undefined) {
      continue
    }
    if (effectIds.has(fields.effectId)) {
      collector.report(
        "DUPLICATE_ID",
        `${pointer}/effectId`,
        `Effect "${fields.effectId}" is registered more than once`,
        { effectId: fields.effectId as EffectRule["effectId"] },
      )
      continue
    }
    effectIds.add(fields.effectId)
    effectKinds.set(fields.effectId, kind)
    entriesByEffectId.set(fields.effectId, ruleObject)
    if (
      validateCondition(
        ruleObject["config"],
        expressionContextFor(
          fields,
          collector,
          "configuration",
          false,
          knownStates,
          knownActions,
        ),
        `${pointer}/config`,
      ) === undefined
    ) {
      continue
    }
    if (kind === "contribution") {
      if (
        !validateContributionRule(
          ruleObject,
          fields,
          ruleChecks,
          knownStates,
          knownActions,
        )
      ) {
        continue
      }
      effects.push(entry as ContributionRule)
      continue
    }
    if (kind === "instant") {
      if (
        !validateInstantRule(
          ruleObject,
          fields,
          ruleChecks,
          knownStates,
          knownActions,
        )
      ) {
        continue
      }
      effects.push(entry as InstantRule)
      continue
    }
    const pending = validateModificationRuleShell(
      ruleObject,
      fields,
      ruleChecks,
      knownStates,
    )
    if (pending === undefined) {
      continue
    }
    effects.push(entry as ModificationRule)
    pendingModifications.push(pending)
  }

  const statesById = new Map<string, Record<string, unknown>>()
  for (const entry of statesArray) {
    const stateObject = entry as Record<string, unknown>
    const stateId = stateObject["stateId"]
    if (typeof stateId === "string" && knownStates.has(stateId)) {
      if (!statesById.has(stateId)) {
        statesById.set(stateId, stateObject)
      }
    }
  }

  return {
    ruleSet: {
      schemaVersion: 1,
      ruleSetId,
      revision,
      effects: effects as EffectRule[],
      states: statesArray.filter((entry) =>
        knownStates.has((entry as { stateId: string })["stateId"]),
      ) as RuleSet["states"],
      actions: actionsArray.filter((entry) =>
        knownActions.has((entry as { actionId: string })["actionId"]),
      ) as RuleSet["actions"],
    },
    effectKinds,
    entriesByEffectId,
    statesById,
    knownStates,
    knownActions,
    pendingModifications,
  }
}

function expectStringArray(
  object: Record<string, unknown>,
  field: string,
  collector: IssueCollector,
): unknown[] | undefined {
  const value = object[field]
  if (!Array.isArray(value)) {
    collector.report(
      "INVALID_DEFINITION",
      `/${field}`,
      `Rule set "${field}" must be an array`,
    )
    return undefined
  }
  return value
}

/** 校验来源绑定的结构；prepareEffects 的调用方输入检查复用本函数。 */
export function validateSourceBindings(
  input: unknown,
  collector: IssueCollector,
): SourceBinding[] | undefined {
  if (!Array.isArray(input)) {
    collector.report("INVALID_INPUT", "/bindings", "Bindings must be an array")
    return undefined
  }
  const bindings: SourceBinding[] = []
  const bindingIds = new Set<string>()
  const holderSources = new Set<string>()
  let valid = true
  for (const [index, entry] of input.entries()) {
    const pointer = `/bindings/${index}`
    const checks: FieldChecks = {
      collector,
      structureCode: "INVALID_INPUT",
      pointer,
    }
    const object = expectObject(entry, checks, "source binding")
    if (object === undefined) {
      valid = false
      continue
    }
    const kind = expectLiteral(
      object["kind"],
      ["agent", "drive-disc", "w-engine", "bangboo", "monster", "environment"],
      checks,
      "binding kind",
    )
    if (kind === undefined) {
      valid = false
      continue
    }
    const bindingId = object["bindingId"]
    if (
      typeof bindingId !== "string" ||
      !bindingId.startsWith("binding:") ||
      bindingId.length <= "binding:".length
    ) {
      checks.collector.report(
        "INVALID_INPUT",
        `${pointer}/bindingId`,
        "bindingId must be a non-empty binding: identity",
      )
      valid = false
      continue
    }
    const holderId = object["holderId"]
    if (
      typeof holderId !== "string" ||
      !holderId.startsWith("entity:") ||
      holderId.length <= "entity:".length
    ) {
      checks.collector.report(
        "INVALID_INPUT",
        `${pointer}/holderId`,
        "holderId must be a non-empty entity: identity",
      )
      valid = false
      continue
    }
    const sourceEntityId = expectNonEmptyString(
      object["sourceEntityId"],
      { ...checks, pointer: `${pointer}/sourceEntityId` },
      "sourceEntityId",
    )
    if (sourceEntityId === undefined) {
      valid = false
      continue
    }
    const eligible = object["eligible"]
    if (typeof eligible !== "boolean") {
      checks.collector.report(
        "INVALID_INPUT",
        `${pointer}/eligible`,
        "eligible must be a boolean",
      )
      valid = false
      continue
    }
    const configurationObject = expectObject(
      object["configuration"],
      { ...checks, pointer: `${pointer}/configuration` },
      "binding configuration",
    )
    if (configurationObject === undefined) {
      valid = false
      continue
    }
    const allowedFields = SOURCE_CONFIGURATION_FIELDS[kind]
    for (const key of Object.keys(configurationObject)) {
      if (!allowedFields.includes(key as never)) {
        checks.collector.report(
          "INVALID_INPUT",
          `${pointer}/configuration/${key}`,
          `Configuration field "${key}" is not provided by source kind "${kind}"`,
        )
        valid = false
      }
    }
    for (const field of allowedFields) {
      const value = configurationObject[field]
      if (value === undefined) {
        checks.collector.report(
          "INVALID_INPUT",
          `${pointer}/configuration/${field}`,
          `Required configuration field "${field}" is missing`,
        )
        valid = false
        continue
      }
      const fieldValid =
        field === "mindscapeRank"
          ? isMindscapeRank(value)
          : field === "coreSkillLevel"
            ? isCoreSkillLevel(value)
            : field === "refinement"
              ? isRefinementRank(value)
              : isSetPieceCount(value)
      if (!fieldValid) {
        checks.collector.report(
          "INVALID_INPUT",
          `${pointer}/configuration/${field}`,
          `Configuration field "${field}" has an invalid rank value`,
        )
        valid = false
      }
    }
    if (bindingIds.has(bindingId)) {
      collector.report(
        "DUPLICATE_ID",
        `${pointer}/bindingId`,
        `Binding "${bindingId}" is declared more than once`,
      )
      valid = false
      continue
    }
    bindingIds.add(bindingId)
    const holderSourceKey = `${holderId}\u0000${kind}\u0000${sourceEntityId}`
    if (holderSources.has(holderSourceKey)) {
      collector.report(
        "DUPLICATE_ID",
        pointer,
        `Holder "${holderId}" binds source "${kind}/${sourceEntityId}" more than once`,
      )
      valid = false
      continue
    }
    holderSources.add(holderSourceKey)
    rejectUnknownFields(
      object,
      [
        "kind",
        "bindingId",
        "holderId",
        "sourceEntityId",
        "eligible",
        "configuration",
      ],
      checks,
      "source binding",
    )
    bindings.push({
      kind,
      bindingId: bindingId as SourceBinding["bindingId"],
      holderId: holderId as EntityId,
      sourceEntityId,
      eligible,
      configuration: configurationObject as never,
    })
  }
  return valid ? bindings : undefined
}

export type { Issue }
export { UNITS }
