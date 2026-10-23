import type {
  Activation,
  AnyParameter,
  Condition,
  ContributionOperation,
  EffectId,
  FactorChannelUnitMap,
  NonEmpty,
  NumericExpression,
  SourceIdentity,
  SourceReference,
  StaticCatalogApplicability,
  StaticCatalogDamageItemRequirement,
  StaticCatalogInputRequirement,
  StaticCatalogUnavailableReason,
  StaticCatalogVariant,
  TargetSelector,
} from "@randomplay/shared"

/**
 * 作者层只开放试点实际用到的封闭联合。新增通道或条件必须同时扩展
 * 本文件的常量、编译器和测试；不存在按字符串路径读取任意数据的入口。
 */
export const AUTHORING_FACTOR_CHANNELS = [
  "damage-bonus",
  "anomaly-damage-bonus",
  "attacker-resistance-ignore",
  "sheer-damage-bonus",
] as const

export type AuthoringFactorChannel = (typeof AUTHORING_FACTOR_CHANNELS)[number]

export type AuthoringFactorOperation = {
  readonly [C in AuthoringFactorChannel]: {
    readonly kind: "factor-contribution"
    readonly channel: C
    readonly value: NumericExpression<FactorChannelUnitMap[C], "contribution">
  }
}[AuthoringFactorChannel]

export type AuthoringOperation =
  | AuthoringFactorOperation
  | Extract<ContributionOperation, { readonly kind: "stat-adjustment" }>
  | Extract<ContributionOperation, { readonly kind: "hit-adjustment" }>

/** 试点只使用调用方显式声明的 supplied 状态。 */
export type AuthoringActivation = Extract<
  Activation,
  { readonly kind: "supplied" }
>

/**
 * 条件联合只含试点所需的五种结构；`all` / `any` 递归回本联合，
 * 因此嵌套条件也不能携带未登记的结构。
 */
export type AuthoringCondition<P extends "configuration" | "contribution"> =
  | { readonly kind: "constant"; readonly value: boolean }
  | {
      readonly kind: "all" | "any"
      readonly conditions: readonly AuthoringCondition<P>[]
    }
  | Extract<Condition<P>, { readonly kind: "compare-number" }>
  | Extract<Condition<P>, { readonly kind: "one-of" }>

export const AUTHORING_COVERAGE_STATUSES = [
  "converted",
  "corrected",
  "unsupported",
] as const

export type AuthoringCoverageStatus =
  (typeof AUTHORING_COVERAGE_STATUSES)[number]

export const AUTHORING_COVERAGE_POSITION_KINDS = [
  "mindscape",
  "refinement",
  "setPieces",
  "fixed",
] as const

export type AuthoringCoveragePositionKind =
  (typeof AUTHORING_COVERAGE_POSITION_KINDS)[number]

/** 一条来源位置到编译结果的覆盖记录；Pointer 只作为来源定位。 */
export interface AuthoringCoveragePosition {
  readonly pointer: `/${string}`
  readonly rank: number
  readonly rankKind: AuthoringCoveragePositionKind
  readonly stat: string
  readonly normalizationChanges: readonly string[]
  readonly rawValue: number
  readonly normalizedValue: number
}

export interface AuthoringCoverage {
  readonly status: AuthoringCoverageStatus
  /** 该记录所属变体的具名差异；同一变体来自多条记录时取有序并集。 */
  readonly differenceIds: readonly string[]
  readonly reason?: StaticCatalogUnavailableReason
  readonly explanation?: string
  /**
   * 固定来源位置。完整状态派生规则和补充来源选项可以没有位置：
   * 此时编译器不替换 coverage 条目，只把状态/差异投影到目录变体。
   */
  readonly positions: readonly AuthoringCoveragePosition[]
}

export const AUTHORING_SUPPLEMENTAL_KINDS = [
  "option",
  "option-variant",
  "entity",
  "unsupported-option",
] as const

export type AuthoringSupplementalKind =
  (typeof AUTHORING_SUPPLEMENTAL_KINDS)[number]

export const AUTHORING_SUPPLEMENTAL_STATUSES = [
  "integrated",
  "out-of-scope",
] as const

export type AuthoringSupplementalStatus =
  (typeof AUTHORING_SUPPLEMENTAL_STATUSES)[number]

/**
 * 补充来源覆盖记录的作者形状。字段与正式 static-coverage.json 的
 * supplementalRecords 对齐；编译只按 supplementId 原位替换基线条目。
 */
export interface AuthoringSupplementalRecord {
  readonly supplementId: string
  readonly source: string
  readonly kind: AuthoringSupplementalKind
  readonly optionId?: string
  readonly effectIds?: readonly string[]
  readonly supportedRanks: string
  readonly computationTarget: string
  readonly status: AuthoringSupplementalStatus
}

export interface AuthoringEntity {
  readonly sourceId: "zzz-hp" | "nanoka-integrated"
  readonly catalogEntityId: string
  readonly identity: SourceIdentity
}

export interface AuthoringIds {
  readonly optionId: string
  readonly effectId: EffectId
}

export interface AuthoringOptionVariant {
  readonly configuration: StaticCatalogVariant["configuration"]
  readonly references: NonEmpty<SourceReference>
  readonly maximumLayers: number
  readonly inputs: readonly StaticCatalogInputRequirement[]
  readonly applicability: StaticCatalogApplicability
  /** 引用同一选项下的作者记录 key；编译后变成稳定 effectId。 */
  readonly effectKeys: readonly string[]
  readonly target?: "self" | "team"
}

export interface AuthoringOption {
  readonly optionId: string
  readonly catalogEntityId: string
  readonly name: string
  readonly conditionDescription: string
  readonly target: "self" | "team"
  readonly exclusiveGroup?: string
  readonly variants: NonEmpty<AuthoringOptionVariant>
}

export interface AuthoringSkillTarget {
  readonly targetId: string
  readonly upstreamId: string | null
  readonly agentEntityId: string | null
  readonly category: string
  readonly name: string
  readonly countsAsFollowUp: boolean
}

export const AUTHORING_MECHANISM_KINDS = [
  "single-rule",
  "complete-state",
  "independent-settlement",
  "unsupported",
] as const

export type AuthoringMechanism =
  | { readonly kind: "single-rule" }
  | { readonly kind: "complete-state" }
  | {
      readonly kind: "independent-settlement"
      readonly skillTarget: AuthoringSkillTarget
      readonly damageItem: StaticCatalogDamageItemRequirement
      readonly exclusiveDamageItem?: true
    }
  | { readonly kind: "unsupported" }

interface AuthoringRecordBase {
  readonly key: string
  readonly entity: AuthoringEntity
  readonly ids: AuthoringIds
  readonly coverage: AuthoringCoverage
  readonly option: AuthoringOption
  /**
   * 该记录所属选项的补充来源覆盖记录。未声明时基线补充记录保持原样；
   * 声明后按 supplementId 原位替换，声明的 optionId 必须等于 ids.optionId。
   */
  readonly supplementalRecords?: readonly AuthoringSupplementalRecord[]
}

interface AuthoringRuleFieldsBase {
  readonly section: string
  readonly references: NonEmpty<SourceReference>
  readonly config: AuthoringCondition<"configuration">
  readonly activation: AuthoringActivation
  readonly beneficiary: TargetSelector
  readonly when: AuthoringCondition<"contribution">
  readonly parameters: Readonly<Record<string, AnyParameter>>
}

type AuthoringRuleFields = AuthoringRuleFieldsBase &
  (
    | {
        readonly scope: "entity"
        readonly operation: Exclude<
          AuthoringOperation,
          { readonly kind: "hit-adjustment" }
        >
      }
    | {
        readonly scope: "hit"
        readonly operation: AuthoringOperation
      }
  )

export type EffectAuthoringRuleRecord = AuthoringRecordBase &
  AuthoringRuleFields & {
    readonly mechanism: Exclude<
      AuthoringMechanism,
      { readonly kind: "unsupported" }
    >
  }

export type EffectAuthoringUnsupportedRecord = AuthoringRecordBase & {
  readonly mechanism: Extract<
    AuthoringMechanism,
    { readonly kind: "unsupported" }
  >
}

export type EffectAuthoringRecord =
  | EffectAuthoringRuleRecord
  | EffectAuthoringUnsupportedRecord

export function isUnsupportedAuthoringRecord(
  record: EffectAuthoringRecord,
): record is EffectAuthoringUnsupportedRecord {
  return record.mechanism.kind === "unsupported"
}
