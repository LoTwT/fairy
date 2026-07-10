import type {
  BucketId,
  CalculationWarning,
  CalculationWarningCode,
} from "./types"

export function warning(
  code: CalculationWarningCode,
  message: string,
  bucketId?: BucketId,
): CalculationWarning {
  if (bucketId === undefined) {
    return { code, message }
  }

  return { code, message, bucketId }
}

export function missingRequiredBucket(bucketId: BucketId): CalculationWarning {
  return warning(
    "missing_required_bucket",
    `${bucketId} is required and has no neutral default.`,
    bucketId,
  )
}

export function defaultedBucket(
  bucketId: BucketId,
  value: number,
): CalculationWarning {
  return warning(
    "defaulted_bucket",
    `${bucketId} defaulted to neutral value ${value}.`,
    bucketId,
  )
}

export function conflictingBucketInput(bucketId: BucketId): CalculationWarning {
  return warning(
    "conflicting_bucket_input",
    "Bucket cannot contain both value and contributions in Phase 6A.",
    bucketId,
  )
}

export function duplicateBucket(bucketId: BucketId): CalculationWarning {
  return warning(
    "duplicate_bucket",
    `CalculationInput cannot contain duplicate bucketId ${bucketId}.`,
    bucketId,
  )
}

export function invalidNumber(bucketId: BucketId): CalculationWarning {
  return warning(
    "invalid_number",
    "Bucket value must be a finite number.",
    bucketId,
  )
}

export function invalidCalculationResult(): CalculationWarning {
  return warning(
    "invalid_number",
    "Calculation result must be a finite number.",
  )
}

export function emptyContributions(bucketId: BucketId): CalculationWarning {
  return warning(
    "empty_contributions",
    "Bucket contributions cannot be empty.",
    bucketId,
  )
}

export function unsupportedContributions(
  bucketId: BucketId,
): CalculationWarning {
  return warning(
    "unsupported_contributions",
    `${bucketId} does not support contributions in Phase 6A; pass a normalized value.`,
    bucketId,
  )
}

export function unsupportedDerivedValue(
  bucketId: BucketId,
): CalculationWarning {
  return warning(
    "unsupported_derived_value",
    `${bucketId} does not support derived values in Phase 6A; pass a manual normalized value.`,
    bucketId,
  )
}

export function unsupportedBucket(
  bucketId: BucketId,
  formulaId: string,
): CalculationWarning {
  return warning(
    "unsupported_bucket",
    `${bucketId} is not supported by ${formulaId}.`,
    bucketId,
  )
}

export function ignoredBucket(
  bucketId: BucketId,
  formulaId: string,
): CalculationWarning {
  return warning(
    "ignored_bucket",
    `${bucketId} is ignored by ${formulaId}.`,
    bucketId,
  )
}

export function unsupportedFormula(formulaId: string): CalculationWarning {
  return warning(
    "unsupported_formula",
    `${formulaId} is not a supported Phase 6A formula.`,
  )
}
