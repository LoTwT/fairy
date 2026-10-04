import type {
  ActionId,
  SkillCategory,
  DamageElement,
  MindscapeRank,
} from "./effects.ts"

/** 培养类别；连携与终结共用 chain，与伤害增益分类独立。 */
export type SkillLevelGroup = "basic" | "dodge" | "assist" | "special" | "chain"
export type AgentActionId = ActionId
export type SkillLevelInput =
  | { readonly mode: "trained"; readonly value: number }
  | { readonly mode: "effective"; readonly value: number }
export type ActionSkillCategory = SkillCategory
export type ActionDamageElement = DamageElement
export type ActionScalingStat = "attack" | "health" | "defense" | "sheerForce"

export interface ActionSourceReference {
  readonly path: string
  readonly pointer: string
}

/** 计算比例：base + growth × (有效等级 − 1)，不预先取整。 */
export interface SkillCoefficientCurve {
  readonly levelGroup: SkillLevelGroup
  readonly base: number
  readonly growth: number
}

/**
 * 命中身份随潜能与额外能力事实变化的显式条件。基础身份始终携带；
 * 满足条件时再追加这里声明的目标与标签，由 data 解析、core 复核。
 */
export interface AgentActionConditionalIdentity {
  /** 启用该条件身份的潜能等级；基础身份与它互补，不能同时套用。 */
  readonly potentialLevels: readonly number[]
  /** 这些潜能下调用方必须显式提供 additionalAbilityActive，不能推断。 */
  readonly requiresAdditionalAbilityActive: true
  readonly skillTargetIds: readonly string[]
  readonly skillTags: readonly string[]
}

export interface ActionIssue {
  readonly code:
    | "unsupported-expression"
    | "mixed-elements"
    | "unknown-element"
    | "unknown-category"
    | "potential-variant"
    | "special-mechanic"
    | "individual-hits-required"
  readonly message: string
}

export interface ActionDamageItem {
  readonly itemId: string
  readonly stat: ActionScalingStat
  readonly coefficient: SkillCoefficientCurve
  /** 显式静态输入；例如照已积累的蓄力秒数。 */
  readonly multiplyByInput?: string
}

/** 动作伤害种类的公共取值；sheer 为命破，sharpen 为锐化（防御缩放、锐暴判定）。 */
export type ActionDamageKind = "regular" | "sheer" | "sharpen"

export interface ActionDamageSegment {
  readonly segmentId: string
  readonly damageKind: ActionDamageKind
  readonly element: ActionDamageElement
  /** individual 表示一次独立伤害；aggregate 不宣称已知内部命中数。 */
  readonly granularity: "individual" | "aggregate"
  readonly repeat: number
  readonly items: readonly ActionDamageItem[]
}

export type AgentActionCalculation =
  | {
      readonly kind: "damage"
      readonly segments: readonly ActionDamageSegment[]
    }
  | { readonly kind: "daze-only" }
  | { readonly kind: "luminize"; readonly multiplier: SkillCoefficientCurve }
  | { readonly kind: "unavailable"; readonly issues: readonly ActionIssue[] }

export interface AgentAction {
  /** 固定登记的应用身份；不是参数 ID、skillList ID 或显示名称。 */
  readonly actionId: AgentActionId
  /** 同一来源招式的选项归组；不同段数/蓄力档位须显式选择，不能自动求和。 */
  readonly branchId: string
  readonly name: string
  readonly rowName: string
  readonly levelGroup: SkillLevelGroup
  readonly skillCategory: ActionSkillCategory | null
  readonly skillTargetIds: readonly string[]
  readonly skillTags: readonly string[]
  /** 该动作仅在列出的潜能等级可用；省略表示与潜能无关，解析上下文不记录潜能。 */
  readonly potentialLevels?: readonly number[]
  /** 基础身份之外、满足潜能与额外能力条件时追加的命中身份。 */
  readonly conditionalIdentity?: AgentActionConditionalIdentity
  readonly source: ActionSourceReference
  readonly descriptionSources: readonly ActionSourceReference[]
  readonly description: string
  readonly parameterIds: readonly string[]
  readonly sourceExpression: string
  /** 来源展示行完整表达式的合计，不代表单次命中。无法解析时为 null。 */
  readonly damageCoefficient: SkillCoefficientCurve | null
  readonly dazeCoefficient: SkillCoefficientCurve | null
  readonly calculation: AgentActionCalculation
  readonly inputs: readonly {
    readonly inputId: string
    readonly name: string
    readonly minimum: number
    readonly maximum: number
  }[]
  readonly limitations: readonly string[]
  readonly upstreamSkillId: string | null
}

export interface AgentActions {
  readonly schemaVersion: 1
  readonly entityId: string
  readonly skillLevelBonuses: readonly {
    readonly minimumMindscapeRank: number
    readonly bonus: number
    readonly groups: readonly SkillLevelGroup[]
    readonly source: ActionSourceReference
  }[]
  readonly actions: readonly AgentAction[]
}

export interface ResolvedSkillLevel {
  readonly trained: number
  readonly bonus: number
  readonly effective: number
}

export interface ResolveAgentActionInput {
  readonly agent: AgentActions
  readonly actionId: string
  readonly mindscapeRank: number
  /** 只须提供该动作实际读取的类别，各项必须明确输入模式。 */
  readonly levels: Readonly<Partial<Record<SkillLevelGroup, SkillLevelInput>>>
  readonly inputs?: Readonly<Record<string, number>>
  /** 对逐次附加伤害等场景必须开启；未核实拆分时返回不可用。 */
  readonly requireIndividualHits?: boolean
  /** 整数 0—6；省略按未开启潜能（0）处理。 */
  readonly potentialLevel?: number
  /** 条件身份动作在声明潜能下必填的额外能力事实；不能由其他输入推断。 */
  readonly additionalAbilityActive?: boolean
}

export interface ResolvedActionSegment {
  readonly segmentId: string
  readonly damageKind: "regular" | "sheer" | "sharpen"
  readonly element: ActionDamageElement
  readonly granularity: "individual" | "aggregate"
  readonly repeat: number
  readonly damageItems: readonly {
    readonly itemId: string
    readonly stat: ActionScalingStat
    readonly damageMultiplier: number
  }[]
}

export type ResolvedAgentAction =
  | { readonly ok: false; readonly issues: readonly ActionIssue[] }
  | {
      readonly ok: true
      /** 解析时的角色与培养配置；消费端须与当前动作使用者一致。 */
      readonly resolutionContext: {
        readonly agentEntityId: string
        readonly mindscapeRank: MindscapeRank
        /** 仅当动作的可用性或身份依赖潜能等级时记录。 */
        readonly potentialLevel?: number
        /** 仅当动作在该潜能下实际消费额外能力事实时记录。 */
        readonly additionalAbilityActive?: boolean
      }
      readonly actionId: AgentActionId
      readonly skillCategory: ActionSkillCategory | null
      readonly skillTargetIds: readonly string[]
      readonly skillTags: readonly string[]
      readonly levels: Readonly<
        Partial<Record<SkillLevelGroup, ResolvedSkillLevel>>
      >
      /** 来源伤害行的合计倍率；实际计算须使用 segments 中按属性分开的 items。 */
      readonly sourceDamageMultiplier: number | null
      readonly dazeMultiplier: number | null
      readonly calculation:
        | {
            readonly kind: "damage"
            readonly segments: readonly ResolvedActionSegment[]
          }
        | { readonly kind: "daze-only" }
        | { readonly kind: "luminize"; readonly multiplier: number }
      readonly limitations: readonly string[]
    }
