import type {
  AttackSegment,
  BattleSnapshot,
  BucketContributor,
  BucketResult,
  CalcResult,
  DamageType,
  Diagnostic,
  ManualEvent,
  ManualEventResult,
  MultiplierBucket,
  SegmentResult,
  SourceRef,
  TraceEvent,
} from "../schema"

export interface CalculateOptions {
  calculationId?: string
  snapshotId?: string
}

export interface CalculationState {
  snapshot: BattleSnapshot
  calculationId: string
  snapshotId?: string
  trace: TraceEvent[]
  warnings: Diagnostic[]
  errors: Diagnostic[]
}

export interface SegmentComputation {
  segment: AttackSegment
  result: SegmentResult
  buckets: BucketResult[]
}

export interface BucketInput {
  bucketId: MultiplierBucket
  before?: number
  after: number
  effectiveMultiplier: number
  contributors?: BucketContributor[]
  traceRefs?: string[]
}

export interface DamageFormulaInput {
  baseDamage: number
  damageType: DamageType
  buckets: BucketInput[]
}

export interface ManualEventComputation {
  event: ManualEvent
  result: ManualEventResult
}

export interface SourceAwareValue {
  value: number
  source?: SourceRef
}

export type CalculateResult = CalcResult
