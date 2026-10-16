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
  SourceReference,
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
  /**
   * 调用方显式声明的本次结算命中最终暴击概率（替换语义，不加数）：
   * 缺省时沿用读取命中角色当前暴击率（含命中作用域贡献）的既有路径。
   * 存在时必须是有限数且 0 ≤ r ≤ 1；仅支持 regular 直伤的单一伤害项
   * 结算，且该项实际缩放属性须读取当前命中角色的当前属性；与
   * `attributeSources.criticalRate` 或本命中实际生效的命中作用域
   * criticalRate 调整并存时按冲突拒绝。r=0/1 表示调用方声明的单次
   * 非/必暴结果，中间值是调用方声明的条件期望，不是引擎抽签；结果的
   * `critical`/`nonCritical` 始终是两个条件分支（critical 继续采用当前
   * 普通暴击伤害，是调用方选择的 regular 条件模型，不证明游戏附伤
   * 继承该暴击伤害或能暴击）。
   */
  readonly declaredCriticalRate?: number
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
    | {
        readonly kind: "sharpen"
        readonly sharpenDamageBonus: import("../formulas.ts").SharpenDamageBonusFactorInput
        readonly defense: StaticDefenseInput
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
  readonly mechanism?: never
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

/** 小猪自有值显式给出；当前值组合属于调用方选择的条件模型。 */
export interface LucyGuardBoarOwnStats {
  readonly attack: Quantity<"attack-points">
  readonly impact: Quantity<"impact-points">
  readonly anomalyProficiency: Quantity<"anomaly-proficiency-points">
  readonly criticalRate: Quantity<"ratio">
  readonly criticalDamage: Quantity<"ratio">
  readonly penetrationRatio: Quantity<"ratio">
}
export type LucyGuardBoarTeamCondition =
  | { readonly kind: "not-satisfied" }
  | {
      readonly kind: "teammate"
      readonly entityId: EntityId
      readonly reason: "same-element" | "same-faction" | "rupture"
    }

export interface LucyGuardBoarConditionalModel {
  readonly statComposition: "own-plus-owner-current-without-selected-lucy-cheer"
  readonly otherEffects: "lucy-options-only"
  readonly damageFactors: "explicit-boar-baseline"
  readonly criticalDamage: "resolved-boar"
}
export interface LucyGuardBoarM6Event {
  readonly eventId: EventId
  readonly sourceBindingId: BindingId
  readonly triggerActorId: EntityId
  readonly targetId: EntityId
  readonly skillCategory: "enhanced-special"
  readonly cheerOn: true
}
export interface LucyGuardBoarDamageInput {
  readonly mechanism: "lucy-guard-boar"
  readonly definitions: RuleSet
  readonly bindings: readonly SourceBinding[]
  readonly selections: readonly {
    readonly effectId: EffectId
    readonly bindingId: BindingId
    readonly layers: number
  }[]
  readonly world: WorldObservation
  readonly sourceBindingId: BindingId
  readonly atSeconds: number
  readonly boar: {
    readonly entityId: EntityId
    readonly ownerSource: {
      readonly entityId: EntityId
      readonly snapshotId?: never
    }
    readonly ownStats: LucyGuardBoarOwnStats
  }
  readonly teamCondition: LucyGuardBoarTeamCondition
  readonly conditionalModel: LucyGuardBoarConditionalModel
  readonly inputs?: readonly EffectNumericInput[]
  readonly snapshots?: readonly SavedSnapshot[]
  readonly settlement:
    | { readonly kind: "attributes" }
    | {
        readonly kind: "m6-explosion"
        readonly event: LucyGuardBoarM6Event
        readonly criticalRate: Quantity<"ratio">
        readonly damage: Extract<
          StaticDamageParameters,
          { readonly kind: "regular" }
        >
      }
  readonly hit?: never
  readonly damage?: never
  readonly damageItems?: never
  readonly attributeSources?: never
  readonly declaredCriticalRate?: never
}
export interface LucyGuardBoarCatalogInput extends Omit<
  LucyGuardBoarDamageInput,
  "selections"
> {
  readonly catalog: StaticEffectCatalog
  readonly actorSources: StaticCatalogDamageInput["actorSources"]
  readonly selections: readonly {
    readonly optionId: string
    readonly bindingId: BindingId
    readonly layers: number
  }[]
}
export interface LucyGuardBoarDirectContribution {
  readonly effectId: EffectId
  readonly bindingId: BindingId
  readonly sourceEntityId: EntityId
  readonly beneficiaryId: EntityId
  readonly stat: "attack" | "criticalDamage"
  readonly sourceValue: Quantity<"attack-points" | "ratio">
  readonly multiplier: number
  readonly value: Quantity<"attack-points" | "ratio">
  readonly references: NonEmpty<SourceReference>
}
export interface LucyGuardBoarResult {
  readonly mechanism: "lucy-guard-boar"
  readonly inheritanceStatus: "applied" | "inactive"
  readonly attributes: LucyGuardBoarOwnStats
  readonly provenance: {
    readonly holderId: EntityId
    readonly sourceBindingId: BindingId
    readonly boarId: EntityId
    readonly ownerSource: {
      readonly entityId: EntityId
      readonly stage: "current"
    }
    readonly teamCondition: LucyGuardBoarTeamCondition
    readonly teamConditionEvidence: "caller-asserted" | "catalog-verified"
    readonly conditionalModel: LucyGuardBoarConditionalModel
    readonly ownStats: LucyGuardBoarOwnStats
    readonly ownerReadings: EvaluationResult["attributes"]
    readonly selectedOwnerContributions: readonly ResolvedContribution[]
    readonly removedOwnerCheerContributions: readonly LucyGuardBoarDirectContribution[]
    readonly boarCheerContributions: readonly LucyGuardBoarDirectContribution[]
    readonly inheritanceContributions: readonly {
      readonly stat: Exclude<keyof LucyGuardBoarOwnStats, "penetrationRatio">
      readonly value: Quantity<
        | "attack-points"
        | "impact-points"
        | "anomaly-proficiency-points"
        | "ratio"
      >
      readonly effectId: EffectId
      readonly bindingId: BindingId
      readonly sourceEntityId: EntityId
      readonly beneficiaryId: EntityId
      readonly stage: "current"
      readonly references: NonEmpty<SourceReference>
    }[]
    readonly conversionInput: null | {
      readonly bindingId: BindingId
      readonly name: string
      readonly value: Quantity<"attack-points">
      readonly source: "derived-owner-initial" | "caller-provided"
      readonly ownerId: EntityId
      readonly stage: "initial"
    }
  }
  readonly settlement:
    | null
    | (StaticDamageResult & {
        readonly status: "applied" | "inactive"
        readonly event: LucyGuardBoarM6Event
        readonly effectId: EffectId
        readonly bindingId: BindingId
        readonly references: NonEmpty<SourceReference>
        readonly attackProvider: {
          readonly entityId: EntityId
          readonly stage: "current"
        }
        readonly beneficiaryId: EntityId
        readonly itemId: "lucy:m6-boar-rain"
        readonly skillTargetId: "nanoka:lucy-m6-boar-rain"
        readonly element: "fire"
        readonly skillCategory: "uncategorized"
        readonly skillTags: readonly []
      })
}

/** 来源文本只证明触发关系及 3×耀嘉音 ATK；其余读取属于显式条件模型。 */
export interface AstraYaoM4Event {
  readonly eventId: EventId
  readonly sourceBindingId: BindingId
  readonly triggerActorId: EntityId
  readonly targetId: EntityId
  readonly triggerSpecialty: "attack"
  readonly idyllicCadenza: true
  readonly enteredViaQuickAssist: true
  readonly nextQuickAssistHeavyHit: true
}

export interface AstraYaoM4ConditionalModel {
  readonly attackReading: "holder-current"
  readonly factorBeneficiary: "trigger-actor-current"
  readonly criticalRate: Quantity<"ratio">
  readonly criticalDamageSource: AttributeSource
  readonly penetrationRatioSource: AttributeSource
}

export interface AstraYaoM4DamageInput extends Omit<
  StaticDamageInput,
  "mechanism" | "hit" | "damage" | "atSeconds"
> {
  readonly mechanism: "astra-yao-m4-quick-assist-damage"
  readonly event: AstraYaoM4Event
  readonly conditionalModel: AstraYaoM4ConditionalModel
  readonly atSeconds: number
  readonly damage: Extract<StaticDamageParameters, { readonly kind: "regular" }>
  readonly hit: Omit<StaticHit, "attributeSources" | "declaredCriticalRate"> & {
    readonly attributeSources?: never
    readonly declaredCriticalRate?: never
    readonly skillCategory: "uncategorized"
  }
}

export interface AstraYaoM4CatalogInput extends Omit<
  StaticCatalogDamageInput,
  "mechanism" | "hit" | "damage" | "atSeconds"
> {
  readonly mechanism: "astra-yao-m4-quick-assist-damage"
  readonly event: AstraYaoM4Event
  readonly conditionalModel: AstraYaoM4ConditionalModel
  readonly atSeconds: number
  readonly damage: Extract<
    StaticCatalogDamageInput["damage"],
    { readonly kind: "regular" }
  >
  readonly hit: Omit<
    StaticCatalogDamageInput["hit"],
    "attributeSources" | "declaredCriticalRate"
  > & {
    readonly attributeSources?: never
    readonly declaredCriticalRate?: never
    readonly skillCategory: "uncategorized"
  }
}

export interface AstraYaoM4DamageResult extends StaticDamageResult {
  readonly mechanism: "astra-yao-m4-quick-assist-damage"
  readonly status: "applied" | "inactive"
  readonly provenance: {
    readonly event: AstraYaoM4Event
    readonly sourceBindingId: BindingId
    readonly effectId: EffectId
    readonly holderId: EntityId
    readonly triggerActorId: EntityId
    readonly hitActorId: EntityId
    readonly beneficiaryId: EntityId
    readonly attackProvider: {
      readonly entityId: EntityId
      readonly stage: "current"
    }
    readonly criticalDamageSource: AttributeSource
    readonly penetrationRatioSource: AttributeSource
    readonly targetId: EntityId
    readonly criticalRate: Quantity<"ratio">
    readonly specialtyEvidence: "caller-asserted" | "catalog-verified"
    readonly conditionalModel: AstraYaoM4ConditionalModel
  }
}

/** 调用方声明的原强击实际结果；snapshot 只见证历史身份与时点。 */
export interface OriginalPhysicalAnomalyFact {
  readonly eventId: EventId
  readonly snapshotId: SnapshotId
  readonly sourceActorId: EntityId
  readonly targetId: EntityId
  readonly kind: "assault"
  readonly element: "physical"
  readonly isAnomalyCritical: boolean
  readonly settledDamage: {
    readonly unit: "damage-points"
    readonly value: number
  }
}

export interface AliceCorePeriodicEvent {
  readonly eventId: EventId
  readonly actorId: EntityId
  readonly targetId: EntityId
  readonly sourceBindingId: BindingId
  readonly originalAnomalyEventId: EventId
  readonly originalAnomalySnapshotId: SnapshotId
  readonly originalAnomalyActive: true
}

/** 一个已声明发生的周期事件，不接受普通命中、乘区或面板读数。 */
export interface AliceCorePeriodicDamageInput {
  readonly hit?: never
  readonly damage?: never
  readonly damageItems?: never
  readonly inputs?: never
  readonly declaredCriticalRate?: never
  readonly attributeSources?: never
  readonly mechanism: "alice-core-periodic-damage"
  readonly definitions: RuleSet
  readonly bindings: readonly SourceBinding[]
  readonly selections: readonly {
    readonly effectId: EffectId
    readonly bindingId: BindingId
    readonly layers: 0 | 1
  }[]
  readonly world: WorldObservation
  readonly snapshots: readonly SavedSnapshot[]
  readonly atSeconds: number
  readonly event: AliceCorePeriodicEvent
  readonly originalAnomalies: readonly OriginalPhysicalAnomalyFact[]
}

export interface AliceCorePeriodicCatalogInput extends Omit<
  AliceCorePeriodicDamageInput,
  "selections"
> {
  readonly catalog: StaticEffectCatalog
  readonly actorSources: StaticCatalogDamageInput["actorSources"]
  readonly selections: readonly {
    readonly optionId: string
    readonly bindingId: BindingId
    readonly layers: 0 | 1
  }[]
}

export interface AliceCorePeriodicDamageResult {
  readonly mechanism: "alice-core-periodic-damage"
  readonly status: "applied" | "inactive"
  /** 本事件无再次暴击分支；原值本身可以已发生异常暴击。 */
  readonly nonCritical: number
  readonly critical: null
  readonly criticalRate: 0
  readonly criticalSemantics: "no-critical-settlement"
  readonly expected: number
  readonly factors: {
    readonly originalSettledDamage: number
    readonly effectivePeriodicRatio: number
  }
  readonly provenance: {
    readonly event: AliceCorePeriodicEvent
    readonly holderId: EntityId
    readonly bindingId: BindingId
    readonly effectId: EffectId
    readonly originalAnomaly: OriginalPhysicalAnomalyFact
    readonly effectivePeriodicRatio: number
  }
  readonly contributions: readonly {
    readonly effectId: EffectId
    readonly bindingId: BindingId
    readonly holderId: EntityId
    readonly eventId: EventId
    readonly originalAnomalyEventId: EventId
    readonly ratio: { readonly unit: "ratio"; readonly value: number }
  }[]
}

/**
 * 具名暴击分支语义：`critical` 字段在锐化下表示"第一层锐暴强制触发、
 * 溢出层仍按期望"，与普通伤害的"整次命中按暴击结算"不同，不能混用解读。
 */
export type StaticDamageCriticalSemantics =
  | "critical-hit"
  | "sharp-critical-forced-first-layer"
  | "no-critical-settlement"

export interface StaticDamageResult {
  readonly evaluation: EvaluationResult
  readonly nonCritical: number
  /** 当前 core 的 luminize 公式没有暴击分支。 */
  readonly critical: number | null
  /** 命名 critical 分支的结算语义；critical 为 null 时为 "no-critical-settlement"。 */
  readonly criticalSemantics: StaticDamageCriticalSemantics
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
      readonly address: {
        readonly kind: "hit"
        readonly hitId: HitId
        readonly field: "stunDamageMultiplier"
      }
      readonly operator: "replace"
      readonly value: Quantity<"multiplier">
    }
  | {
      readonly address: {
        readonly kind: "hit"
        readonly hitId: HitId
        readonly field: "criticalRate"
        readonly itemId: string
      }
      readonly operator: "guarantee"
      readonly value: { readonly unit: "ratio"; readonly value: 1 }
    }
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
  calculateStaticDamage(
    input: LucyGuardBoarDamageInput,
  ): Result<LucyGuardBoarResult>
  calculateStaticDamageFromCatalog(
    input: LucyGuardBoarCatalogInput,
  ): Result<LucyGuardBoarResult>

  calculateStaticDamage(
    input: AstraYaoM4DamageInput,
  ): Result<AstraYaoM4DamageResult>
  calculateStaticDamageFromCatalog(
    input: AstraYaoM4CatalogInput,
  ): Result<AstraYaoM4DamageResult>
  calculateStaticDamage(
    input: AliceCorePeriodicDamageInput,
  ): Result<AliceCorePeriodicDamageResult>
  calculateStaticDamage(input: StaticDamageInput): Result<StaticDamageResult>
  calculateStaticDamageFromCatalog(
    input: AliceCorePeriodicCatalogInput,
  ): Result<AliceCorePeriodicDamageResult>
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
  | {
      readonly mode: "direct"
      readonly damageMultiplier: number
      /**
       * 来源归属元数据；不据此重算已传入的直接倍率，也不引入时间派生。
       * 合法枚举与标准紊乱共用同一七值来源（DISORDER_SOURCE_ATTRIBUTES：
       * fire/electric/ether/ice/physical/auric-ink/frost），显式提供非法值、
       * null 或 undefined 均拒绝；省略表示不声明归属。存在真实归属
       * requirement（目录 damageItemRequirements）时按原规则校验。
       */
      readonly originalAnomalyAttribute?: import("../formulas.ts").CalculateStandardDisorderDamageMultiplierParams["originalAnomalyAttribute"]
    }
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

/**
 * 蕾米埃尔自身特殊虚曜的具名异常来源。entityId 必须映射到 1581 且等于本次
 * 耀变 actor；level 为角色等级（有限整数 1—60，不做 round/clamp）；strength
 * 的影画门槛按目录机制元数据校验。此分支不接受快照覆盖。
 */
export interface RemielleSpecialVoidflareAnomalySource {
  readonly mechanism: "remielle-special-voidflare"
  readonly entityId: EntityId
  readonly level: number
  readonly strength: "full" | "mindscape-6-quarter"
}

/**
 * 目录普通异常来源：`mechanism` 与 `strength` 是具名机制来源的专有字段，普通
 * 来源显式排除（`?: never`），使具名对象无法经结构化赋值退入普通分支；运行时
 * 对普通来源同样按 `rejectUnknownFields` 拒绝未知字段。
 */
export type StaticCatalogPlainAnomalySource = AttributeSource & {
  readonly level: number
  readonly mechanism?: never
  readonly strength?: never
}

/**
 * 目录 luminize 分支的公开 defense 形状：普通异常来源沿用含 `attackerLevel` 的
 * 完整输入；特殊虚曜机制分支不接收 `attackerLevel`（`Omit` 之外再显式排除该
 * 字段——同值也拒绝），等级唯一来自具名来源并由内部组装。
 */
export type StaticCatalogDefenseInput = Omit<
  StaticDefenseInput,
  "attackerLevel"
> & {
  readonly attackerLevel?: never
}

/** luminize 分支的异常来源与防御形状：普通来源与具名特殊虚曜机制互斥。 */
export type StaticCatalogLuminizeDamageBranch =
  | {
      /** 异常精通、穿透率及等级的来源；有快照时两个属性均须保存 current 值。 */
      readonly anomalySource: StaticCatalogPlainAnomalySource
      readonly defense: StaticDefenseInput
    }
  | {
      readonly anomalySource: RemielleSpecialVoidflareAnomalySource
      readonly defense: StaticCatalogDefenseInput
    }

export type StaticCatalogDamageParameters =
  StaticDamageParameters extends infer D
    ? D extends StaticDamageParameters
      ? D extends { readonly refringe: unknown }
        ? Omit<
            D,
            "refringe" | "luminizeMultiplier" | "anomalySource" | "defense"
          > &
            (D extends { readonly kind: "luminize" }
              ? {
                  readonly luminizeMultiplier: Pick<
                    import("../formulas.ts").LuminizeMultiplierFactorInput,
                    | "baseLuminizeMultiplier"
                    | "multiplicativeLuminizeMultiplierAdjustments"
                  >
                } & StaticCatalogLuminizeDamageBranch
              : {
                  /** 异常精通、穿透率及等级的来源；有快照时两个属性均须保存 current 值。 */
                  readonly anomalySource: StaticCatalogPlainAnomalySource
                  readonly defense: StaticDefenseInput
                }) & {
              readonly refringe:
                | { readonly mode: "from-effects" }
                | { readonly mode: "settled"; readonly multiplier: number }
            }
        : D
      : never
    : never

export interface StaticCatalogDamageInput {
  readonly mechanism?: never
  readonly definitions: RuleSet
  readonly catalog: StaticEffectCatalog
  readonly bindings: readonly SourceBinding[]
  readonly selections: readonly {
    readonly optionId: string
    readonly bindingId: BindingId
    /** 真实激活上下文，原样透传；不根据本次命中伪造入场事实。 */
    readonly trigger?: TriggerContext
    /** 0 明确关闭该选项；仍校验选项、来源、档位和层数身份。 */
    readonly layers: number
    /**
     * 声明式同队受益者：仅当所选变体声明 declaredTeammateBeneficiary 且
     * layers > 0 时必须提供；必须是持有者同队的另一名有身份实体。表达
     * 调用方声明的前后场事实（如持有者后场时的当前前场角色），不由命中
     * 身份或位置引擎推断。未声明的变体不接受该字段。
     */
    readonly beneficiaryActorId?: EntityId
    /** 有效元素增益集合；仅声明 elementBuffInputs 的选项接受，0 层无需提供。 */
    readonly activeBuffElements?: readonly DamageElement[]
  }[]
  readonly actorSources: readonly {
    readonly entityId: EntityId
    readonly agentEntityId: string
    /** 该运行实体的当前角色等级；提供时必须是有限整数 1—60，无默认值。 */
    readonly level?: number
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
