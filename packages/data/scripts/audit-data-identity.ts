import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

const identitiesPath = fileURLToPath(
  new URL("./static-effects/identities.json", import.meta.url),
)
const definitionsDirectory = fileURLToPath(
  new URL("../definitions/effects/", import.meta.url),
)
const baselinePath = fileURLToPath(
  new URL(
    "../test/fixtures/data-identity-audit-baseline.json",
    import.meta.url,
  ),
)

type Identities = Readonly<Record<string, string>>

interface CatalogEntity {
  readonly catalogEntityId: string
  readonly status?: string
  readonly identity?: { readonly entityId?: string } | null
}

interface CatalogVariant {
  readonly effectIds?: readonly string[]
  readonly differences?: readonly (
    | string
    | { readonly differenceId?: string }
  )[]
}

interface CatalogOption {
  readonly optionId: string
  readonly catalogEntityId: string
  readonly name: string
  readonly variants: readonly CatalogVariant[]
}

interface Catalog {
  readonly entities: readonly CatalogEntity[]
  readonly options: readonly CatalogOption[]
  readonly differences: readonly { readonly differenceId: string }[]
}

interface Rule {
  readonly effectId: string
  readonly kind: string
  readonly target?: {
    readonly kind?: string
    readonly effectId?: string
  }
}

interface Definitions {
  readonly effects: readonly Rule[]
}

interface Coverage {
  readonly records: readonly unknown[]
  readonly supplementalRecords?: readonly unknown[]
}

export interface AuditInputs {
  readonly identities: Identities
  readonly catalog: Catalog
  readonly definitions: Definitions
  readonly coverage: Coverage
}

export type AuditCheck =
  | "identity-mapping-missing"
  | "identity-mapping-extra"
  | "unreferenced-difference"
  | "duplicate-option-name"
  | "unreferenced-rule"

export interface AuditProblem {
  readonly check: AuditCheck
  readonly id: string
  readonly details: Readonly<Record<string, unknown>>
}

export interface AuditBaseline {
  readonly schemaVersion: number
  readonly problems: readonly AuditProblem[]
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"))
}

function expectRecord(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label} must be a JSON object`)
  return value as Record<string, unknown>
}

function expectArray(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be a JSON array`)
  return value
}

/** 读取审计输入；只读，不修改任何制品。 */
export function loadAuditInputs(
  identitiesFile = identitiesPath,
  effectsDirectory = definitionsDirectory,
): AuditInputs {
  const identities = expectRecord(readJson(identitiesFile), "identities.json")
  const catalog = expectRecord(
    readJson(`${effectsDirectory}/static-catalog.json`),
    "static-catalog.json",
  )
  const definitions = expectRecord(
    readJson(`${effectsDirectory}/static.json`),
    "static.json",
  )
  const coverage = expectRecord(
    readJson(`${effectsDirectory}/static-coverage.json`),
    "static-coverage.json",
  )
  return {
    identities: identities as Identities,
    catalog: {
      entities: expectArray(
        catalog.entities,
        "static-catalog.json/entities",
      ) as readonly CatalogEntity[],
      options: expectArray(
        catalog.options,
        "static-catalog.json/options",
      ) as readonly CatalogOption[],
      differences: expectArray(
        catalog.differences,
        "static-catalog.json/differences",
      ) as readonly { differenceId: string }[],
    },
    definitions: {
      effects: expectArray(
        definitions.effects,
        "static.json/effects",
      ) as readonly Rule[],
    },
    coverage: {
      records: expectArray(coverage.records, "static-coverage.json/records"),
      ...(coverage.supplementalRecords === undefined
        ? {}
        : {
            supplementalRecords: expectArray(
              coverage.supplementalRecords,
              "static-coverage.json/supplementalRecords",
            ),
          }),
    },
  }
}

function collectStrings(value: unknown, strings: string[]): void {
  if (typeof value === "string") {
    strings.push(value)
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, strings)
    return
  }
  if (value !== null && typeof value === "object")
    for (const item of Object.values(value)) collectStrings(item, strings)
}

function referencedDifferenceIds(inputs: AuditInputs): Set<string> {
  const referenced = new Set<string>()
  for (const option of inputs.catalog.options)
    for (const variant of option.variants ?? [])
      for (const difference of variant.differences ?? [])
        if (typeof difference === "string") referenced.add(difference)
        else if (difference.differenceId !== undefined)
          referenced.add(difference.differenceId)
  const coverageStrings: string[] = []
  collectStrings(inputs.coverage.records, coverageStrings)
  collectStrings(inputs.coverage.supplementalRecords ?? [], coverageStrings)
  for (const difference of inputs.catalog.differences)
    if (coverageStrings.some((text) => text.includes(difference.differenceId)))
      referenced.add(difference.differenceId)
  return referenced
}

function referencedRuleIds(inputs: AuditInputs): Set<string> {
  const referenced = new Set<string>()
  for (const option of inputs.catalog.options)
    for (const variant of option.variants ?? [])
      for (const effectId of variant.effectIds ?? []) referenced.add(effectId)
  for (const rule of inputs.definitions.effects)
    if (rule.kind === "modification" && rule.target?.kind === "effect")
      if (rule.target.effectId !== undefined)
        referenced.add(rule.target.effectId)
  return referenced
}

/**
 * 收集当前身份与引用漂移。修改规则本身通常由 core 按 target 自动发现，
 * 但仍纳入“未被选项或 modification target 引用”的检查：这样新增的孤立
 * 修改规则不会被静默忽略，既有情况由基线明确记录。
 */
export function collectAuditProblems(inputs: AuditInputs): AuditProblem[] {
  const problems: AuditProblem[] = []
  const catalogEntityIds = new Set(
    inputs.catalog.entities.map((entity) => entity.catalogEntityId),
  )

  for (const entity of inputs.catalog.entities) {
    if (
      entity.status === "placeholder" ||
      entity.identity?.entityId === undefined
    )
      continue
    if (!Object.hasOwn(inputs.identities, entity.catalogEntityId))
      problems.push({
        check: "identity-mapping-missing",
        id: `identity-mapping-missing/${entity.catalogEntityId}`,
        details: { catalogEntityId: entity.catalogEntityId },
      })
  }
  for (const identityKey of Object.keys(inputs.identities).toSorted())
    if (!catalogEntityIds.has(identityKey))
      problems.push({
        check: "identity-mapping-extra",
        id: `identity-mapping-extra/${identityKey}`,
        details: { catalogEntityId: identityKey },
      })

  const referencedDifferences = referencedDifferenceIds(inputs)
  for (const difference of inputs.catalog.differences) {
    const differenceId = difference.differenceId
    if (!referencedDifferences.has(differenceId))
      problems.push({
        check: "unreferenced-difference",
        id: `unreferenced-difference/${differenceId}`,
        details: { differenceId },
      })
  }

  const optionNamesByEntity = new Map<string, Map<string, string[]>>()
  for (const option of inputs.catalog.options) {
    const names = optionNamesByEntity.get(option.catalogEntityId) ?? new Map()
    const optionIds = names.get(option.name) ?? []
    optionIds.push(option.optionId)
    names.set(option.name, optionIds)
    optionNamesByEntity.set(option.catalogEntityId, names)
  }
  for (const [catalogEntityId, names] of [...optionNamesByEntity].toSorted(
    ([left], [right]) => (left < right ? -1 : 1),
  ))
    for (const [name, optionIds] of [...names].toSorted(([left], [right]) =>
      left < right ? -1 : 1,
    ))
      if (optionIds.length > 1)
        problems.push({
          check: "duplicate-option-name",
          id: `duplicate-option-name/${catalogEntityId}/${name}`,
          details: {
            catalogEntityId,
            name,
            optionIds: optionIds.toSorted(),
          },
        })

  const referencedRules = referencedRuleIds(inputs)
  for (const rule of inputs.definitions.effects) {
    if (referencedRules.has(rule.effectId)) continue
    problems.push({
      check: "unreferenced-rule",
      id: `unreferenced-rule/${rule.effectId}`,
      details: { effectId: rule.effectId, kind: rule.kind },
    })
  }

  return problems.toSorted((left, right) => {
    if (left.check !== right.check) return left.check < right.check ? -1 : 1
    if (left.id !== right.id) return left.id < right.id ? -1 : 1
    const leftDetails = JSON.stringify(left.details)
    const rightDetails = JSON.stringify(right.details)
    return leftDetails < rightDetails ? -1 : leftDetails > rightDetails ? 1 : 0
  })
}

export function problemKey(problem: AuditProblem): string {
  return JSON.stringify(problem)
}

export function findProblemDelta(
  current: readonly AuditProblem[],
  baseline: readonly AuditProblem[],
): {
  readonly newProblems: readonly AuditProblem[]
  readonly resolvedProblems: readonly AuditProblem[]
} {
  const currentKeys = new Set(current.map(problemKey))
  const baselineKeys = new Set(baseline.map(problemKey))
  return {
    newProblems: current.filter(
      (problem) => !baselineKeys.has(problemKey(problem)),
    ),
    resolvedProblems: baseline.filter(
      (problem) => !currentKeys.has(problemKey(problem)),
    ),
  }
}

function countProblems(
  problems: readonly AuditProblem[],
): Record<AuditCheck, number> {
  const counts: Record<AuditCheck, number> = {
    "identity-mapping-missing": 0,
    "identity-mapping-extra": 0,
    "unreferenced-difference": 0,
    "duplicate-option-name": 0,
    "unreferenced-rule": 0,
  }
  for (const problem of problems) counts[problem.check] += 1
  return counts
}

function readBaseline(path: string): AuditBaseline {
  const value = expectRecord(readJson(path), "audit baseline")
  if (value.schemaVersion !== 1)
    throw new Error(`unsupported audit baseline schema: ${value.schemaVersion}`)
  return {
    schemaVersion: 1,
    problems: expectArray(
      value.problems,
      "audit baseline/problems",
    ) as readonly AuditProblem[],
  }
}

function writeBaseline(path: string, problems: readonly AuditProblem[]): void {
  const baseline: AuditBaseline = { schemaVersion: 1, problems }
  writeFileSync(path, `${JSON.stringify(baseline, null, 2)}\n`)
}

function printHelp(): void {
  console.log(`Usage: pnpm --filter @randomplay/data audit:data-identity [options]

只读审计静态效果制品的身份映射与引用漂移，不修改任何数据制品。

Options:
  --write-baseline  用当前问题重写基线
  --help            显示此帮助`)
}

function main(): void {
  const args = process.argv.slice(2)
  if (args.includes("--help")) {
    printHelp()
    return
  }
  if (args.some((arg) => arg !== "--write-baseline"))
    throw new Error(`unknown arguments: ${args.join(" ")}`)
  const problems = collectAuditProblems(loadAuditInputs())
  if (args.includes("--write-baseline")) {
    writeBaseline(baselinePath, problems)
    console.log(
      JSON.stringify(
        {
          outcome: "baseline-written",
          baselinePath,
          counts: countProblems(problems),
          problemCount: problems.length,
        },
        null,
        2,
      ),
    )
    return
  }

  let baseline: AuditBaseline
  try {
    baseline = readBaseline(baselinePath)
  } catch (error) {
    throw new Error(
      `cannot read audit baseline at ${baselinePath}; run with --write-baseline after verifying the current findings (${error instanceof Error ? error.message : String(error)})`,
      { cause: error },
    )
  }
  const { newProblems, resolvedProblems } = findProblemDelta(
    problems,
    baseline.problems,
  )
  console.log(
    JSON.stringify(
      {
        outcome: newProblems.length === 0 ? "matched" : "new-problems",
        baselinePath,
        counts: countProblems(problems),
        problemCount: problems.length,
        newProblems,
        resolvedProblems,
      },
      null,
      2,
    ),
  )
  if (newProblems.length > 0) process.exitCode = 1
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    console.error(
      `error: ${error instanceof Error ? error.message : String(error)}`,
    )
    process.exitCode = 1
  }
}

export { baselinePath }
