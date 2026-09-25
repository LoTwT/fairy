/**
 * 统一效果模型的正式类型；由私有 shared 维护并内联至公开包。
 * 规范文档（docs/specs/effects/）与示例引用本文件，不在别处复制维护。
 * 字段语义、跨字段约束与执行行为以 index.md、execution.md 为准。
 */

export type NonEmpty<T> = readonly [T, ...T[]]
export type EntityId = `entity:${string}`
export type TeamId = `team:${string}`
export type BindingId = `binding:${string}`
export type InstanceId = `instance:${string}`
export type LayerId = `layer:${string}`
export type SnapshotId = `snapshot:${string}`
export type EventId = `event:${string}`
export type ActionInstanceId = `action-instance:${string}`
export type HitId = `hit:${string}`
export type RequestId = `request:${string}`
export type SessionId = `session:${string}`
export type StateId = `state:${string}`
export type StateActivationId = `state-activation:${string}`
export type ActionId = `action:${string}`
export type EffectId =
  | `agent:${string}`
  | `disc:${string}`
  | `w-engine:${string}`
  | `bangboo:${string}`
  | `monster:${string}`
  | `environment:${string}`

export type MindscapeRank = 0 | 1 | 2 | 3 | 4 | 5 | 6
export type CoreSkillLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7
export type RefinementRank = 1 | 2 | 3 | 4 | 5
export type SetPieceCount = 0 | 1 | 2 | 3 | 4 | 5 | 6
export type SourceKind =
  | "agent"
  | "drive-disc"
  | "w-engine"
  | "bangboo"
  | "monster"
  | "environment"

export interface SourceIdentity {
  readonly kind: SourceKind
  readonly entityId: string
}

export interface SourceReference {
  readonly sourceId: string
  readonly version: string
  readonly locale: "zh" | "en"
  readonly resourcePath: string
  readonly pointer: "" | `/${string}`
}

export interface RuleSource {
  readonly identity: SourceIdentity
  readonly section: string
  readonly references: NonEmpty<SourceReference>
}

interface BindingBase {
  readonly bindingId: BindingId
  readonly holderId: EntityId
  readonly sourceEntityId: string
  /** 来源适配方已确认装备/来源适用性；false 时不启用此绑定。 */
  readonly eligible: boolean
}

export type SourceBinding = BindingBase &
  (
    | {
        readonly kind: "agent"
        readonly configuration: {
          readonly mindscapeRank: MindscapeRank
          readonly coreSkillLevel: CoreSkillLevel
        }
      }
    | {
        readonly kind: "w-engine"
        readonly configuration: { readonly refinement: RefinementRank }
      }
    | {
        readonly kind: "drive-disc"
        readonly configuration: { readonly setPieces: SetPieceCount }
      }
    | {
        readonly kind: "bangboo" | "monster" | "environment"
        readonly configuration: Readonly<Record<string, never>>
      }
  )

export const STAT_UNIT_MAP = Object.freeze({
  attack: "attack-points",
  health: "health-points",
  defense: "defense-points",
  impact: "impact-points",
  sheerForce: "sheer-force-points",
  anomalyProficiency: "anomaly-proficiency-points",
  anomalyMastery: "anomaly-mastery-points",
  energyRegen: "energy-per-second",
  adrenalineRegen: "adrenaline-per-second",
  criticalRate: "ratio",
  criticalDamage: "ratio",
  penetrationRatio: "ratio",
} as const)
export type StatUnitMap = typeof STAT_UNIT_MAP

export type Stat = keyof StatUnitMap
export type DirectStat = "criticalRate" | "criticalDamage" | "penetrationRatio"
export type GeneralStat = Exclude<Stat, DirectStat>
export type Unit =
  | StatUnitMap[Stat]
  | "multiplier"
  | "energy-points"
  | "seconds"
  | "meters"
  | "count"

export interface Quantity<U extends Unit> {
  readonly unit: U
  readonly value: number
}

export type Parameter<U extends Unit> =
  | ({ readonly kind: "constant" } & Quantity<U>)
  | {
      readonly kind: "by-rank"
      readonly unit: U
      readonly rank: "coreSkillLevel"
      readonly values: Readonly<Partial<Record<CoreSkillLevel, number>>>
    }
  | {
      readonly kind: "by-rank"
      readonly unit: U
      readonly rank: "mindscapeRank"
      readonly values: Readonly<Partial<Record<MindscapeRank, number>>>
    }
  | {
      readonly kind: "by-rank"
      readonly unit: U
      readonly rank: "refinement"
      readonly values: Readonly<Partial<Record<RefinementRank, number>>>
    }

export type AnyParameter = { [U in Unit]: Parameter<U> }[Unit]
export type Phase = "configuration" | "trigger" | "contribution"
export type ReadMoment<P extends Phase> = P extends "configuration"
  ? never
  : P extends "trigger"
    ? "before-event"
    : "activation" | "evaluation" | "action-start"

export type EntityReference<P extends Phase> =
  | { readonly role: "holder" }
  | { readonly role: "entity"; readonly entityId: EntityId }
  | (P extends "configuration"
      ? never
      : {
          readonly role: "triggerActor" | "entryActor" | "supportActor"
        })
  | (P extends "contribution"
      ? { readonly role: "beneficiary" | "hitActor" | "hitTarget" }
      : never)

type StatRead<U extends Unit, P extends Phase> = P extends "configuration"
  ? never
  : {
      [S in Stat]: StatUnitMap[S] extends U
        ? {
            readonly kind: "stat"
            readonly unit: StatUnitMap[S]
            readonly entity: EntityReference<P>
            readonly stat: S
            readonly stage: S extends DirectStat
              ? "current"
              : "base" | "initial" | "current"
            readonly at: ReadMoment<P>
          }
        : never
    }[Stat]

type NumericFact<U extends Unit, P extends Phase> =
  | (U extends "count"
      ? {
          readonly kind: "configuration-number"
          readonly unit: "count"
          readonly field:
            | "mindscapeRank"
            | "coreSkillLevel"
            | "refinement"
            | "setPieces"
        }
      : never)
  | (P extends "trigger"
      ? U extends "energy-points"
        ? {
            readonly kind: "event-number"
            readonly unit: "energy-points"
            readonly field: "energySpent"
          }
        : never
      : never)

export type NumericExpression<U extends Unit, P extends Phase> =
  | ({ readonly kind: "literal" } & Quantity<U>)
  | {
      readonly kind: "parameter"
      readonly unit: U
      readonly name: string
    }
  | StatRead<U, P>
  | NumericFact<U, P>
  | (P extends "contribution"
      ? { readonly kind: "input"; readonly unit: U; readonly name: string }
      : never)
  | {
      /** rate 表示每一 input 单位对应多少输出单位；不会隐式换算百分数。 */
      readonly kind: "convert"
      readonly unit: U
      readonly input: NumericExpression<Unit, P>
      readonly rate: NumericExpression<"multiplier", P>
    }
  | {
      readonly kind: "add" | "minimum" | "maximum"
      readonly unit: U
      readonly operands: NonEmpty<NumericExpression<U, P>>
    }
  | {
      readonly kind: "multiply"
      readonly unit: U
      readonly value: NumericExpression<U, P>
      readonly coefficient:
        | NumericExpression<"ratio", P>
        | NumericExpression<"multiplier", P>
    }

export const SKILL_CATEGORIES = Object.freeze([
  "basic",
  "dash",
  "follow-up",
  "dodge-counter",
  "enhanced-special",
  "special",
  "chain",
  "ultimate",
  "quick-assist",
  "defensive-assist",
  "evasive-assist",
  "assist-follow-up",
  "uncategorized",
] as const)
export type SkillCategory = (typeof SKILL_CATEGORIES)[number]

export const DAMAGE_ELEMENTS = Object.freeze([
  "physical",
  "fire",
  "ice",
  "electric",
  "ether",
  "wind",
  "auric-ink",
  "frost",
  "lumiflux",
] as const)
export type DamageElement = (typeof DAMAGE_ELEMENTS)[number]
export type DamageKind =
  | "regular"
  | "sheer"
  | "anomaly"
  | "disorder"
  | "vortex"
  | "anomaly-settlement"
  | "luminize"

export type EntryAction =
  | "quick-assist"
  | "chain"
  | "defensive-assist"
  | "evasive-assist"

export type EventKind =
  | "hit-resolved"
  | "entry"
  | "entry-followup"
  | "energy-spent"
  | "precision-support"
  | "summon-attack-ordered"
  | "state-observed"

interface EnumFactMap {
  readonly "event.kind": EventKind
  readonly "event.entryAction": EntryAction
  readonly "event.skillCategory": SkillCategory
  readonly "event.followupActionId": ActionId
  readonly "hit.actionId": ActionId
  readonly "hit.skillCategory": SkillCategory
  readonly "hit.originEffectId": EffectId | null
  readonly "hit.element": DamageElement
  readonly "hit.damageKind": DamageKind
  readonly "hit.skillTag": string
  readonly "hit.targetState": "stunned" | "not-stunned"
}

type EnumFactFor<P extends Phase> = P extends "trigger"
  ?
      | "event.kind"
      | "event.entryAction"
      | "event.skillCategory"
      | "event.followupActionId"
  : P extends "contribution"
    ?
        | "hit.actionId"
        | "hit.skillCategory"
        | "hit.originEffectId"
        | "hit.element"
        | "hit.damageKind"
        | "hit.skillTag"
        | "hit.targetState"
    : never

type EnumCondition<P extends Phase> = {
  [K in EnumFactFor<P>]: {
    readonly kind: "one-of"
    readonly fact: K
    readonly values: NonEmpty<EnumFactMap[K]>
  }
}[EnumFactFor<P>]

type NumericCondition<P extends Phase> = {
  [U in Unit]: {
    readonly kind: "compare-number"
    readonly unit: U
    readonly operator: "eq" | "neq" | "lt" | "lte" | "gt" | "gte"
    readonly left: NumericExpression<U, P>
    readonly right: NumericExpression<U, P>
  }
}[Unit]

export type Condition<P extends Phase> =
  | { readonly kind: "constant"; readonly value: boolean }
  | {
      readonly kind: "all" | "any"
      readonly conditions: readonly Condition<P>[]
    }
  | { readonly kind: "not"; readonly condition: Condition<P> }
  | NumericCondition<P>
  | EnumCondition<P>
  | (P extends "configuration"
      ? never
      : {
          readonly kind: "same-entity" | "same-team"
          readonly left: EntityReference<P>
          readonly right: EntityReference<P>
        })
  | (P extends "configuration"
      ? never
      : {
          readonly kind: "state-is"
          readonly stateId: StateId
          readonly owner: EntityReference<P>
          readonly at: ReadMoment<P>
          readonly active: boolean
        })
  | (P extends "trigger"
      ? {
          readonly kind: "event-flag"
          readonly field: "isCriticalHit"
          readonly value: boolean
        }
      : never)
  | (P extends "contribution"
      ? {
          readonly kind: "within-summon-distance"
          readonly entity: EntityReference<P>
          readonly summonOwner: EntityReference<P>
          readonly summonKinds: NonEmpty<string>
          readonly maximum: NumericExpression<"meters", P>
          readonly at: ReadMoment<P>
        }
      : never)

export type TargetSelector =
  | { readonly kind: "holder" | "team" | "team-except-holder" }
  | { readonly kind: "holder-and-trigger-actor" }

export type StatOperation = {
  [S in Stat]: S extends GeneralStat
    ?
        | {
            readonly kind: "stat-adjustment"
            readonly stat: S
            readonly stage: "initial-percentage" | "final-percentage"
            readonly value: NumericExpression<"ratio", "contribution">
          }
        | {
            readonly kind: "stat-adjustment"
            readonly stat: S
            readonly stage: "initial-fixed" | "final-fixed"
            readonly value: NumericExpression<StatUnitMap[S], "contribution">
          }
    : {
        readonly kind: "stat-adjustment"
        readonly stat: S
        readonly stage: "direct"
        readonly value: NumericExpression<"ratio", "contribution">
      }
}[Stat]

/** 当前登记通道；新增通道必须同时补齐 execution.md 的适配与归约约定。 */
export interface FactorChannelUnitMap {
  readonly "damage-bonus": "ratio"
  readonly "daze-dealt-increase": "ratio"
  readonly "daze-dealt-reduction": "ratio"
  readonly "target-resistance-reduction": "ratio"
  readonly "attacker-resistance-ignore": "ratio"
  readonly "energy-generation-rate": "ratio"
  readonly "target-defense-adjustment": "ratio"
  readonly "attacker-penetration-value": "defense-points"
  readonly "damage-taken-increase": "ratio"
  readonly "damage-taken-reduction": "ratio"
  readonly "stun-damage-adjustment": "multiplier"
  readonly "sheer-damage-bonus": "ratio"
  readonly "anomaly-damage-bonus": "ratio"
  readonly "anomaly-critical-rate": "ratio"
  readonly "anomaly-critical-damage": "ratio"
  readonly "luminize-multiplier-addition": "multiplier"
  readonly "luminize-multiplier-scale": "multiplier"
  readonly "refringe-coefficient-increase": "ratio"
  readonly "base-multiplier-addition": "multiplier"
  readonly "base-multiplier-increase": "ratio"
  readonly "settlement-multiplier-addition": "multiplier"
  readonly "anomaly-duration-addition": "seconds"
  readonly "luminize-multiplier-increase": "ratio"
  readonly "luminize-special-addition": "ratio"
  readonly "luminize-special-increase": "ratio"
  readonly "luminize-proficiency-input": "anomaly-proficiency-points"
}
export type FactorChannel = keyof FactorChannelUnitMap

type FactorOperation = {
  [C in FactorChannel]: {
    readonly kind: "factor-contribution"
    readonly channel: C
    readonly value: NumericExpression<FactorChannelUnitMap[C], "contribution">
  }
}[FactorChannel]

export type ContributionOperation =
  | StatOperation
  | FactorOperation
  | {
      readonly kind: "hit-adjustment"
      readonly field: "damageMultiplier"
      readonly operator: "add" | "scale"
      /** 省略时作用于全部基础伤害项。 */
      readonly itemIds?: NonEmpty<string>
      readonly value: NumericExpression<"multiplier", "contribution">
    }

export interface CooldownPolicy {
  readonly groupId: string
  readonly partition: "binding" | "holder" | "trigger-actor" | "team" | "global"
  readonly seconds: NumericExpression<"seconds", "trigger">
}

export interface Trigger {
  readonly eventKinds: NonEmpty<EventKind>
  readonly when: Condition<"trigger">
  readonly cooldown?: CooldownPolicy
}

export type ClockUpdate =
  | { readonly kind: "keep" | "refresh" }
  | {
      readonly kind: "extend"
      readonly limit:
        | { readonly kind: "none" }
        | {
            readonly kind: "remaining" | "since-first-activation"
            readonly maximum: NumericExpression<"seconds", "trigger">
          }
    }

export type TriggeredLifetime =
  | {
      readonly kind: "timed"
      readonly seconds: NumericExpression<"seconds", "trigger">
      readonly clock: "shared" | "per-layer"
      readonly onRetrigger: ClockUpdate
      readonly refreshExisting: "all" | "newest" | "none"
    }
  | {
      readonly kind: "state-bound"
      readonly stateId: StateId
      readonly stateOwner: EntityReference<"trigger">
    }

export interface LayeringPolicy {
  readonly recipientPartition: "individual" | "selected-set"
  readonly keys: readonly ("trigger-actor" | "skill-category")[]
  readonly maximum: NumericExpression<"count", "configuration">
  readonly onRetrigger: "add-layer" | "keep-count"
  readonly atCapacity: "ignore-new-layer" | "replace-oldest-layer"
}

export type Activation =
  | {
      readonly kind: "continuous"
      readonly trigger?: never
      readonly lifetime?: never
      readonly layering?: never
    }
  | {
      readonly kind: "supplied"
      readonly maximumLayers?: NumericExpression<"count", "configuration">
      /** 同一来源绑定中，同组只能选择一条规则。 */
      readonly exclusiveGroup?: string
      readonly trigger?: never
      readonly lifetime?: never
      readonly layering?: never
    }
  | {
      readonly kind: "triggered"
      readonly trigger: Trigger
      readonly lifetime: TriggeredLifetime
      readonly layering: LayeringPolicy
    }

export interface UniquenessPolicy {
  readonly key: string
  readonly scope: "team" | "global"
  readonly select:
    | { readonly kind: "single-source-only" }
    | { readonly kind: "highest-value" }
    | { readonly kind: "latest-activation" }
    | {
        readonly kind: "priority"
        readonly priority: NumericExpression<"count", "configuration">
      }
}

interface RuleBase {
  readonly effectId: EffectId
  readonly source: RuleSource
  readonly config: Condition<"configuration">
  readonly parameters: Readonly<Record<string, AnyParameter>>
}

export type ContributionRule = RuleBase & {
  readonly kind: "contribution"
  readonly activation: Activation
  readonly beneficiary: TargetSelector
  readonly when: Condition<"contribution">
  readonly uniqueness?: UniquenessPolicy
  readonly phase?: never
  readonly modifications?: never
} & (
    | {
        readonly scope: "entity"
        readonly operation: Exclude<
          ContributionOperation,
          { readonly kind: "hit-adjustment" }
        >
      }
    | { readonly scope: "hit"; readonly operation: ContributionOperation }
  )

export type InstantOperation =
  | {
      readonly kind: "resource-generation"
      readonly resource: "energy"
      readonly amount: NumericExpression<"energy-points", "trigger">
    }
  | {
      readonly kind: "action-request"
      readonly actions: NonEmpty<{
        readonly actionId: ActionId
        readonly count: NumericExpression<"count", "trigger">
      }>
    }

export interface InstantRule extends RuleBase {
  readonly kind: "instant"
  readonly trigger: Trigger
  readonly beneficiary: TargetSelector
  readonly operation: InstantOperation
  readonly activation?: never
  readonly uniqueness?: never
  readonly phase?: never
  readonly modifications?: never
}

export type NumericUpdate<U extends Unit, P extends Phase> =
  | {
      readonly operator: "set" | "add"
      readonly value: NumericExpression<U, P>
    }
  | {
      readonly operator: "scale"
      readonly value: NumericExpression<"multiplier", P>
    }

export type ParameterChange<P extends Phase> = {
  [U in Unit]: {
    readonly field: "parameter"
    readonly name: string
    readonly unit: U
    readonly change: NumericUpdate<U, P>
  }
}[Unit]

export type OutputChange<P extends Phase> = {
  [U in Unit]: {
    readonly field: "output"
    readonly unit: U
    readonly change:
      | { readonly operator: "add"; readonly value: NumericExpression<U, P> }
      | {
          readonly operator: "scale"
          readonly value: NumericExpression<"multiplier", P>
        }
  }
}[Unit]

export type TimingChange<P extends Phase> = {
  readonly field: "duration-seconds" | "extension-maximum"
  readonly change: NumericUpdate<"seconds", P>
}

export type ConfigurationChange =
  | ParameterChange<"configuration">
  | OutputChange<"configuration">
  | TimingChange<"configuration">

export type ModificationRule = RuleBase & {
  readonly kind: "modification"
  readonly operation?: never
  readonly activation?: never
  readonly beneficiary?: never
  readonly uniqueness?: never
} & (
    | {
        readonly phase: "configuration"
        readonly target: {
          readonly kind: "effect"
          readonly effectId: EffectId
        }
        readonly modifications: NonEmpty<ConfigurationChange>
      }
    | {
        readonly phase: "configuration"
        readonly target: { readonly kind: "state"; readonly stateId: StateId }
        readonly modifications: NonEmpty<ParameterChange<"configuration">>
      }
    | {
        readonly phase: "activation"
        readonly target: {
          readonly kind: "effect"
          readonly effectId: EffectId
        }
        readonly when: Condition<"trigger">
        readonly modifications: NonEmpty<TimingChange<"trigger">>
      }
    | {
        readonly phase: "contribution"
        readonly target: {
          readonly kind: "effect"
          readonly effectId: EffectId
        }
        readonly when: Condition<"contribution">
        readonly modifications: NonEmpty<
          ParameterChange<"contribution"> | OutputChange<"contribution">
        >
      }
  )

export type EffectRule = ContributionRule | InstantRule | ModificationRule

/** 世界状态由调用方观察；本模型解析其参数，但不模拟召唤物运动。 */
export interface StateDefinition {
  readonly stateId: StateId
  readonly source: RuleSource
  readonly parameters: Readonly<Record<string, AnyParameter>>
  readonly input: "observed"
}

export interface RuleSet {
  readonly schemaVersion: 1
  readonly ruleSetId: string
  readonly revision: string
  readonly effects: readonly EffectRule[]
  readonly states: readonly StateDefinition[]
  readonly actions: readonly {
    readonly actionId: ActionId
    readonly source: RuleSource
  }[]
}

export type StaticCatalogUnavailableReason =
  | "missing-identity"
  | "missing-rank-evidence"
  | "missing-parameter"
  | "semantic-conflict"
  | "formula-out-of-scope"

export interface StaticCatalogEntity {
  readonly catalogEntityId: string
  readonly upstreamId: string
  readonly name: string
  readonly identity: SourceIdentity | null
  readonly status: "mapped" | "missing-identity" | "placeholder"
  readonly profession: string | null
  readonly element: DamageElement | null
}

export interface StaticCatalogInputRequirement {
  readonly name: string
  readonly unit: Unit
  readonly description: string
  readonly preset?: number
}

export interface StaticCatalogApplicability {
  readonly beneficiaryProfession?: string
  readonly beneficiaryElements?: readonly DamageElement[]
  readonly teamProfession?: {
    readonly profession: string
    readonly counts: readonly number[]
  }
}

export interface StaticCatalogVariant {
  /** 同一选项不同精炼档改变对象时覆盖 option.target。 */
  readonly target?: "self" | "team"
  readonly configuration: {
    readonly minimumMindscape?: MindscapeRank
    readonly refinements?: readonly RefinementRank[]
    readonly minimumSetPieces?: SetPieceCount
    readonly coreSkillLevels?: readonly CoreSkillLevel[]
  }
  readonly status: "converted" | "corrected" | "unsupported"
  readonly reason?: StaticCatalogUnavailableReason
  readonly explanation?: string
  readonly references: NonEmpty<SourceReference>
  readonly effectIds: readonly EffectId[]
  readonly maximumLayers: number
  readonly inputs: readonly StaticCatalogInputRequirement[]
  readonly applicability: StaticCatalogApplicability
  readonly differences: readonly string[]
  /** 只登记已有 core 耀变精通换算；不开放任意参数路径。 */
  readonly parameterMapping?: {
    readonly kind: "luminize-proficiency"
    readonly rate: number
    readonly source: "holder-current" | "holder-initial" | "input"
    readonly inputName?: string
  }
}

export interface StaticCatalogOption {
  readonly optionId: string
  readonly catalogEntityId: string
  readonly name: string
  /** 来源描述中的状态、潜能和触发条件由调用方在选中时明确断言。 */
  readonly conditionDescription: string
  readonly target: "self" | "team"
  readonly exclusiveGroup?: string
  readonly variants: NonEmpty<StaticCatalogVariant>
}

export interface StaticEffectCatalog {
  readonly schemaVersion: 1
  readonly ruleSetId: string
  readonly revision: string
  readonly source: {
    readonly repository: string
    readonly commit: string
    readonly files: readonly {
      readonly path: string
      readonly sha256: string
    }[]
  }
  readonly entities: readonly StaticCatalogEntity[]
  readonly options: readonly StaticCatalogOption[]
  readonly skillTargets: readonly {
    readonly targetId: string
    readonly upstreamId: string | null
    readonly agentEntityId: string | null
    readonly category: string
    readonly name: string
    readonly countsAsFollowUp: boolean
  }[]
  readonly differences: readonly {
    readonly differenceId: string
    readonly explanation: string
    readonly references: readonly SourceReference[]
  }[]
}
