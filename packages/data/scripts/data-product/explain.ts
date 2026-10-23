import type {
  AgentActionDefinition,
  AgentActionIndex,
  AgentSkillLevelBonus,
} from "./agent-actions.ts"
import { findAgentAction } from "./agent-actions.ts"
import type { StaticEffectsProduct, StaticRule } from "./manifests.ts"
import type {
  StaticCatalog,
  StaticCatalogInput,
  StaticCatalogOption,
  StaticCatalogVariant,
  StaticCoverageMatch,
  StaticCoverageRecord,
  StaticCoverageSupplementalRecord,
  StaticSkillTarget,
  StaticSourceReference,
} from "./static-coverage.ts"
import { queryStaticCoverage } from "./static-coverage.ts"

export type DataIdentityType = "effect" | "option" | "action" | "pointer"

export interface DataIdentity {
  readonly type: DataIdentityType
  readonly value: string
}

export const supportedInputForms = [
  "effectId：agent:…、w-engine:…、disc:…",
  "optionId：agents:…、w-engines:…、drive-discs:…、nanoka:…",
  "actionId：action:agent:…",
  "pointer：/…（static-coverage.json 的 records[].pointer）",
] as const

const effectPrefixes = ["agent:", "w-engine:", "disc:"] as const
const optionPrefixes = [
  "agents:",
  "w-engines:",
  "drive-discs:",
  "nanoka:",
] as const
const actionPrefix = "action:agent:"
const pointerPrefix = "/"

export function isDataIdentityType(value: string): value is DataIdentityType {
  return (
    value === "effect" ||
    value === "option" ||
    value === "action" ||
    value === "pointer"
  )
}

function matchesIdentityType(value: string, type: DataIdentityType): boolean {
  switch (type) {
    case "effect":
      return effectPrefixes.some((prefix) => value.startsWith(prefix))
    case "option":
      return optionPrefixes.some((prefix) => value.startsWith(prefix))
    case "action":
      return value.startsWith(actionPrefix)
    case "pointer":
      return value.startsWith(pointerPrefix)
  }
}

/**
 * 按文档化的 ID 前缀识别四类输入。无法识别或未来出现多重匹配时返回
 * undefined，由调用方给出明确错误；不会根据内容猜测类型。
 */
export function identifyDataIdentity(
  input: string,
  type?: DataIdentityType,
): DataIdentity | undefined {
  const value = input.trim()
  if (value.length === 0) return undefined
  if (type !== undefined)
    return matchesIdentityType(value, type) ? { type, value } : undefined
  const matches = (["effect", "option", "action", "pointer"] as const).filter(
    (candidate) => matchesIdentityType(value, candidate),
  )
  if (matches.length !== 1) return undefined
  return { type: matches[0], value }
}

export type ExplainErrorCode =
  | "UNKNOWN_INPUT_TYPE"
  | "NOT_FOUND"
  | "INVALID_ARGUMENT"

export class ExplainError extends Error {
  readonly code: ExplainErrorCode

  constructor(code: ExplainErrorCode, message: string) {
    super(message)
    this.name = "ExplainError"
    this.code = code
  }
}

export interface ExplainSourceReference {
  readonly sourceId: string
  readonly version: string
  readonly locale: string | null
  readonly resourcePath: string
  readonly pointer: string
}

export interface ExplainDifference {
  readonly differenceId: string
  readonly explanation: string
  readonly references: readonly ExplainSourceReference[]
}

export interface ExplainOptionInput {
  readonly name: string
  readonly unit: string
  readonly description: string
  readonly preset: number | null
}

export interface ExplainRule {
  readonly effectId: string
  readonly kind: "contribution" | "instant" | "modification"
  readonly operationKind: string | null
  readonly triggerEventKinds: readonly string[]
  readonly scope: string | null
  readonly activationKind: string | null
  readonly beneficiaryKind: string | null
  readonly parameterNames: readonly string[]
  readonly phase: string | null
  readonly targetEffectId: string | null
  readonly targetStateId: string | null
  readonly modifications: readonly Readonly<Record<string, unknown>>[]
  readonly source: {
    readonly identity: StaticRule["source"]["identity"]
    readonly section: string
    readonly references: readonly ExplainSourceReference[]
  }
}

export interface ExplainCatalogReference {
  readonly optionId: string
  readonly catalogEntityId: string
  readonly name: string
  readonly target: string
  readonly variantIndex: number
  readonly status: string | null
  readonly configuration: Readonly<Record<string, unknown>> | null
  readonly effectIds: readonly string[]
  readonly references: readonly ExplainSourceReference[]
  readonly differences: readonly ExplainDifference[]
  readonly reason: string | null
  readonly explanation: string | null
}

export interface ExplainOptionVariant {
  readonly index: number
  readonly status: string | null
  readonly target: string | null
  readonly configuration: Readonly<Record<string, unknown>> | null
  readonly maximumLayers: number | null
  readonly effectIds: readonly string[]
  readonly references: readonly ExplainSourceReference[]
  readonly inputs: readonly ExplainOptionInput[]
  readonly differences: readonly ExplainDifference[]
  readonly reason: string | null
  readonly explanation: string | null
}

export interface ExplainOption {
  readonly optionId: string
  readonly catalogEntityId: string
  readonly name: string
  readonly conditionDescription: string
  readonly target: string
  readonly exclusiveGroup: string | null
  readonly effectIds: readonly string[]
  readonly statuses: readonly string[]
  readonly variants: readonly ExplainOptionVariant[]
  readonly rules: readonly ExplainRule[]
}

export interface ExplainCoverageRecord {
  readonly pointer: string
  readonly catalogEntityId: string
  readonly rank: number
  readonly rankKind: string
  readonly stat: string
  readonly optionId: string
  readonly effectIds: readonly string[]
  readonly status: string
  readonly normalizationChanges: readonly string[]
  readonly rawValue: number
  readonly normalizedValue: number
  readonly reason: string | null
  readonly explanation: string | null
}

export interface ExplainSupplementalRecord {
  readonly supplementId: string
  readonly source: string
  readonly kind: string
  readonly optionId: string
  readonly catalogEntityId: string | null
  readonly effectIds: readonly string[]
  readonly status: string
  readonly reason: string | null
  readonly supportedRanks: string
  readonly computationTarget: string
}

export interface ExplainCoverage {
  readonly records: readonly ExplainCoverageRecord[]
  readonly supplementalRecords: readonly ExplainSupplementalRecord[]
}

export interface ExplainStaticEffects {
  readonly ruleSetId: string
  readonly revision: string
  readonly source: {
    readonly repository: string
    readonly commit: string
  }
}

const notAutoLinked = "未自动关联测试/文档"

export interface ExplainResultBase {
  readonly schemaVersion: 1
  readonly input: string
  readonly staticEffects: ExplainStaticEffects
  readonly limitations: readonly string[]
  readonly relatedTestsAndDocs: string
}

export interface EffectExplainResult extends ExplainResultBase {
  readonly type: "effect"
  readonly effectId: string
  readonly rule: ExplainRule | null
  readonly catalogReferences: readonly ExplainCatalogReference[]
  readonly modifications: readonly ExplainRule[]
  readonly coverage: ExplainCoverage
}

export interface OptionExplainResult extends ExplainResultBase {
  readonly type: "option"
  readonly optionId: string
  readonly option: ExplainOption
  readonly coverage: ExplainCoverage
}

export interface ActionExplainResult extends ExplainResultBase {
  readonly type: "action"
  readonly actionId: string
  readonly agentEntityId: string
  readonly definitionPath: string
  readonly action: AgentActionDefinition
  readonly skillLevelBonuses: readonly AgentSkillLevelBonus[]
  readonly skillTargets: readonly StaticSkillTarget[]
  readonly conditionalSkillTargets: readonly StaticSkillTarget[]
  readonly skillTargetAssociation: "structured" | "partial" | "none"
  readonly conditionalSkillTargetAssociation: "structured" | "partial" | "none"
}

export interface PointerExplainResult extends ExplainResultBase {
  readonly type: "pointer"
  readonly pointer: string
  readonly records: readonly ExplainCoverageRecord[]
  readonly options: readonly ExplainOption[]
  readonly rules: readonly ExplainRule[]
}

export type ExplainResult =
  | EffectExplainResult
  | OptionExplainResult
  | ActionExplainResult
  | PointerExplainResult

export interface ExplainSources {
  readonly staticEffects: StaticEffectsProduct
  readonly agentActions: AgentActionIndex
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values)].toSorted(compareText)
}

function staticEffectsSummary(
  product: StaticEffectsProduct,
): ExplainStaticEffects {
  return {
    ruleSetId: product.catalog.ruleSetId,
    revision: product.catalog.revision,
    source: {
      repository: product.catalog.source.repository,
      commit: product.catalog.source.commit,
    },
  }
}

function normalizeReference(
  reference: StaticSourceReference,
): ExplainSourceReference {
  return {
    sourceId: reference.sourceId,
    version: reference.version,
    locale: reference.locale ?? null,
    resourcePath: reference.resourcePath,
    pointer: reference.pointer,
  }
}

function normalizeInput(input: StaticCatalogInput): ExplainOptionInput {
  return {
    name: input.name,
    unit: input.unit,
    description: input.description,
    preset: input.preset ?? null,
  }
}

function normalizeDifferences(
  catalog: StaticCatalog,
  differenceIds: readonly string[],
): readonly ExplainDifference[] {
  const byId = new Map(
    catalog.differences.map((difference) => [
      difference.differenceId,
      difference,
    ]),
  )
  return uniqueSorted(differenceIds).map((differenceId) => {
    const difference = byId.get(differenceId)
    if (difference === undefined)
      throw new ExplainError(
        "NOT_FOUND",
        `catalog 变体引用了未登记的 differenceId "${differenceId}"。`,
      )
    return {
      differenceId,
      explanation: difference.explanation,
      references: difference.references.map(normalizeReference),
    }
  })
}

function normalizeRule(rule: StaticRule): ExplainRule {
  return {
    effectId: rule.effectId,
    kind: rule.kind,
    operationKind:
      rule.kind === "contribution" || rule.kind === "instant"
        ? rule.operationKind
        : null,
    triggerEventKinds:
      rule.kind === "instant" ? [...rule.triggerEventKinds] : [],
    scope: rule.kind === "contribution" ? rule.scope : null,
    activationKind: rule.kind === "contribution" ? rule.activationKind : null,
    beneficiaryKind:
      rule.kind === "contribution" || rule.kind === "instant"
        ? rule.beneficiaryKind
        : null,
    parameterNames:
      rule.kind === "contribution" ? [...rule.parameterNames] : [],
    phase: rule.kind === "modification" ? rule.phase : null,
    targetEffectId:
      rule.kind === "modification" && rule.target.kind === "effect"
        ? rule.target.effectId
        : null,
    targetStateId:
      rule.kind === "modification" && rule.target.kind === "state"
        ? rule.target.stateId
        : null,
    modifications: rule.kind === "modification" ? [...rule.modifications] : [],
    source: {
      identity: { ...rule.source.identity },
      section: rule.source.section,
      references: rule.source.references.map(normalizeReference),
    },
  }
}

function rulesForEffectIds(
  rules: readonly StaticRule[],
  effectIds: readonly string[],
): readonly ExplainRule[] {
  const wanted = new Set(effectIds)
  return rules
    .filter((rule) => wanted.has(rule.effectId))
    .map(normalizeRule)
    .toSorted((left, right) => compareText(left.effectId, right.effectId))
}

function normalizeVariant(
  index: number,
  variant: StaticCatalogVariant,
  catalog: StaticCatalog,
): ExplainOptionVariant {
  return {
    index,
    status: variant.status ?? null,
    target: variant.target ?? null,
    configuration: variant.configuration ?? null,
    maximumLayers: variant.maximumLayers ?? null,
    effectIds: [...variant.effectIds],
    references: (variant.references ?? []).map(normalizeReference),
    inputs: (variant.inputs ?? []).map(normalizeInput),
    differences: normalizeDifferences(catalog, variant.differences),
    reason: variant.reason ?? null,
    explanation: variant.explanation ?? null,
  }
}

function normalizeOption(
  option: StaticCatalogOption,
  product: StaticEffectsProduct,
): ExplainOption {
  const variants = option.variants.map((variant, index) =>
    normalizeVariant(index, variant, product.catalog),
  )
  const effectIds = uniqueSorted(
    variants.flatMap((variant) => variant.effectIds),
  )
  return {
    optionId: option.optionId,
    catalogEntityId: option.catalogEntityId,
    name: option.name,
    conditionDescription: option.conditionDescription,
    target: option.target,
    exclusiveGroup: option.exclusiveGroup ?? null,
    effectIds,
    statuses: uniqueSorted(
      variants
        .map((variant) => variant.status)
        .filter((status): status is string => status !== null),
    ),
    variants,
    rules: rulesForEffectIds(product.rules, effectIds),
  }
}

function normalizeRecord(record: StaticCoverageRecord): ExplainCoverageRecord {
  return {
    pointer: record.pointer,
    catalogEntityId: record.catalogEntityId,
    rank: record.rank,
    rankKind: record.rankKind,
    stat: record.stat,
    optionId: record.optionId,
    effectIds: [...record.effectIds],
    status: record.status,
    normalizationChanges: [...record.normalizationChanges],
    rawValue: record.rawValue,
    normalizedValue: record.normalizedValue,
    reason: record.reason ?? null,
    explanation: record.explanation ?? null,
  }
}

function normalizeSupplementalRecord(
  record: StaticCoverageSupplementalRecord & {
    readonly catalogEntityId?: string
  },
): ExplainSupplementalRecord {
  return {
    supplementId: record.supplementId,
    source: record.source,
    kind: record.kind,
    optionId: record.optionId,
    catalogEntityId: record.catalogEntityId ?? null,
    effectIds: [...(record.effectIds ?? [])],
    status: record.status,
    reason: record.reason ?? null,
    supportedRanks: record.supportedRanks,
    computationTarget: record.computationTarget,
  }
}

function partitionCoverage(
  matches: readonly StaticCoverageMatch[],
): ExplainCoverage {
  const records: ExplainCoverageRecord[] = []
  const supplementalRecords: ExplainSupplementalRecord[] = []
  for (const match of matches) {
    if (match.group === "records") records.push(normalizeRecord(match))
    else supplementalRecords.push(normalizeSupplementalRecord(match))
  }
  records.sort(
    (left, right) =>
      compareText(left.pointer, right.pointer) ||
      compareText(left.optionId, right.optionId) ||
      compareText(left.stat, right.stat),
  )
  supplementalRecords.sort((left, right) =>
    compareText(left.supplementId, right.supplementId),
  )
  return { records, supplementalRecords }
}

function deferredMechanismLimitations(
  product: StaticEffectsProduct,
  catalogEntityIds: readonly string[],
): readonly string[] {
  const wanted = new Set(catalogEntityIds)
  return product.coverage.deferredMechanisms
    .filter((mechanism) => wanted.has(mechanism.catalogEntityId))
    .toSorted(
      (left, right) =>
        compareText(left.catalogEntityId, right.catalogEntityId) ||
        compareText(left.reason, right.reason),
    )
    .map(
      (mechanism) =>
        `${mechanism.catalogEntityId}（${mechanism.reason}）：${mechanism.explanation}`,
    )
}

function catalogReferencesForEffect(
  catalog: StaticCatalog,
  effectId: string,
): readonly ExplainCatalogReference[] {
  const references: ExplainCatalogReference[] = []
  for (const option of catalog.options) {
    option.variants.forEach((variant, variantIndex) => {
      if (!variant.effectIds.includes(effectId)) return
      references.push({
        optionId: option.optionId,
        catalogEntityId: option.catalogEntityId,
        name: option.name,
        target: option.target,
        variantIndex,
        status: variant.status ?? null,
        configuration: variant.configuration ?? null,
        effectIds: [...variant.effectIds],
        references: (variant.references ?? []).map(normalizeReference),
        differences: normalizeDifferences(catalog, variant.differences),
        reason: variant.reason ?? null,
        explanation: variant.explanation ?? null,
      })
    })
  }
  return references.toSorted(
    (left, right) =>
      compareText(left.optionId, right.optionId) ||
      left.variantIndex - right.variantIndex,
  )
}

function effectCatalogEntityIds(
  references: readonly ExplainCatalogReference[],
  coverage: ExplainCoverage,
): readonly string[] {
  return uniqueSorted([
    ...references.map((reference) => reference.catalogEntityId),
    ...coverage.records.map((record) => record.catalogEntityId),
    ...coverage.supplementalRecords.flatMap((record) =>
      record.catalogEntityId === null ? [] : [record.catalogEntityId],
    ),
  ])
}

export function explainEffect(
  effectId: string,
  product: StaticEffectsProduct,
): EffectExplainResult {
  const rule = product.rules.find(
    (candidate) => candidate.effectId === effectId,
  )
  const catalogReferences = catalogReferencesForEffect(
    product.catalog,
    effectId,
  )
  const modifications = product.rules
    .filter(
      (candidate) =>
        candidate.kind === "modification" &&
        candidate.target.kind === "effect" &&
        candidate.target.effectId === effectId,
    )
    .map(normalizeRule)
    .toSorted((left, right) => compareText(left.effectId, right.effectId))
  const coverageQuery = queryStaticCoverage(
    { catalog: product.catalog, coverage: product.coverage },
    { effectId },
  )
  const coverage = partitionCoverage(coverageQuery.matches)

  if (
    rule === undefined &&
    catalogReferences.length === 0 &&
    modifications.length === 0 &&
    coverage.records.length === 0 &&
    coverage.supplementalRecords.length === 0
  )
    throw new ExplainError(
      "NOT_FOUND",
      `未找到 effectId "${effectId}" 的规则、目录引用、覆盖记录或 modification 关联。`,
    )

  const limitations = [...coverageQuery.limitations]
  if (rule === undefined)
    limitations.push(`static.json 中未找到 effectId "${effectId}" 的规则定义。`)
  if (catalogReferences.length === 0)
    limitations.push("未找到引用该 effectId 的 catalog variants/options。")
  if (
    coverage.records.length === 0 &&
    coverage.supplementalRecords.length === 0
  )
    limitations.push(
      "static-coverage.json 中未找到按 effectId 关联的 records 或 supplementalRecords。",
    )
  limitations.push(
    ...deferredMechanismLimitations(
      product,
      effectCatalogEntityIds(catalogReferences, coverage),
    ),
  )

  return {
    schemaVersion: 1,
    type: "effect",
    input: effectId,
    staticEffects: staticEffectsSummary(product),
    effectId,
    rule: rule === undefined ? null : normalizeRule(rule),
    catalogReferences,
    modifications,
    coverage,
    limitations,
    relatedTestsAndDocs: notAutoLinked,
  }
}

export function explainOption(
  optionId: string,
  product: StaticEffectsProduct,
): OptionExplainResult {
  const option = product.catalog.options.find(
    (candidate) => candidate.optionId === optionId,
  )
  if (option === undefined)
    throw new ExplainError(
      "NOT_FOUND",
      `catalog 中未找到 optionId "${optionId}"。`,
    )

  const normalizedOption = normalizeOption(option, product)
  const coverageQuery = queryStaticCoverage(
    { catalog: product.catalog, coverage: product.coverage },
    { optionId },
  )
  const coverage = partitionCoverage(coverageQuery.matches)
  const limitations = [...coverageQuery.limitations]

  if (
    coverage.records.length === 0 &&
    coverage.supplementalRecords.length === 0
  )
    limitations.push(
      "static-coverage.json 中未找到该 optionId 的 records 或 supplementalRecords。",
    )
  for (const variant of normalizedOption.variants) {
    if (variant.status !== "unsupported") continue
    limitations.push(
      `变体 ${variant.index}（unsupported）：${variant.reason ?? "未提供 reason"}${variant.explanation === null ? "" : ` — ${variant.explanation}`}`,
    )
  }
  limitations.push(
    ...deferredMechanismLimitations(product, [option.catalogEntityId]),
  )

  return {
    schemaVersion: 1,
    type: "option",
    input: optionId,
    staticEffects: staticEffectsSummary(product),
    optionId,
    option: normalizedOption,
    coverage,
    limitations,
    relatedTestsAndDocs: notAutoLinked,
  }
}

function skillTargetAssociationFor(
  declaredCount: number,
  missing: readonly string[],
): "structured" | "partial" | "none" {
  return declaredCount === 0
    ? "none"
    : missing.length === 0
      ? "structured"
      : "partial"
}

function unavailableCalculationLimitations(
  calculation: Readonly<Record<string, unknown>>,
): readonly string[] {
  if (calculation.kind !== "unavailable") return []
  const issues = Array.isArray(calculation.issues) ? calculation.issues : []
  if (issues.length === 0)
    return ["动作目录将其登记为 unavailable，但没有提供具体原因。"]
  return issues.map((issue) => {
    if (issue === null || typeof issue !== "object")
      return "动作目录将其登记为 unavailable，但问题项形状无法解释。"
    const record = issue as Readonly<Record<string, unknown>>
    const code = typeof record.code === "string" ? record.code : "unknown"
    const message =
      typeof record.message === "string" ? record.message : "未提供说明"
    return `动作目录将其登记为 unavailable（${code}）：${message}`
  })
}

export function explainAction(
  actionId: string,
  product: StaticEffectsProduct,
  actionIndex: AgentActionIndex,
): ActionExplainResult {
  const found = findAgentAction(actionIndex, actionId)
  if (found === undefined)
    throw new ExplainError(
      "NOT_FOUND",
      `definitions/skills/agents/*.json 中未找到 actionId "${actionId}"。`,
    )

  const targetById = new Map(
    product.catalog.skillTargets.map((target) => [target.targetId, target]),
  )
  const resolveTargets = (
    targetIds: readonly string[],
  ): {
    readonly resolved: readonly StaticSkillTarget[]
    readonly missing: readonly string[]
  } => {
    const resolved: StaticSkillTarget[] = []
    const missing: string[] = []
    for (const targetId of targetIds) {
      const target = targetById.get(targetId)
      if (target === undefined) missing.push(targetId)
      else resolved.push({ ...target })
    }
    return { resolved, missing }
  }
  const unconditional = resolveTargets(found.action.skillTargetIds)
  const conditional = resolveTargets(
    found.action.conditionalIdentity?.skillTargetIds ?? [],
  )
  const skillTargets = unconditional.resolved
  const conditionalSkillTargets = conditional.resolved
  const skillTargetAssociation = skillTargetAssociationFor(
    found.action.skillTargetIds.length,
    unconditional.missing,
  )
  const conditionalSkillTargetAssociation = skillTargetAssociationFor(
    found.action.conditionalIdentity?.skillTargetIds.length ?? 0,
    conditional.missing,
  )
  const missingTargetIds = [
    ...new Set([...unconditional.missing, ...conditional.missing]),
  ]
  const limitations = [
    ...unavailableCalculationLimitations(found.action.calculation),
  ]
  if (
    skillTargetAssociation === "none" &&
    conditionalSkillTargetAssociation === "none"
  )
    limitations.push(
      "静态目录未提供与该动作的结构化 skill target 关联（action.skillTargetIds 与 conditionalIdentity.skillTargetIds 均为空）。",
    )
  if (missingTargetIds.length > 0)
    limitations.push(
      `catalog.skillTargets 中未找到 targetId：${missingTargetIds.join(", ")}。`,
    )

  return {
    schemaVersion: 1,
    type: "action",
    input: actionId,
    staticEffects: staticEffectsSummary(product),
    actionId,
    agentEntityId: found.file.entityId,
    definitionPath: found.file.definitionPath,
    action: found.action,
    skillLevelBonuses: found.file.skillLevelBonuses.filter((bonus) =>
      bonus.groups.includes(found.action.levelGroup),
    ),
    skillTargets,
    conditionalSkillTargets,
    skillTargetAssociation,
    conditionalSkillTargetAssociation,
    limitations,
    relatedTestsAndDocs: notAutoLinked,
  }
}

export function explainPointer(
  pointer: string,
  product: StaticEffectsProduct,
): PointerExplainResult {
  const coverageQuery = queryStaticCoverage(
    { catalog: product.catalog, coverage: product.coverage },
    { pointer },
  )
  const coverage = partitionCoverage(coverageQuery.matches)
  if (coverage.records.length === 0)
    throw new ExplainError(
      "NOT_FOUND",
      `static-coverage.json 的 records 中未找到 pointer "${pointer}"。`,
    )

  const optionIds = uniqueSorted(
    coverage.records.map((record) => record.optionId),
  )
  const options = optionIds.flatMap((optionId) => {
    const option = product.catalog.options.find(
      (candidate) => candidate.optionId === optionId,
    )
    return option === undefined ? [] : [normalizeOption(option, product)]
  })
  const effectIds = uniqueSorted(
    coverage.records.flatMap((record) => record.effectIds),
  )
  const rules = rulesForEffectIds(product.rules, effectIds)
  const limitations = [...coverageQuery.limitations]

  const missingOptionIds = optionIds.filter(
    (optionId) => !options.some((option) => option.optionId === optionId),
  )
  if (missingOptionIds.length > 0)
    limitations.push(
      `catalog 中未找到 optionId：${missingOptionIds.join(", ")}。`,
    )
  const missingRuleIds = effectIds.filter(
    (effectId) => !rules.some((rule) => rule.effectId === effectId),
  )
  if (missingRuleIds.length > 0)
    limitations.push(
      `static.json 中未找到 effectId：${missingRuleIds.join(", ")}。`,
    )
  limitations.push(
    ...deferredMechanismLimitations(
      product,
      coverage.records.map((record) => record.catalogEntityId),
    ),
  )

  return {
    schemaVersion: 1,
    type: "pointer",
    input: pointer,
    staticEffects: staticEffectsSummary(product),
    pointer,
    records: coverage.records,
    options,
    rules,
    limitations,
    relatedTestsAndDocs: notAutoLinked,
  }
}

/** 纯函数入口：识别输入类型并返回稳定的解释结构。 */
export function explainDataIdentity(
  input: string,
  sources: ExplainSources,
  type?: DataIdentityType,
): ExplainResult {
  const identity = identifyDataIdentity(input, type)
  if (identity === undefined)
    throw new ExplainError(
      "UNKNOWN_INPUT_TYPE",
      `无法识别或无法唯一识别输入 "${input}"${type === undefined ? "" : `（--type ${type}）`}。`,
    )

  switch (identity.type) {
    case "effect":
      return explainEffect(identity.value, sources.staticEffects)
    case "option":
      return explainOption(identity.value, sources.staticEffects)
    case "action":
      return explainAction(
        identity.value,
        sources.staticEffects,
        sources.agentActions,
      )
    case "pointer":
      return explainPointer(identity.value, sources.staticEffects)
  }
}

export function serializeExplainResult(result: ExplainResult): string {
  return JSON.stringify(result, null, 2)
}

function formatCoefficient(
  coefficient: {
    readonly levelGroup: string
    readonly base: number
    readonly growth: number
  } | null,
): string {
  if (coefficient === null) return "无"
  return `levelGroup=${coefficient.levelGroup}, base=${coefficient.base}, growth=${coefficient.growth}`
}

function formatCalculation(
  calculation: Readonly<Record<string, unknown>>,
): readonly string[] {
  const kind =
    typeof calculation.kind === "string" ? calculation.kind : "unknown"
  if (kind === "damage") {
    const segments = Array.isArray(calculation.segments)
      ? calculation.segments
      : []
    return [
      `  计算结构：damage（${segments.length} 段）`,
      ...segments.map((segment, index) => {
        if (segment === null || typeof segment !== "object")
          return `    段 ${index}：形状无法解释`
        const record = segment as Readonly<Record<string, unknown>>
        const items = Array.isArray(record.items) ? record.items : []
        return `    段 ${index}：${String(record.segmentId)}；damageKind=${String(record.damageKind)}；element=${String(record.element)}；granularity=${String(record.granularity)}；repeat=${String(record.repeat)}；items=${items.length}`
      }),
    ]
  }
  if (kind === "luminize") {
    const multiplier =
      calculation.multiplier !== null &&
      typeof calculation.multiplier === "object"
        ? (calculation.multiplier as Readonly<Record<string, unknown>>)
        : undefined
    return [
      `  计算结构：luminize；multiplier=${
        multiplier === undefined
          ? "无"
          : `levelGroup=${String(multiplier.levelGroup)}, base=${String(multiplier.base)}, growth=${String(multiplier.growth)}`
      }`,
    ]
  }
  if (kind === "daze-only") return ["  计算结构：daze-only（仅失衡倍率）"]
  if (kind === "unavailable") {
    const issues = Array.isArray(calculation.issues) ? calculation.issues : []
    return [
      "  计算结构：unavailable",
      ...issues.map((issue) => {
        if (issue === null || typeof issue !== "object")
          return "    - 形状无法解释的问题项"
        const record = issue as Readonly<Record<string, unknown>>
        return `    - ${String(record.code)}：${String(record.message)}`
      }),
    ]
  }
  return [`  计算结构：${kind}`]
}

function formatSourceReference(reference: ExplainSourceReference): string {
  const locale = reference.locale === null ? "" : `（${reference.locale}）`
  return `${reference.sourceId}@${reference.version}${locale} ${reference.resourcePath} ${reference.pointer}`
}

function formatRule(rule: ExplainRule): readonly string[] {
  const lines = [`  effectId：${rule.effectId}`, `  kind：${rule.kind}`]
  if (rule.kind === "contribution") {
    lines.push(
      `  operation：${rule.operationKind}`,
      `  scope：${rule.scope}`,
      `  activation：${rule.activationKind}`,
      `  beneficiary：${rule.beneficiaryKind}`,
      `  参数：${rule.parameterNames.length === 0 ? "无" : rule.parameterNames.join(", ")}`,
    )
  } else if (rule.kind === "instant") {
    lines.push(
      `  trigger：${rule.triggerEventKinds.join(", ")}`,
      `  beneficiary：${rule.beneficiaryKind}`,
      `  operation：${rule.operationKind}`,
    )
  } else {
    lines.push(
      `  phase：${rule.phase}`,
      `  target：${
        rule.targetEffectId === null
          ? `state ${rule.targetStateId}`
          : `effect ${rule.targetEffectId}`
      }`,
      `  变更：${JSON.stringify(rule.modifications)}`,
    )
  }
  lines.push(
    `  来源实体：${rule.source.identity.kind}:${rule.source.identity.entityId}`,
    `  段落：${rule.source.section.length === 0 ? "无" : rule.source.section}`,
  )
  if (rule.source.references.length === 0) lines.push("  来源引用：无")
  else {
    lines.push("  来源引用：")
    for (const reference of rule.source.references)
      lines.push(`    - ${formatSourceReference(reference)}`)
  }
  return lines
}

function formatCoverage(
  title: string,
  coverage: ExplainCoverage,
): readonly string[] {
  const lines = [`${title} records（${coverage.records.length}）：`]
  if (coverage.records.length === 0) lines.push("  - 无")
  for (const record of coverage.records) {
    lines.push(
      `  - ${record.pointer}：${record.status}；raw=${record.rawValue}，normalized=${record.normalizedValue}`,
      `    ${record.rankKind} ${record.rank} / ${record.stat}；optionId=${record.optionId}`,
      `    effectIds=${record.effectIds.length === 0 ? "无" : record.effectIds.join(", ")}`,
    )
    if (record.normalizationChanges.length > 0)
      lines.push(
        `    normalizationChanges=${record.normalizationChanges.join(", ")}`,
      )
    if (record.reason !== null) lines.push(`    reason=${record.reason}`)
    if (record.explanation !== null)
      lines.push(`    explanation=${record.explanation}`)
  }
  lines.push(
    `${title} supplementalRecords（${coverage.supplementalRecords.length}）：`,
  )
  if (coverage.supplementalRecords.length === 0) lines.push("  - 无")
  for (const record of coverage.supplementalRecords) {
    lines.push(
      `  - ${record.supplementId}：${record.status}；kind=${record.kind}；optionId=${record.optionId}`,
      `    source=${record.source}`,
      `    supportedRanks=${record.supportedRanks}；computationTarget=${record.computationTarget}`,
      `    effectIds=${record.effectIds.length === 0 ? "无" : record.effectIds.join(", ")}`,
    )
    if (record.reason !== null) lines.push(`    reason=${record.reason}`)
  }
  return lines
}

function formatLimitations(limitations: readonly string[]): readonly string[] {
  if (limitations.length === 0) return ["限制与说明：无"]
  return [
    "限制与说明：",
    ...limitations.map((limitation) => `  - ${limitation}`),
  ]
}

function formatEffect(result: EffectExplainResult): readonly string[] {
  const lines = [`effectId：${result.effectId}`]
  if (result.rule === null) lines.push("规则：static.json 中未找到。")
  else lines.push("规则：", ...formatRule(result.rule))
  lines.push(`目录引用（${result.catalogReferences.length} 个选项变体）：`)
  if (result.catalogReferences.length === 0) lines.push("  - 无")
  for (const reference of result.catalogReferences) {
    lines.push(
      `  - ${reference.optionId}（${reference.name}）`,
      `    变体 ${reference.variantIndex}：${reference.status ?? "未提供 status"}；实体=${reference.catalogEntityId}；目标=${reference.target}`,
      `    配置：${reference.configuration === null ? "未提供" : JSON.stringify(reference.configuration)}`,
      `    差异：${reference.differences.length === 0 ? "无" : reference.differences.map((difference) => difference.differenceId).join(", ")}`,
      `    effectIds：${reference.effectIds.join(", ")}`,
    )
    if (reference.reason !== null) lines.push(`    reason=${reference.reason}`)
    if (reference.explanation !== null)
      lines.push(`    explanation=${reference.explanation}`)
    if (reference.references.length === 0) lines.push("    来源引用：无")
    else {
      lines.push("    来源引用：")
      for (const source of reference.references)
        lines.push(`      - ${formatSourceReference(source)}`)
    }
  }
  lines.push(
    `以该 effectId 为 target 的 modification（${result.modifications.length}）：`,
  )
  if (result.modifications.length === 0) lines.push("  - 无")
  for (const modification of result.modifications)
    lines.push(`  - ${modification.effectId}（phase=${modification.phase}）`)
  lines.push(...formatCoverage("覆盖", result.coverage))
  lines.push(...formatLimitations(result.limitations))
  lines.push(result.relatedTestsAndDocs)
  return lines
}

function formatOption(result: OptionExplainResult): readonly string[] {
  const option = result.option
  const lines = [
    `optionId：${option.optionId}`,
    `实体：${option.catalogEntityId}`,
    `名称：${option.name}`,
    `目标：${option.target}`,
    `互斥组：${option.exclusiveGroup ?? "无"}`,
    `条件：${option.conditionDescription.length === 0 ? "无" : option.conditionDescription}`,
    `汇总 effectIds（${option.effectIds.length}）：${option.effectIds.length === 0 ? "无" : option.effectIds.join(", ")}`,
    `状态：${option.statuses.length === 0 ? "未提供" : option.statuses.join(", ")}`,
    `变体（${option.variants.length}）：`,
  ]
  for (const variant of option.variants) {
    lines.push(
      `  - 变体 ${variant.index}：${variant.status ?? "未提供 status"}；target=${variant.target ?? "未提供"}；maximumLayers=${variant.maximumLayers ?? "未提供"}`,
      `    配置：${variant.configuration === null ? "未提供" : JSON.stringify(variant.configuration)}`,
      `    effectIds：${variant.effectIds.length === 0 ? "无" : variant.effectIds.join(", ")}`,
      `    差异：${variant.differences.length === 0 ? "无" : variant.differences.map((difference) => difference.differenceId).join(", ")}`,
    )
    if (variant.inputs.length === 0) lines.push("    输入：无")
    else {
      lines.push("    输入：")
      for (const input of variant.inputs)
        lines.push(
          `      - ${input.name}（${input.unit}）${input.preset === null ? "" : `，preset=${input.preset}`}：${input.description}`,
        )
    }
    for (const difference of variant.differences)
      lines.push(
        `    差异 ${difference.differenceId}：${difference.explanation}`,
      )
    if (variant.reason !== null) lines.push(`    reason=${variant.reason}`)
    if (variant.explanation !== null)
      lines.push(`    explanation=${variant.explanation}`)
    if (variant.references.length === 0) lines.push("    来源引用：无")
    else {
      lines.push("    来源引用：")
      for (const reference of variant.references)
        lines.push(`      - ${formatSourceReference(reference)}`)
    }
  }
  lines.push(`规则（${option.rules.length}）：`)
  if (option.rules.length === 0) lines.push("  - 无")
  else for (const rule of option.rules) lines.push(...formatRule(rule))
  lines.push(...formatCoverage("覆盖", result.coverage))
  lines.push(...formatLimitations(result.limitations))
  lines.push(result.relatedTestsAndDocs)
  return lines
}

function formatAction(result: ActionExplainResult): readonly string[] {
  const action = result.action
  const lines = [
    `动作定义：${result.definitionPath}`,
    `actionId：${result.actionId}`,
    `名称：${action.name}（${action.rowName}）`,
    `branchId：${action.branchId}`,
    `levelGroup：${action.levelGroup}`,
    `skillCategory：${action.skillCategory ?? "无"}`,
    `来源：${action.source.path} ${action.source.pointer}`,
    `描述：${action.description.length === 0 ? "无" : action.description}`,
    `参数：${action.parameterIds.length === 0 ? "无" : action.parameterIds.join(", ")}`,
    `来源表达式：${action.sourceExpression}`,
    `伤害系数：${formatCoefficient(action.damageCoefficient)}`,
    `失衡系数：${formatCoefficient(action.dazeCoefficient)}`,
    ...formatCalculation(action.calculation),
    `潜能等级：${action.potentialLevels === undefined ? "无" : action.potentialLevels.join(", ")}`,
    `技能等级加成（${result.skillLevelBonuses.length}）：`,
  ]
  if (result.skillLevelBonuses.length === 0) lines.push("  - 无")
  for (const bonus of result.skillLevelBonuses)
    lines.push(
      `  - 影画 ${bonus.minimumMindscapeRank} 起：${bonus.groups.join("/")} +${bonus.bonus}；来源 ${bonus.source.path} ${bonus.source.pointer}`,
    )
  lines.push(
    `静态目录 skill target 关联（无条件）：${result.skillTargetAssociation}`,
  )
  if (result.skillTargets.length === 0) lines.push("  - 无")
  for (const target of result.skillTargets)
    lines.push(
      `  - ${target.targetId}（${target.category}，agentEntityId=${target.agentEntityId ?? "null"}，followUp=${target.countsAsFollowUp}）：${target.name}`,
    )
  if (action.conditionalIdentity !== undefined) {
    lines.push(
      `静态目录 skill target 关联（条件）：${result.conditionalSkillTargetAssociation}`,
      `  - 需额外能力激活=${action.conditionalIdentity.requiresAdditionalAbilityActive}；潜能 ${action.conditionalIdentity.potentialLevels.join("/")}`,
    )
    if (result.conditionalSkillTargets.length === 0) lines.push("  - 无")
    for (const target of result.conditionalSkillTargets)
      lines.push(
        `  - ${target.targetId}（${target.category}，agentEntityId=${target.agentEntityId ?? "null"}，followUp=${target.countsAsFollowUp}）：${target.name}`,
      )
  }
  lines.push(...formatLimitations(result.limitations))
  lines.push(result.relatedTestsAndDocs)
  return lines
}

function formatPointer(result: PointerExplainResult): readonly string[] {
  const lines = [
    `pointer：${result.pointer}`,
    `覆盖记录（${result.records.length}）：`,
  ]
  for (const record of result.records) {
    lines.push(
      `  - ${record.pointer}：${record.status}；raw=${record.rawValue}，normalized=${record.normalizedValue}`,
      `    ${record.rankKind} ${record.rank} / ${record.stat}；optionId=${record.optionId}`,
      `    effectIds=${record.effectIds.length === 0 ? "无" : record.effectIds.join(", ")}`,
    )
    if (record.normalizationChanges.length > 0)
      lines.push(
        `    normalizationChanges=${record.normalizationChanges.join(", ")}`,
      )
    if (record.reason !== null) lines.push(`    reason=${record.reason}`)
    if (record.explanation !== null)
      lines.push(`    explanation=${record.explanation}`)
  }
  lines.push(`对应选项（${result.options.length}）：`)
  if (result.options.length === 0) lines.push("  - 无")
  for (const option of result.options)
    lines.push(
      `  - ${option.optionId}（${option.name}；实体=${option.catalogEntityId}）`,
    )
  lines.push(`对应规则（${result.rules.length}）：`)
  if (result.rules.length === 0) lines.push("  - 无")
  for (const rule of result.rules)
    lines.push(
      `  - ${rule.effectId}（${rule.kind}${rule.operationKind === null ? "" : ` / ${rule.operationKind}`}）`,
    )
  lines.push(...formatLimitations(result.limitations))
  lines.push(result.relatedTestsAndDocs)
  return lines
}

export function formatExplainText(result: ExplainResult): string {
  const header = [
    `数据身份：${result.input}`,
    `类型：${result.type}`,
    `静态效果：${result.staticEffects.ruleSetId}/${result.staticEffects.revision}（${result.staticEffects.source.repository}@${result.staticEffects.source.commit}）`,
  ]
  const body =
    result.type === "effect"
      ? formatEffect(result)
      : result.type === "option"
        ? formatOption(result)
        : result.type === "action"
          ? formatAction(result)
          : formatPointer(result)
  return [...header, ...body].join("\n")
}
