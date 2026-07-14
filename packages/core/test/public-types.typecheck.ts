import type {
  CalculationError,
  CalculationErrorCode,
  CalculationWarning,
  CalculationWarningCode,
} from "../src/index"

const errorCodes = [
  "missing_required_bucket",
  "conflicting_bucket_input",
  "duplicate_bucket",
  "invalid_number",
  "empty_contributions",
  "unsupported_contributions",
  "unsupported_derived_value",
  "unsupported_formula",
  "unsupported_bucket",
] as const satisfies readonly CalculationErrorCode[]

const warningCodes = [
  "ignored_bucket",
  "defaulted_bucket",
] as const satisfies readonly CalculationWarningCode[]

const missingErrorCodes: Record<
  Exclude<CalculationErrorCode, (typeof errorCodes)[number]>,
  never
> = {}
const missingWarningCodes: Record<
  Exclude<CalculationWarningCode, (typeof warningCodes)[number]>,
  never
> = {}
const overlappingCodes: Record<
  Extract<CalculationErrorCode, CalculationWarningCode>,
  never
> = {}

const impossibleWarning: CalculationWarning = {
  // @ts-expect-error fatal codes cannot appear in recoverable warnings
  code: "unsupported_formula",
  message: "Unsupported formula.",
}

const impossibleError: CalculationError = {
  // @ts-expect-error recoverable codes cannot appear as fatal errors
  code: "defaulted_bucket",
  message: "Bucket defaulted.",
  bucketId: "crit",
}

void [
  missingErrorCodes,
  missingWarningCodes,
  overlappingCodes,
  impossibleWarning,
  impossibleError,
]
