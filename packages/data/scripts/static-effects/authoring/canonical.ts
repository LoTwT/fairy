/**
 * 三制品的语义比较工具。对象键始终排序；数组默认按稳定序列化排序，
 * 仅对顺序有语义的 `source.files` 与规则 `modifications` 保留原顺序。
 * 已知顶层集合会转换为以稳定身份为键的对象，使差异路径可读。
 */

export interface SemanticDifference {
  readonly path: string
  readonly baseline: unknown
  readonly candidate: unknown
}

export interface SemanticComparison {
  readonly equivalent: boolean
  readonly differences: readonly SemanticDifference[]
}

export interface SemanticComparisonOptions {
  readonly maximumDifferences?: number
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value, ""))
}

function canonicalText(value: unknown): string {
  return JSON.stringify(value)
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function preservesArrayOrder(path: string): boolean {
  return path.endsWith("/source/files") || path.endsWith("/modifications")
}

export function canonicalize(value: unknown, path = ""): unknown {
  if (Array.isArray(value)) {
    const items = value.map((entry, index) =>
      canonicalize(entry, `${path}[${index}]`),
    )
    if (preservesArrayOrder(path)) return items
    return items.toSorted((left, right) =>
      canonicalText(left).localeCompare(canonicalText(right)),
    )
  }
  if (!isObject(value)) return value
  if (
    value["kind"] === "all" &&
    Array.isArray(value["conditions"]) &&
    value["conditions"].length === 0
  )
    return { kind: "constant", value: true }
  if (
    value["kind"] === "any" &&
    Array.isArray(value["conditions"]) &&
    value["conditions"].length === 0
  )
    return { kind: "constant", value: false }
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(value).toSorted())
    result[key] = canonicalize(value[key], `${path}/${key}`)
  return result
}

function mapByIdentity(
  value: unknown,
  identity: (entry: Record<string, unknown>, index: number) => string,
): Record<string, unknown> {
  if (!Array.isArray(value)) return {}
  const result: Record<string, unknown> = {}
  for (const [index, entry] of value.entries()) {
    if (!isObject(entry)) continue
    result[identity(entry, index)] = entry
  }
  return result
}

function collectionView(
  artifact: unknown,
  collections: Readonly<
    Record<string, (entry: Record<string, unknown>, index: number) => string>
  >,
): unknown {
  if (!isObject(artifact)) return artifact
  const result: Record<string, unknown> = { ...artifact }
  for (const [field, identity] of Object.entries(collections)) {
    if (!(field in result)) continue
    result[field] = mapByIdentity(result[field], identity)
  }
  return result
}

const stringField =
  (field: string) =>
  (entry: Record<string, unknown>): string =>
    String(entry[field])

const coverageRecordKey = (entry: Record<string, unknown>): string =>
  `${String(entry["pointer"])}|${String(entry["catalogEntityId"])}`

const packKey = (entry: Record<string, unknown>): string =>
  `${String(entry["catalogEntityId"])}|${String(entry["rankKind"])}|${String(entry["rank"])}|${String(entry["pointer"])}`

const differencesKey = (entry: Record<string, unknown>): string =>
  `${String(entry["differenceId"])}`

function semanticView(artifact: {
  readonly definitions: unknown
  readonly catalog: unknown
  readonly coverage: unknown
}): unknown {
  const definitions = collectionView(canonicalize(artifact.definitions), {
    effects: stringField("effectId"),
    states: stringField("stateId"),
    actions: stringField("actionId"),
  })
  const catalog = collectionView(canonicalize(artifact.catalog), {
    entities: stringField("catalogEntityId"),
    options: stringField("optionId"),
    skillTargets: stringField("targetId"),
    mechanisms: stringField("mechanism"),
    differences: differencesKey,
  })
  const coverage = collectionView(canonicalize(artifact.coverage), {
    entities: stringField("catalogEntityId"),
    packs: packKey,
    records: coverageRecordKey,
    supplementalRecords: stringField("supplementId"),
  })
  return { definitions, catalog, coverage }
}

export function compareStaticArtifacts(
  baseline: {
    readonly definitions: unknown
    readonly catalog: unknown
    readonly coverage: unknown
  },
  candidate: {
    readonly definitions: unknown
    readonly catalog: unknown
    readonly coverage: unknown
  },
  options: SemanticComparisonOptions = {},
): SemanticComparison {
  const maximum = options.maximumDifferences ?? 100
  const differences: SemanticDifference[] = []
  diffValues(
    semanticView(baseline),
    semanticView(candidate),
    "",
    differences,
    maximum,
  )
  return { equivalent: differences.length === 0, differences }
}

function diffValues(
  baseline: unknown,
  candidate: unknown,
  path: string,
  differences: SemanticDifference[],
  maximum: number,
): void {
  if (differences.length >= maximum) return
  if (isObject(baseline) && isObject(candidate)) {
    const keys = new Set([...Object.keys(baseline), ...Object.keys(candidate)])
    for (const key of [...keys].toSorted()) {
      diffValues(
        baseline[key],
        candidate[key],
        `${path}/${escapePointer(key)}`,
        differences,
        maximum,
      )
      if (differences.length >= maximum) return
    }
    return
  }
  if (Array.isArray(baseline) && Array.isArray(candidate)) {
    const length = Math.max(baseline.length, candidate.length)
    for (let index = 0; index < length; index += 1) {
      diffValues(
        baseline[index],
        candidate[index],
        `${path}[${index}]`,
        differences,
        maximum,
      )
      if (differences.length >= maximum) return
    }
    return
  }
  if (!Object.is(baseline, candidate))
    differences.push({ path, baseline, candidate })
}

function escapePointer(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1")
}

export function formatDifference(difference: SemanticDifference): string {
  return `${difference.path || "/"}: ${formatValue(difference.baseline)} -> ${formatValue(difference.candidate)}`
}

function formatValue(value: unknown): string {
  if (value === undefined) return "<missing>"
  const text = JSON.stringify(value)
  if (text === undefined) return String(value)
  return text.length <= 240 ? text : `${text.slice(0, 240)}…`
}
