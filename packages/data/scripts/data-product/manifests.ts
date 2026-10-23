import { statSync } from "node:fs"
import { basename, dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  assertKnownKeys,
  expectArray,
  expectField,
  expectInteger,
  expectRecord,
  expectSha256,
  expectString,
  expectStringArray,
  readJsonFile,
} from "./json.ts"
import {
  collectUnstructuredDifferenceIds,
  parseStaticCatalog,
  parseStaticCoverage,
  parseStaticSourceReferences,
  type StaticCatalog,
  type StaticCoverage,
  type StaticCoverageSummary,
  type StaticSource,
  type StaticSourceFile,
  type StaticSourceReference,
} from "./static-coverage.ts"

export type DataProductId =
  | "panel-attributes"
  | "agent-actions"
  | "static-effects"

export interface DataProductArtifact {
  readonly path: string
  readonly sha256: string
  readonly bytes: number
  /** manifest 声明摘要，或由读取器按实际文件计算。 */
  readonly sha256Origin: "manifest" | "computed"
}

export interface DataProductRulesVersion {
  readonly label: string
  readonly ruleSetId?: string
  readonly revision?: string
}

export interface DataProductSource {
  readonly version?: string
  readonly repository?: string
  readonly commit?: string
}

/** 三个产品的覆盖计数单位不同，调用方必须按 unit 解释 count 与 statusCounts。 */
export type DataProductCoverageUnit = "members" | "actions" | "coverage-records"

/**
 * 产品级覆盖摘要。`unit` 表示 `count` 的计量单位：
 * panel-attributes 为属性成员数，agent-actions 为动作数，
 * static-effects 为 static-coverage 的逐条 records 数。
 */
export interface DataProductCoverageSummary {
  readonly unit: DataProductCoverageUnit
  readonly count: number
  readonly statusCounts: Readonly<Record<string, number>>
  readonly supplementalCount: number
  readonly supplementalStatusCounts: Readonly<Record<string, number>>
}

export interface DataProductDiscrepancy {
  readonly id: string
  readonly description: string
  readonly details?: Readonly<Record<string, unknown>>
}

export interface DataProductLimitation {
  readonly origin: "manifest" | "reader"
  readonly text: string
  readonly scope?: string
  readonly reason?: string
}

export interface DataProductManifest<
  Product extends DataProductId,
  Extensions,
> {
  readonly product: Product
  readonly schemaVersion: number
  readonly rulesVersion: DataProductRulesVersion
  readonly source: DataProductSource
  readonly artifacts: readonly DataProductArtifact[]
  readonly limitations: readonly DataProductLimitation[]
  readonly discrepancies: readonly DataProductDiscrepancy[]
  readonly coverage: DataProductCoverageSummary
  readonly extensions: Extensions
}

export interface DataProductEvidenceSummary {
  readonly zzzHpCommit: string
  readonly resources: number
}

export interface PanelAttributesExtensions {
  readonly members: {
    readonly agents: readonly string[]
    readonly wEngines: readonly string[]
  }
  readonly inputs: number
  readonly evidence: DataProductEvidenceSummary
}

export interface AgentActionsCoverageCounts {
  readonly agents: number
  readonly actions: number
  readonly damage: number
  readonly dazeOnly: number
  readonly luminize: number
  readonly unavailable: number
  readonly individualHitActions: number
}

export interface AgentActionsExtensions {
  readonly members: readonly string[]
  readonly inputs: number
  readonly registrySha256: string
  readonly staticCatalogSha256: string
  readonly coverage: AgentActionsCoverageCounts
  readonly evidence: DataProductEvidenceSummary
}

export interface StaticEffectsExtensions {
  readonly sourceFiles: readonly StaticSourceFile[]
  readonly catalog: {
    readonly entities: number
    readonly options: number
    readonly differences: number
    readonly mechanisms: number
  }
  readonly coverage: StaticCoverageSummary
}

export type PanelAttributesManifest = DataProductManifest<
  "panel-attributes",
  PanelAttributesExtensions
>
export type AgentActionsManifest = DataProductManifest<
  "agent-actions",
  AgentActionsExtensions
>
export type StaticEffectsManifest = DataProductManifest<
  "static-effects",
  StaticEffectsExtensions
>
export type AnyDataProductManifest =
  | PanelAttributesManifest
  | AgentActionsManifest
  | StaticEffectsManifest

export interface DataProductManifests {
  readonly panelAttributes: PanelAttributesManifest
  readonly agentActions: AgentActionsManifest
  readonly staticEffects: StaticEffectsManifest
}

export interface StaticRuleIdentity {
  readonly kind: string
  readonly entityId: string
}

export interface StaticRuleSource {
  readonly identity: StaticRuleIdentity
  readonly section: string
  readonly references: readonly StaticSourceReference[]
}

export interface StaticContributionRule {
  readonly kind: "contribution"
  readonly effectId: string
  readonly source: StaticRuleSource
  readonly operationKind: string
  readonly scope: string
  readonly activationKind: string
  readonly beneficiaryKind: string
  readonly parameterNames: readonly string[]
}

export type StaticModificationTarget =
  | {
      readonly kind: "effect"
      readonly effectId: string
    }
  | {
      readonly kind: "state"
      readonly stateId: string
    }

export interface StaticInstantRule {
  readonly kind: "instant"
  readonly effectId: string
  readonly source: StaticRuleSource
  readonly triggerEventKinds: readonly string[]
  readonly beneficiaryKind: string
  readonly operationKind: string
}

export interface StaticModificationRule {
  readonly kind: "modification"
  readonly effectId: string
  readonly source: StaticRuleSource
  readonly phase: string
  readonly target: StaticModificationTarget
  readonly modifications: readonly Readonly<Record<string, unknown>>[]
}

export type StaticRule =
  | StaticContributionRule
  | StaticInstantRule
  | StaticModificationRule

export interface StaticEffectsProduct {
  readonly manifest: StaticEffectsManifest
  readonly rules: readonly StaticRule[]
  readonly catalog: StaticCatalog
  readonly coverage: StaticCoverage
}

export const defaultDefinitionsDirectory = fileURLToPath(
  new URL("../../definitions/", import.meta.url),
)

const attributesManifestKeys = [
  "artifacts",
  "discrepancies",
  "evidence",
  "inputs",
  "limitations",
  "members",
  "rulesVersion",
  "schemaVersion",
  "sourceVersion",
] as const

const skillsManifestKeys = [
  "artifacts",
  "coverage",
  "discrepancies",
  "evidence",
  "inputs",
  "limitations",
  "members",
  "registrySha256",
  "rulesVersion",
  "schemaVersion",
  "sourceVersion",
  "staticCatalogSha256",
] as const

const skillsCoverageKeys = [
  "actions",
  "agents",
  "damage",
  "dazeOnly",
  "individualHitActions",
  "luminize",
  "unavailable",
] as const

const staticEffectsKeys = [
  "actions",
  "effects",
  "revision",
  "ruleSetId",
  "schemaVersion",
  "states",
] as const

function parseEvidence(
  value: unknown,
  label: string,
): DataProductEvidenceSummary {
  const evidence = expectRecord(value, label)
  assertKnownKeys(evidence, ["zzzHpCommit", "resources"], label)
  return {
    zzzHpCommit: expectString(
      expectField(evidence, "zzzHpCommit", label),
      `${label}.zzzHpCommit`,
    ),
    resources: expectArray(
      expectField(evidence, "resources", label),
      `${label}.resources`,
    ).length,
  }
}

function artifactBytes(
  definitionsDirectory: string,
  artifactPath: string,
  label: string,
): number {
  try {
    return statSync(join(definitionsDirectory, artifactPath)).size
  } catch (error) {
    throw new Error(
      `${label}: artifact "${artifactPath}" is missing or unreadable under ${definitionsDirectory}`,
      { cause: error },
    )
  }
}

function parseManifestArtifacts(
  value: unknown,
  productDirectory: string,
  definitionsDirectory: string,
  label: string,
): readonly DataProductArtifact[] {
  const artifactRecord = expectRecord(value, `${label}.artifacts`)
  return Object.entries(artifactRecord).map(([relativePath, digest]) => {
    const artifactPath = `${productDirectory}/${relativePath}`
    return {
      path: artifactPath,
      sha256: expectSha256(digest, `${label}.artifacts["${relativePath}"]`),
      bytes: artifactBytes(definitionsDirectory, artifactPath, label),
      sha256Origin: "manifest",
    }
  })
}

function countStatuses(
  records: readonly { readonly status: string }[],
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {}
  for (const record of records)
    counts[record.status] = (counts[record.status] ?? 0) + 1
  return counts
}

function parsePanelAttributesManifest(
  definitionsDirectory: string,
  productDirectory = "attributes",
): PanelAttributesManifest {
  const label = `${productDirectory}/manifest.json`
  const manifest = expectRecord(
    readJsonFile(join(definitionsDirectory, label), label).value,
    label,
  )
  assertKnownKeys(manifest, attributesManifestKeys, label)

  const membersLabel = `${label}.members`
  const members = expectRecord(
    expectField(manifest, "members", label),
    membersLabel,
  )
  assertKnownKeys(members, ["agents", "wEngines"], membersLabel)
  const agents = expectStringArray(
    expectField(members, "agents", membersLabel),
    `${membersLabel}.agents`,
  )
  const wEngines = expectStringArray(
    expectField(members, "wEngines", membersLabel),
    `${membersLabel}.wEngines`,
  )

  const discrepancies = expectArray(
    expectField(manifest, "discrepancies", label),
    `${label}.discrepancies`,
  ).map((entry, index) => {
    const itemLabel = `${label}.discrepancies[${index}]`
    const discrepancy = expectRecord(entry, itemLabel)
    assertKnownKeys(discrepancy, ["id", "description"], itemLabel)
    return {
      id: expectString(
        expectField(discrepancy, "id", itemLabel),
        `${itemLabel}.id`,
      ),
      description: expectString(
        expectField(discrepancy, "description", itemLabel),
        `${itemLabel}.description`,
      ),
    }
  })

  const limitations = expectArray(
    expectField(manifest, "limitations", label),
    `${label}.limitations`,
  ).map((entry, index) => ({
    origin: "manifest" as const,
    text: expectString(entry, `${label}.limitations[${index}]`),
  }))

  return {
    product: "panel-attributes",
    schemaVersion: expectInteger(
      expectField(manifest, "schemaVersion", label),
      `${label}.schemaVersion`,
    ),
    rulesVersion: {
      label: expectString(
        expectField(manifest, "rulesVersion", label),
        `${label}.rulesVersion`,
      ),
    },
    source: {
      version: expectString(
        expectField(manifest, "sourceVersion", label),
        `${label}.sourceVersion`,
      ),
    },
    artifacts: parseManifestArtifacts(
      expectField(manifest, "artifacts", label),
      productDirectory,
      definitionsDirectory,
      label,
    ),
    limitations,
    discrepancies,
    coverage: {
      unit: "members",
      count: agents.length + wEngines.length,
      statusCounts: {},
      supplementalCount: 0,
      supplementalStatusCounts: {},
    },
    extensions: {
      members: { agents, wEngines },
      inputs: expectArray(
        expectField(manifest, "inputs", label),
        `${label}.inputs`,
      ).length,
      evidence: parseEvidence(
        expectField(manifest, "evidence", label),
        `${label}.evidence`,
      ),
    },
  }
}

function parseAgentActionsManifest(
  definitionsDirectory: string,
  productDirectory = "skills",
): AgentActionsManifest {
  const label = `${productDirectory}/manifest.json`
  const manifest = expectRecord(
    readJsonFile(join(definitionsDirectory, label), label).value,
    label,
  )
  assertKnownKeys(manifest, skillsManifestKeys, label)

  const coverageLabel = `${label}.coverage`
  const coverage = expectRecord(
    expectField(manifest, "coverage", label),
    coverageLabel,
  )
  assertKnownKeys(coverage, skillsCoverageKeys, coverageLabel)
  const coverageCounts: AgentActionsCoverageCounts = {
    agents: expectInteger(
      expectField(coverage, "agents", coverageLabel),
      `${coverageLabel}.agents`,
    ),
    actions: expectInteger(
      expectField(coverage, "actions", coverageLabel),
      `${coverageLabel}.actions`,
    ),
    damage: expectInteger(
      expectField(coverage, "damage", coverageLabel),
      `${coverageLabel}.damage`,
    ),
    dazeOnly: expectInteger(
      expectField(coverage, "dazeOnly", coverageLabel),
      `${coverageLabel}.dazeOnly`,
    ),
    luminize: expectInteger(
      expectField(coverage, "luminize", coverageLabel),
      `${coverageLabel}.luminize`,
    ),
    unavailable: expectInteger(
      expectField(coverage, "unavailable", coverageLabel),
      `${coverageLabel}.unavailable`,
    ),
    individualHitActions: expectInteger(
      expectField(coverage, "individualHitActions", coverageLabel),
      `${coverageLabel}.individualHitActions`,
    ),
  }

  const discrepancies = expectArray(
    expectField(manifest, "discrepancies", label),
    `${label}.discrepancies`,
  ).map((entry, index) => {
    const itemLabel = `${label}.discrepancies[${index}]`
    const discrepancy = expectRecord(entry, itemLabel)
    assertKnownKeys(
      discrepancy,
      ["actionId", "field", "upstream", "adopted", "reason"],
      itemLabel,
    )
    const actionId = expectString(
      expectField(discrepancy, "actionId", itemLabel),
      `${itemLabel}.actionId`,
    )
    const field = expectString(
      expectField(discrepancy, "field", itemLabel),
      `${itemLabel}.field`,
    )
    return {
      id: `${actionId}:${field}`,
      description: expectString(
        expectField(discrepancy, "reason", itemLabel),
        `${itemLabel}.reason`,
      ),
      details: {
        actionId,
        field,
        upstream: expectString(
          expectField(discrepancy, "upstream", itemLabel),
          `${itemLabel}.upstream`,
        ),
        adopted: expectString(
          expectField(discrepancy, "adopted", itemLabel),
          `${itemLabel}.adopted`,
        ),
      },
    }
  })

  const limitations = expectArray(
    expectField(manifest, "limitations", label),
    `${label}.limitations`,
  ).map((entry, index) => ({
    origin: "manifest" as const,
    text: expectString(entry, `${label}.limitations[${index}]`),
  }))

  return {
    product: "agent-actions",
    schemaVersion: expectInteger(
      expectField(manifest, "schemaVersion", label),
      `${label}.schemaVersion`,
    ),
    rulesVersion: {
      label: expectString(
        expectField(manifest, "rulesVersion", label),
        `${label}.rulesVersion`,
      ),
    },
    source: {
      version: expectString(
        expectField(manifest, "sourceVersion", label),
        `${label}.sourceVersion`,
      ),
    },
    artifacts: parseManifestArtifacts(
      expectField(manifest, "artifacts", label),
      productDirectory,
      definitionsDirectory,
      label,
    ),
    limitations,
    discrepancies,
    coverage: {
      unit: "actions",
      count: coverageCounts.actions,
      statusCounts: {
        damage: coverageCounts.damage,
        dazeOnly: coverageCounts.dazeOnly,
        luminize: coverageCounts.luminize,
        unavailable: coverageCounts.unavailable,
      },
      supplementalCount: 0,
      supplementalStatusCounts: {},
    },
    extensions: {
      members: expectStringArray(
        expectField(manifest, "members", label),
        `${label}.members`,
      ),
      inputs: expectArray(
        expectField(manifest, "inputs", label),
        `${label}.inputs`,
      ).length,
      registrySha256: expectSha256(
        expectField(manifest, "registrySha256", label),
        `${label}.registrySha256`,
      ),
      staticCatalogSha256: expectSha256(
        expectField(manifest, "staticCatalogSha256", label),
        `${label}.staticCatalogSha256`,
      ),
      coverage: coverageCounts,
      evidence: parseEvidence(
        expectField(manifest, "evidence", label),
        `${label}.evidence`,
      ),
    },
  }
}

function expectSharedStaticField(
  field: "schemaVersion" | "ruleSetId" | "revision",
  staticValue: number | string,
  catalogValue: number | string,
  coverageValue: number | string,
): void {
  if (staticValue === catalogValue && staticValue === coverageValue) return
  throw new Error(
    `static effects products disagree on ${field}: static.json=${String(staticValue)}, static-catalog.json=${String(catalogValue)}, static-coverage.json=${String(coverageValue)}`,
  )
}

function firstSourceFileDifference(
  catalogFiles: readonly StaticSourceFile[],
  coverageFiles: readonly StaticSourceFile[],
): string | undefined {
  const length = Math.max(catalogFiles.length, coverageFiles.length)
  for (let index = 0; index < length; index += 1) {
    const catalogFile = catalogFiles[index]
    const coverageFile = coverageFiles[index]
    if (catalogFile === undefined) {
      if (coverageFile === undefined) return undefined
      return `static-coverage.json additionally lists "${coverageFile.path}" at index ${index}`
    }
    if (coverageFile === undefined)
      return `static-catalog.json additionally lists "${catalogFile.path}" at index ${index}`
    if (catalogFile.path !== coverageFile.path)
      return `file at index ${index} is "${catalogFile.path}" in static-catalog.json but "${coverageFile.path}" in static-coverage.json`
    if (catalogFile.sha256 !== coverageFile.sha256)
      return `sha256 disagrees for "${catalogFile.path}"`
  }
  return undefined
}

/** 校验 catalog 与 coverage 描述同一来源，并返回可直接用于 manifest 的来源。 */
function expectMatchingStaticSource(
  catalogSource: StaticSource,
  coverageSource: StaticSource,
): StaticSource {
  if (catalogSource.repository !== coverageSource.repository)
    throw new Error(
      `static effects products disagree on source.repository: static-catalog.json=${catalogSource.repository}, static-coverage.json=${coverageSource.repository}`,
    )
  if (catalogSource.commit !== coverageSource.commit)
    throw new Error(
      `static effects products disagree on source.commit: static-catalog.json=${catalogSource.commit}, static-coverage.json=${coverageSource.commit}`,
    )
  const fileDifference = firstSourceFileDifference(
    catalogSource.files,
    coverageSource.files,
  )
  if (fileDifference !== undefined)
    throw new Error(
      `static effects products disagree on source.files: ${fileDifference}`,
    )
  return coverageSource
}

function parseStaticRuleSource(
  value: unknown,
  label: string,
): StaticRuleSource {
  const source = expectRecord(value, label)
  assertKnownKeys(source, ["identity", "references", "section"], label)
  const identity = expectRecord(
    expectField(source, "identity", label),
    `${label}.identity`,
  )
  assertKnownKeys(identity, ["entityId", "kind"], `${label}.identity`)
  return {
    identity: {
      kind: expectString(
        expectField(identity, "kind", `${label}.identity`),
        `${label}.identity.kind`,
      ),
      entityId: expectString(
        expectField(identity, "entityId", `${label}.identity`),
        `${label}.identity.entityId`,
      ),
    },
    section: expectString(
      expectField(source, "section", label),
      `${label}.section`,
    ),
    references: parseStaticSourceReferences(
      expectField(source, "references", label),
      `${label}.references`,
    ),
  }
}

function parseStaticRule(value: unknown, label: string): StaticRule {
  const rule = expectRecord(value, label)
  const kind = expectString(expectField(rule, "kind", label), `${label}.kind`)
  const effectId = expectString(
    expectField(rule, "effectId", label),
    `${label}.effectId`,
  )
  const source = parseStaticRuleSource(
    expectField(rule, "source", label),
    `${label}.source`,
  )

  if (kind === "contribution") {
    const operation = expectRecord(
      expectField(rule, "operation", label),
      `${label}.operation`,
    )
    const activation = expectRecord(
      expectField(rule, "activation", label),
      `${label}.activation`,
    )
    const beneficiary = expectRecord(
      expectField(rule, "beneficiary", label),
      `${label}.beneficiary`,
    )
    const parameters = expectRecord(
      expectField(rule, "parameters", label),
      `${label}.parameters`,
    )
    return {
      kind,
      effectId,
      source,
      operationKind: expectString(
        expectField(operation, "kind", `${label}.operation`),
        `${label}.operation.kind`,
      ),
      scope: expectString(expectField(rule, "scope", label), `${label}.scope`),
      activationKind: expectString(
        expectField(activation, "kind", `${label}.activation`),
        `${label}.activation.kind`,
      ),
      beneficiaryKind: expectString(
        expectField(beneficiary, "kind", `${label}.beneficiary`),
        `${label}.beneficiary.kind`,
      ),
      parameterNames: Object.keys(parameters).toSorted(),
    }
  }

  if (kind === "instant") {
    const trigger = expectRecord(
      expectField(rule, "trigger", label),
      `${label}.trigger`,
    )
    const beneficiary = expectRecord(
      expectField(rule, "beneficiary", label),
      `${label}.beneficiary`,
    )
    const operation = expectRecord(
      expectField(rule, "operation", label),
      `${label}.operation`,
    )
    return {
      kind,
      effectId,
      source,
      triggerEventKinds: expectStringArray(
        expectField(trigger, "eventKinds", `${label}.trigger`),
        `${label}.trigger.eventKinds`,
      ),
      beneficiaryKind: expectString(
        expectField(beneficiary, "kind", `${label}.beneficiary`),
        `${label}.beneficiary.kind`,
      ),
      operationKind: expectString(
        expectField(operation, "kind", `${label}.operation`),
        `${label}.operation.kind`,
      ),
    }
  }

  if (kind === "modification") {
    const target = expectRecord(
      expectField(rule, "target", label),
      `${label}.target`,
    )
    const targetKind = expectString(
      expectField(target, "kind", `${label}.target`),
      `${label}.target.kind`,
    )
    const modifications = expectArray(
      expectField(rule, "modifications", label),
      `${label}.modifications`,
    ).map((entry, index) =>
      expectRecord(entry, `${label}.modifications[${index}]`),
    )
    if (modifications.length === 0)
      throw new Error(`${label}.modifications: expected a non-empty array`)
    const common = {
      kind,
      effectId,
      source,
      phase: expectString(expectField(rule, "phase", label), `${label}.phase`),
      modifications,
    } as const
    if (targetKind === "effect")
      return {
        ...common,
        target: {
          kind: "effect",
          effectId: expectString(
            expectField(target, "effectId", `${label}.target`),
            `${label}.target.effectId`,
          ),
        },
      }
    if (targetKind === "state")
      return {
        ...common,
        target: {
          kind: "state",
          stateId: expectString(
            expectField(target, "stateId", `${label}.target`),
            `${label}.target.stateId`,
          ),
        },
      }
    throw new Error(
      `${label}.target.kind: expected "effect" or "state", received "${targetKind}"`,
    )
  }

  throw new Error(
    `${label}.kind: expected "contribution", "instant", or "modification", received "${kind}"`,
  )
}

function parseStaticRules(
  value: unknown,
  label: string,
): readonly StaticRule[] {
  const ruleSet = expectRecord(value, label)
  const rules = expectArray(
    expectField(ruleSet, "effects", label),
    `${label}.effects`,
  ).map((entry, index) => parseStaticRule(entry, `${label}.effects[${index}]`))
  const effectIds = new Set<string>()
  for (const rule of rules) {
    if (effectIds.has(rule.effectId))
      throw new Error(`${label}.effects: duplicate effectId "${rule.effectId}"`)
    effectIds.add(rule.effectId)
  }
  return rules
}

/** 读取三个静态效果制品，并构造统一 manifest 与可查询的目录/覆盖数据。 */
export function loadStaticEffectsProduct(
  definitionsDirectory = defaultDefinitionsDirectory,
): StaticEffectsProduct {
  const staticLabel = "effects/static.json"
  const catalogLabel = "effects/static-catalog.json"
  const coverageLabel = "effects/static-coverage.json"

  const staticFile = readJsonFile(
    join(definitionsDirectory, staticLabel),
    staticLabel,
  )
  const catalogFile = readJsonFile(
    join(definitionsDirectory, catalogLabel),
    catalogLabel,
  )
  const coverageFile = readJsonFile(
    join(definitionsDirectory, coverageLabel),
    coverageLabel,
  )

  const staticManifest = expectRecord(staticFile.value, staticLabel)
  assertKnownKeys(staticManifest, staticEffectsKeys, staticLabel)
  const schemaVersion = expectInteger(
    expectField(staticManifest, "schemaVersion", staticLabel),
    `${staticLabel}.schemaVersion`,
  )
  const ruleSetId = expectString(
    expectField(staticManifest, "ruleSetId", staticLabel),
    `${staticLabel}.ruleSetId`,
  )
  const revision = expectString(
    expectField(staticManifest, "revision", staticLabel),
    `${staticLabel}.revision`,
  )
  expectArray(
    expectField(staticManifest, "effects", staticLabel),
    `${staticLabel}.effects`,
  )
  expectArray(
    expectField(staticManifest, "actions", staticLabel),
    `${staticLabel}.actions`,
  )
  expectArray(
    expectField(staticManifest, "states", staticLabel),
    `${staticLabel}.states`,
  )

  const rules = parseStaticRules(staticFile.value, staticLabel)
  const catalog = parseStaticCatalog(catalogFile.value, catalogLabel)
  const coverage = parseStaticCoverage(coverageFile.value, coverageLabel)
  expectSharedStaticField(
    "schemaVersion",
    schemaVersion,
    catalog.schemaVersion,
    coverage.schemaVersion,
  )
  expectSharedStaticField(
    "ruleSetId",
    ruleSetId,
    catalog.ruleSetId,
    coverage.ruleSetId,
  )
  expectSharedStaticField(
    "revision",
    revision,
    catalog.revision,
    coverage.revision,
  )
  const source = expectMatchingStaticSource(catalog.source, coverage.source)

  const limitations: DataProductLimitation[] = coverage.deferredMechanisms.map(
    (mechanism) => ({
      origin: "manifest",
      scope: mechanism.catalogEntityId,
      reason: mechanism.reason,
      text: mechanism.explanation,
    }),
  )
  const unstructuredDifferenceIds = collectUnstructuredDifferenceIds(catalog)
  if (unstructuredDifferenceIds.length > 0)
    limitations.push({
      origin: "reader",
      scope: "static-coverage.differenceId",
      text: `catalog.differences 中 ${unstructuredDifferenceIds.length} 个条目没有被任何变体 differences[] 结构化引用（${unstructuredDifferenceIds.join(", ")}）；differenceId 查询只使用结构化引用，不从 explanation/reason 文本推断关联。`,
    })
  limitations.push(
    {
      origin: "reader",
      scope: "static-coverage.pointer",
      text: "supplementalRecords 不携带结构化 pointer；pointer 过滤只应用于 records；补充记录仍可由 optionId 关联目录，并按解析出的 catalogEntityId 与 status 查询。",
    },
    {
      origin: "reader",
      scope: "static-coverage.status",
      text: "records 使用 converted/corrected/unsupported；supplementalRecords 使用 integrated/out-of-scope。",
    },
    {
      origin: "reader",
      scope: "static-coverage.reason",
      text: "records 的 reason/explanation 是可选字段；converted/corrected 记录通常没有逐条原因，具名解释以 catalog.differences 为准。",
    },
  )

  return {
    manifest: {
      product: "static-effects",
      schemaVersion,
      rulesVersion: {
        label: `${ruleSetId}/${revision}`,
        ruleSetId,
        revision,
      },
      source: {
        repository: source.repository,
        commit: source.commit,
      },
      artifacts: [
        {
          path: staticLabel,
          sha256: staticFile.sha256,
          bytes: staticFile.bytes,
          sha256Origin: "computed",
        },
        {
          path: catalogLabel,
          sha256: catalogFile.sha256,
          bytes: catalogFile.bytes,
          sha256Origin: "computed",
        },
        {
          path: coverageLabel,
          sha256: coverageFile.sha256,
          bytes: coverageFile.bytes,
          sha256Origin: "computed",
        },
      ],
      limitations,
      discrepancies: catalog.differences.map((difference) => ({
        id: difference.differenceId,
        description: difference.explanation,
        details: { references: difference.references },
      })),
      coverage: {
        unit: "coverage-records",
        count: coverage.records.length,
        statusCounts: countStatuses(coverage.records),
        supplementalCount: coverage.supplementalRecords.length,
        supplementalStatusCounts: countStatuses(coverage.supplementalRecords),
      },
      extensions: {
        sourceFiles: source.files,
        catalog: {
          entities: catalog.entityCount,
          options: catalog.options.length,
          differences: catalog.differences.length,
          mechanisms: catalog.mechanismCount,
        },
        coverage: coverage.summary,
      },
    },
    rules,
    catalog,
    coverage,
  }
}

/** 读取两个数据产品 manifest；只读，不修改任何制品。 */
export function loadDataProductManifests(
  definitionsDirectory = defaultDefinitionsDirectory,
): DataProductManifests {
  return {
    panelAttributes: parsePanelAttributesManifest(definitionsDirectory),
    agentActions: parseAgentActionsManifest(definitionsDirectory),
    staticEffects: loadStaticEffectsProduct(definitionsDirectory).manifest,
  }
}

export function loadPanelAttributesManifest(
  definitionsDirectory = defaultDefinitionsDirectory,
): PanelAttributesManifest {
  return parsePanelAttributesManifest(definitionsDirectory)
}

export function loadAgentActionsManifest(
  definitionsDirectory = defaultDefinitionsDirectory,
): AgentActionsManifest {
  return parseAgentActionsManifest(definitionsDirectory)
}

/**
 * 生成器候选目录本身就是产品目录（manifest.json 位于根）；复用同一结构
 * 与制品校验，不另建候选专用 schema。
 */
export function loadPanelAttributesCandidateManifest(
  candidateDirectory: string,
): PanelAttributesManifest {
  return parsePanelAttributesManifest(
    dirname(candidateDirectory),
    basename(candidateDirectory),
  )
}

export function loadAgentActionsCandidateManifest(
  candidateDirectory: string,
): AgentActionsManifest {
  return parseAgentActionsManifest(
    dirname(candidateDirectory),
    basename(candidateDirectory),
  )
}
