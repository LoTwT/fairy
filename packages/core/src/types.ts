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

export type BucketProvenance =
  | {
      readonly kind: "manual"
      readonly source?: string
      readonly note?: string
    }
  | {
      readonly kind: "derived"
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
}

export interface ResolvedBucket {
  readonly bucketId: BucketId
  readonly value: number
}

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

interface BucketBreakdownBase {
  readonly bucketId: BucketId
  readonly value: number
}

type DefaultedBucketWarning = Extract<
  CalculationWarning,
  { readonly code: "defaulted_bucket" }
>

type IgnoredBucketWarning = Extract<
  CalculationWarning,
  { readonly code: "ignored_bucket" }
>

type IgnoredBucketBreakdown =
  | (BucketBreakdownBase & {
      readonly source: "ignored"
      readonly defaulted: true
      readonly contributions?: never
      readonly provenance?: never
      readonly warnings: readonly [DefaultedBucketWarning, IgnoredBucketWarning]
    })
  | (BucketBreakdownBase & {
      readonly source: "ignored"
      readonly defaulted?: never
      readonly contributions: readonly BucketContribution[]
      readonly provenance?: BucketProvenance
      readonly warnings: readonly [IgnoredBucketWarning]
    })
  | (BucketBreakdownBase & {
      readonly source: "ignored"
      readonly defaulted?: never
      readonly contributions?: never
      readonly provenance?: BucketProvenance
      readonly warnings: readonly [IgnoredBucketWarning]
    })

export type BucketBreakdown =
  | (BucketBreakdownBase & {
      readonly source: "input_value"
      readonly defaulted?: never
      readonly contributions?: never
      readonly provenance?: BucketProvenance & { readonly kind: "manual" }
      readonly warnings?: never
    })
  | (BucketBreakdownBase & {
      readonly source: "contributions"
      readonly defaulted?: never
      readonly contributions: readonly BucketContribution[]
      readonly provenance?: BucketProvenance
      readonly warnings?: never
    })
  | (BucketBreakdownBase & {
      readonly source: "default"
      readonly defaulted: true
      readonly contributions?: never
      readonly provenance?: never
      readonly warnings: readonly [DefaultedBucketWarning]
    })
  | (BucketBreakdownBase & {
      readonly source: "derived"
      readonly defaulted?: never
      readonly contributions?: never
      readonly provenance: BucketProvenance & { readonly kind: "derived" }
      readonly warnings?: never
    })
  | IgnoredBucketBreakdown

export type BucketBreakdownSource = BucketBreakdown["source"]

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
