export type {
  PanelAttributeUnitMap,
  PanelAttribute,
  PanelAttributeValues,
  PanelCoreSkillLevel,
  DriveDiscSlot,
  DriveDiscDamageElement,
  PanelAttributeBonus,
  AgentLevel60Attributes,
  WEngineLevel60Attributes,
  SDriveDiscMaxLevelAffixes,
} from "@randomplay/shared"

export interface PanelAttributeManifest {
  readonly schemaVersion: 1
  readonly rulesVersion: "panel-attributes/1"
  readonly sourceVersion: string
  readonly members: {
    readonly agents: readonly string[]
    readonly wEngines: readonly string[]
  }
  readonly inputs: readonly { readonly path: string; readonly sha256: string }[]
  /** 相对于 attributes/；manifest 自身不在此表中。 */
  readonly artifacts: Readonly<Record<string, string>>
  readonly evidence: {
    readonly zzzHpCommit: string
    readonly resources: readonly {
      readonly resource: string
      readonly sha256: string
      readonly purpose: string
    }[]
  }
  readonly limitations: readonly string[]
  readonly discrepancies: readonly {
    readonly id: string
    readonly description: string
  }[]
}
