import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs"
import { basename, dirname, join, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"
import type {
  ContributionRule,
  EffectRule,
  RuleSet,
  StaticCatalogOption,
  StaticCatalogVariant,
  StaticCatalogVariantMechanism,
  StaticEffectCatalog,
} from "@randomplay/shared"
import { stableStringify } from "./canonical.ts"
import type {
  AuthoringSupplementalRecord,
  EffectAuthoringRecord,
  EffectAuthoringRuleRecord,
  EffectAuthoringUnsupportedRecord,
  AuthoringOptionVariant,
} from "./types.ts"
import { validateAuthoringRecords } from "./validation.ts"

function isRuleRecord(
  record: EffectAuthoringRecord,
): record is EffectAuthoringRuleRecord {
  return record.mechanism.kind !== "unsupported"
}

export interface StaticCoverageRecord {
  readonly pointer: string
  readonly catalogEntityId: string
  readonly rank: number
  readonly rankKind: string
  readonly stat: string
  readonly optionId: string
  readonly effectIds: readonly string[]
  readonly status: string
  readonly reason?: string
  readonly explanation?: string
  readonly normalizationChanges: readonly string[]
  readonly rawValue: number
  /** 未归一化的位置可以没有数值；作者层只替换有明确数值的选中位置。 */
  readonly normalizedValue: number | null
}

export interface StaticCoverageSupplementalRecord {
  readonly supplementId: string
  readonly source: string
  readonly kind: string
  /**
   * 读取正式 coverage 的类型：boundary 记录可能没有 optionId/supportedRanks。
   * 作者层不表达 boundary，`AuthoringSupplementalRecord` 才要求两者必填。
   */
  readonly optionId?: string
  readonly effectIds?: readonly string[]
  readonly supportedRanks?: string
  readonly computationTarget: string
  readonly status: string
  readonly reason?: string
}

export interface StaticCoverageDocument {
  readonly schemaVersion: number
  readonly ruleSetId: string
  readonly revision: string
  readonly source: unknown
  readonly entities: readonly unknown[]
  readonly packs: readonly unknown[]
  readonly records: readonly StaticCoverageRecord[]
  readonly supplementalRecords: readonly StaticCoverageSupplementalRecord[]
  readonly summary: unknown
  readonly reverseGaps: readonly unknown[]
  readonly deferredMechanisms: readonly unknown[]
  readonly fieldMappings: unknown
}

export interface StaticArtifacts {
  readonly definitions: RuleSet
  readonly catalog: StaticEffectCatalog
  readonly coverage: StaticCoverageDocument
}

export interface AuthoringCompilation {
  readonly artifacts: StaticArtifacts
  readonly ruleIds: readonly string[]
  readonly optionIds: readonly string[]
  readonly coverageKeys: readonly string[]
  readonly supplementalRecordIds: readonly string[]
  readonly skillTargetIds: readonly string[]
}

export interface CompileAuthoringPilotInput {
  readonly records: readonly EffectAuthoringRecord[]
  readonly baselineDirectory: string
  readonly outputDirectory: string
}

export interface CompileAuthoringPilotResult extends AuthoringCompilation {
  readonly outputDirectory: string
  readonly recordCount: number
  readonly coverageRecordCount: number
}

const ARTIFACT_FILES = [
  "static.json",
  "static-catalog.json",
  "static-coverage.json",
] as const

export function readStaticArtifacts(directory: string): StaticArtifacts {
  const definitions = readJson(join(directory, ARTIFACT_FILES[0]))
  const catalog = readJson(join(directory, ARTIFACT_FILES[1]))
  const coverage = readJson(join(directory, ARTIFACT_FILES[2]))
  requireObject(definitions, ARTIFACT_FILES[0])
  requireObject(catalog, ARTIFACT_FILES[1])
  requireObject(coverage, ARTIFACT_FILES[2])
  if (!Array.isArray(definitions["effects"]))
    throw new Error(`${ARTIFACT_FILES[0]}: "effects" must be an array`)
  if (!Array.isArray(catalog["options"]))
    throw new Error(`${ARTIFACT_FILES[1]}: "options" must be an array`)
  for (const field of ["entities", "skillTargets", "differences"] as const)
    if (!Array.isArray(catalog[field]))
      throw new Error(`${ARTIFACT_FILES[1]}: "${field}" must be an array`)
  if (!Array.isArray(coverage["records"]))
    throw new Error(`${ARTIFACT_FILES[2]}: "records" must be an array`)
  if (!Array.isArray(coverage["supplementalRecords"]))
    throw new Error(
      `${ARTIFACT_FILES[2]}: "supplementalRecords" must be an array`,
    )
  assertUnique(definitions["effects"], "effectId", "effects")
  assertUnique(catalog["entities"], "catalogEntityId", "catalog entities")
  assertUnique(catalog["options"], "optionId", "catalog options")
  assertUnique(catalog["skillTargets"], "targetId", "catalog skill targets")
  assertUnique(catalog["differences"], "differenceId", "catalog differences")
  assertUnique(
    coverage["records"],
    (entry) =>
      `${String(entry["pointer"])}|${String(entry["catalogEntityId"])}`,
    "coverage records",
  )
  assertUnique(
    coverage["supplementalRecords"],
    "supplementId",
    "coverage supplemental records",
  )
  return {
    definitions: definitions as unknown as RuleSet,
    catalog: catalog as unknown as StaticEffectCatalog,
    coverage: coverage as unknown as StaticCoverageDocument,
  }
}

function assertUnique(
  value: unknown,
  fieldOrKey: string | ((entry: Record<string, unknown>) => string),
  label: string,
): void {
  if (!Array.isArray(value)) throw new Error(`${label}: expected an array`)
  const key =
    typeof fieldOrKey === "string"
      ? (entry: Record<string, unknown>) => String(entry[fieldOrKey])
      : fieldOrKey
  const seen = new Set<string>()
  for (const entry of value) {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry))
      throw new Error(`${label}: expected objects`)
    const identity = key(entry as Record<string, unknown>)
    if (seen.has(identity))
      throw new Error(`${label}: duplicate identity ${identity}`)
    seen.add(identity)
  }
}

function readJson(path: string): Record<string, unknown> {
  let text: string
  try {
    text = readFileSync(path, "utf8")
  } catch (error) {
    throw new Error(`Cannot read baseline artifact: ${path}`, { cause: error })
  }
  let value: unknown
  try {
    value = JSON.parse(text) as unknown
  } catch (error) {
    throw new Error(`Invalid JSON in baseline artifact: ${path}`, {
      cause: error,
    })
  }
  requireObject(value, path)
  return value
}

function requireObject(
  value: unknown,
  label: string,
): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label}: expected a JSON object`)
}

function isCaseInsensitivePlatform(): boolean {
  return process.platform === "darwin" || process.platform === "win32"
}

/**
 * 解析最近的已存在祖先，再用 realpath 还原大小写与符号链接；
 * 不存在的尾段按调用方给出的路径保留。用于阻止通过大小写或
 * symlink 绕过受管目录保护。
 */
function canonicalPath(path: string): string {
  let current = resolve(path)
  const suffix: string[] = []
  while (!existsSync(current)) {
    const parent = dirname(current)
    if (parent === current) break
    suffix.unshift(basename(current))
    current = parent
  }
  let real = current
  try {
    real = realpathSync.native(current)
  } catch {
    // 祖先不可读时保留 resolve 结果；后续写入仍会失败。
  }
  return resolve(real, ...suffix)
}

function comparisonPath(path: string): string {
  const canonical = canonicalPath(path)
  return isCaseInsensitivePlatform() ? canonical.toLowerCase() : canonical
}

function sameOrInside(path: string, directory: string): boolean {
  return path === directory || path.startsWith(`${directory}${sep}`)
}

function assertSafeOutput(outputDirectory: string): void {
  const output = comparisonPath(outputDirectory)
  const forbidden = [
    fileURLToPath(new URL("../../../definitions", import.meta.url)),
    fileURLToPath(new URL("../../../integrated", import.meta.url)),
    fileURLToPath(new URL("../../../dist", import.meta.url)),
  ]
  for (const directory of forbidden) {
    if (sameOrInside(output, comparisonPath(directory)))
      throw new Error(
        `Authoring output must not write into a managed definitions/integrated/dist directory: ${outputDirectory}`,
      )
  }
}

export function compileAuthoringArtifacts(
  records: readonly EffectAuthoringRecord[],
  baseline: StaticArtifacts,
): AuthoringCompilation {
  const keys = new Set<string>()
  const effectIds = new Set<string>()
  const catalogEntityIds = new Set(
    baseline.catalog.entities.map((entity) => entity.catalogEntityId),
  )
  const differenceIds = new Set(
    baseline.catalog.differences.map((difference) => difference.differenceId),
  )
  for (const record of records) {
    if (keys.has(record.key))
      throw new Error(`Duplicate authoring key: ${record.key}`)
    keys.add(record.key)
    if (!catalogEntityIds.has(record.entity.catalogEntityId))
      throw new Error(
        `Authoring record ${record.key} references unknown catalog entity ${record.entity.catalogEntityId}`,
      )
    for (const differenceId of record.coverage.differenceIds)
      if (!differenceIds.has(differenceId))
        throw new Error(
          `Authoring record ${record.key} references unknown difference ${differenceId}`,
        )
    // 迁移占位记录与完整状态规则共享来源 effectId，但不生成规则；
    // 只有可执行记录参与规则身份唯一性检查。
    if (!isRuleRecord(record)) continue
    if (effectIds.has(record.ids.effectId))
      throw new Error(`Duplicate authoring effect ID: ${record.ids.effectId}`)
    effectIds.add(record.ids.effectId)
  }

  const groups = groupByOption(records)
  const supplementalRecords = collectAuthoringSupplementalRecords(records)
  assertSelectedEntriesExpressible(groups, records, baseline)
  const compiledRules = new Map<string, EffectRule>()
  const compiledOptions = new Map<string, StaticCatalogOption>()
  const compiledCoverage: StaticCoverageRecord[] = []
  const compiledTargets = new Map<
    string,
    StaticEffectCatalog["skillTargets"][number]
  >()

  for (const group of groups.values())
    compileOptionGroup(
      group,
      compiledRules,
      compiledOptions,
      compiledCoverage,
      compiledTargets,
    )

  const coverageKeys = new Set<string>()
  for (const record of compiledCoverage) {
    const key = `${record.pointer}|${record.catalogEntityId}`
    if (coverageKeys.has(key))
      throw new Error(`Duplicate compiled coverage position: ${key}`)
    coverageKeys.add(key)
  }
  assertCoverageCompleteness(groups, baseline.coverage, compiledCoverage)
  assertSupplementalEffectIds(
    supplementalRecords,
    baseline,
    new Set(compiledRules.keys()),
  )

  const definitions = replaceRules(baseline.definitions, compiledRules)
  const catalog = replaceCatalog(
    baseline.catalog,
    compiledOptions,
    compiledTargets,
  )
  const coverage = replaceSupplementalRecords(
    replaceCoverage(baseline.coverage, compiledCoverage),
    supplementalRecords.map((entry) => entry.supplement),
  )
  assertCountsUnchanged(baseline, {
    definitions,
    catalog,
    coverage,
  })
  return {
    artifacts: { definitions, catalog, coverage },
    ruleIds: [...compiledRules.keys()],
    optionIds: [...compiledOptions.keys()],
    coverageKeys: compiledCoverage.map(
      (record) => `${record.pointer}|${record.catalogEntityId}`,
    ),
    supplementalRecordIds: supplementalRecords.map(
      (entry) => entry.supplement.supplementId,
    ),
    skillTargetIds: [...compiledTargets.keys()],
  }
}

interface CollectedSupplementalRecord {
  readonly recordKey: string
  readonly supplement: AuthoringSupplementalRecord
}

/**
 * 收集记录声明的补充来源记录。补充记录属于记录所在选项，因此声明的
 * optionId 必须与记录一致；supplementId 在整批作者输入中唯一。
 */
function collectAuthoringSupplementalRecords(
  records: readonly EffectAuthoringRecord[],
): readonly CollectedSupplementalRecord[] {
  const collected: CollectedSupplementalRecord[] = []
  const supplementIds = new Set<string>()
  for (const record of records)
    for (const supplement of record.supplementalRecords ?? []) {
      if (supplementIds.has(supplement.supplementId))
        throw new Error(
          `Duplicate authoring supplement ID: ${supplement.supplementId}`,
        )
      supplementIds.add(supplement.supplementId)
      if (supplement.optionId !== record.ids.optionId)
        throw new Error(
          `Supplement ${supplement.supplementId} declares option ${supplement.optionId} but belongs to authoring record ${record.key} (${record.ids.optionId})`,
        )
      collected.push({ recordKey: record.key, supplement })
    }
  return collected
}

/** effectIds 必须指向本次编译生成的规则或基线已有规则。 */
function assertSupplementalEffectIds(
  supplements: readonly CollectedSupplementalRecord[],
  baseline: StaticArtifacts,
  compiledRuleIds: ReadonlySet<string>,
): void {
  const baselineRuleIds = new Set<string>(
    baseline.definitions.effects.map((rule) => rule.effectId),
  )
  for (const { recordKey, supplement } of supplements)
    for (const effectId of supplement.effectIds ?? [])
      if (!compiledRuleIds.has(effectId) && !baselineRuleIds.has(effectId))
        throw new Error(
          `Supplement ${supplement.supplementId} of authoring record ${recordKey} references unknown effect ID ${effectId}`,
        )
}

function requireValidAuthoringRecords(
  records: readonly EffectAuthoringRecord[],
): readonly EffectAuthoringRecord[] {
  const validated = validateAuthoringRecords(records)
  if (!validated.ok)
    throw new Error(
      `Authoring records are invalid:\n${validated.issues
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join("\n")}`,
    )
  return validated.records
}

export function compileAuthoringRecords(
  records: readonly EffectAuthoringRecord[],
  baseline: StaticArtifacts,
): AuthoringCompilation {
  return compileAuthoringArtifacts(
    requireValidAuthoringRecords(records),
    baseline,
  )
}

export function compileAuthoringPilot(
  input: CompileAuthoringPilotInput,
): CompileAuthoringPilotResult {
  const records = requireValidAuthoringRecords(input.records)
  assertSafeOutput(input.outputDirectory)
  if (
    comparisonPath(input.outputDirectory) ===
    comparisonPath(input.baselineDirectory)
  )
    throw new Error("Authoring output must differ from the baseline directory")
  const baseline = readStaticArtifacts(input.baselineDirectory)
  const compilation = compileAuthoringArtifacts(records, baseline)
  writeStaticArtifacts(input.outputDirectory, compilation.artifacts)
  return {
    ...compilation,
    outputDirectory: resolve(input.outputDirectory),
    recordCount: records.length,
    coverageRecordCount: compilation.coverageKeys.length,
  }
}

export function writeStaticArtifacts(
  outputDirectory: string,
  artifacts: StaticArtifacts,
): void {
  assertSafeOutput(outputDirectory)
  mkdirSync(outputDirectory, { recursive: true })
  writeJson(join(outputDirectory, ARTIFACT_FILES[0]), artifacts.definitions)
  writeJson(join(outputDirectory, ARTIFACT_FILES[1]), artifacts.catalog)
  writeJson(join(outputDirectory, ARTIFACT_FILES[2]), artifacts.coverage)
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8")
}

interface OptionGroup {
  readonly optionId: string
  readonly records: readonly EffectAuthoringRecord[]
}

function groupByOption(
  records: readonly EffectAuthoringRecord[],
): ReadonlyMap<string, OptionGroup> {
  const groups = new Map<string, EffectAuthoringRecord[]>()
  for (const record of records) {
    const existing = groups.get(record.ids.optionId)
    if (existing) existing.push(record)
    else groups.set(record.ids.optionId, [record])
  }
  return new Map(
    [...groups.entries()].map(([optionId, groupRecords]) => [
      optionId,
      { optionId, records: groupRecords },
    ]),
  )
}

const EXPRESSIBLE_OPTION_FIELDS = new Set([
  "optionId",
  "catalogEntityId",
  "name",
  "conditionDescription",
  "target",
  "exclusiveGroup",
  "variants",
])

const EXPRESSIBLE_VARIANT_FIELDS = new Set([
  "target",
  "configuration",
  "status",
  "reason",
  "explanation",
  "references",
  "effectIds",
  "maximumLayers",
  "inputs",
  "applicability",
  "differences",
  "mechanism",
])

const EXPRESSIBLE_RULE_FIELDS = new Set([
  "kind",
  "effectId",
  "source",
  "config",
  "parameters",
  "activation",
  "scope",
  "beneficiary",
  "when",
  "operation",
  "uniqueness",
])

/**
 * 只允许替换作者层能够完整表达的基线条目。否则 `as` 断言会静默
 * 丢弃未建模的变体机制 arm、`uniqueness` 等字段；当前只建模
 * `independent-settlement` 变体机制。
 */
function assertSelectedEntriesExpressible(
  groups: ReadonlyMap<string, OptionGroup>,
  records: readonly EffectAuthoringRecord[],
  baseline: StaticArtifacts,
): void {
  const baselineOptions = new Map(
    baseline.catalog.options.map((option) => [option.optionId, option]),
  )
  for (const [optionId, group] of groups) {
    const option = baselineOptions.get(optionId)
    if (!option)
      throw new Error(
        `Selected option ${optionId} is not present in the baseline`,
      )
    const mechanismKind = group.records[0]?.mechanism.kind
    const authoringOption = group.records[0]?.option
    if (authoringOption === undefined)
      throw new Error(`Empty authoring group: ${optionId}`)
    if (authoringOption.variants.length !== option.variants.length)
      throw new Error(
        `Authoring option ${optionId} has ${authoringOption.variants.length} variants, but the baseline has ${option.variants.length}`,
      )
    for (const field of Object.keys(option))
      if (!EXPRESSIBLE_OPTION_FIELDS.has(field))
        throw new Error(
          `Authoring layer cannot express baseline option ${optionId} field ${field}`,
        )
    for (const [variantIndex, variant] of option.variants.entries()) {
      for (const field of Object.keys(variant))
        if (!EXPRESSIBLE_VARIANT_FIELDS.has(field))
          throw new Error(
            `Authoring layer cannot express baseline option ${optionId} variant field ${field}`,
          )
      const authoringVariant = authoringOption.variants[variantIndex]
      if (authoringVariant === undefined)
        throw new Error(
          `Authoring option ${optionId} is missing baseline variant ${variantIndex}`,
        )
      const expectedMechanism = authoringVariantMechanism(
        group,
        authoringVariant,
        mechanismKind,
      )
      const baselineMechanism = variant.mechanism
      // 作者变体声明决定编译时写入哪个 arm；基线变体必须与作者层的
      // arm 和全部字段一致，否则 compileVariant 会静默丢弃 completeState、
      // isolateDamageItems 或额外的 damageItemRequirements。
      if (expectedMechanism === undefined) {
        if (baselineMechanism !== undefined)
          throw new Error(
            `Baseline variant ${variantIndex} of option ${optionId} declares ${baselineMechanism.kind}, but its authoring option does not declare a catalog mechanism`,
          )
        continue
      }
      if (baselineMechanism === undefined)
        throw new Error(
          `Baseline variant ${variantIndex} of option ${optionId} must declare ${expectedMechanism.kind} to match its authoring option`,
        )
      if (baselineMechanism.kind !== expectedMechanism.kind)
        throw new Error(
          `Baseline variant ${variantIndex} of option ${optionId} declares ${baselineMechanism.kind}, but its authoring option declares ${expectedMechanism.kind}`,
        )
      if (
        stableStringify(baselineMechanism) !==
        stableStringify(expectedMechanism)
      )
        throw new Error(
          `Baseline variant ${variantIndex} of option ${optionId} mechanism cannot be expressed by its authoring option: baseline ${stableStringify(baselineMechanism)}, expected ${stableStringify(expectedMechanism)}`,
        )
    }
  }

  const baselineRules = new Map(
    baseline.definitions.effects.map((rule) => [rule.effectId, rule]),
  )
  for (const record of records) {
    if (!isRuleRecord(record)) continue
    const rule = baselineRules.get(record.ids.effectId)
    if (!rule)
      throw new Error(
        `Selected rule ${record.ids.effectId} is not present in the baseline`,
      )
    if (rule.kind !== "contribution")
      throw new Error(
        `Authoring layer only compiles contribution rules (${record.ids.effectId})`,
      )
    for (const field of Object.keys(rule))
      if (!EXPRESSIBLE_RULE_FIELDS.has(field))
        throw new Error(
          `Authoring layer cannot express baseline rule ${record.ids.effectId} field ${field}`,
        )
  }
}

function assertCoverageCompleteness(
  groups: ReadonlyMap<string, OptionGroup>,
  baseline: StaticCoverageDocument,
  compiled: readonly StaticCoverageRecord[],
): void {
  const selected = new Set(groups.keys())
  const expected = new Map<string, Set<string>>()
  for (const record of baseline.records) {
    if (!selected.has(record.optionId)) continue
    addCoverageKey(
      expected,
      record.optionId,
      `${record.pointer}|${record.catalogEntityId}`,
    )
  }
  const actual = new Map<string, Set<string>>()
  for (const record of compiled) {
    if (!selected.has(record.optionId)) continue
    addCoverageKey(
      actual,
      record.optionId,
      `${record.pointer}|${record.catalogEntityId}`,
    )
  }
  for (const optionId of selected) {
    const want = expected.get(optionId) ?? new Set<string>()
    const got = actual.get(optionId) ?? new Set<string>()
    for (const key of want)
      if (!got.has(key))
        throw new Error(
          `Selected option ${optionId} is missing coverage position ${key}`,
        )
    for (const key of got)
      if (!want.has(key))
        throw new Error(
          `Selected option ${optionId} declares coverage position ${key} that is not in the baseline`,
        )
  }
}

function addCoverageKey(
  map: Map<string, Set<string>>,
  optionId: string,
  key: string,
): void {
  const existing = map.get(optionId)
  if (existing) existing.add(key)
  else map.set(optionId, new Set([key]))
}

function compileOptionGroup(
  group: OptionGroup,
  compiledRules: Map<string, EffectRule>,
  compiledOptions: Map<string, StaticCatalogOption>,
  compiledCoverage: StaticCoverageRecord[],
  compiledTargets: Map<string, StaticEffectCatalog["skillTargets"][number]>,
): void {
  const [first] = group.records
  if (!first) throw new Error(`Empty authoring group: ${group.optionId}`)
  const optionJson = stableStringify(first.option)
  const mechanismKind = first.mechanism.kind
  for (const record of group.records) {
    if (record.option.optionId !== group.optionId)
      throw new Error(
        `Option ID mismatch in authoring group: ${group.optionId} / ${record.ids.optionId}`,
      )
    if (record.option.catalogEntityId !== record.entity.catalogEntityId)
      throw new Error(
        `Catalog entity mismatch for ${record.key}: ${record.option.catalogEntityId} / ${record.entity.catalogEntityId}`,
      )
    if (stableStringify(record.option) !== optionJson)
      throw new Error(
        `Authoring records in ${group.optionId} must share one option descriptor`,
      )
    if (record.mechanism.kind !== mechanismKind)
      throw new Error(
        `Authoring records in ${group.optionId} must share one mechanism kind`,
      )
  }
  validateMechanismCardinality(group, mechanismKind)

  const rules = new Map<string, EffectAuthoringRuleRecord>()
  for (const record of group.records) {
    if (!isRuleRecord(record)) continue
    const rule = compileRule(record)
    rules.set(record.key, record)
    compiledRules.set(record.ids.effectId, rule)
  }

  const option = compileOption(group, rules, mechanismKind)
  compiledOptions.set(option.optionId, option)

  for (const record of group.records) {
    if (
      record.mechanism.kind === "independent-settlement" &&
      record.mechanism.skillTarget !== undefined
    ) {
      const target = record.mechanism.skillTarget
      const existing = compiledTargets.get(target.targetId)
      if (existing && stableStringify(existing) !== stableStringify(target))
        throw new Error(
          `Conflicting skill target definitions for ${target.targetId}`,
        )
      compiledTargets.set(target.targetId, target)
    }
    for (const position of record.coverage.positions)
      compiledCoverage.push(compileCoverageRecord(record, position))
  }
}

function validateMechanismCardinality(
  group: OptionGroup,
  mechanismKind: EffectAuthoringRecord["mechanism"]["kind"],
): void {
  if (mechanismKind === "single-rule" && group.records.length !== 1)
    throw new Error(
      `single-rule group ${group.optionId} must contain exactly one record`,
    )
  if (mechanismKind === "single-rule-per-variant" && group.records.length < 2)
    throw new Error(
      `single-rule-per-variant group ${group.optionId} must contain at least two records`,
    )
  if (mechanismKind === "complete-state" && group.records.length < 2)
    throw new Error(
      `complete-state group ${group.optionId} must contain at least two records`,
    )
  if (mechanismKind === "unsupported" && group.records.length !== 1)
    throw new Error(
      `unsupported group ${group.optionId} must contain exactly one record`,
    )
  if (mechanismKind === "independent-settlement") {
    const mechanisms = group.records.map((record) =>
      stableStringify(record.mechanism),
    )
    if (new Set(mechanisms).size !== 1)
      throw new Error(
        `independent-settlement group ${group.optionId} must share one mechanism descriptor`,
      )
  }
}

function compileRule(record: EffectAuthoringRuleRecord): ContributionRule {
  return {
    kind: "contribution",
    effectId: record.ids.effectId,
    source: {
      identity: record.entity.identity,
      section: record.section,
      references: record.references,
    },
    config: record.config,
    parameters: record.parameters,
    activation: record.activation,
    scope: record.scope,
    beneficiary: record.beneficiary,
    when: record.when,
    operation: record.operation,
    ...(record.uniqueness === undefined
      ? {}
      : { uniqueness: record.uniqueness }),
  } as ContributionRule
}

function compileOption(
  group: OptionGroup,
  rules: ReadonlyMap<string, EffectAuthoringRuleRecord>,
  mechanismKind: EffectAuthoringRecord["mechanism"]["kind"],
): StaticCatalogOption {
  const [first] = group.records
  if (!first) throw new Error(`Empty authoring group: ${group.optionId}`)
  const referenced = new Set<string>()
  const variants = first.option.variants.map((variant, index) =>
    compileVariant(group, variant, index, rules, mechanismKind, referenced),
  )
  const [firstVariant, ...restVariants] = variants
  if (!firstVariant)
    throw new Error(
      `Option ${group.optionId} must declare at least one variant`,
    )
  const nonEmptyVariants: StaticCatalogOption["variants"] = [
    firstVariant,
    ...restVariants,
  ]
  for (const key of rules.keys())
    if (!referenced.has(key))
      throw new Error(
        `Authoring record ${key} is not referenced by any variant of ${group.optionId}`,
      )
  return {
    optionId: first.option.optionId,
    catalogEntityId: first.option.catalogEntityId,
    name: first.option.name,
    conditionDescription: first.option.conditionDescription,
    target: first.option.target,
    ...(first.option.exclusiveGroup === undefined
      ? {}
      : { exclusiveGroup: first.option.exclusiveGroup }),
    variants: nonEmptyVariants,
  }
}

function compileVariant(
  group: OptionGroup,
  variant: AuthoringOptionVariant,
  index: number,
  rules: ReadonlyMap<string, EffectAuthoringRuleRecord>,
  mechanismKind: EffectAuthoringRecord["mechanism"]["kind"],
  referenced: Set<string>,
): StaticCatalogVariant {
  const recordsByKey = new Map(
    group.records.map((record) => [record.key, record]),
  )
  const contributing: EffectAuthoringRecord[] = []
  const effectIds: string[] = []
  if (mechanismKind === "unsupported") {
    if (variant.effectKeys.length > 0)
      throw new Error(
        `Unsupported option ${group.optionId} cannot list effect keys`,
      )
    contributing.push(...group.records)
  } else {
    for (const key of variant.effectKeys) {
      referenced.add(key)
      const record = recordsByKey.get(key)
      if (!record)
        throw new Error(
          `Variant of ${group.optionId} references unknown authoring key ${key}`,
        )
      contributing.push(record)
      if (record.mechanism.kind !== "unsupported")
        effectIds.push(record.ids.effectId)
    }
  }

  if (mechanismKind === "unsupported") {
    if (effectIds.length > 0)
      throw new Error(
        `Unsupported option ${group.optionId} cannot reference rules`,
      )
    if (contributing.length !== 1)
      throw new Error(
        `Unsupported option ${group.optionId} must have exactly one contributing record`,
      )
  } else {
    if (effectIds.length === 0)
      throw new Error(`Option ${group.optionId} variant ${index} has no rules`)
    if (contributing.some((record) => record.mechanism.kind === "unsupported"))
      throw new Error(
        `Option ${group.optionId} mixes unsupported and executable records`,
      )
  }

  const statuses = new Set(contributing.map((record) => record.coverage.status))
  if (statuses.size !== 1)
    throw new Error(
      `Variant ${index} of ${group.optionId} mixes coverage statuses: ${[...statuses].join(", ")}`,
    )
  const status = [...statuses][0]
  if (status === undefined)
    throw new Error(
      `Variant ${index} of ${group.optionId} has no coverage status`,
    )
  const reason =
    status === "unsupported"
      ? singleCoverageField(group, contributing, "reason")
      : undefined
  const explanation =
    status === "unsupported"
      ? singleCoverageField(group, contributing, "explanation")
      : undefined
  if (
    status === "unsupported" &&
    (reason === undefined || explanation === undefined)
  )
    throw new Error(
      `Unsupported variant ${index} of ${group.optionId} requires reason and explanation`,
    )

  const differences: string[] = []
  for (const record of contributing)
    for (const differenceId of record.coverage.differenceIds)
      if (!differences.includes(differenceId)) differences.push(differenceId)

  const mechanism = authoringVariantMechanism(group, variant, mechanismKind)

  return {
    ...(variant.target === undefined ? {} : { target: variant.target }),
    configuration: variant.configuration,
    status,
    ...(reason === undefined ? {} : { reason }),
    ...(explanation === undefined ? {} : { explanation }),
    references: variant.references,
    effectIds,
    maximumLayers: variant.maximumLayers,
    inputs: variant.inputs,
    differences,
    applicability: variant.applicability,
    ...(mechanism === undefined ? {} : { mechanism }),
  } as StaticCatalogVariant
}

function singleCoverageField(
  group: OptionGroup,
  records: readonly EffectAuthoringRecord[],
  field: "reason" | "explanation",
): string | undefined {
  const values = new Set(
    records
      .map((record) => record.coverage[field])
      .filter((value): value is string => value !== undefined),
  )
  if (values.size > 1)
    throw new Error(
      `Option ${group.optionId} has conflicting coverage ${field} values`,
    )
  return [...values][0]
}

/**
 * 解析作者变体要写入目录的 mechanism。显式 catalogMechanism 是完整来源；
 * 省略时保留 P4-2 的最小兼容：independent-settlement 由记录级 damageItem
 * 推导，其余分组不写 mechanism。independent-settlement 的显式 payload 必须
 * 与记录级 damageItem/exclusiveDamageItem 一致，避免两处声明漂移。
 */
function authoringVariantMechanism(
  group: OptionGroup,
  variant: AuthoringOptionVariant,
  mechanismKind: EffectAuthoringRecord["mechanism"]["kind"],
): StaticCatalogVariantMechanism | undefined {
  const catalogMechanism = variant.catalogMechanism
  if (catalogMechanism === undefined) {
    return mechanismKind === "independent-settlement"
      ? independentSettlementFields(group).mechanism
      : undefined
  }
  const [first] = group.records
  if (!first) throw new Error(`Empty authoring group: ${group.optionId}`)
  if (mechanismKind === "independent-settlement") {
    if (first.mechanism.kind !== "independent-settlement")
      throw new Error(
        `Option ${group.optionId} cannot combine a catalog mechanism with a non-independent authoring record`,
      )
    if (catalogMechanism.kind !== "independent-settlement")
      throw new Error(
        `Option ${group.optionId} authoring record is independent-settlement, but its catalog mechanism is ${catalogMechanism.kind}`,
      )
    const [requirement] = catalogMechanism.damageItemRequirements
    if (
      catalogMechanism.damageItemRequirements.length !== 1 ||
      requirement === undefined ||
      stableStringify(requirement) !==
        stableStringify(first.mechanism.damageItem)
    )
      throw new Error(
        `Option ${group.optionId} catalog mechanism damageItemRequirements must equal its authoring damageItem`,
      )
    const authoringIsolate = first.mechanism.exclusiveDamageItem === true
    const catalogIsolate = catalogMechanism.isolateDamageItems === true
    if (authoringIsolate !== catalogIsolate)
      throw new Error(
        `Option ${group.optionId} catalog mechanism isolateDamageItems must match authoring exclusiveDamageItem`,
      )
  } else if (catalogMechanism.kind === "independent-settlement") {
    throw new Error(
      `Option ${group.optionId} authoring record is ${mechanismKind}, but its catalog mechanism is independent-settlement`,
    )
  }
  return catalogMechanism
}

function independentSettlementFields(
  group: OptionGroup,
): Pick<StaticCatalogVariant, "mechanism"> {
  const [first] = group.records
  if (!first || first.mechanism.kind !== "independent-settlement")
    throw new Error(`Option ${group.optionId} is not an independent settlement`)
  const mechanism = first.mechanism
  const hitRules = group.records
    .filter(isRuleRecord)
    .filter((record) => record.operation.kind === "hit-adjustment")
  if (hitRules.length === 0)
    throw new Error(
      `Independent settlement ${group.optionId} needs a hit-adjustment rule`,
    )
  for (const record of hitRules) {
    if (
      record.operation.kind !== "hit-adjustment" ||
      !record.operation.itemIds?.includes(mechanism.damageItem.itemId)
    )
      throw new Error(
        `Independent settlement rule ${record.key} must bind item ${mechanism.damageItem.itemId}`,
      )
  }
  for (const record of group.records) {
    if (!isRuleRecord(record)) continue
    if (record.scope !== "hit")
      throw new Error(
        `Independent settlement rule ${record.key} must use hit scope`,
      )
  }
  return {
    mechanism: {
      kind: "independent-settlement",
      damageItemRequirements: [mechanism.damageItem],
      ...(mechanism.exclusiveDamageItem === true
        ? { isolateDamageItems: true as const }
        : {}),
    },
  }
}

function compileCoverageRecord(
  record: EffectAuthoringRecord,
  position: EffectAuthoringRecord["coverage"]["positions"][number],
): StaticCoverageRecord {
  return {
    pointer: position.pointer,
    catalogEntityId: record.entity.catalogEntityId,
    rank: position.rank,
    rankKind: position.rankKind,
    stat: position.stat,
    optionId: record.ids.optionId,
    effectIds:
      record.mechanism.kind === "unsupported" ? [] : [record.ids.effectId],
    status: record.coverage.status,
    ...(record.coverage.reason === undefined
      ? {}
      : { reason: record.coverage.reason }),
    ...(record.coverage.explanation === undefined
      ? {}
      : { explanation: record.coverage.explanation }),
    normalizationChanges: position.normalizationChanges,
    rawValue: position.rawValue,
    normalizedValue: position.normalizedValue,
  }
}

/**
 * 用基线条目的键序写出替换对象。键序是序列化细节，不承载作者语义：
 * 作者值仍来自记录，这里只让候选与正式制品的字段次序一致，字节比较
 * 才继续是有效门禁。候选缺少或新增的键由语法校验与语义比较负责。
 */
function withBaselineKeyOrder<T extends object>(value: T, template: object): T {
  const ordered: Record<string, unknown> = {}
  const record = value as Record<string, unknown>
  for (const key of Object.keys(template))
    if (Object.hasOwn(record, key)) ordered[key] = record[key]
  for (const key of Object.keys(record))
    if (!Object.hasOwn(ordered, key)) ordered[key] = record[key]
  return ordered as T
}

function alignOptionSerialization(
  compiled: StaticCatalogOption,
  baseline: StaticCatalogOption,
): StaticCatalogOption {
  const variants = compiled.variants.map((variant, index) => {
    const template = baseline.variants[index]
    return template === undefined
      ? variant
      : withBaselineKeyOrder(variant, template)
  })
  const [first, ...rest] = variants
  if (!first) throw new Error(`Option ${baseline.optionId} has no variants`)
  return withBaselineKeyOrder(
    { ...compiled, variants: [first, ...rest] },
    baseline,
  )
}

function replaceRules(
  baseline: RuleSet,
  compiled: ReadonlyMap<string, EffectRule>,
): RuleSet {
  const seen = new Set<string>()
  const effects = baseline.effects.map((rule) => {
    const replacement = compiled.get(rule.effectId)
    if (!replacement) return rule
    seen.add(rule.effectId)
    return withBaselineKeyOrder(replacement, rule)
  })
  for (const effectId of compiled.keys())
    if (!seen.has(effectId))
      throw new Error(
        `Compiled rule ${effectId} is not present in the baseline`,
      )
  return { ...baseline, effects }
}

function replaceCatalog(
  baseline: StaticEffectCatalog,
  compiledOptions: ReadonlyMap<string, StaticCatalogOption>,
  compiledTargets: ReadonlyMap<
    string,
    StaticEffectCatalog["skillTargets"][number]
  >,
): StaticEffectCatalog {
  const seenOptions = new Set<string>()
  const options = baseline.options.map((option) => {
    const replacement = compiledOptions.get(option.optionId)
    if (!replacement) return option
    seenOptions.add(option.optionId)
    return alignOptionSerialization(replacement, option)
  })
  for (const optionId of compiledOptions.keys())
    if (!seenOptions.has(optionId))
      throw new Error(
        `Compiled option ${optionId} is not present in the baseline catalog`,
      )

  const seenTargets = new Set<string>()
  const skillTargets = baseline.skillTargets.map((target) => {
    const replacement = compiledTargets.get(target.targetId)
    if (!replacement) return target
    seenTargets.add(target.targetId)
    return replacement
  })
  for (const targetId of compiledTargets.keys())
    if (!seenTargets.has(targetId))
      throw new Error(
        `Compiled skill target ${targetId} is not present in the baseline catalog`,
      )
  return { ...baseline, options, skillTargets }
}

function replaceCoverage(
  baseline: StaticCoverageDocument,
  compiled: readonly StaticCoverageRecord[],
): StaticCoverageDocument {
  const compiledByKey = new Map(
    compiled.map((record) => [
      `${record.pointer}|${record.catalogEntityId}`,
      record,
    ]),
  )
  const seen = new Set<string>()
  const records = baseline.records.map((record) => {
    const key = `${record.pointer}|${record.catalogEntityId}`
    const replacement = compiledByKey.get(key)
    if (!replacement) return record
    seen.add(key)
    return withBaselineKeyOrder(replacement, record)
  })
  for (const key of compiledByKey.keys())
    if (!seen.has(key))
      throw new Error(
        `Compiled coverage position ${key} is not in the baseline`,
      )
  return { ...baseline, records }
}

const EXPRESSIBLE_SUPPLEMENTAL_RECORD_FIELDS = new Set([
  "supplementId",
  "source",
  "kind",
  "optionId",
  "effectIds",
  "supportedRanks",
  "computationTarget",
  "status",
])

/**
 * 按 supplementId 原位替换补充来源覆盖记录。保留基线数组顺序与保留
 * 条目的键序；未知 ID、重复 ID 与作者层无法表达的基线条目字段都明确
 * 失败，而不是静默丢弃或新增条目。
 */
export function replaceSupplementalRecords(
  baseline: StaticCoverageDocument,
  compiled: readonly StaticCoverageSupplementalRecord[],
): StaticCoverageDocument {
  const compiledById = new Map<string, StaticCoverageSupplementalRecord>()
  for (const record of compiled) {
    if (compiledById.has(record.supplementId))
      throw new Error(
        `Duplicate authoring supplement ID: ${record.supplementId}`,
      )
    compiledById.set(record.supplementId, record)
  }
  if (compiledById.size === 0) return baseline
  const seen = new Set<string>()
  const supplementalRecords = baseline.supplementalRecords.map((record) => {
    const replacement = compiledById.get(record.supplementId)
    if (!replacement) return record
    for (const field of Object.keys(record))
      if (!EXPRESSIBLE_SUPPLEMENTAL_RECORD_FIELDS.has(field))
        throw new Error(
          `Authoring layer cannot express baseline supplemental record ${record.supplementId} field ${field}`,
        )
    seen.add(record.supplementId)
    return withBaselineKeyOrder(replacement, record)
  })
  for (const supplementId of compiledById.keys())
    if (!seen.has(supplementId))
      throw new Error(
        `Authoring supplement ${supplementId} is not present in the baseline`,
      )
  return { ...baseline, supplementalRecords }
}

function assertCountsUnchanged(
  baseline: StaticArtifacts,
  compiled: StaticArtifacts,
): void {
  for (const [label, before, after] of [
    [
      "effects",
      baseline.definitions.effects.length,
      compiled.definitions.effects.length,
    ],
    [
      "options",
      baseline.catalog.options.length,
      compiled.catalog.options.length,
    ],
    [
      "skill targets",
      baseline.catalog.skillTargets.length,
      compiled.catalog.skillTargets.length,
    ],
    [
      "coverage records",
      baseline.coverage.records.length,
      compiled.coverage.records.length,
    ],
    [
      "supplemental records",
      baseline.coverage.supplementalRecords.length,
      compiled.coverage.supplementalRecords.length,
    ],
  ] as const) {
    if (before !== after)
      throw new Error(
        `Authoring compilation must replace selected entries only: ${label} ${before} -> ${after}`,
      )
  }
}

export function summarizeCompilation(
  compilation: AuthoringCompilation,
): string {
  return [
    `rules: ${compilation.ruleIds.length}`,
    `options: ${compilation.optionIds.length}`,
    `coverage positions: ${compilation.coverageKeys.length}`,
    `skill targets: ${compilation.skillTargetIds.length}`,
    `supplemental records: ${compilation.supplementalRecordIds.length}`,
  ].join(", ")
}

export function unsupportedRecordCount(
  records: readonly EffectAuthoringRecord[],
): number {
  return records.filter(
    (record): record is EffectAuthoringUnsupportedRecord =>
      record.mechanism.kind === "unsupported",
  ).length
}
