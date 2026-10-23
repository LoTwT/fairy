import {
  assertKnownKeys,
  expectArray,
  expectBoolean,
  expectField,
  expectInteger,
  expectNumber,
  expectRecord,
  expectSha256,
  expectString,
  expectStringArray,
  nullableString,
  optionalString,
} from "./json.ts"

export type StaticCoverageRecordStatus =
  | "converted"
  | "corrected"
  | "unsupported"
export type StaticCoverageSupplementalStatus = "integrated" | "out-of-scope"
export type StaticCoverageStatus =
  | StaticCoverageRecordStatus
  | StaticCoverageSupplementalStatus

export interface StaticSourceFile {
  readonly path: string
  readonly sha256: string
}

export interface StaticSource {
  readonly repository: string
  readonly commit: string
  readonly files: readonly StaticSourceFile[]
}

/** 规则、目录变体与具名差异共用的来源引用。 */
export interface StaticSourceReference {
  readonly sourceId: string
  readonly version: string
  readonly locale?: string
  readonly resourcePath: string
  readonly pointer: string
}

export interface StaticSkillTarget {
  readonly targetId: string
  readonly upstreamId: string | null
  readonly agentEntityId: string | null
  readonly category: string
  readonly name: string
  readonly countsAsFollowUp: boolean
}

export interface StaticCoverageSummary {
  readonly entities: number
  readonly packs: number
  readonly emptyPacks: number
  readonly rawEffects: number
  readonly rules: number
  readonly options: number
  readonly converted: number
  readonly corrected: number
  readonly unsupported: number
  readonly supplements: {
    readonly records: number
    readonly rules: number
    readonly options: number
    readonly entities: number
    readonly integrated: number
    readonly outOfScope: number
  }
}

export interface StaticCoverageDeferredMechanism {
  readonly catalogEntityId: string
  readonly reason: string
  readonly explanation: string
}

export interface StaticCoverageRecord {
  readonly pointer: string
  readonly catalogEntityId: string
  readonly rank: number
  readonly rankKind: string
  readonly stat: string
  readonly optionId: string
  readonly effectIds: readonly string[]
  readonly status: StaticCoverageRecordStatus
  readonly normalizationChanges: readonly string[]
  readonly rawValue: number
  readonly normalizedValue: number
  readonly reason?: string
  readonly explanation?: string
}

export interface StaticCoverageSupplementalRecord {
  readonly supplementId: string
  readonly source: string
  readonly kind: string
  readonly optionId: string
  readonly effectIds?: readonly string[]
  readonly status: StaticCoverageSupplementalStatus
  readonly reason?: string
  readonly supportedRanks: string
  readonly computationTarget: string
}

export interface StaticCoverage {
  readonly schemaVersion: number
  readonly ruleSetId: string
  readonly revision: string
  readonly source: StaticSource
  readonly summary: StaticCoverageSummary
  readonly records: readonly StaticCoverageRecord[]
  readonly supplementalRecords: readonly StaticCoverageSupplementalRecord[]
  readonly deferredMechanisms: readonly StaticCoverageDeferredMechanism[]
}

export interface StaticCatalogInput {
  readonly name: string
  readonly unit: string
  readonly description: string
  readonly preset?: number
}

/**
 * explain 需要展示的变体字段。status、configuration、references 与
 * inputs 只做形状读取，具体领域语义仍由正式类型与生成器维护。
 */
export interface StaticCatalogVariant {
  readonly target?: string
  readonly configuration?: Readonly<Record<string, unknown>>
  readonly status?: string
  readonly references?: readonly StaticSourceReference[]
  readonly effectIds: readonly string[]
  readonly maximumLayers?: number
  readonly inputs?: readonly StaticCatalogInput[]
  readonly differences: readonly string[]
  readonly reason?: string
  readonly explanation?: string
}

export interface StaticCatalogOption {
  readonly optionId: string
  readonly catalogEntityId: string
  readonly name: string
  readonly conditionDescription: string
  readonly target: string
  readonly exclusiveGroup?: string
  readonly variants: readonly StaticCatalogVariant[]
}

export interface StaticCatalogDifference {
  readonly differenceId: string
  readonly explanation: string
  readonly references: readonly StaticSourceReference[]
}

export interface StaticCatalog {
  readonly schemaVersion: number
  readonly ruleSetId: string
  readonly revision: string
  readonly source: StaticSource
  readonly entityCount: number
  readonly mechanismCount: number
  readonly differences: readonly StaticCatalogDifference[]
  readonly options: readonly StaticCatalogOption[]
  readonly skillTargets: readonly StaticSkillTarget[]
}

const staticCoverageKeys = [
  "deferredMechanisms",
  "entities",
  "fieldMappings",
  "packs",
  "records",
  "reverseGaps",
  "revision",
  "ruleSetId",
  "schemaVersion",
  "source",
  "summary",
  "supplementalRecords",
] as const

const staticCoverageRecordKeys = [
  "catalogEntityId",
  "effectIds",
  "explanation",
  "normalizationChanges",
  "normalizedValue",
  "optionId",
  "pointer",
  "rank",
  "rankKind",
  "rawValue",
  "reason",
  "stat",
  "status",
] as const

const staticCoverageSupplementalKeys = [
  "computationTarget",
  "effectIds",
  "kind",
  "optionId",
  "reason",
  "source",
  "status",
  "supplementId",
  "supportedRanks",
] as const

const staticCoverageSummaryKeys = [
  "converted",
  "corrected",
  "emptyPacks",
  "entities",
  "options",
  "packs",
  "rawEffects",
  "rules",
  "supplements",
  "unsupported",
] as const

const staticCoverageSupplementsKeys = [
  "entities",
  "integrated",
  "options",
  "outOfScope",
  "records",
  "rules",
] as const

const staticCoverageDeferredKeys = [
  "catalogEntityId",
  "explanation",
  "reason",
] as const

const staticCatalogKeys = [
  "differences",
  "entities",
  "mechanisms",
  "options",
  "revision",
  "ruleSetId",
  "schemaVersion",
  "skillTargets",
  "source",
] as const

const staticCatalogOptionKeys = [
  "catalogEntityId",
  "conditionDescription",
  "exclusiveGroup",
  "name",
  "optionId",
  "target",
  "variants",
] as const

const staticCatalogDifferenceKeys = [
  "differenceId",
  "explanation",
  "references",
] as const

const recordStatuses = new Set<StaticCoverageRecordStatus>([
  "converted",
  "corrected",
  "unsupported",
])

const supplementalStatuses = new Set<StaticCoverageSupplementalStatus>([
  "integrated",
  "out-of-scope",
])

function parseSourceFiles(
  value: unknown,
  label: string,
): readonly StaticSourceFile[] {
  return expectArray(value, label).map((entry, index) => {
    const itemLabel = `${label}[${index}]`
    const file = expectRecord(entry, itemLabel)
    assertKnownKeys(file, ["path", "sha256"], itemLabel)
    return {
      path: expectString(
        expectField(file, "path", itemLabel),
        `${itemLabel}.path`,
      ),
      sha256: expectSha256(
        expectField(file, "sha256", itemLabel),
        `${itemLabel}.sha256`,
      ),
    }
  })
}

function parseStaticSource(value: unknown, label: string): StaticSource {
  const source = expectRecord(value, label)
  assertKnownKeys(source, ["repository", "commit", "files"], label)
  return {
    repository: expectString(
      expectField(source, "repository", label),
      `${label}.repository`,
    ),
    commit: expectString(
      expectField(source, "commit", label),
      `${label}.commit`,
    ),
    files: parseSourceFiles(
      expectField(source, "files", label),
      `${label}.files`,
    ),
  }
}

/** 解析规则、变体与具名差异共用的来源引用数组。 */
export function parseStaticSourceReferences(
  value: unknown,
  label: string,
): readonly StaticSourceReference[] {
  return expectArray(value, label).map((entry, index) => {
    const itemLabel = `${label}[${index}]`
    const reference = expectRecord(entry, itemLabel)
    const locale = optionalString(reference, "locale", itemLabel)
    return {
      sourceId: expectString(
        expectField(reference, "sourceId", itemLabel),
        `${itemLabel}.sourceId`,
      ),
      version: expectString(
        expectField(reference, "version", itemLabel),
        `${itemLabel}.version`,
      ),
      ...(locale === undefined ? {} : { locale }),
      resourcePath: expectString(
        expectField(reference, "resourcePath", itemLabel),
        `${itemLabel}.resourcePath`,
      ),
      pointer: expectString(
        expectField(reference, "pointer", itemLabel),
        `${itemLabel}.pointer`,
      ),
    }
  })
}

function parseCoverageSummary(
  value: unknown,
  label: string,
): StaticCoverageSummary {
  const summary = expectRecord(value, label)
  assertKnownKeys(summary, staticCoverageSummaryKeys, label)
  const supplementsLabel = `${label}.supplements`
  const supplements = expectRecord(
    expectField(summary, "supplements", label),
    supplementsLabel,
  )
  assertKnownKeys(supplements, staticCoverageSupplementsKeys, supplementsLabel)
  return {
    entities: expectInteger(
      expectField(summary, "entities", label),
      `${label}.entities`,
    ),
    packs: expectInteger(
      expectField(summary, "packs", label),
      `${label}.packs`,
    ),
    emptyPacks: expectInteger(
      expectField(summary, "emptyPacks", label),
      `${label}.emptyPacks`,
    ),
    rawEffects: expectInteger(
      expectField(summary, "rawEffects", label),
      `${label}.rawEffects`,
    ),
    rules: expectInteger(
      expectField(summary, "rules", label),
      `${label}.rules`,
    ),
    options: expectInteger(
      expectField(summary, "options", label),
      `${label}.options`,
    ),
    converted: expectInteger(
      expectField(summary, "converted", label),
      `${label}.converted`,
    ),
    corrected: expectInteger(
      expectField(summary, "corrected", label),
      `${label}.corrected`,
    ),
    unsupported: expectInteger(
      expectField(summary, "unsupported", label),
      `${label}.unsupported`,
    ),
    supplements: {
      records: expectInteger(
        expectField(supplements, "records", supplementsLabel),
        `${supplementsLabel}.records`,
      ),
      rules: expectInteger(
        expectField(supplements, "rules", supplementsLabel),
        `${supplementsLabel}.rules`,
      ),
      options: expectInteger(
        expectField(supplements, "options", supplementsLabel),
        `${supplementsLabel}.options`,
      ),
      entities: expectInteger(
        expectField(supplements, "entities", supplementsLabel),
        `${supplementsLabel}.entities`,
      ),
      integrated: expectInteger(
        expectField(supplements, "integrated", supplementsLabel),
        `${supplementsLabel}.integrated`,
      ),
      outOfScope: expectInteger(
        expectField(supplements, "outOfScope", supplementsLabel),
        `${supplementsLabel}.outOfScope`,
      ),
    },
  }
}

function parseCoverageRecord(
  value: unknown,
  label: string,
): StaticCoverageRecord {
  const record = expectRecord(value, label)
  assertKnownKeys(record, staticCoverageRecordKeys, label)
  const status = expectString(
    expectField(record, "status", label),
    `${label}.status`,
  )
  if (!recordStatuses.has(status as StaticCoverageRecordStatus))
    throw new Error(
      `${label}.status: expected "converted", "corrected", or "unsupported", received "${status}"`,
    )
  const reason = optionalString(record, "reason", label)
  const explanation = optionalString(record, "explanation", label)
  return {
    pointer: expectString(
      expectField(record, "pointer", label),
      `${label}.pointer`,
    ),
    catalogEntityId: expectString(
      expectField(record, "catalogEntityId", label),
      `${label}.catalogEntityId`,
    ),
    rank: expectInteger(expectField(record, "rank", label), `${label}.rank`),
    rankKind: expectString(
      expectField(record, "rankKind", label),
      `${label}.rankKind`,
    ),
    stat: expectString(expectField(record, "stat", label), `${label}.stat`),
    optionId: expectString(
      expectField(record, "optionId", label),
      `${label}.optionId`,
    ),
    effectIds: expectStringArray(
      expectField(record, "effectIds", label),
      `${label}.effectIds`,
    ),
    status: status as StaticCoverageRecordStatus,
    normalizationChanges: expectStringArray(
      expectField(record, "normalizationChanges", label),
      `${label}.normalizationChanges`,
    ),
    rawValue: expectNumber(
      expectField(record, "rawValue", label),
      `${label}.rawValue`,
    ),
    normalizedValue: expectNumber(
      expectField(record, "normalizedValue", label),
      `${label}.normalizedValue`,
    ),
    ...(reason === undefined ? {} : { reason }),
    ...(explanation === undefined ? {} : { explanation }),
  }
}

function parseSupplementalRecord(
  value: unknown,
  label: string,
): StaticCoverageSupplementalRecord {
  const record = expectRecord(value, label)
  assertKnownKeys(record, staticCoverageSupplementalKeys, label)
  const status = expectString(
    expectField(record, "status", label),
    `${label}.status`,
  )
  if (!supplementalStatuses.has(status as StaticCoverageSupplementalStatus))
    throw new Error(
      `${label}.status: expected "integrated" or "out-of-scope", received "${status}"`,
    )
  const effectIds = Object.hasOwn(record, "effectIds")
    ? expectStringArray(record.effectIds, `${label}.effectIds`)
    : undefined
  const reason = optionalString(record, "reason", label)
  return {
    supplementId: expectString(
      expectField(record, "supplementId", label),
      `${label}.supplementId`,
    ),
    source: expectString(
      expectField(record, "source", label),
      `${label}.source`,
    ),
    kind: expectString(expectField(record, "kind", label), `${label}.kind`),
    optionId: expectString(
      expectField(record, "optionId", label),
      `${label}.optionId`,
    ),
    status: status as StaticCoverageSupplementalStatus,
    supportedRanks: expectString(
      expectField(record, "supportedRanks", label),
      `${label}.supportedRanks`,
    ),
    computationTarget: expectString(
      expectField(record, "computationTarget", label),
      `${label}.computationTarget`,
    ),
    ...(effectIds === undefined ? {} : { effectIds }),
    ...(reason === undefined ? {} : { reason }),
  }
}

/** 解析正式 static-coverage.json；拒绝缺失字段、未知字段与未知状态。 */
export function parseStaticCoverage(
  value: unknown,
  label = "static-coverage.json",
): StaticCoverage {
  const coverage = expectRecord(value, label)
  assertKnownKeys(coverage, staticCoverageKeys, label)
  expectRecord(
    expectField(coverage, "fieldMappings", label),
    `${label}.fieldMappings`,
  )
  expectArray(expectField(coverage, "entities", label), `${label}.entities`)
  expectArray(expectField(coverage, "packs", label), `${label}.packs`)
  expectArray(
    expectField(coverage, "reverseGaps", label),
    `${label}.reverseGaps`,
  )
  const sourceLabel = `${label}.source`
  return {
    schemaVersion: expectInteger(
      expectField(coverage, "schemaVersion", label),
      `${label}.schemaVersion`,
    ),
    ruleSetId: expectString(
      expectField(coverage, "ruleSetId", label),
      `${label}.ruleSetId`,
    ),
    revision: expectString(
      expectField(coverage, "revision", label),
      `${label}.revision`,
    ),
    source: parseStaticSource(
      expectField(coverage, "source", label),
      sourceLabel,
    ),
    summary: parseCoverageSummary(
      expectField(coverage, "summary", label),
      `${label}.summary`,
    ),
    records: expectArray(
      expectField(coverage, "records", label),
      `${label}.records`,
    ).map((entry, index) =>
      parseCoverageRecord(entry, `${label}.records[${index}]`),
    ),
    supplementalRecords: expectArray(
      expectField(coverage, "supplementalRecords", label),
      `${label}.supplementalRecords`,
    ).map((entry, index) =>
      parseSupplementalRecord(entry, `${label}.supplementalRecords[${index}]`),
    ),
    deferredMechanisms: expectArray(
      expectField(coverage, "deferredMechanisms", label),
      `${label}.deferredMechanisms`,
    ).map((entry, index) => {
      const itemLabel = `${label}.deferredMechanisms[${index}]`
      const mechanism = expectRecord(entry, itemLabel)
      assertKnownKeys(mechanism, staticCoverageDeferredKeys, itemLabel)
      return {
        catalogEntityId: expectString(
          expectField(mechanism, "catalogEntityId", itemLabel),
          `${itemLabel}.catalogEntityId`,
        ),
        reason: expectString(
          expectField(mechanism, "reason", itemLabel),
          `${itemLabel}.reason`,
        ),
        explanation: expectString(
          expectField(mechanism, "explanation", itemLabel),
          `${itemLabel}.explanation`,
        ),
      }
    }),
  }
}

function parseCatalogInput(value: unknown, label: string): StaticCatalogInput {
  const input = expectRecord(value, label)
  const preset = Object.hasOwn(input, "preset")
    ? expectNumber(input.preset, `${label}.preset`)
    : undefined
  return {
    name: expectString(expectField(input, "name", label), `${label}.name`),
    unit: expectString(expectField(input, "unit", label), `${label}.unit`),
    description: expectString(
      expectField(input, "description", label),
      `${label}.description`,
    ),
    ...(preset === undefined ? {} : { preset }),
  }
}

function parseCatalogVariant(
  value: unknown,
  label: string,
): StaticCatalogVariant {
  const variant = expectRecord(value, label)
  const target = optionalString(variant, "target", label)
  const configuration = Object.hasOwn(variant, "configuration")
    ? expectRecord(variant.configuration, `${label}.configuration`)
    : undefined
  const status = optionalString(variant, "status", label)
  const references = Object.hasOwn(variant, "references")
    ? parseStaticSourceReferences(variant.references, `${label}.references`)
    : undefined
  const maximumLayers = Object.hasOwn(variant, "maximumLayers")
    ? expectInteger(variant.maximumLayers, `${label}.maximumLayers`)
    : undefined
  const inputs = Object.hasOwn(variant, "inputs")
    ? expectArray(variant.inputs, `${label}.inputs`).map((entry, index) =>
        parseCatalogInput(entry, `${label}.inputs[${index}]`),
      )
    : undefined
  const reason = optionalString(variant, "reason", label)
  const explanation = optionalString(variant, "explanation", label)
  return {
    ...(target === undefined ? {} : { target }),
    ...(configuration === undefined ? {} : { configuration }),
    ...(status === undefined ? {} : { status }),
    ...(references === undefined ? {} : { references }),
    effectIds: expectStringArray(
      expectField(variant, "effectIds", label),
      `${label}.effectIds`,
    ),
    ...(maximumLayers === undefined ? {} : { maximumLayers }),
    ...(inputs === undefined ? {} : { inputs }),
    differences: expectStringArray(
      expectField(variant, "differences", label),
      `${label}.differences`,
    ),
    ...(reason === undefined ? {} : { reason }),
    ...(explanation === undefined ? {} : { explanation }),
  }
}

function parseCatalogOption(
  value: unknown,
  label: string,
): StaticCatalogOption {
  const option = expectRecord(value, label)
  assertKnownKeys(option, staticCatalogOptionKeys, label)
  const exclusiveGroup = optionalString(option, "exclusiveGroup", label)
  return {
    optionId: expectString(
      expectField(option, "optionId", label),
      `${label}.optionId`,
    ),
    catalogEntityId: expectString(
      expectField(option, "catalogEntityId", label),
      `${label}.catalogEntityId`,
    ),
    name: expectString(expectField(option, "name", label), `${label}.name`),
    conditionDescription: expectString(
      expectField(option, "conditionDescription", label),
      `${label}.conditionDescription`,
    ),
    target: expectString(
      expectField(option, "target", label),
      `${label}.target`,
    ),
    ...(exclusiveGroup === undefined ? {} : { exclusiveGroup }),
    variants: expectArray(
      expectField(option, "variants", label),
      `${label}.variants`,
    ).map((entry, index) =>
      parseCatalogVariant(entry, `${label}.variants[${index}]`),
    ),
  }
}

function parseStaticSkillTarget(
  value: unknown,
  label: string,
): StaticSkillTarget {
  const target = expectRecord(value, label)
  assertKnownKeys(
    target,
    [
      "agentEntityId",
      "category",
      "countsAsFollowUp",
      "name",
      "targetId",
      "upstreamId",
    ],
    label,
  )
  return {
    targetId: expectString(
      expectField(target, "targetId", label),
      `${label}.targetId`,
    ),
    upstreamId: nullableString(target, "upstreamId", label),
    agentEntityId: nullableString(target, "agentEntityId", label),
    category: expectString(
      expectField(target, "category", label),
      `${label}.category`,
    ),
    name: expectString(expectField(target, "name", label), `${label}.name`),
    countsAsFollowUp: expectBoolean(
      expectField(target, "countsAsFollowUp", label),
      `${label}.countsAsFollowUp`,
    ),
  }
}

function parseCatalogDifference(
  value: unknown,
  label: string,
): StaticCatalogDifference {
  const difference = expectRecord(value, label)
  assertKnownKeys(difference, staticCatalogDifferenceKeys, label)
  return {
    differenceId: expectString(
      expectField(difference, "differenceId", label),
      `${label}.differenceId`,
    ),
    explanation: expectString(
      expectField(difference, "explanation", label),
      `${label}.explanation`,
    ),
    references: parseStaticSourceReferences(
      expectField(difference, "references", label),
      `${label}.references`,
    ),
  }
}

/** 解析正式 static-catalog.json；只保留 coverage 关联所需的目录结构。 */
export function parseStaticCatalog(
  value: unknown,
  label = "static-catalog.json",
): StaticCatalog {
  const catalog = expectRecord(value, label)
  assertKnownKeys(catalog, staticCatalogKeys, label)
  const source = parseStaticSource(
    expectField(catalog, "source", label),
    `${label}.source`,
  )
  const skillTargets = expectArray(
    expectField(catalog, "skillTargets", label),
    `${label}.skillTargets`,
  ).map((entry, index) =>
    parseStaticSkillTarget(entry, `${label}.skillTargets[${index}]`),
  )
  const differences = expectArray(
    expectField(catalog, "differences", label),
    `${label}.differences`,
  ).map((entry, index) =>
    parseCatalogDifference(entry, `${label}.differences[${index}]`),
  )
  const options = expectArray(
    expectField(catalog, "options", label),
    `${label}.options`,
  ).map((entry, index) =>
    parseCatalogOption(entry, `${label}.options[${index}]`),
  )

  const differenceIds = new Set<string>()
  for (const difference of differences) {
    if (differenceIds.has(difference.differenceId))
      throw new Error(
        `${label}.differences: duplicate differenceId "${difference.differenceId}"`,
      )
    differenceIds.add(difference.differenceId)
  }

  const optionIds = new Set<string>()
  const referencedDifferenceIds = new Set<string>()
  for (const option of options) {
    if (optionIds.has(option.optionId))
      throw new Error(
        `${label}.options: duplicate optionId "${option.optionId}"`,
      )
    optionIds.add(option.optionId)
    for (const variant of option.variants) {
      for (const differenceId of variant.differences)
        referencedDifferenceIds.add(differenceId)
    }
  }

  const unregistered = [...referencedDifferenceIds].filter(
    (differenceId) => !differenceIds.has(differenceId),
  )
  if (unregistered.length > 0)
    throw new Error(
      `${label}.options: variants reference unregistered differenceId(s): ${unregistered.join(", ")}`,
    )

  return {
    schemaVersion: expectInteger(
      expectField(catalog, "schemaVersion", label),
      `${label}.schemaVersion`,
    ),
    ruleSetId: expectString(
      expectField(catalog, "ruleSetId", label),
      `${label}.ruleSetId`,
    ),
    revision: expectString(
      expectField(catalog, "revision", label),
      `${label}.revision`,
    ),
    source,
    entityCount: expectArray(
      expectField(catalog, "entities", label),
      `${label}.entities`,
    ).length,
    mechanismCount: expectArray(
      expectField(catalog, "mechanisms", label),
      `${label}.mechanisms`,
    ).length,
    differences,
    options,
    skillTargets,
  }
}

/** 返回只有说明、未被任何变体以 differences[] 结构化引用的具名差异。 */
export function collectUnstructuredDifferenceIds(
  catalog: StaticCatalog,
): readonly string[] {
  const referenced = new Set<string>()
  for (const option of catalog.options) {
    for (const variant of option.variants) {
      for (const differenceId of variant.differences)
        referenced.add(differenceId)
    }
  }
  return catalog.differences
    .filter((difference) => !referenced.has(difference.differenceId))
    .map((difference) => difference.differenceId)
}

export interface StaticCoverageQueryInput {
  readonly catalog: StaticCatalog
  readonly coverage: StaticCoverage
}

export interface StaticCoverageFilter {
  readonly catalogEntityId?: string
  readonly pointer?: string
  readonly status?: StaticCoverageStatus
  readonly differenceId?: string
  readonly optionId?: string
  readonly effectId?: string
}

export type StaticCoverageMatch =
  | (StaticCoverageRecord & { readonly group: "records" })
  | (StaticCoverageSupplementalRecord & {
      readonly group: "supplementalRecords"
      readonly catalogEntityId?: string
    })

export interface StaticCoverageQueryResult {
  readonly matches: readonly StaticCoverageMatch[]
  readonly limitations: readonly string[]
}

interface DifferenceLink {
  readonly optionIds: ReadonlySet<string>
  readonly effectIds: ReadonlySet<string>
}

function buildDifferenceLink(
  catalog: StaticCatalog,
  differenceId: string,
): DifferenceLink | undefined {
  const optionIds = new Set<string>()
  const effectIds = new Set<string>()
  for (const option of catalog.options) {
    for (const variant of option.variants) {
      if (!variant.differences.includes(differenceId)) continue
      optionIds.add(option.optionId)
      for (const effectId of variant.effectIds) effectIds.add(effectId)
    }
  }
  if (optionIds.size === 0) return undefined
  return { optionIds, effectIds }
}

function matchesDifferenceLink(
  optionId: string,
  effectIds: readonly string[],
  link: DifferenceLink,
): boolean {
  if (link.optionIds.has(optionId)) return true
  return effectIds.some((effectId) => link.effectIds.has(effectId))
}

/**
 * 按 catalogEntityId、pointer、status、differenceId、optionId 或 effectId
 * 过滤正式覆盖记录。differenceId 只使用变体 differences[] →
 * optionId/effectIds 的结构化关联；说明文本不参与匹配。条件之间按 AND
 * 组合，输入对象不会被修改。
 */
export function queryStaticCoverage(
  input: StaticCoverageQueryInput,
  filter: StaticCoverageFilter,
): StaticCoverageQueryResult {
  const limitations: string[] = []
  let differenceLink: DifferenceLink | undefined

  if (filter.pointer !== undefined)
    limitations.push(
      "supplementalRecords 不携带结构化 pointer；pointer 过滤只应用于 records。",
    )

  if (filter.differenceId !== undefined) {
    differenceLink = buildDifferenceLink(input.catalog, filter.differenceId)
    if (differenceLink === undefined) {
      const registered = input.catalog.differences.some(
        (difference) => difference.differenceId === filter.differenceId,
      )
      limitations.push(
        registered
          ? `differenceId "${filter.differenceId}" 只有 catalog 说明，没有变体 differences[] 结构化引用；未按 explanation/reason 文本推断，返回空结果。`
          : `未登记的 differenceId "${filter.differenceId}"；返回空结果。`,
      )
      return { matches: [], limitations }
    }
  }

  const optionEntities = new Map(
    input.catalog.options.map((option) => [
      option.optionId,
      option.catalogEntityId,
    ]),
  )
  const matches: StaticCoverageMatch[] = []

  for (const record of input.coverage.records) {
    if (filter.status !== undefined && record.status !== filter.status) continue
    if (filter.pointer !== undefined && record.pointer !== filter.pointer)
      continue
    if (filter.optionId !== undefined && record.optionId !== filter.optionId)
      continue
    if (
      filter.effectId !== undefined &&
      !record.effectIds.includes(filter.effectId)
    )
      continue
    if (
      filter.catalogEntityId !== undefined &&
      record.catalogEntityId !== filter.catalogEntityId
    )
      continue
    if (
      differenceLink !== undefined &&
      !matchesDifferenceLink(record.optionId, record.effectIds, differenceLink)
    )
      continue
    matches.push({
      ...record,
      group: "records",
      effectIds: [...record.effectIds],
    })
  }

  for (const record of input.coverage.supplementalRecords) {
    // supplementalRecords 没有 pointer；带 pointer 过滤时不参与匹配。
    if (filter.pointer !== undefined) continue
    if (filter.status !== undefined && record.status !== filter.status) continue
    if (filter.optionId !== undefined && record.optionId !== filter.optionId)
      continue
    if (
      filter.effectId !== undefined &&
      !(record.effectIds ?? []).includes(filter.effectId)
    )
      continue
    const catalogEntityId = optionEntities.get(record.optionId)
    if (
      filter.catalogEntityId !== undefined &&
      catalogEntityId !== filter.catalogEntityId
    )
      continue
    if (
      differenceLink !== undefined &&
      !matchesDifferenceLink(
        record.optionId,
        record.effectIds ?? [],
        differenceLink,
      )
    )
      continue
    matches.push({
      ...record,
      group: "supplementalRecords",
      ...(record.effectIds === undefined
        ? {}
        : { effectIds: [...record.effectIds] }),
      ...(catalogEntityId === undefined ? {} : { catalogEntityId }),
    })
  }

  return { matches, limitations }
}
