import { statSync } from "node:fs"
import { join } from "node:path"
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
  type StaticCatalog,
  type StaticCoverage,
  type StaticCoverageSummary,
  type StaticSourceFile,
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

/**
 * 产品级覆盖摘要。static-effects 取 coverage 的逐条记录；
 * panel-attributes 取属性成员记录；agent-actions 取动作覆盖计数。
 */
export interface DataProductCoverageSummary {
  readonly records: number
  readonly statusCounts: Readonly<Record<string, number>>
  readonly supplementalRecords: number
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

export interface StaticEffectsProduct {
  readonly manifest: StaticEffectsManifest
  readonly catalog: StaticCatalog
  readonly coverage: StaticCoverage
}

const defaultDefinitionsDirectory = fileURLToPath(
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
): PanelAttributesManifest {
  const label = "attributes/manifest.json"
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
      "attributes",
      definitionsDirectory,
      label,
    ),
    limitations,
    discrepancies,
    coverage: {
      records: agents.length + wEngines.length,
      statusCounts: {},
      supplementalRecords: 0,
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
): AgentActionsManifest {
  const label = "skills/manifest.json"
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
      "skills",
      definitionsDirectory,
      label,
    ),
    limitations,
    discrepancies,
    coverage: {
      records: coverageCounts.actions,
      statusCounts: {
        damage: coverageCounts.damage,
        dazeOnly: coverageCounts.dazeOnly,
        luminize: coverageCounts.luminize,
        unavailable: coverageCounts.unavailable,
      },
      supplementalRecords: 0,
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
      text: "supplementalRecords 不携带结构化 pointer；pointer 过滤只应用于 records，补充记录仍可按 optionId、解析后的 catalogEntityId 与 status 查询。",
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
        repository: coverage.source.repository,
        commit: coverage.source.commit,
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
        records: coverage.records.length,
        statusCounts: countStatuses(coverage.records),
        supplementalRecords: coverage.supplementalRecords.length,
        supplementalStatusCounts: countStatuses(coverage.supplementalRecords),
      },
      extensions: {
        sourceFiles: coverage.source.files,
        catalog: {
          entities: catalog.entityCount,
          options: catalog.options.length,
          differences: catalog.differences.length,
          mechanisms: catalog.mechanismCount,
        },
        coverage: coverage.summary,
      },
    },
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
