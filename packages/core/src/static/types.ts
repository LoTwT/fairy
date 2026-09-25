import type {
  DamageElement,
  DriveDiscSlot,
  EntityId,
  CoreSkillLevel,
  MindscapeRank,
  RefinementRank,
  PanelAttributeBonus,
  Quantity,
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
  /** 耀变保留显式伤害来源与已结算快照；不根据普通动作推导异常结算。 */
  readonly luminize?: Pick<StaticCatalogDamageInput, "hit" | "damage">
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
