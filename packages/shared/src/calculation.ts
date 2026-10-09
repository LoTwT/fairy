import type {
  AgentLevel60Attributes,
  SDriveDiscMaxLevelAffixes,
  WEngineLevel60Attributes,
} from "./attributes.ts"
import type { AgentActions } from "./skills.ts"
import type {
  ContributionRule,
  DamageElement,
  EffectId,
  RuleSet,
  StaticEffectCatalog,
} from "./effects.ts"

/** 结构、单位和静态输入语义的版本，与 npm 发布号及来源提交分别维护。 */
export const CALCULATION_CONTRACT_VERSION = 2
export const CALCULATION_GAME_VERSION = "3.2"

export interface CalculationDataVersion {
  readonly packageVersion: string
  readonly contractVersion: typeof CALCULATION_CONTRACT_VERSION
  readonly gameVersion: string
  /** 已校验 integrated、属性、动作、效果和面板适配规则的内容摘要。 */
  readonly snapshotId: string
}

export interface AgentPanelRules {
  readonly initialConversions: readonly ContributionRule[]
  /** 已核实的 0.1 生命 + 0.3 攻击关系；独立贯穿力另行保留。 */
  readonly deriveSheerForce: boolean
}

/**
 * 已核对身份的驱动盘套装注册表：`sourceEntityId` 对应效果目录中已映射的
 * 驱动盘实体；完整入口据此独立校验配装身份（任意件数），并核对二件套
 * 规则的存在性与声明一致。二件套的消费状态由 data 生成、不得由 core 按
 * “实体存在但无选项”自行推断。
 */
export interface StaticDriveDiscSetCoverage {
  readonly sourceEntityId: string
  readonly twoPieceConsumption:
    | { readonly kind: "auto-selected-options" }
    | {
        /** 目录以不可选变体如实声明的二件套条款；当前伤害计算不消费。 */
        readonly kind: "declared-out-of-scope"
        readonly contributions: readonly string[]
      }
}

export interface StaticPanelRules {
  readonly damageElementInheritance: readonly {
    readonly element: DamageElement
    readonly baseElement: DamageElement
    readonly source: { readonly path: string; readonly pointer: string }
  }[]
  readonly agents: Readonly<Record<string, AgentPanelRules>>
  readonly driveDiscSets: readonly StaticDriveDiscSetCoverage[]
  readonly twoPieceOptions: readonly {
    readonly optionId: string
    readonly sourceEntityId: string
    readonly outputs: readonly (
      | { readonly effectId: EffectId; readonly kind: "stat" }
      | {
          readonly effectId: EffectId
          readonly kind: "elemental-damage"
          readonly elements: readonly DamageElement[]
        }
      | { readonly effectId: EffectId; readonly kind: "conditional-damage" }
    )[]
  }[]
}

/** 由 data 一次装载的同版计算资料；调用方原样传递及缓存整个对象。 */
export interface StaticCalculationData {
  readonly version: CalculationDataVersion
  readonly agents: readonly {
    readonly attributes: AgentLevel60Attributes
    readonly actions: AgentActions
  }[]
  readonly wEngines: readonly WEngineLevel60Attributes[]
  readonly driveDiscAffixes: SDriveDiscMaxLevelAffixes
  readonly definitions: RuleSet
  readonly catalog: StaticEffectCatalog
  readonly panelRules: StaticPanelRules
}
