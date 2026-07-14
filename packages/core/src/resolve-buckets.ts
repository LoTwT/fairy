import { getBucketSpec } from "./bucket-specs"
import { getFormulaSpecById } from "./formula-specs"
import {
  conflictingBucketInput,
  defaultedBucket,
  duplicateBucket,
  emptyContributions,
  ignoredBucket,
  invalidNumber,
  missingRequiredBucket,
  unsupportedBucket,
  unsupportedContributions,
  unsupportedDerivedValue,
  unsupportedFormula,
} from "./warnings"
import type {
  Bucket,
  BucketBreakdown,
  BucketContribution,
  BucketId,
  CalculationError,
  CalculationInput,
  CalculationWarning,
  FormulaSpec,
  ResolvedBucket,
} from "./types"

type ResolveBucketsResult =
  | {
      readonly ok: true
      readonly formulaSpec: FormulaSpec
      readonly buckets: readonly ResolvedBucket[]
      readonly breakdown: readonly BucketBreakdown[]
      readonly warnings: readonly CalculationWarning[]
      readonly trace?: readonly string[]
    }
  | {
      readonly ok: false
      readonly formulaId?: string
      readonly error: CalculationError
      readonly warnings: readonly CalculationWarning[]
      readonly buckets?: readonly BucketBreakdown[]
      readonly trace?: readonly string[]
    }

interface NormalizedBucket {
  readonly resolved?: ResolvedBucket
  readonly breakdown: BucketBreakdown
  readonly warnings: readonly CalculationWarning[]
}

export function resolveBuckets(input: CalculationInput): ResolveBucketsResult {
  const inputFormulaId: unknown = input.formulaId
  const formulaSpec = getFormulaSpecById(inputFormulaId)
  const trace: string[] | undefined =
    input.options?.trace === true ? [] : undefined

  if (formulaSpec === undefined) {
    const rejectedFormulaId =
      typeof inputFormulaId === "string" ? inputFormulaId : undefined
    return fail(
      unsupportedFormula(rejectedFormulaId),
      [],
      [],
      rejectedFormulaId,
      trace,
    )
  }

  const buckets = sortBucketsForValidation(formulaSpec, input.buckets)
  const duplicate = findDuplicateBucket(buckets)
  if (duplicate !== undefined) {
    return fail(
      duplicateBucket(duplicate),
      [],
      [],
      formulaSpec.formulaId,
      trace,
    )
  }

  for (const bucket of buckets) {
    if (!isApplicableBucket(formulaSpec, bucket.bucketId)) {
      return fail(
        unsupportedBucket(bucket.bucketId, formulaSpec.formulaId),
        [],
        [],
        formulaSpec.formulaId,
        trace,
      )
    }
  }

  const explicitError = findExplicitBucketError(buckets)
  if (explicitError !== undefined) {
    return fail(explicitError, [], [], formulaSpec.formulaId, trace)
  }

  const missingRequired = findMissingRequiredBucket(formulaSpec, buckets)
  if (missingRequired !== undefined) {
    return fail(
      missingRequiredBucket(missingRequired),
      [],
      [],
      formulaSpec.formulaId,
      trace,
    )
  }

  const explicitBuckets = new Map<BucketId, NormalizedBucket>()
  const warnings: CalculationWarning[] = []

  for (const bucket of buckets) {
    const ignored =
      formulaSpec.ignoredBuckets?.includes(bucket.bucketId) ?? false
    const normalized = normalizeExplicitBucket(
      bucket,
      ignored,
      formulaSpec.formulaId,
    )

    explicitBuckets.set(bucket.bucketId, normalized)
    warnings.push(...normalized.warnings)
  }

  const resolvedBuckets: ResolvedBucket[] = []
  const breakdown: BucketBreakdown[] = []

  for (const bucketId of formulaSpec.buckets) {
    const explicit = explicitBuckets.get(bucketId)
    if (explicit !== undefined) {
      if (explicit.resolved !== undefined) {
        resolvedBuckets.push(explicit.resolved)
      }
      breakdown.push(explicit.breakdown)
      continue
    }

    const bucketSpec = getBucketSpec(bucketId)
    if (bucketSpec.defaultValue === undefined) {
      return fail(
        missingRequiredBucket(bucketId),
        breakdown,
        warnings,
        formulaSpec.formulaId,
        trace,
      )
    }

    const defaultWarning = defaultedBucket(bucketId, bucketSpec.defaultValue)
    const resolved = {
      bucketId,
      value: bucketSpec.defaultValue,
    } satisfies ResolvedBucket

    resolvedBuckets.push(resolved)
    breakdown.push({
      bucketId,
      value: bucketSpec.defaultValue,
      source: "default",
      defaulted: true,
      warnings: [defaultWarning],
    })
    warnings.push(defaultWarning)
  }

  for (const bucketId of formulaSpec.ignoredBuckets ?? []) {
    const ignored = explicitBuckets.get(bucketId)
    if (ignored !== undefined) {
      breakdown.push(ignored.breakdown)
    }
  }

  if (trace !== undefined) {
    trace.push(`${formulaSpec.formulaId} = ${formulaSpec.buckets.join(" * ")}`)
    trace.push(
      `${formulaSpec.formulaId} = ${resolvedBuckets.map(({ value }) => value).join(" * ")}`,
    )
  }

  return {
    ok: true,
    formulaSpec,
    buckets: resolvedBuckets,
    breakdown,
    warnings,
    trace,
  }
}

function normalizeExplicitBucket(
  bucket: Bucket,
  ignored: boolean,
  formulaId: string,
): NormalizedBucket {
  // Collection-wide validation has already established these input invariants.
  const hasValue = hasOwn(bucket, "value")
  const hasContributions = hasOwn(bucket, "contributions")

  if (hasValue) {
    const value = bucket.value as number
    const ignoredWarning = ignored
      ? ignoredBucket(bucket.bucketId, formulaId)
      : undefined

    return {
      resolved: ignored ? undefined : { bucketId: bucket.bucketId, value },
      breakdown: createDirectBreakdown(bucket, value, ignoredWarning),
      warnings: ignoredWarning === undefined ? [] : [ignoredWarning],
    }
  }

  if (hasContributions) {
    const contributions = bucket.contributions ?? []
    const bucketSpec = getBucketSpec(bucket.bucketId)
    const value = reduceContributions(
      contributions,
      bucketSpec.contributionReducer!,
    )
    const ignoredWarning = ignored
      ? ignoredBucket(bucket.bucketId, formulaId)
      : undefined

    const copiedContributions = copyContributions(contributions)
    const copiedProvenance = copyProvenance(bucket.provenance)
    const breakdown: BucketBreakdown =
      ignoredWarning !== undefined
        ? {
            bucketId: bucket.bucketId,
            value,
            source: "ignored",
            contributions: copiedContributions,
            provenance: copiedProvenance,
            warnings: [ignoredWarning],
          }
        : {
            bucketId: bucket.bucketId,
            value,
            source: "contributions",
            contributions: copiedContributions,
            provenance: copiedProvenance,
          }

    return {
      resolved: ignored ? undefined : { bucketId: bucket.bucketId, value },
      breakdown,
      warnings: ignoredWarning === undefined ? [] : [ignoredWarning],
    }
  }

  const bucketSpec = getBucketSpec(bucket.bucketId)
  const defaultValue = bucketSpec.defaultValue!
  const defaultWarning = defaultedBucket(bucket.bucketId, defaultValue)
  const ignoredWarning = ignored
    ? ignoredBucket(bucket.bucketId, formulaId)
    : undefined
  const bucketWarnings: CalculationWarning[] =
    ignoredWarning === undefined
      ? [defaultWarning]
      : [defaultWarning, ignoredWarning]

  const breakdown: BucketBreakdown =
    ignoredWarning !== undefined
      ? {
          bucketId: bucket.bucketId,
          value: defaultValue,
          source: "ignored",
          defaulted: true,
          warnings: [defaultWarning, ignoredWarning],
        }
      : {
          bucketId: bucket.bucketId,
          value: defaultValue,
          source: "default",
          defaulted: true,
          warnings: [defaultWarning],
        }

  return {
    resolved: ignored
      ? undefined
      : { bucketId: bucket.bucketId, value: defaultValue },
    breakdown,
    warnings: bucketWarnings,
  }
}

function findDuplicateBucket(buckets: readonly Bucket[]): BucketId | undefined {
  const seen = new Set<BucketId>()

  for (const bucket of buckets) {
    if (seen.has(bucket.bucketId)) {
      return bucket.bucketId
    }

    seen.add(bucket.bucketId)
  }

  return undefined
}

function findExplicitBucketError(
  buckets: readonly Bucket[],
): CalculationError | undefined {
  for (const bucket of buckets) {
    if (hasOwn(bucket, "value") && hasOwn(bucket, "contributions")) {
      return conflictingBucketInput(bucket.bucketId)
    }
  }

  for (const bucket of buckets) {
    if (
      hasOwn(bucket, "value") &&
      bucket.provenance?.kind === "derived" &&
      getBucketSpec(bucket.bucketId).acceptsDerivedValue !== true
    ) {
      return unsupportedDerivedValue(bucket.bucketId)
    }
  }

  for (const bucket of buckets) {
    if (
      (hasOwn(bucket, "value") && !isFiniteNumber(bucket.value)) ||
      (bucket.contributions !== undefined &&
        hasInvalidContributionEntries(bucket.contributions))
    ) {
      return invalidNumber(bucket.bucketId)
    }
  }

  for (const bucket of buckets) {
    if (
      hasOwn(bucket, "contributions") &&
      (bucket.contributions?.length ?? 0) === 0
    ) {
      return emptyContributions(bucket.bucketId)
    }
  }

  for (const bucket of buckets) {
    if (
      hasOwn(bucket, "contributions") &&
      getBucketSpec(bucket.bucketId).contributionReducer === undefined
    ) {
      return unsupportedContributions(bucket.bucketId)
    }
  }

  for (const bucket of buckets) {
    if (!hasOwn(bucket, "contributions")) {
      continue
    }

    const bucketSpec = getBucketSpec(bucket.bucketId)
    const contributions = bucket.contributions ?? []
    const reducer = bucketSpec.contributionReducer
    if (
      reducer !== undefined &&
      !isFiniteNumber(reduceContributions(contributions, reducer))
    ) {
      return invalidNumber(bucket.bucketId)
    }
  }

  return undefined
}

function findMissingRequiredBucket(
  formulaSpec: FormulaSpec,
  buckets: readonly Bucket[],
): BucketId | undefined {
  const explicitBuckets = new Map(
    buckets.map((bucket) => [bucket.bucketId, bucket]),
  )

  for (const bucketId of formulaSpec.requiredBuckets) {
    const bucket = explicitBuckets.get(bucketId)
    if (
      bucket === undefined ||
      (!hasOwn(bucket, "value") && !hasOwn(bucket, "contributions"))
    ) {
      return bucketId
    }
  }

  return undefined
}

function sortBucketsForValidation(
  formulaSpec: FormulaSpec,
  buckets: readonly Bucket[],
): Bucket[] {
  const bucketOrder = new Map<BucketId, number>()
  const orderedBucketIds = [
    ...formulaSpec.buckets,
    ...(formulaSpec.ignoredBuckets ?? []),
  ]

  for (const [index, bucketId] of orderedBucketIds.entries()) {
    bucketOrder.set(bucketId, index)
  }

  // Sorting a defensive copy makes error selection independent of caller order.
  // oxlint-disable-next-line unicorn/no-array-sort
  return [...buckets].sort((left, right) => {
    const leftOrder = bucketOrder.get(left.bucketId)
    const rightOrder = bucketOrder.get(right.bucketId)

    if (leftOrder !== undefined && rightOrder !== undefined) {
      return leftOrder - rightOrder
    }
    if (leftOrder !== undefined) {
      return -1
    }
    if (rightOrder !== undefined) {
      return 1
    }

    return left.bucketId.localeCompare(right.bucketId)
  })
}

function isApplicableBucket(
  formulaSpec: FormulaSpec,
  bucketId: BucketId,
): boolean {
  return (
    formulaSpec.buckets.includes(bucketId) ||
    formulaSpec.ignoredBuckets?.includes(bucketId) === true
  )
}

function reduceContributions(
  contributions: readonly BucketContribution[],
  reducer: "sum" | "one_plus_sum",
): number {
  const sum = contributions.reduce((total, contribution) => {
    return total + contribution.value
  }, 0)

  if (reducer === "one_plus_sum") {
    return 1 + sum
  }

  return sum
}

function copyContributions(
  contributions: readonly BucketContribution[],
): [BucketContribution, ...BucketContribution[]] {
  return contributions.map(copyContribution) as [
    BucketContribution,
    ...BucketContribution[],
  ]
}

function copyContribution(
  contribution: BucketContribution,
): BucketContribution {
  return {
    value: contribution.value,
    ...(contribution.source === undefined
      ? {}
      : { source: contribution.source }),
    ...(contribution.note === undefined ? {} : { note: contribution.note }),
  }
}

function copyProvenance(
  provenance: Bucket["provenance"],
): Bucket["provenance"] {
  if (provenance === undefined) {
    return undefined
  }

  return {
    kind: provenance.kind,
    ...(provenance.source === undefined ? {} : { source: provenance.source }),
    ...(provenance.note === undefined ? {} : { note: provenance.note }),
  }
}

function createDirectBreakdown(
  bucket: Bucket,
  value: number,
  ignoredWarning:
    | Extract<CalculationWarning, { readonly code: "ignored_bucket" }>
    | undefined,
): BucketBreakdown {
  const provenance = copyProvenance(bucket.provenance)
  if (ignoredWarning !== undefined) {
    return {
      bucketId: bucket.bucketId,
      value,
      source: "ignored",
      provenance,
      warnings: [ignoredWarning],
    }
  }

  if (provenance?.kind === "derived") {
    return {
      bucketId: bucket.bucketId,
      value,
      source: "derived",
      provenance,
    }
  }

  return {
    bucketId: bucket.bucketId,
    value,
    source: "input_value",
    provenance,
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function hasInvalidContributionEntries(contributions: unknown): boolean {
  if (!Array.isArray(contributions)) {
    return true
  }

  for (let index = 0; index < contributions.length; index += 1) {
    if (!hasOwn(contributions, index)) {
      return true
    }

    const contribution: unknown = contributions[index]
    if (
      typeof contribution !== "object" ||
      contribution === null ||
      Array.isArray(contribution) ||
      !isFiniteNumber((contribution as { readonly value?: unknown }).value)
    ) {
      return true
    }
  }

  return false
}

function hasOwn(object: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(object, key)
}

function fail(
  error: CalculationError,
  breakdown: readonly BucketBreakdown[],
  warnings: readonly CalculationWarning[],
  formulaId?: string,
  trace?: readonly string[],
): ResolveBucketsResult {
  return {
    ok: false,
    formulaId,
    error,
    warnings,
    buckets: breakdown.length > 0 ? breakdown : undefined,
    trace,
  }
}
