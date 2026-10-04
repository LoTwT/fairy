import type {
  DamageElement,
  DriveDiscSlot,
  EntityId,
  CoreSkillLevel,
  MindscapeRank,
  RefinementRank,
  PanelAttributeBonus,
  PotentialLevel,
  Quantity,
  SkillLevelGroup,
  SkillLevelInput,
  Stat,
  StatUnitMap,
  StaticCalculationData,
  TeamId,
  ResolvedAgentAction,
} from "@randomplay/shared"
import type {
  EffectNumericInput,
  ResolvedContribution,
  StaticCatalogDamageInput,
  StaticDamageResult,
  WorldObservation,
} from "../effects/types.ts"

export type StaticPanelValues = {
  readonly [S in Stat]?: Quantity<StatUnitMap[S]>
}

export interface StaticDriveDisc {
  readonly setEntityId: string
  /** 配装模式必须提供；从对应槽位的主词条选项中选择。 */
  readonly mainStat?: {
    readonly attribute: PanelAttributeBonus["attribute"]
    readonly element?: DamageElement
  }
  readonly substats?: readonly {
    readonly attribute: PanelAttributeBonus["attribute"]
    readonly operation: "initial-fixed" | "initial-percentage" | "ratio-add"
    readonly rolls: number
  }[]
}

export interface StaticActorConfiguration {
  readonly entityId: EntityId
  readonly teamId: TeamId
  readonly agentEntityId: string
  readonly coreSkillLevel: CoreSkillLevel
  readonly mindscapeRank: MindscapeRank
  /**
   * 可选的显式技能等级输入，按培养类别提供；special 的有效等级交给该角色的
   * 代理人来源绑定。未提供时，依赖特殊技等级的效果按缺输入报告。
   */
  readonly skillLevels?: Partial<Record<SkillLevelGroup, SkillLevelInput>>
  /**
   * 可选；未提供按未开启潜能（0）处理。仅当选中的效果依赖潜能等级时有意义。
   */
  readonly potentialLevel?: PotentialLevel
  readonly wEngine: {
    readonly entityId: string
    readonly refinement: RefinementRank
    readonly eligible: boolean
  } | null
  readonly driveDiscs: Readonly<Record<DriveDiscSlot, StaticDriveDisc | null>>
  readonly panel:
    | { readonly mode: "equipment" }
    | {
        readonly mode: "out-of-combat"
        readonly stats: StaticPanelValues
        readonly penetrationValue: number
        /** 面板总元素增伤，含装备及二件套；本次动作使用的元素必须显式给值。 */
        readonly damageBonuses: Readonly<Partial<Record<DamageElement, number>>>
      }
}

export interface StaticActionCalculationInput {
  readonly data: StaticCalculationData
  readonly actors: readonly StaticActorConfiguration[]
  readonly actorId: EntityId
  /** 调用方使用 data.resolveAgentAction 得到结果，并原样交给 core。 */
  readonly action: ResolvedAgentAction
  readonly target: {
    readonly entityId: EntityId
    readonly teamId: TeamId
    readonly baseDefense: number
    readonly resistances: Readonly<Partial<Record<DamageElement, number>>>
    readonly isStunned: boolean
    /** 当前状态下的基础乘数（通常未失衡为 1、失衡为 1.5）；不会根据 isStunned 自动切换。 */
    readonly baseStunDamageMultiplier: number
  }
  readonly selections: readonly {
    readonly holderId: EntityId
    readonly optionId: string
    readonly layers: number
  }[]
  readonly inputs?: readonly EffectNumericInput[]
  readonly observedWorld?: Pick<WorldObservation, "states" | "distances">
  readonly snapshots?: StaticCatalogDamageInput["snapshots"]
  readonly atSeconds?: number
  readonly requireIndividualHits?: boolean
  /**
   * 耀变保留显式伤害来源与已结算快照；不根据普通动作推导异常结算。
   * `hit` 的动作身份字段（actor/target/action/分类与技能目标）由本入口按
   * 已解析动作填充并覆盖调用方提供的值，历史完整 hit 对象（含
   * `actionSnapshotId` 等原公开字段）保持可赋值复用；`element` 与
   * `damageItems` 必须显式提供。特殊虚曜机制分支仍在运行时拒绝
   * `actionSnapshotId` 快照覆盖。
   */
  readonly luminize?: {
    readonly hit: Pick<
      StaticCatalogDamageInput["hit"],
      "element" | "damageItems"
    > &
      Partial<Omit<StaticCatalogDamageInput["hit"], "element" | "damageItems">>
    readonly damage: StaticCatalogDamageInput["damage"]
  }
}

export interface StaticPanelResult {
  readonly entityId: EntityId
  readonly stats: StaticPanelValues
  readonly penetrationValue: number
  readonly damageBonuses: Readonly<Partial<Record<DamageElement, number>>>
  readonly contributions: readonly ResolvedContribution[]
}

export type StaticActionCalculationResult = {
  readonly panels: readonly StaticPanelResult[]
  readonly limitations: readonly string[]
} & (
  | { readonly kind: "daze-only" }
  | {
      readonly kind: "damage"
      readonly segments: readonly {
        readonly segmentId: string
        readonly repetition: number
        readonly granularity: "individual" | "aggregate"
        readonly damage: StaticDamageResult
      }[]
      readonly totals: {
        readonly nonCritical: number
        readonly critical: number | null
        readonly expected: number
        /** 只有已确认独立命中才给显示取整总值。 */
        readonly displayedNonCritical: number | null
        readonly displayedCritical: number | null
      }
    }
)
