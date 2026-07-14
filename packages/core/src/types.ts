export type FormulaId = "regular_damage" | "sheer_damage"

export type BucketId =
  | "base_damage"
  | "damage_bonus"
  | "crit"
  | "defense"
  | "sheer_damage_bonus"
  | "resistance"
  | "damage_taken"
  | "stun_damage_taken"
  | "special"

export type BucketContributionReducer = "sum" | "one_plus_sum"

export interface CalculationOptions {
  readonly trace?: boolean
}

export interface BucketContribution {
  readonly value: number
  readonly source?: string
  readonly note?: string
}

export interface BucketProvenance {
  readonly kind: "manual" | "derived"
  readonly source?: string
  readonly note?: string
}

export interface Bucket {
  readonly bucketId: BucketId
  readonly value?: number
  readonly contributions?: readonly BucketContribution[]
  readonly provenance?: BucketProvenance
}

export interface CalculationInput {
  readonly formulaId: FormulaId
  readonly buckets: readonly Bucket[]
  readonly options?: CalculationOptions
}

export interface FormulaSpec {
  readonly formulaId: FormulaId
  readonly buckets: readonly BucketId[]
  readonly requiredBuckets: readonly BucketId[]
  readonly optionalBuckets: readonly BucketId[]
  readonly ignoredBuckets?: readonly BucketId[]
}

export interface BucketSpec {
  readonly bucketId: BucketId
  readonly acceptsDirectValue: true
  readonly acceptsDerivedValue?: boolean
  readonly contributionReducer?: BucketContributionReducer
  readonly defaultValue?: number
  readonly required?: boolean
}

export interface ResolvedBucket {
  readonly bucketId: BucketId
  readonly value: number
}

export type BucketBreakdownSource =
  | "input_value"
  | "contributions"
  | "default"
  | "derived"
  | "ignored"

export type CalculationErrorCode =
  | "missing_required_bucket"
  | "conflicting_bucket_input"
  | "duplicate_bucket"
  | "invalid_number"
  | "empty_contributions"
  | "unsupported_contributions"
  | "unsupported_derived_value"
  | "unsupported_formula"
  | "unsupported_bucket"

export type CalculationWarningCode = "ignored_bucket" | "defaulted_bucket"

interface CalculationIssue<Code extends string> {
  readonly code: Code
  readonly message: string
}

type BucketCalculationIssue<Code extends string> = Code extends string
  ? CalculationIssue<Code> & { readonly bucketId: BucketId }
  : never

export type CalculationError =
  | CalculationIssue<"unsupported_formula">
  | (CalculationIssue<"invalid_number"> & {
      readonly bucketId?: BucketId
    })
  | BucketCalculationIssue<
      Exclude<CalculationErrorCode, "unsupported_formula" | "invalid_number">
    >

export type CalculationWarning = BucketCalculationIssue<CalculationWarningCode>

export interface BucketBreakdown {
  readonly bucketId: BucketId
  readonly value: number
  readonly source: BucketBreakdownSource
  readonly defaulted?: boolean
  readonly contributions?: readonly BucketContribution[]
  readonly provenance?: BucketProvenance
  readonly warnings?: readonly CalculationWarning[]
}

export type CalculationResult =
  | {
      readonly ok: true
      readonly formulaId: FormulaId
      readonly value: number
      readonly buckets: readonly BucketBreakdown[]
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
