import type { BucketId, CalculationError, CalculationWarning } from "./types"

type DefaultedBucketWarning = Extract<
  CalculationWarning,
  { readonly code: "defaulted_bucket" }
>

type IgnoredBucketWarning = Extract<
  CalculationWarning,
  { readonly code: "ignored_bucket" }
>

function issue<Code extends string>(
  code: Code,
  message: string,
): { readonly code: Code; readonly message: string } {
  return { code, message }
}

function bucketIssue<Code extends string>(
  code: Code,
  message: string,
  bucketId: BucketId,
): {
  readonly code: Code
  readonly message: string
  readonly bucketId: BucketId
} {
  return { code, message, bucketId }
}

export function missingRequiredBucket(bucketId: BucketId): CalculationError {
  return bucketIssue(
    "missing_required_bucket",
    `${bucketId} is required and has no neutral default.`,
    bucketId,
  )
}

export function defaultedBucket(
  bucketId: BucketId,
  value: number,
): DefaultedBucketWarning {
  return bucketIssue(
    "defaulted_bucket",
    `${bucketId} defaulted to neutral value ${value}.`,
    bucketId,
  )
}

export function conflictingBucketInput(bucketId: BucketId): CalculationError {
  return bucketIssue(
    "conflicting_bucket_input",
    "Bucket cannot contain both value and contributions in Phase 6A.",
    bucketId,
  )
}

export function duplicateBucket(bucketId: BucketId): CalculationError {
  return bucketIssue(
    "duplicate_bucket",
    `CalculationInput cannot contain duplicate bucketId ${bucketId}.`,
    bucketId,
  )
}

export function invalidNumber(bucketId: BucketId): CalculationError {
  return bucketIssue(
    "invalid_number",
    "Bucket value must be a finite number.",
    bucketId,
  )
}

export function invalidCalculationResult(): CalculationError {
  return issue("invalid_number", "Calculation result must be a finite number.")
}

export function emptyContributions(bucketId: BucketId): CalculationError {
  return bucketIssue(
    "empty_contributions",
    "Bucket contributions cannot be empty.",
    bucketId,
  )
}

export function unsupportedContributions(bucketId: BucketId): CalculationError {
  return bucketIssue(
    "unsupported_contributions",
    `${bucketId} does not support contributions in Phase 6A; pass a normalized value.`,
    bucketId,
  )
}

export function unsupportedDerivedValue(bucketId: BucketId): CalculationError {
  return bucketIssue(
    "unsupported_derived_value",
    `${bucketId} does not support derived values in Phase 6A; pass a manual normalized value.`,
    bucketId,
  )
}

export function unsupportedBucket(
  bucketId: BucketId,
  formulaId: string,
): CalculationError {
  return bucketIssue(
    "unsupported_bucket",
    `${bucketId} is not supported by ${formulaId}.`,
    bucketId,
  )
}

export function ignoredBucket(
  bucketId: BucketId,
  formulaId: string,
): IgnoredBucketWarning {
  return bucketIssue(
    "ignored_bucket",
    `${bucketId} is ignored by ${formulaId}.`,
    bucketId,
  )
}

export function unsupportedFormula(formulaId?: string): CalculationError {
  return issue(
    "unsupported_formula",
    formulaId === undefined
      ? "Formula ID must be a supported Phase 6A string."
      : `${formulaId} is not a supported Phase 6A formula.`,
  )
}
