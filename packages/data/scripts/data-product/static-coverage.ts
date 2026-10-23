import {
  assertKnownKeys,
  expectArray,
  expectField,
  expectInteger,
  expectNumber,
  expectRecord,
  expectSha256,
  expectString,
  expectStringArray,
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

export interface StaticCoverageSource {
  readonly repository: string
  readonly commit: string
  readonly files: readonly StaticSourceFile[]
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
  readonly source: StaticCoverageSource
  readonly summary: StaticCoverageSummary
  readonly records: readonly StaticCoverageRecord[]
  readonly supplementalRecords: readonly StaticCoverageSupplementalRecord[]
  readonly deferredMechanisms: readonly StaticCoverageDeferredMechanism[]
}

export interface StaticCatalogVariant {
  readonly effectIds: readonly string[]
  readonly differences: readonly string[]
}

export interface StaticCatalogOption {
  readonly optionId: string
  readonly catalogEntityId: string
  readonly variants: readonly StaticCatalogVariant[]
}

export interface StaticCatalogDifference {
  readonly differenceId: string
  readonly explanation: string
  readonly references: readonly unknown[]
}

export interface StaticCatalog {
  readonly schemaVersion: number
  readonly ruleSetId: string
  readonly revision: string
  readonly entityCount: number
  readonly mechanismCount: number
  readonly differences: readonly StaticCatalogDifference[]
  readonly options: readonly StaticCatalogOption[]
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
  const source = expectRecord(
    expectField(coverage, "source", label),
    sourceLabel,
  )
  assertKnownKeys(source, ["repository", "commit", "files"], sourceLabel)
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
    source: {
      repository: expectString(
        expectField(source, "repository", sourceLabel),
        `${sourceLabel}.repository`,
      ),
      commit: expectString(
        expectField(source, "commit", sourceLabel),
        `${sourceLabel}.commit`,
      ),
      files: parseSourceFiles(
        expectField(source, "files", sourceLabel),
        `${sourceLabel}.files`,
      ),
    },
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

function parseCatalogOption(
  value: unknown,
  label: string,
): StaticCatalogOption {
  const option = expectRecord(value, label)
  assertKnownKeys(option, staticCatalogOptionKeys, label)
  if (Object.hasOwn(option, "exclusiveGroup"))
    expectString(option.exclusiveGroup, `${label}.exclusiveGroup`)
  return {
    optionId: expectString(
      expectField(option, "optionId", label),
      `${label}.optionId`,
    ),
    catalogEntityId: expectString(
      expectField(option, "catalogEntityId", label),
      `${label}.catalogEntityId`,
    ),
    variants: expectArray(
      expectField(option, "variants", label),
      `${label}.variants`,
    ).map((entry, index) => {
      const variantLabel = `${label}.variants[${index}]`
      // 只解释 coverage 关联需要的字段；其余变体语义由正式类型与生成器维护。
      const variant = expectRecord(entry, variantLabel)
      return {
        effectIds: expectStringArray(
          expectField(variant, "effectIds", variantLabel),
          `${variantLabel}.effectIds`,
        ),
        differences: expectStringArray(
          expectField(variant, "differences", variantLabel),
          `${variantLabel}.differences`,
        ),
      }
    }),
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
    references: expectArray(
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
  expectRecord(expectField(catalog, "source", label), `${label}.source`)
  expectArray(
    expectField(catalog, "skillTargets", label),
    `${label}.skillTargets`,
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
 * 按 catalogEntityId、pointer、status 或 differenceId 过滤正式覆盖记录。
 * differenceId 只使用变体 differences[] → optionId/effectIds 的结构化关联；
 * 说明文本不参与匹配。输入对象不会被修改。
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
