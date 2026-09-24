/** 培养类别；连携与终结共用 chain，与伤害增益分类独立。 */
export type SkillLevelGroup = "basic" | "dodge" | "assist" | "special" | "chain"
export type AgentActionId = `action:${string}`
export type SkillLevelInput =
  | { readonly mode: "trained"; readonly value: number }
  | { readonly mode: "effective"; readonly value: number }
export type ActionSkillCategory =
  | "basic"
  | "dash"
  | "dodge-counter"
  | "special"
  | "enhanced-special"
  | "chain"
  | "ultimate"
  | "quick-assist"
  | "defensive-assist"
  | "evasive-assist"
  | "assist-follow-up"
  | "follow-up"
  | "uncategorized"
export type ActionDamageElement =
  | "physical"
  | "fire"
  | "ice"
  | "electric"
  | "ether"
  | "wind"
  | "frost"
  | "auric-ink"
  | "lumiflux"
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

export interface ActionDamageSegment {
  readonly segmentId: string
  readonly damageKind: "regular" | "sheer"
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
}

export interface ResolvedActionSegment {
  readonly segmentId: string
  readonly damageKind: "regular" | "sheer"
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

export interface AgentActionManifest {
  readonly schemaVersion: 1
  readonly rulesVersion: "agent-actions/1"
  readonly sourceVersion: string
  readonly members: readonly string[]
  readonly inputs: readonly { readonly path: string; readonly sha256: string }[]
  readonly artifacts: Readonly<Record<string, string>>
  readonly evidence: {
    readonly zzzHpCommit: string
    readonly resources: readonly {
      readonly resource: string
      readonly sha256: string
      readonly purpose: string
    }[]
  }
  readonly registrySha256: string
  readonly staticCatalogSha256: string
  readonly coverage: {
    readonly agents: number
    readonly actions: number
    readonly damage: number
    readonly dazeOnly: number
    readonly luminize: number
    readonly unavailable: number
    readonly individualHitActions: number
  }
  readonly limitations: readonly string[]
  readonly discrepancies: readonly {
    readonly actionId: string
    readonly field: string
    readonly upstream: string
    readonly adopted: string
    readonly reason: string
  }[]
}
