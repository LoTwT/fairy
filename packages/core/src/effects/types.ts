import type {
  NonEmpty,
  EntityId,
  TeamId,
  BindingId,
  InstanceId,
  LayerId,
  SnapshotId,
  EventId,
  ActionInstanceId,
  HitId,
  RequestId,
  SessionId,
  StateId,
  StateActivationId,
  ActionId,
  EffectId,
  SourceBinding,
  StatUnitMap,
  Stat,
  DirectStat,
  GeneralStat,
  Unit,
  Quantity,
  SkillCategory,
  DamageElement,
  DamageKind,
  EntryAction,
  FactorChannelUnitMap,
  FactorChannel,
  RuleSet,
  StaticEffectCatalog,
} from "@randomplay/shared"
export type * from "@randomplay/shared"

export interface ComponentStatInput {
  readonly baseValue: number
  readonly settledInitialValue?: never
  readonly initialPercentage: readonly number[]
  readonly initialFixed: readonly number[]
  readonly finalPercentage: readonly number[]
  readonly finalFixed: readonly number[]
}

/** 已结算局外属性；基础值只在效果实际读取该阶段时需要。 */
export interface SettledInitialStatInput {
  readonly settledInitialValue: number
  readonly baseValue?: number
  readonly initialPercentage?: never
  readonly initialFixed?: never
  readonly finalPercentage: readonly number[]
  readonly finalFixed: readonly number[]
}

export type GeneralStatInput = ComponentStatInput | SettledInitialStatInput

export interface DirectStatInput {
  readonly baseValue: number
  readonly additions: readonly number[]
}

export type EntityObservation =
  | {
      readonly kind: "actor"
      /** 此模式下 sheerForce 记录独立贡献，另加 0.1 health + 0.3 attack。 */
      readonly deriveSheerForce?: boolean
      readonly entityId: EntityId
      readonly teamId: TeamId
      readonly generalStats: Readonly<
        Partial<Record<GeneralStat, GeneralStatInput>>
      >
      readonly directStats: Readonly<
        Partial<Record<DirectStat, DirectStatInput>>
      >
    }
  | {
      readonly kind: "summon"
      readonly entityId: EntityId
      readonly teamId: TeamId
      readonly ownerId: EntityId
      readonly summonKind: string
      readonly deployed: boolean
    }

export type StateObservation = {
  readonly stateId: StateId
  readonly bindingId: BindingId
  readonly ownerId: EntityId
} & (
  | {
      readonly active: true
      readonly activationId: StateActivationId
      readonly since: number
    }
  | {
      readonly active: false
      readonly activationId: null
      readonly since: null
    }
)

export interface WorldObservation {
  readonly entities: readonly EntityObservation[]
  readonly states: readonly StateObservation[]
  /** 距离由调用方提供，世界观察中出现的实体对缺失距离不等于范围外。 */
  readonly distances: readonly {
    readonly first: EntityId
    readonly second: EntityId
    readonly meters: number
  }[]
}

export type AttributeObservation = {
  [S in Stat]: {
    readonly entityId: EntityId
    readonly stat: S
    readonly stage: S extends DirectStat
      ? "current"
      : "base" | "initial" | "current"
    readonly value: Quantity<StatUnitMap[S]>
  }
}[Stat]

export interface SavedSnapshot {
  readonly snapshotId: SnapshotId
  readonly atSeconds: number
  readonly attributes: readonly AttributeObservation[]
  readonly world: WorldObservation
}

export interface TriggerContext {
  readonly eventId: EventId
  readonly actorId: EntityId
  readonly entryActorId?: EntityId
  readonly supportActorId?: EntityId
  readonly skillCategory?: SkillCategory
  readonly activationSnapshotId: SnapshotId
}

export interface EffectLayer {
  readonly layerId: LayerId
  readonly startedAt: number
  readonly expiresAt: number | null
  readonly trigger: TriggerContext | null
}

export interface EffectInstance {
  readonly instanceId: InstanceId
  readonly effectId: EffectId
  readonly bindingId: BindingId
  readonly beneficiaryIds: NonEmpty<EntityId>
  readonly stackKey: readonly string[]
  readonly layers: NonEmpty<EffectLayer>
  readonly lifetime:
    | { readonly kind: "supplied" }
    | { readonly kind: "timed"; readonly firstActivatedAt: number }
    | {
        readonly kind: "state-bound"
        readonly stateId: StateId
        readonly stateOwnerId: EntityId
        readonly stateActivationId: StateActivationId
      }
}

export type SuppliedEffectInstance = Omit<EffectInstance, "lifetime"> & {
  readonly lifetime: { readonly kind: "supplied" }
}

/** 战斗事件与外部实例同步共用的会话顺序游标。 */
export interface StateChangeCursor {
  readonly eventId: EventId
  readonly atSeconds: number
  readonly sequence: number
}

export interface StateInput {
  readonly sessionId: SessionId
  readonly atSeconds: number
  readonly instances: readonly EffectInstance[]
  readonly snapshots: readonly SavedSnapshot[]
  readonly cooldowns: readonly {
    readonly groupId: string
    readonly partitionKey: string
    readonly availableAt: number
  }[]
  readonly eventHistory: {
    readonly processedIds: readonly EventId[]
    readonly last: StateChangeCursor | null
  }
}

/** 每项完整替换指定来源绑定的一条 supplied 规则；空实例列表表示清除该项。 */
export interface SuppliedInstancesUpdate extends StateChangeCursor {
  readonly replacements: NonEmpty<{
    readonly effectId: EffectId
    readonly bindingId: BindingId
    readonly instances: readonly SuppliedEffectInstance[]
  }>
  readonly world: WorldObservation
  readonly observedSnapshots: readonly SavedSnapshot[]
}

/** 指定读取的角色；提供 snapshotId 时仅消费该快照中已保存的属性。 */
export interface AttributeSource {
  readonly entityId: EntityId
  readonly snapshotId?: SnapshotId
}

export interface HitContext {
  readonly hitId: HitId
  readonly actionInstanceId: ActionInstanceId
  readonly actionId: ActionId
  readonly actorId: EntityId
  readonly targetId: EntityId
  readonly skillCategory: SkillCategory
  /** 旧调用方可省略；规则读取缺失事实时返回 MISSING_FACT。 */
  readonly element?: DamageElement
  readonly damageKind?: DamageKind
  readonly skillTags?: readonly string[]
  readonly targetState?: "stunned" | "not-stunned"
  readonly actionSnapshotId: SnapshotId
  readonly origin:
    | { readonly kind: "direct" }
    | {
        readonly kind: "effect-request"
        readonly requestId: RequestId
        readonly effectId: EffectId
        readonly bindingId: BindingId
      }
  readonly attributeSources?: Readonly<Partial<Record<Stat, AttributeSource>>>
  readonly damageItems: NonEmpty<{
    readonly statSource?: AttributeSource
    readonly itemId: string
    readonly damageMultiplier: number
    readonly stat: GeneralStat
  }>
}

interface EventBase extends StateChangeCursor {
  readonly actorId: EntityId
}

export type Event = EventBase &
  (
    | {
        readonly kind: "hit-resolved"
        readonly hit: HitContext
        readonly isCriticalHit: boolean
      }
    | { readonly kind: "entry"; readonly entryAction: EntryAction }
    | {
        readonly kind: "entry-followup"
        readonly entryAction: EntryAction
        readonly entryEventId: EventId
        readonly supportActorId: EntityId
        readonly energySpent: number
        readonly followupActionId: ActionId
      }
    | { readonly kind: "energy-spent"; readonly energySpent: number }
    | { readonly kind: "precision-support" }
    | {
        readonly kind: "summon-attack-ordered"
        readonly summonIds: NonEmpty<EntityId>
      }
    | {
        readonly kind: "state-observed"
        readonly observation: StateObservation
      }
  )

export interface TransitionInput {
  readonly event: Event
  readonly before: WorldObservation
  readonly after: WorldObservation
  readonly observedSnapshots: readonly SavedSnapshot[]
}

export type EvaluationInput = {
  readonly atSeconds: number
  readonly world: WorldObservation
  readonly observedSnapshots: readonly SavedSnapshot[]
  readonly inputs?: readonly EffectNumericInput[]
} & (
  | {
      readonly kind: "panel"
      readonly entities: NonEmpty<EntityId>
      readonly stats: NonEmpty<Stat>
    }
  | {
      readonly kind: "hit"
      readonly hit: HitContext
      readonly stats?: NonEmpty<Stat>
    }
  | {
      readonly kind: "contributions"
      readonly beneficiaries: NonEmpty<EntityId>
    }
)

/** 手工或施加时读取值；按来源绑定隔离，不使用规则中的默认预设。 */
export interface EffectNumericInput {
  readonly bindingId: BindingId
  readonly name: string
  readonly value: Quantity<Unit>
}

export interface StaticEffectSelection {
  readonly effectId: EffectId
  readonly bindingId: BindingId
  readonly layers: number
  /** 仅在规则确实读取触发角色或施加快照时提供。 */
  readonly trigger?: TriggerContext
}

export type StaticHit = Pick<
  HitContext,
  | "actorId"
  | "targetId"
  | "actionId"
  | "skillCategory"
  | "skillTags"
  | "attributeSources"
  | "damageItems"
> & {
  readonly element: DamageElement
  readonly actionSnapshotId?: SnapshotId
}

export type StaticDefenseInput = Omit<
  import("../formulas.ts").CalculateTargetEffectiveDefenseParams,
  "penetrationRatios"
> & {
  readonly attackerLevel: number
}

interface StaticDamageCommon {
  /** 均为尚未包含本次 effects 贡献的基线。 */
  readonly resistance: import("../formulas.ts").ResistanceFactorInput
  readonly damageTaken: import("../formulas.ts").DamageTakenFactorInput
  readonly stunDamage: import("../formulas.ts").StunDamageFactorInput
}

interface StaticAnomalyCommon {
  /** 已结算快照或特殊固定乘区可直接提供；此时不再叠加当前 damage-bonus。 */
  readonly damageBonus:
    | import("../formulas.ts").DamageBonusFactorInput
    | { readonly settledMultiplier: number }
  readonly defense: StaticDefenseInput
  readonly anomalyDamageBonus: import("../formulas.ts").AnomalyDamageBonusFactorInput
  readonly refringe:
    | import("../formulas.ts").CalculateRefringeMultiplierParams
    | { readonly settledMultiplier: number }
}

export type StaticDamageParameters = StaticDamageCommon &
  (
    | {
        readonly kind: "regular"
        readonly defense: StaticDefenseInput
        readonly damageBonus: import("../formulas.ts").DamageBonusFactorInput
      }
    | {
        readonly kind: "sheer"
        readonly sheerDamageBonus: import("../formulas.ts").SheerDamageBonusFactorInput
        readonly damageBonus: import("../formulas.ts").DamageBonusFactorInput
      }
    | (StaticAnomalyCommon & {
        readonly kind: "anomaly" | "disorder" | "vortex" | "anomaly-settlement"
        readonly anomalyCriticalRate: number
        readonly anomalyCriticalDamage: readonly number[]
      })
    | (StaticAnomalyCommon & {
        readonly kind: "luminize"
        readonly luminizeMultiplier: import("../formulas.ts").LuminizeMultiplierFactorInput
      })
  )

export interface StaticDamageInput {
  readonly definitions: RuleSet
  readonly bindings: readonly SourceBinding[]
  /** 未选择的 supplied 效果关闭；continuous 规则仍由配置条件控制。 */
  readonly selections: readonly StaticEffectSelection[]
  readonly world: WorldObservation
  readonly hit: StaticHit
  readonly damage: StaticDamageParameters
  readonly inputs?: readonly EffectNumericInput[]
  readonly snapshots?: readonly SavedSnapshot[]
  readonly atSeconds?: number
}

export interface StaticDamageResult {
  readonly evaluation: EvaluationResult
  readonly nonCritical: number
  /** 当前 core 的 luminize 公式没有暴击分支。 */
  readonly critical: number | null
  readonly criticalRate: number
  readonly expected: number
  readonly factors: {
    readonly nonCritical: Readonly<Record<string, number>>
    readonly critical: Readonly<Record<string, number>> | null
  }
  /** 已求值但不属于本次伤害公式的通道，例如能量生成或失衡累积。 */
  readonly notApplicableContributions: readonly ResolvedContribution[]
  readonly preparations?: readonly {
    readonly itemId: string
    readonly durationAdjustment: number
    readonly contributions: readonly ResolvedContribution[]
  }[]
}

export interface ContributionOrigin {
  readonly effectId: EffectId
  readonly bindingId: BindingId
  readonly instanceId: InstanceId | null
  readonly layerId: LayerId | null
  readonly beneficiaryId: EntityId
}

type ResolvedStatOutput = {
  [S in Stat]: S extends GeneralStat
    ?
        | {
            readonly address: {
              readonly kind: "stat"
              readonly stat: S
              readonly stage: "initial-percentage" | "final-percentage"
              readonly entityId: EntityId
              readonly hitId: HitId | null
            }
            readonly operator: "add"
            readonly value: Quantity<"ratio">
          }
        | {
            readonly address: {
              readonly kind: "stat"
              readonly stat: S
              readonly stage: "initial-fixed" | "final-fixed"
              readonly entityId: EntityId
              readonly hitId: HitId | null
            }
            readonly operator: "add"
            readonly value: Quantity<StatUnitMap[S]>
          }
    : {
        readonly address: {
          readonly kind: "stat"
          readonly stat: S
          readonly stage: "direct"
          readonly entityId: EntityId
          readonly hitId: HitId | null
        }
        readonly operator: "add"
        readonly value: Quantity<"ratio">
      }
}[Stat]

/** address 是本次消费位置；命中计算中的通用贡献也使用该命中的 hitId。 */
export type ResolvedOutput =
  | ResolvedStatOutput
  | {
      [C in FactorChannel]: {
        readonly address: {
          readonly kind: "factor"
          readonly channel: C
          readonly entityId: EntityId
          readonly hitId: HitId | null
        }
        readonly operator: C extends "luminize-multiplier-scale"
          ? "scale"
          : "add"
        readonly value: Quantity<FactorChannelUnitMap[C]>
      }
    }[FactorChannel]
  | {
      readonly address: {
        readonly kind: "hit"
        readonly hitId: HitId
        readonly field: "damageMultiplier"
        readonly itemId?: string
      }
      readonly operator: "add" | "scale"
      readonly value: Quantity<"multiplier">
    }

export type OutputAddress = ResolvedOutput["address"]
export type ResolvedContribution = ResolvedOutput & {
  readonly origin: ContributionOrigin
  readonly appliedModifications: readonly EffectId[]
}

export type EventRequest = {
  readonly requestId: RequestId
  readonly eventId: EventId
  readonly effectId: EffectId
  readonly bindingId: BindingId
  readonly beneficiaryId: EntityId
} & (
  | {
      readonly kind: "resource-generation"
      readonly resource: "energy"
      readonly baseAmount: Quantity<"energy-points">
    }
  | {
      readonly kind: "action-request"
      readonly actionId: ActionId
      readonly count: number
      readonly triggerSnapshotId: SnapshotId
    }
)

export interface EvaluationResult {
  /** 仅含本次输出消费的获选贡献，不混入内部依赖节点的贡献。 */
  readonly contributions: readonly ResolvedContribution[]
  readonly attributes: readonly (AttributeObservation & {
    /** null 是通用面板；命中局部属性不得写回通用面板。 */
    readonly hitId: HitId | null
    readonly snapshotId?: SnapshotId
  })[]
  readonly hit: null | {
    readonly hitId: HitId
    readonly criticalRate: number
    readonly damageItems: readonly {
      readonly itemId: string
      readonly damageMultiplier: number
      readonly finalStat: number
    }[]
  }
}

export type IssueCode =
  | "INVALID_DEFINITION"
  | "INVALID_INPUT"
  | "DUPLICATE_ID"
  | "MISSING_REFERENCE"
  | "MISSING_RANK"
  | "UNIT_MISMATCH"
  | "INVALID_PHASE"
  | "INVALID_MODIFICATION"
  | "MODIFICATION_CONFLICT"
  | "MISSING_FACT"
  | "MISSING_SNAPSHOT"
  | "DEPENDENCY_CYCLE"
  | "UNIQUENESS_CONFLICT"
  | "EVENT_ORDER"
  | "CONTEXT_MISMATCH"

export interface Issue {
  readonly code: IssueCode
  readonly pointer: string
  readonly effectId?: EffectId
  readonly bindingId?: BindingId
  readonly message: string
  readonly dependencyPath?: readonly string[]
}

export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issues: NonEmpty<Issue> }

declare const preparedBrand: unique symbol
declare const stateBrand: unique symbol

export interface PreparedEffects {
  readonly [preparedBrand]: true
  readonly ruleSetId: string
  readonly revision: string
  /** 交给状态更新方的配置级参数，不能凭此声称世界状态已经改变。 */
  readonly stateParameters: readonly {
    readonly stateId: StateId
    readonly bindingId: BindingId
    readonly parameters: Readonly<Record<string, Quantity<Unit>>>
  }[]
}

export interface EffectState {
  readonly [stateBrand]: true
  readonly atSeconds: number
  readonly sessionId: SessionId
}

export interface TransitionResult {
  readonly state: EffectState
  readonly requests: readonly EventRequest[]
}

/** 公开纯函数接口；全部实现由包入口导出。 */
export interface EffectEngine {
  calculateStaticDamage(input: StaticDamageInput): Result<StaticDamageResult>
  calculateStaticDamageFromCatalog(
    input: StaticCatalogDamageInput,
  ): Result<StaticDamageResult>
  prepareEffects(
    definitions: RuleSet,
    bindings: readonly SourceBinding[],
  ): Result<PreparedEffects>
  supplyEffectState(
    prepared: PreparedEffects,
    input: StateInput,
  ): Result<EffectState>
  synchronizeSuppliedInstances(
    prepared: PreparedEffects,
    previous: EffectState,
    input: SuppliedInstancesUpdate,
  ): Result<EffectState>
  advanceEffects(
    prepared: PreparedEffects,
    previous: EffectState,
    input: TransitionInput,
  ): Result<TransitionResult>
  evaluateEffects(
    prepared: PreparedEffects,
    state: EffectState,
    input: EvaluationInput,
  ): Result<EvaluationResult>
}

export type StaticCatalogDamageItem = {
  readonly itemId: string
  readonly stat: GeneralStat
  readonly statSource: AttributeSource
  readonly role: "base" | "settlement"
} & (
  | { readonly mode: "direct"; readonly damageMultiplier: number }
  | {
      readonly mode: "standard-disorder"
      readonly originalAnomalyAttribute: import("../formulas.ts").CalculateStandardDisorderDamageMultiplierParams["originalAnomalyAttribute"]
      readonly baseDurationSeconds: number
      readonly elapsedSeconds: number
    }
  | {
      readonly mode: "standard-vortex"
      readonly profile: import("../formulas.ts").CalculateStandardVortexDamageMultiplierParams["vortexDamageMultiplierProfile"]
      readonly baseDurationSeconds: number
    }
)

export type StaticCatalogDamageParameters =
  StaticDamageParameters extends infer D
    ? D extends StaticDamageParameters
      ? D extends { readonly refringe: unknown }
        ? Omit<D, "refringe" | "luminizeMultiplier"> &
            (D extends { readonly kind: "luminize" }
              ? {
                  readonly luminizeMultiplier: Pick<
                    import("../formulas.ts").LuminizeMultiplierFactorInput,
                    | "baseLuminizeMultiplier"
                    | "multiplicativeLuminizeMultiplierAdjustments"
                  >
                }
              : object) & {
              readonly refringe:
                | { readonly mode: "from-effects" }
                | { readonly mode: "settled"; readonly multiplier: number }
              /** 异常精通、穿透率及等级的来源；有快照时两个属性均须保存 current 值。 */
              readonly anomalySource: AttributeSource & {
                readonly level: number
              }
            }
        : D
      : never
    : never

export interface StaticCatalogDamageInput {
  readonly definitions: RuleSet
  readonly catalog: StaticEffectCatalog
  readonly bindings: readonly SourceBinding[]
  readonly selections: readonly {
    readonly optionId: string
    readonly bindingId: BindingId
    /** 0 明确关闭该选项；仍校验选项、来源、档位和层数身份。 */
    readonly layers: number
  }[]
  readonly actorSources: readonly {
    readonly entityId: EntityId
    readonly agentEntityId: string
  }[]
  readonly world: WorldObservation
  readonly hit: Omit<StaticHit, "damageItems" | "attributeSources"> & {
    readonly damageItems: NonEmpty<StaticCatalogDamageItem>
    readonly skillTargetIds?: readonly string[]
  }
  readonly damage: StaticCatalogDamageParameters
  readonly inputs?: readonly EffectNumericInput[]
  readonly snapshots?: readonly SavedSnapshot[]
  readonly atSeconds?: number
}
