export type {
  SkillLevelGroup,
  AgentActionId,
  SkillLevelInput,
  ActionSkillCategory,
  ActionDamageElement,
  ActionScalingStat,
  ActionSourceReference,
  SkillCoefficientCurve,
  ActionIssue,
  ActionDamageItem,
  ActionDamageSegment,
  AgentActionCalculation,
  AgentAction,
  AgentActions,
  ResolvedSkillLevel,
  ResolveAgentActionInput,
  ResolvedActionSegment,
  ResolvedAgentAction,
} from "@randomplay/shared"

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
