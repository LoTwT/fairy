/** 计算单位；百分比使用比例，所有字段均已脱离来源显示缩放。 */
export interface PanelAttributeUnitMap {
  health: "health-points"
  attack: "attack-points"
  defense: "defense-points"
  impact: "impact-points"
  anomalyProficiency: "anomaly-proficiency-points"
  anomalyMastery: "anomaly-mastery-points"
  energyRegen: "energy-per-second"
  criticalRate: "ratio"
  criticalDamage: "ratio"
  penetrationRatio: "ratio"
}

export type PanelAttribute = keyof PanelAttributeUnitMap
export type PanelAttributeValues = {
  readonly [K in PanelAttribute]: {
    readonly unit: PanelAttributeUnitMap[K]
    readonly value: number
  }
}

export type PanelCoreSkillLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7
export type DriveDiscSlot = 1 | 2 | 3 | 4 | 5 | 6
export type DriveDiscDamageElement =
  | "physical"
  | "fire"
  | "ice"
  | "electric"
  | "ether"
type PointAttribute = Exclude<
  PanelAttribute,
  "criticalRate" | "criticalDamage" | "penetrationRatio"
>
type PercentageAttribute = Exclude<PointAttribute, "anomalyProficiency">

/** 基础加数先于装备百分比；初始固定加数不被装备百分比放大。 */
export type PanelAttributeBonus =
  | {
      [K in PointAttribute]: {
        readonly attribute: K
        readonly operation: "base-add" | "initial-fixed"
        readonly unit: PanelAttributeUnitMap[K]
        readonly value: number
      }
    }[PointAttribute]
  | {
      readonly attribute: PercentageAttribute
      readonly operation: "initial-percentage"
      readonly unit: "ratio"
      readonly value: number
    }
  | {
      readonly attribute: "criticalRate" | "criticalDamage" | "penetrationRatio"
      readonly operation: "ratio-add"
      readonly unit: "ratio"
      readonly value: number
    }
  | {
      readonly attribute: "penetrationValue"
      readonly operation: "initial-fixed"
      readonly unit: "defense-points"
      readonly value: number
    }
  | {
      readonly attribute: "damageBonus"
      readonly operation: "damage-bonus"
      readonly element: DriveDiscDamageElement
      readonly unit: "ratio"
      readonly value: number
    }

export interface AgentLevel60Attributes {
  readonly schemaVersion: 1
  readonly entityId: string
  readonly level: 60
  /** 不含 extraLevel 或核心被动属性转化；不是已完成配装的面板。 */
  readonly baseAttributes: PanelAttributeValues
  /** 1 是未升级且提升为空；2—7 分别为 A—F。每行已累计，仅选择一行。 */
  readonly coreAttributeBonuses: Readonly<
    Record<PanelCoreSkillLevel, readonly PanelAttributeBonus[]>
  >
}

export interface WEngineLevel60Attributes {
  readonly schemaVersion: 1
  readonly entityId: string
  readonly level: 60
  readonly baseAttribute: {
    readonly attribute: "attack"
    readonly operation: "base-add"
    readonly unit: "attack-points"
    readonly value: number
  }
  readonly advancedAttribute: PanelAttributeBonus
}

export interface SDriveDiscMaxLevelAffixes {
  readonly schemaVersion: 1
  readonly rarity: "S"
  readonly enhancement: "maximum"
  readonly mainStatsBySlot: Readonly<
    Record<DriveDiscSlot, readonly PanelAttributeBonus[]>
  >
  /** 每次获得一档；初始词条也算一档，次数不是仅指后续强化次数。 */
  readonly substatsPerRoll: readonly PanelAttributeBonus[]
}

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
