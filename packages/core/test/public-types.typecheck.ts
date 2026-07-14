import type {
  BucketBreakdown,
  CalculationError,
  CalculationErrorCode,
  CalculationWarning,
  CalculationWarningCode,
} from "../src/index"

const errorCodes = [
  "invalid_bucket_input",
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

const validInvalidBucketInput: CalculationError = {
  code: "invalid_bucket_input",
  message: "Malformed bucket input.",
}

const impossibleInvalidBucketInput: CalculationError = {
  code: "invalid_bucket_input",
  message: "Malformed bucket input.",
  // @ts-expect-error formula-level invalid_bucket_input cannot claim a bucket identity
  bucketId: "crit",
}

const validDefaultBreakdown: BucketBreakdown = {
  bucketId: "crit",
  value: 1,
  source: "default",
  defaulted: true,
  warnings: [
    {
      code: "defaulted_bucket",
      bucketId: "crit",
      message: "crit defaulted to neutral value 1.",
    },
  ],
}

const validContributionsBreakdown: BucketBreakdown = {
  bucketId: "damage_bonus",
  value: 1.5,
  source: "contributions",
  contributions: [{ value: 0.5 }],
}

const validDerivedBreakdown: BucketBreakdown = {
  bucketId: "defense",
  value: 0.5,
  source: "derived",
  provenance: { kind: "derived", source: "enemy_stats" },
}

const validIgnoredBreakdowns = [
  {
    bucketId: "defense",
    value: 0.5,
    source: "ignored",
    provenance: { kind: "derived", source: "enemy_stats" },
    warnings: [
      {
        code: "ignored_bucket",
        bucketId: "defense",
        message: "defense is ignored.",
      },
    ],
  },
  {
    bucketId: "defense",
    value: 0.5,
    source: "ignored",
    contributions: [{ value: 0.5 }],
    warnings: [
      {
        code: "ignored_bucket",
        bucketId: "defense",
        message: "defense is ignored.",
      },
    ],
  },
  {
    bucketId: "defense",
    value: 1,
    source: "ignored",
    defaulted: true,
    warnings: [
      {
        code: "defaulted_bucket",
        bucketId: "defense",
        message: "defense defaulted to neutral value 1.",
      },
      {
        code: "ignored_bucket",
        bucketId: "defense",
        message: "defense is ignored.",
      },
    ],
  },
] as const satisfies readonly BucketBreakdown[]

// @ts-expect-error default breakdowns require defaulted: true
const impossibleDefaultBreakdown: BucketBreakdown = {
  bucketId: "crit",
  value: 1,
  source: "default",
}

// @ts-expect-error contribution breakdowns require contributions
const impossibleContributionsBreakdown: BucketBreakdown = {
  bucketId: "damage_bonus",
  value: 1.5,
  source: "contributions",
}

// @ts-expect-error derived breakdowns require derived provenance
const impossibleDerivedBreakdown: BucketBreakdown = {
  bucketId: "defense",
  value: 0.5,
  source: "derived",
  provenance: { kind: "manual" },
}

// @ts-expect-error input-value breakdowns cannot carry derived provenance
const impossibleInputValueBreakdown: BucketBreakdown = {
  bucketId: "defense",
  value: 0.5,
  source: "input_value",
  provenance: { kind: "derived" },
}

const impossibleIgnoredBreakdown: BucketBreakdown = {
  bucketId: "defense",
  value: 1,
  source: "ignored",
  defaulted: true,
  // @ts-expect-error ignored defaults and contributions are mutually exclusive
  contributions: [{ value: 1 }],
  warnings: [
    {
      code: "defaulted_bucket",
      bucketId: "defense",
      message: "defense defaulted.",
    },
    {
      code: "ignored_bucket",
      bucketId: "defense",
      message: "defense ignored.",
    },
  ],
}

const impossibleEmptyContributionsBreakdown: BucketBreakdown = {
  bucketId: "damage_bonus",
  value: 1,
  source: "contributions",
  // @ts-expect-error contribution breakdowns require at least one contribution
  contributions: [],
}

const impossibleEmptyIgnoredContributionsBreakdown: BucketBreakdown = {
  bucketId: "defense",
  value: 1,
  source: "ignored",
  // @ts-expect-error ignored contribution breakdowns require at least one contribution
  contributions: [],
  warnings: [
    {
      code: "ignored_bucket",
      bucketId: "defense",
      message: "defense ignored.",
    },
  ],
}

void [
  missingErrorCodes,
  missingWarningCodes,
  overlappingCodes,
  impossibleWarning,
  impossibleError,
  validInvalidBucketInput,
  impossibleInvalidBucketInput,
  validDefaultBreakdown,
  validContributionsBreakdown,
  validDerivedBreakdown,
  validIgnoredBreakdowns,
  impossibleDefaultBreakdown,
  impossibleContributionsBreakdown,
  impossibleDerivedBreakdown,
  impossibleInputValueBreakdown,
  impossibleIgnoredBreakdown,
  impossibleEmptyContributionsBreakdown,
  impossibleEmptyIgnoredContributionsBreakdown,
]
