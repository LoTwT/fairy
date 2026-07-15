import { getBucketSpec, getBucketSpecCount, isBucketId } from "./bucket-specs"
import { getFormulaSpecById } from "./formula-specs"
import {
  trustedGetOwnPropertyDescriptor,
  trustedGetPrototypeOf,
  trustedHasOwn,
  trustedIsArray,
  trustedIsFiniteNumber,
  trustedIsSafeInteger,
  trustedReadDescriptor,
} from "./trusted-intrinsics"
import {
  conflictingBucketInput,
  defaultedBucket,
  duplicateBucket,
  emptyContributions,
  ignoredBucket,
  invalidCalculationInput,
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

interface BucketSnapshot {
  readonly bucketId: BucketId
  readonly hasValue: boolean
  readonly value: unknown
  readonly hasContributions: boolean
  readonly contributions:
    | readonly BucketContribution[]
    | typeof INVALID_CONTRIBUTIONS
    | undefined
  readonly provenance: Bucket["provenance"]
}

interface BucketIdentitySnapshot {
  readonly bucketId: BucketId
  readonly bucket: StructuralObjectSnapshot
}

interface BucketPayloadSnapshot {
  readonly bucketId: BucketId
  readonly hasValue: boolean
  readonly value: unknown
  readonly hasContributions: boolean
  readonly contributions:
    | ContributionCollectionSnapshot
    | typeof INVALID_CONTRIBUTIONS
    | undefined
  readonly provenance: Bucket["provenance"]
}

interface ContributionCollectionSnapshot {
  readonly contributions: readonly unknown[]
  readonly length: number
}

interface CalculationInputSnapshot {
  readonly formulaId: unknown
  readonly buckets: unknown
  readonly traceEnabled: boolean
}

type SnapshotCalculationInputResult =
  | { readonly ok: true; readonly input: CalculationInputSnapshot }
  | { readonly ok: false; readonly formulaId?: string }

type SnapshotBucketIdentitiesResult =
  | { readonly ok: true; readonly buckets: readonly BucketIdentitySnapshot[] }
  | { readonly ok: false }

type SnapshotBucketsResult =
  | { readonly ok: true; readonly buckets: readonly BucketSnapshot[] }
  | { readonly ok: false }

type SnapshotBucketPayloadResult =
  | {
      readonly ok: true
      readonly bucket: BucketPayloadSnapshot
      readonly contributionCount: number
    }
  | { readonly ok: false }

interface SnapshotContributionCollectionResult {
  readonly contributions:
    | ContributionCollectionSnapshot
    | typeof INVALID_CONTRIBUTIONS
  readonly contributionCount: number
}

type SnapshotProvenanceResult =
  | { readonly ok: true; readonly provenance: Bucket["provenance"] }
  | { readonly ok: false }

type SnapshotPrototypeChainResult =
  | { readonly ok: true; readonly chain: readonly object[] }
  | { readonly ok: false }

interface StructuralObjectSnapshot {
  readonly root: Record<PropertyKey, unknown>
  readonly chain: readonly object[]
}

type SnapshotStructuralObjectResult =
  | { readonly ok: true; readonly object: StructuralObjectSnapshot }
  | { readonly ok: false }

type SnapshotStructuralPropertyResult =
  | { readonly ok: true; readonly present: true; readonly value: unknown }
  | { readonly ok: true; readonly present: false; readonly value: undefined }
  | { readonly ok: false }

const INVALID_CONTRIBUTIONS = Symbol("invalid contributions")
const MAX_CONTRIBUTIONS_PER_CALCULATION = 10_000
const MAX_STRUCTURAL_PROTOTYPE_DEPTH = 32

export function resolveBuckets(input: CalculationInput): ResolveBucketsResult {
  const inputSnapshotResult = snapshotCalculationInput(input)
  if (!inputSnapshotResult.ok) {
    return fail(
      invalidCalculationInput(),
      [],
      [],
      inputSnapshotResult.formulaId,
    )
  }

  const inputFormulaId = inputSnapshotResult.input.formulaId
  const formulaSpec = getFormulaSpecById(inputFormulaId)
  const trace: string[] | undefined = inputSnapshotResult.input.traceEnabled
    ? []
    : undefined

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

  const identityResult = snapshotBucketIdentities(
    inputSnapshotResult.input.buckets,
  )
  if (!identityResult.ok) {
    return fail(invalidCalculationInput(), [], [], formulaSpec.formulaId, trace)
  }

  const bucketIdentities = sortBucketsForValidation(
    formulaSpec,
    identityResult.buckets,
  )
  const duplicate = findDuplicateBucket(bucketIdentities)
  if (duplicate !== undefined) {
    return fail(
      duplicateBucket(duplicate),
      [],
      [],
      formulaSpec.formulaId,
      trace,
    )
  }

  for (const bucket of bucketIdentities) {
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

  const snapshotResult = snapshotBuckets(bucketIdentities)
  if (!snapshotResult.ok) {
    return fail(invalidCalculationInput(), [], [], formulaSpec.formulaId, trace)
  }

  const buckets = snapshotResult.buckets

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
  bucket: BucketSnapshot,
  ignored: boolean,
  formulaId: string,
): NormalizedBucket {
  // Collection-wide validation has already established these input invariants.
  const { hasValue, hasContributions } = bucket

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
    const contributions = bucket.contributions as readonly BucketContribution[]
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

function snapshotCalculationInput(
  input: unknown,
): SnapshotCalculationInputResult {
  let formulaId: unknown

  const inputResult = snapshotStructuralObject(input)
  if (!inputResult.ok) {
    return { ok: false }
  }

  const formulaIdResult = snapshotStructuralProperty(
    inputResult.object,
    "formulaId",
  )
  if (!formulaIdResult.ok) {
    return { ok: false }
  }
  formulaId = formulaIdResult.value

  const optionsResult = snapshotStructuralProperty(
    inputResult.object,
    "options",
  )
  if (!optionsResult.ok) {
    return invalidCalculationInputSnapshot(formulaId)
  }

  let traceEnabled = false
  if (optionsResult.value !== undefined) {
    const optionsSnapshotResult = snapshotStructuralObject(optionsResult.value)
    if (!optionsSnapshotResult.ok) {
      return invalidCalculationInputSnapshot(formulaId)
    }

    const traceResult = snapshotStructuralProperty(
      optionsSnapshotResult.object,
      "trace",
    )
    if (
      !traceResult.ok ||
      (traceResult.value !== undefined &&
        typeof traceResult.value !== "boolean")
    ) {
      return invalidCalculationInputSnapshot(formulaId)
    }
    traceEnabled = traceResult.value === true
  }

  const bucketsResult = snapshotStructuralProperty(
    inputResult.object,
    "buckets",
  )
  if (!bucketsResult.ok) {
    return invalidCalculationInputSnapshot(formulaId)
  }

  return {
    ok: true,
    input: {
      formulaId,
      buckets: bucketsResult.value,
      traceEnabled,
    },
  }
}

function invalidCalculationInputSnapshot(
  formulaId: unknown,
): SnapshotCalculationInputResult {
  return {
    ok: false,
    formulaId: typeof formulaId === "string" ? formulaId : undefined,
  }
}

function snapshotBucketIdentities(
  buckets: unknown,
): SnapshotBucketIdentitiesResult {
  try {
    if (!trustedIsArray(buckets)) {
      return { ok: false }
    }

    const length = buckets.length
    if (!isPrimitiveArrayLength(length) || length > getBucketSpecCount()) {
      return { ok: false }
    }

    const snapshots: BucketIdentitySnapshot[] = []
    for (let index = 0; index < length; index += 1) {
      if (!trustedHasOwn(buckets, index)) {
        return { ok: false }
      }

      const bucket: unknown = buckets[index]
      if (
        typeof bucket !== "object" ||
        bucket === null ||
        trustedIsArray(bucket)
      ) {
        return { ok: false }
      }

      const bucketResult = snapshotStructuralObject(bucket)
      if (!bucketResult.ok) {
        return { ok: false }
      }

      const bucketIdResult = snapshotStructuralProperty(
        bucketResult.object,
        "bucketId",
      )
      if (!bucketIdResult.ok || !isBucketId(bucketIdResult.value)) {
        return { ok: false }
      }

      snapshots.push({
        bucketId: bucketIdResult.value,
        bucket: bucketResult.object,
      })
    }

    return { ok: true, buckets: snapshots }
  } catch {
    return { ok: false }
  }
}

function snapshotBuckets(
  buckets: readonly BucketIdentitySnapshot[],
): SnapshotBucketsResult {
  let contributionCount = 0
  const payloads: BucketPayloadSnapshot[] = []

  // Lock every collection length and the total budget before copying entries.
  for (const identity of buckets) {
    const snapshotResult = snapshotBucketPayload(identity)
    if (!snapshotResult.ok) {
      return { ok: false }
    }

    if (
      snapshotResult.contributionCount >
      MAX_CONTRIBUTIONS_PER_CALCULATION - contributionCount
    ) {
      return { ok: false }
    }

    contributionCount += snapshotResult.contributionCount
    payloads.push(snapshotResult.bucket)
  }

  return { ok: true, buckets: payloads.map(snapshotBucket) }
}

function snapshotBucketPayload(
  identity: BucketIdentitySnapshot,
): SnapshotBucketPayloadResult {
  try {
    const { bucket, bucketId } = identity
    const valueResult = snapshotStructuralProperty(bucket, "value")
    const contributionsPropertyResult = snapshotStructuralProperty(
      bucket,
      "contributions",
    )
    const provenancePropertyResult = snapshotStructuralProperty(
      bucket,
      "provenance",
    )
    if (
      !valueResult.ok ||
      !contributionsPropertyResult.ok ||
      !provenancePropertyResult.ok
    ) {
      return { ok: false }
    }

    const provenanceResult = snapshotProvenance(provenancePropertyResult.value)
    if (!provenanceResult.ok) {
      return { ok: false }
    }

    const contributionsResult = contributionsPropertyResult.present
      ? snapshotContributionCollection(contributionsPropertyResult.value)
      : {
          contributions: undefined,
          contributionCount: 0,
        }

    return {
      ok: true,
      bucket: {
        bucketId,
        hasValue: valueResult.present,
        value: valueResult.value,
        hasContributions: contributionsPropertyResult.present,
        contributions: contributionsResult.contributions,
        provenance: provenanceResult.provenance,
      },
      contributionCount: contributionsResult.contributionCount,
    }
  } catch {
    return { ok: false }
  }
}

function snapshotBucket(bucket: BucketPayloadSnapshot): BucketSnapshot {
  return {
    ...bucket,
    contributions:
      typeof bucket.contributions === "object"
        ? snapshotContributions(bucket.contributions)
        : bucket.contributions,
  }
}

function snapshotProvenance(provenance: unknown): SnapshotProvenanceResult {
  if (provenance === undefined) {
    return { ok: true, provenance: undefined }
  }
  if (
    typeof provenance !== "object" ||
    provenance === null ||
    trustedIsArray(provenance)
  ) {
    return { ok: false }
  }

  const provenanceSnapshotResult = snapshotStructuralObject(provenance)
  if (!provenanceSnapshotResult.ok) {
    return { ok: false }
  }

  const kindResult = snapshotStructuralProperty(
    provenanceSnapshotResult.object,
    "kind",
  )
  const sourceResult = snapshotStructuralProperty(
    provenanceSnapshotResult.object,
    "source",
  )
  const noteResult = snapshotStructuralProperty(
    provenanceSnapshotResult.object,
    "note",
  )
  if (!kindResult.ok || !sourceResult.ok || !noteResult.ok) {
    return { ok: false }
  }

  const kind = kindResult.value
  const source = sourceResult.value
  const note = noteResult.value
  if (
    (kind !== "manual" && kind !== "derived") ||
    (source !== undefined && typeof source !== "string") ||
    (note !== undefined && typeof note !== "string")
  ) {
    return { ok: false }
  }

  return {
    ok: true,
    provenance: {
      kind,
      ...(source === undefined ? {} : { source }),
      ...(note === undefined ? {} : { note }),
    },
  }
}

function snapshotContributionCollection(
  contributions: unknown,
): SnapshotContributionCollectionResult {
  let contributionCount = 0

  try {
    if (!trustedIsArray(contributions)) {
      return {
        contributions: INVALID_CONTRIBUTIONS,
        contributionCount,
      }
    }

    const length = contributions.length
    if (!isPrimitiveArrayLength(length)) {
      return {
        contributions: INVALID_CONTRIBUTIONS,
        contributionCount,
      }
    }
    contributionCount = length
    return {
      contributions: { contributions, length },
      contributionCount,
    }
  } catch {
    return {
      contributions: INVALID_CONTRIBUTIONS,
      contributionCount,
    }
  }
}

function snapshotContributions(
  collection: ContributionCollectionSnapshot,
): readonly BucketContribution[] | typeof INVALID_CONTRIBUTIONS {
  try {
    const snapshots: BucketContribution[] = []
    for (let index = 0; index < collection.length; index += 1) {
      if (!trustedHasOwn(collection.contributions, index)) {
        return INVALID_CONTRIBUTIONS
      }

      const contribution: unknown = collection.contributions[index]
      if (
        typeof contribution !== "object" ||
        contribution === null ||
        trustedIsArray(contribution)
      ) {
        return INVALID_CONTRIBUTIONS
      }

      const contributionSnapshotResult = snapshotStructuralObject(contribution)
      if (!contributionSnapshotResult.ok) {
        return INVALID_CONTRIBUTIONS
      }

      const valueResult = snapshotStructuralProperty(
        contributionSnapshotResult.object,
        "value",
      )
      const sourceResult = snapshotStructuralProperty(
        contributionSnapshotResult.object,
        "source",
      )
      const noteResult = snapshotStructuralProperty(
        contributionSnapshotResult.object,
        "note",
      )
      if (!valueResult.ok || !sourceResult.ok || !noteResult.ok) {
        return INVALID_CONTRIBUTIONS
      }

      const value = valueResult.value
      const source = sourceResult.value
      const note = noteResult.value
      if (
        !isFiniteNumber(value) ||
        (source !== undefined && typeof source !== "string") ||
        (note !== undefined && typeof note !== "string")
      ) {
        return INVALID_CONTRIBUTIONS
      }

      snapshots.push({
        value,
        ...(source === undefined ? {} : { source }),
        ...(note === undefined ? {} : { note }),
      })
    }

    return snapshots
  } catch {
    return INVALID_CONTRIBUTIONS
  }
}

function findDuplicateBucket(
  buckets: readonly { readonly bucketId: BucketId }[],
): BucketId | undefined {
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
  buckets: readonly BucketSnapshot[],
): CalculationError | undefined {
  for (const bucket of buckets) {
    if (bucket.hasValue && bucket.hasContributions) {
      return conflictingBucketInput(bucket.bucketId)
    }
  }

  for (const bucket of buckets) {
    if (
      bucket.hasValue &&
      bucket.provenance?.kind === "derived" &&
      getBucketSpec(bucket.bucketId).acceptsDerivedValue !== true
    ) {
      return unsupportedDerivedValue(bucket.bucketId)
    }
  }

  for (const bucket of buckets) {
    if (
      (bucket.hasValue && !isFiniteNumber(bucket.value)) ||
      (bucket.hasContributions &&
        hasInvalidContributionEntries(bucket.contributions))
    ) {
      return invalidNumber(bucket.bucketId)
    }
  }

  for (const bucket of buckets) {
    if (
      bucket.hasContributions &&
      trustedIsArray(bucket.contributions) &&
      bucket.contributions.length === 0
    ) {
      return emptyContributions(bucket.bucketId)
    }
  }

  for (const bucket of buckets) {
    if (
      bucket.hasContributions &&
      getBucketSpec(bucket.bucketId).contributionReducer === undefined
    ) {
      return unsupportedContributions(bucket.bucketId)
    }
  }

  for (const bucket of buckets) {
    if (!bucket.hasContributions) {
      continue
    }

    const bucketSpec = getBucketSpec(bucket.bucketId)
    const contributions = bucket.contributions as readonly BucketContribution[]
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
  buckets: readonly BucketSnapshot[],
): BucketId | undefined {
  const explicitBuckets = new Map(
    buckets.map((bucket) => [bucket.bucketId, bucket]),
  )

  for (const bucketId of formulaSpec.requiredBuckets) {
    const bucket = explicitBuckets.get(bucketId)
    if (
      bucket === undefined ||
      (!bucket.hasValue && !bucket.hasContributions)
    ) {
      return bucketId
    }
  }

  return undefined
}

function sortBucketsForValidation<
  BucketWithIdentity extends { readonly bucketId: BucketId },
>(
  formulaSpec: FormulaSpec,
  buckets: readonly BucketWithIdentity[],
): BucketWithIdentity[] {
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
  bucket: BucketSnapshot,
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
  return trustedIsFiniteNumber(value)
}

function isPrimitiveArrayLength(value: unknown): value is number {
  return trustedIsSafeInteger(value) && value >= 0
}

function hasInvalidContributionEntries(contributions: unknown): boolean {
  return contributions === INVALID_CONTRIBUTIONS
}

function snapshotStructuralPrototypeChain(
  object: object,
): SnapshotPrototypeChainResult {
  const visited = new Set<object>()
  const chain: object[] = [object]
  let current = object
  visited.add(object)

  try {
    while (true) {
      const prototype = trustedGetPrototypeOf(current)
      if (prototype === null) {
        const readableChain = current === object ? chain : chain.slice(0, -1)
        return finalizeStructuralPrototypeChain(readableChain)
      }
      if (prototype === Object.prototype) {
        return finalizeStructuralPrototypeChain(chain)
      }

      if (visited.has(prototype)) {
        return { ok: false }
      }

      visited.add(prototype)
      chain.push(prototype)
      if (chain.length > MAX_STRUCTURAL_PROTOTYPE_DEPTH + 2) {
        return { ok: false }
      }
      current = prototype
    }
  } catch {
    return { ok: false }
  }
}

function finalizeStructuralPrototypeChain(
  chain: readonly object[],
): SnapshotPrototypeChainResult {
  return chain.length - 1 > MAX_STRUCTURAL_PROTOTYPE_DEPTH
    ? { ok: false }
    : { ok: true, chain }
}

function snapshotStructuralObject(
  value: unknown,
): SnapshotStructuralObjectResult {
  try {
    if (typeof value !== "object" || value === null || trustedIsArray(value)) {
      return { ok: false }
    }

    const prototypeChainResult = snapshotStructuralPrototypeChain(value)
    return prototypeChainResult.ok
      ? {
          ok: true,
          object: {
            root: value as Record<PropertyKey, unknown>,
            chain: prototypeChainResult.chain,
          },
        }
      : prototypeChainResult
  } catch {
    return { ok: false }
  }
}

function snapshotStructuralProperty(
  object: StructuralObjectSnapshot,
  key: PropertyKey,
): SnapshotStructuralPropertyResult {
  try {
    for (const owner of object.chain) {
      const descriptor = trustedGetOwnPropertyDescriptor(owner, key)
      if (descriptor !== undefined) {
        return {
          ok: true,
          present: true,
          value: trustedReadDescriptor(descriptor, object.root),
        }
      }
    }

    return { ok: true, present: false, value: undefined }
  } catch {
    return { ok: false }
  }
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
