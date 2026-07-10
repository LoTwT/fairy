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
  BucketBreakdownSource,
  BucketContribution,
  BucketId,
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
      readonly error: CalculationWarning
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
  const formulaSpec = getFormulaSpecById(input.formulaId)
  const trace: string[] | undefined =
    input.options?.trace === true ? [] : undefined

  if (formulaSpec === undefined) {
    return fail(
      unsupportedFormula(input.formulaId),
      [],
      [],
      input.formulaId,
      trace,
    )
  }

  const duplicate = findDuplicateBucket(input.buckets)
  if (duplicate !== undefined) {
    return fail(
      duplicateBucket(duplicate),
      [],
      [],
      formulaSpec.formulaId,
      trace,
    )
  }

  for (const bucket of input.buckets) {
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

  const explicitBuckets = new Map<BucketId, NormalizedBucket>()
  const warnings: CalculationWarning[] = []

  for (const bucket of input.buckets) {
    const ignored =
      formulaSpec.ignoredBuckets?.includes(bucket.bucketId) ?? false
    const normalized = normalizeExplicitBucket(
      bucket,
      ignored,
      formulaSpec.formulaId,
    )

    if (!normalized.ok) {
      return fail(
        normalized.error,
        [...explicitBuckets.values()].map(({ breakdown }) => breakdown),
        warnings,
        formulaSpec.formulaId,
        trace,
      )
    }

    explicitBuckets.set(bucket.bucketId, normalized.bucket)
    warnings.push(...normalized.bucket.warnings)
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
    if (bucketSpec.required === true || bucketSpec.defaultValue === undefined) {
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

  for (const bucket of input.buckets) {
    if (formulaSpec.ignoredBuckets?.includes(bucket.bucketId) === true) {
      const ignored = explicitBuckets.get(bucket.bucketId)
      if (ignored !== undefined) {
        breakdown.push(ignored.breakdown)
      }
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
):
  | { readonly ok: true; readonly bucket: NormalizedBucket }
  | { readonly ok: false; readonly error: CalculationWarning } {
  const hasValue = hasOwn(bucket, "value")
  const hasContributions = hasOwn(bucket, "contributions")

  if (hasValue && hasContributions) {
    return { ok: false, error: conflictingBucketInput(bucket.bucketId) }
  }

  if (hasValue) {
    const bucketSpec = getBucketSpec(bucket.bucketId)
    if (
      bucket.provenance?.kind === "derived" &&
      bucketSpec.acceptsDerivedValue !== true
    ) {
      return { ok: false, error: unsupportedDerivedValue(bucket.bucketId) }
    }

    if (!isFiniteNumber(bucket.value)) {
      return { ok: false, error: invalidNumber(bucket.bucketId) }
    }

    const source = getDirectValueSource(bucket)
    const ignoredWarning = ignored
      ? ignoredBucket(bucket.bucketId, formulaId)
      : undefined

    return {
      ok: true,
      bucket: {
        resolved: ignored
          ? undefined
          : { bucketId: bucket.bucketId, value: bucket.value },
        breakdown: {
          bucketId: bucket.bucketId,
          value: bucket.value,
          source: ignored ? "ignored" : source,
          provenance: copyProvenance(bucket.provenance),
          warnings: ignoredWarning === undefined ? undefined : [ignoredWarning],
        },
        warnings: ignoredWarning === undefined ? [] : [ignoredWarning],
      },
    }
  }

  if (hasContributions) {
    const contributions = bucket.contributions ?? []

    for (const contribution of contributions) {
      if (!isFiniteNumber(contribution.value)) {
        return { ok: false, error: invalidNumber(bucket.bucketId) }
      }
    }

    if (contributions.length === 0) {
      return { ok: false, error: emptyContributions(bucket.bucketId) }
    }

    const bucketSpec = getBucketSpec(bucket.bucketId)
    if (bucketSpec.contributionReducer === undefined) {
      return { ok: false, error: unsupportedContributions(bucket.bucketId) }
    }

    const value = reduceContributions(
      contributions,
      bucketSpec.contributionReducer,
    )
    if (!isFiniteNumber(value)) {
      return { ok: false, error: invalidNumber(bucket.bucketId) }
    }

    const ignoredWarning = ignored
      ? ignoredBucket(bucket.bucketId, formulaId)
      : undefined

    return {
      ok: true,
      bucket: {
        resolved: ignored ? undefined : { bucketId: bucket.bucketId, value },
        breakdown: {
          bucketId: bucket.bucketId,
          value,
          source: ignored ? "ignored" : "contributions",
          contributions: copyContributions(contributions),
          provenance: copyProvenance(bucket.provenance),
          warnings: ignoredWarning === undefined ? undefined : [ignoredWarning],
        },
        warnings: ignoredWarning === undefined ? [] : [ignoredWarning],
      },
    }
  }

  const bucketSpec = getBucketSpec(bucket.bucketId)
  if (bucketSpec.required === true || bucketSpec.defaultValue === undefined) {
    return { ok: false, error: missingRequiredBucket(bucket.bucketId) }
  }

  const defaultWarning = defaultedBucket(
    bucket.bucketId,
    bucketSpec.defaultValue,
  )
  const ignoredWarning = ignored
    ? ignoredBucket(bucket.bucketId, formulaId)
    : undefined
  const bucketWarnings =
    ignoredWarning === undefined
      ? [defaultWarning]
      : [defaultWarning, ignoredWarning]

  return {
    ok: true,
    bucket: {
      resolved: ignored
        ? undefined
        : { bucketId: bucket.bucketId, value: bucketSpec.defaultValue },
      breakdown: {
        bucketId: bucket.bucketId,
        value: bucketSpec.defaultValue,
        source: ignored ? "ignored" : "default",
        defaulted: true,
        provenance: copyProvenance(bucket.provenance),
        warnings: bucketWarnings,
      },
      warnings: bucketWarnings,
    },
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
): BucketContribution[] {
  return contributions.map((contribution) => ({
    value: contribution.value,
    ...(contribution.source === undefined
      ? {}
      : { source: contribution.source }),
    ...(contribution.note === undefined ? {} : { note: contribution.note }),
  }))
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

function getDirectValueSource(
  bucket: Bucket,
): Exclude<BucketBreakdownSource, "ignored"> {
  if (bucket.provenance?.kind === "derived") {
    return "derived"
  }

  return "input_value"
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function hasOwn(object: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(object, key)
}

function fail(
  error: CalculationWarning,
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
