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
export const CALCULATION_CONTRACT_VERSION = 1
export const CALCULATION_GAME_VERSION = "3.1"

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

export interface StaticPanelRules {
  readonly damageElementInheritance: readonly {
    readonly element: DamageElement
    readonly baseElement: DamageElement
    readonly source: { readonly path: string; readonly pointer: string }
  }[]
  readonly agents: Readonly<Record<string, AgentPanelRules>>
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
