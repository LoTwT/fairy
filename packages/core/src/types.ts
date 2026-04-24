export type Attribute
  = | 'fire'
    | 'electric'
    | 'ice'
    | 'physical'
    | 'ether'
    | 'frost'
    | 'auricInk'

export type AttributeChannel = 'fire' | 'electric' | 'ice' | 'physical' | 'ether'

export type DamageType = 'regular' | 'pierce' | 'true'

export type AnomalyType
  = | 'burn'
    | 'shock'
    | 'freeze'
    | 'frostbite'
    | 'assault'
    | 'corrupt'
    | 'disorder'

export type ActionTag
  = | 'basic'
    | 'dash'
    | 'dodgeCounter'
    | 'special'
    | 'enhancedSpecial'
    | 'chain'
    | 'ultimate'
    | 'quickAssist'
    | 'defensiveAssist'
    | 'evasiveAssist'
    | 'followUp'

export type ModifierTag = Attribute | DamageType | AnomalyType | ActionTag

export type ModifierMode = 'add' | 'subtract' | 'replace' | 'force'

export interface ClampRange {
  min: number
  max: number
}

export interface ModifierOperation {
  sourceId: string
  bucket: string
  mode: ModifierMode
  value: number
  active?: boolean
  tags?: readonly ModifierTag[]
  exitCondition?: string
}

export interface BucketTraceOperation {
  sourceId: string
  mode: ModifierMode
  value: number
  applied: boolean
  reason?: string
}

export interface BucketTrace {
  bucket: string
  base: number
  preReplacementValue: number
  preClampValue: number
  replacementSourceId: string | null
  forcedOverrideSourceId: string | null
  forcedOverrideExitCondition: string | null
  finalValue: number
  clampRange: ClampRange | null
  operations: readonly BucketTraceOperation[]
}

export interface BucketResolution {
  value: number
  trace: BucketTrace
}

export interface DefenseAreaResolution {
  reduction: BucketResolution
  penetrationRate: BucketResolution
  penetrationFlat: BucketResolution
  effectiveDefense: number
  multiplier: number
}

export interface StatFormulaInput {
  base: number
  initialPercentDelta?: number
  initialFlatDelta?: number
  finalPercentDelta?: number
  finalFlatDelta?: number
}

export interface AgentStatBlock {
  attack: StatFormulaInput
  hp: StatFormulaInput
  defense: StatFormulaInput
  impact: StatFormulaInput
  pierceForce: StatFormulaInput
  anomalyProficiency: StatFormulaInput
  anomalyMastery: StatFormulaInput
  energyRegen: StatFormulaInput
  flashRegen: StatFormulaInput
  critRate?: StatFormulaInput
  critDamage?: StatFormulaInput
}

export interface EnemyStatBlock {
  attack?: StatFormulaInput
  hp: StatFormulaInput
  defense: StatFormulaInput
  impact: StatFormulaInput
  critRate?: StatFormulaInput
  critDamage?: StatFormulaInput
}

export interface ResolvedStats {
  attack: number
  hp: number
  defense: number
  impact: number
  pierceForce: number
  anomalyProficiency: number
  anomalyMastery: number
  energyRegen: number
  flashRegen: number
  critRate: number
  critDamage: number
}

export interface ResourceState {
  energy?: number
  flash?: number
  noise?: number
  corruption?: number
}

export interface AnomalyContributionRecord {
  sourceId: string
  sourceType: 'agent' | 'bangboo'
  appliedBuildup: number
  level: number
  anomalyMastery: number
  anomalyProficiency: number
  attack: number
  impact: number
  penetrationRate: number
  penetrationFlat: number
  resolvedDamageBonus: number
  resolvedOutgoingDazeBonus: number
}

export interface VirtualAgentSnapshot {
  level: number
  anomalyMastery: number
  anomalyProficiency: number
  attack: number
  impact: number
  penetrationRate: number
  penetrationFlat: number
  resolvedDamageBonus: number
  resolvedOutgoingDazeBonus: number
}

export interface AnomalyStateRecord {
  current: number
  threshold?: number
  contributionHistory: readonly AnomalyContributionRecord[]
  virtualAgent?: VirtualAgentSnapshot
}

export interface EnemyDazeState {
  current: number
  limit: number
  isDazed: boolean
  recoverySpeed: number
  fixedRecoveryDelay: number
  locked?: boolean
}

export interface ShieldState {
  current: number
  purgeDamageMultiplier?: number
}

export interface InterruptState {
  antiInterruptLevel: number
  modifiers?: readonly ModifierOperation[]
}

export interface AgentFrameSnapshot {
  id: string
  sourceType: 'agent' | 'bangboo'
  level: number
  stats: AgentStatBlock
  modifiers?: readonly ModifierOperation[]
  resources?: ResourceState
}

export interface EnemyFrameSnapshot {
  id: string
  level: number
  stats: EnemyStatBlock
  modifiers?: readonly ModifierOperation[]
  dazeState: EnemyDazeState
  anomalyState?: Partial<Record<AnomalyType, AnomalyStateRecord>>
  shieldState?: ShieldState
  interruptState?: InterruptState
}

export interface TeamFrameSnapshot {
  agents: readonly [AgentFrameSnapshot, AgentFrameSnapshot, AgentFrameSnapshot]
  frontLineAgentId: string
  modifiers?: readonly ModifierOperation[]
}

export interface BattleContext {
  distanceDecay?: number
  frontLineAgentId: string
  modifiers?: readonly ModifierOperation[]
}

export interface ActionEventSegment {
  id: string
  damageMultiplier?: number
  dazeMultiplier?: number
  anomalyBuildup?: number
  energyGain?: number
  flashGain?: number
  noiseGain?: number
  shieldReduction?: number
  corruptionGain?: number
  directDazeDelta?: number
  purgeDamageMultiplier?: number
}

export interface TriggeredOutputDefinition {
  id: string
  sourceId: string
  label: string
  damageMultiplier?: number
  dazeMultiplier?: number
  percentCurrentHpDamage?: number
}

export interface ActionEvent {
  id: string
  sourceId: string
  sourceType: 'agent' | 'bangboo'
  attribute: Attribute
  damageType: DamageType
  anomalyType?: Exclude<AnomalyType, 'disorder'>
  disorderSourceAnomaly?: Exclude<AnomalyType, 'disorder'>
  tags: readonly ModifierTag[]
  segments: readonly ActionEventSegment[]
  forceCrit?: boolean
  baseInterruptLevel?: number
  modifiers?: readonly ModifierOperation[]
  triggeredOutputs?: readonly TriggeredOutputDefinition[]
}

export interface ResolvedAgentFrameSnapshot extends Omit<AgentFrameSnapshot, 'stats'> {
  stats: ResolvedStats
}

export interface ResolvedEnemyFrameSnapshot extends Omit<EnemyFrameSnapshot, 'stats'> {
  stats: ResolvedStats
}

export interface SegmentEvaluation {
  id: string
  rawValue: number
  displayValue: number
  bucketTraces: Readonly<Record<string, BucketTrace>>
}

export interface DamageEvaluation {
  type: DamageType
  totalRaw: number
  totalDisplay: number
  critMultiplier: number
  segments: readonly SegmentEvaluation[]
  bucketTraces: Readonly<Record<string, BucketTrace>>
}

export interface DazeEvaluation {
  total: number
  nextRatio: number
  displayRatio: number
  recoverySpeed: number
  recoveryDuration: number
  fixedRecoveryDelay: number
  bucketTraces: Readonly<Record<string, BucketTrace>>
}

export interface AnomalyBuildupEvaluation {
  anomalyType: Exclude<AnomalyType, 'disorder'>
  totalApplied: number
  nextBuildup: number
  threshold: number
  triggered: boolean
  contributions: readonly AnomalyContributionRecord[]
  virtualAgent?: VirtualAgentSnapshot
  bucketTraces: Readonly<Record<string, BucketTrace>>
}

export interface AnomalyDamageEvaluation {
  anomalyType: AnomalyType
  rawDamage: number
  critMultiplier: number
  levelRegion: number
  bucketTraces: Readonly<Record<string, BucketTrace>>
}

export interface DisorderEvaluation {
  rawDamage: number
  daze: number
  levelRegion: number
  bucketTraces: Readonly<Record<string, BucketTrace>>
}

export interface ResourceEvaluation {
  energy: number
  flash: number
  noise: number
  corruptionGain: number
  corruptionBurst: number
  shieldReduction: number
  shieldPurgeDamage: number
  bucketTraces: Readonly<Record<string, BucketTrace>>
}

export interface StatusDurationRequest {
  kind: 'freeze' | Exclude<AnomalyType, 'disorder'>
  baseDuration?: number
  anomalyMastery?: number
  anomalyProficiency?: number
  durationBonus?: number
}

export interface StatusDurationResult {
  kind: StatusDurationRequest['kind']
  duration: number
}

export interface InterruptOutcome {
  effectiveLevel: number
  antiInterruptLevel: number
  interrupted: boolean
  trace: BucketTrace
}

export interface TriggeredOutputEvaluation {
  id: string
  sourceId: string
  label: string
  damage?: number
  daze?: number
  percentCurrentHpDamage?: number
}

export interface FrameEvaluation {
  eventId: string
  sourceId: string
  damage?: DamageEvaluation
  daze?: DazeEvaluation
  anomalyBuildup?: AnomalyBuildupEvaluation
  anomalyDamage?: AnomalyDamageEvaluation
  disorder?: DisorderEvaluation
  resources?: ResourceEvaluation
  interrupt?: InterruptOutcome
  segments: readonly SegmentEvaluation[]
  bucketTraces: Readonly<Record<string, BucketTrace>>
  triggeredOutputs: readonly TriggeredOutputEvaluation[]
}
