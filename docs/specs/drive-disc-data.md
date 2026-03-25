# Drive Disc 数据结构规格（V1）

## 范围

本规格定义 `packages/zzz-data/data/drive-disc/` 的处理后数据结构。

共享基础类型与数值语义见 [shared-combat-types.md](./shared-combat-types.md)。
最终结算输入结构见 [combat-semantics.md](./combat-semantics.md)。
来源默认归类见 [combat-source-matrix.md](./combat-source-matrix.md)。

当前版本覆盖：

- `drive-disc` 套装规则维度的处理后数据
- 2 件套 / 4 件套的结构化效果真源

当前版本不覆盖：

- 玩家当前 6 个驱动盘主副词条快照
- 截图识别输入本身
- 套装文本的 AI 解析与人工 review 流程

## 设计目标

- `profile` 承载语言相关展示信息
- `mechanics` 只承载套装规则，不存单盘主副词条
- 单盘主副词条继续属于 `combat-semantics` 的截图输入层
- 2 件套 / 4 件套效果统一作为结构化效果真源

## 目录结构

```text
data/
└── drive-disc/
    ├── index.json
    ├── profile/
    │   ├── en/
    │   │   └── <setId>.json
    │   └── zh-CN/
    │       └── <setId>.json
    └── mechanics/
        └── <setId>.json
```

## 共享类型

```ts
// 当前处理后数据支持的 locale。
type Locale = "en" | "zh-CN"

// 驱动盘套装主键。
type DriveDiscId = string

// 面板主字段键，沿用 combat-semantics.md。
type PanelStatKey =
  | "hp"
  | "atk"
  | "def"
  | "impact"
  | "critRate"
  | "critDamage"
  | "anomalyMastery"
  | "anomalyProficiency"
  | "penRate"
  | "penFlat"
  | "energyRegen"

// 百分比面板字段键，沿用 combat-semantics.md。
type PercentStatKey = "hpPercent" | "atkPercent" | "defPercent"

// 来源层允许进入面板的字段键。
type SourcePanelStatKey = PanelStatKey | PercentStatKey | DamageBonusKey

// 属性伤害字段键，沿用 combat-semantics.md。
type DamageBonusKey =
  | "physicalDamageBonus"
  | "fireDamageBonus"
  | "iceDamageBonus"
  | "electricDamageBonus"
  | "etherDamageBonus"

// 标准化效果里的数值定义，沿用 combat-semantics.md。
type ValueDefinition =
  | { kind: "static"; value: number }
  | { kind: "by-level"; inputKey: string; values: Record<number, number> }

// 多语言文本块。
interface LocalizedText {
  "en"?: string
  "zh-CN"?: string
}

// 会进入 panel 的结构化效果。
interface StructuredPanelEffect {
  id: string
  label: string
  bucket: "panel"
  key: SourcePanelStatKey
  value: ValueDefinition
  unit: "flat" | "ratio"
}

// 不进面板，但会进入 extras.modifiers 的结构化效果。
interface StructuredExtraModifierEffect {
  id: string
  label: string
  bucket: "modifier"
  key:
    | "hpPercent"
    | "atkPercent"
    | "defPercent"
    | "impact"
    | "critRate"
    | "critDamage"
    | "anomalyMastery"
    | "anomalyProficiency"
    | "penRate"
    | "penFlat"
    | "energyRegen"
    | "physicalDamageBonus"
    | "fireDamageBonus"
    | "iceDamageBonus"
    | "electricDamageBonus"
    | "etherDamageBonus"
    | "damageBonus"
    | "normalAttackDamageBonus"
    | "dashAttackDamageBonus"
    | "followUpAttackDamageBonus"
    | "chainAttackDamageBonus"
    | "ultimateDamageBonus"
    | "specialAttackDamageBonus"
    | "enhancedSpecialDamageBonus"
    | "assistDamageBonus"
    | "sheerBonus"
    | "defenseReduction"
    | "resistanceReduction"
    | "vulnerabilityBonus"
    | "dazeVulnerabilityBonus"
    | "specialMultiplier"
  value: ValueDefinition
  unit: "ratio" | "flat" | "multiplier"
  target: "self" | "team" | "enemy"
  conditionText?: string
}

// 会进入 extras.overrides 的结构化效果。
interface StructuredOverrideEffect {
  id: string
  label: string
  bucket: "override"
  key: "dazeVulnerabilityBonus"
  value: ValueDefinition
  capValue?: number
  conditionText?: string
}

// 2 件套 / 4 件套共用的结构化效果。
type StructuredEffect =
  | StructuredPanelEffect
  | StructuredExtraModifierEffect
  | StructuredOverrideEffect

// 公共来源追溯块。
interface SourceTrace {
  sourceRefs: string[]
}
```

## `drive-disc/index.json`

```ts
interface DriveDiscIndexEntry {
  // 套装主键。
  id: DriveDiscId

  // 用于 URL / 检索的稳定 slug。
  slug: string

  // 轻量多语言名称映射。
  names: Partial<Record<Locale, string>>

  // 展示层图片键。
  imageKey?: string

  // 当前已经生成的 locale 列表。
  locales: Locale[]
}

type DriveDiscIndexFile = Record<DriveDiscId, DriveDiscIndexEntry>
```

## `drive-disc/profile/<locale>/<id>.json`

```ts
interface DriveDiscProfileFile {
  // 套装主键。
  id: DriveDiscId

  // 当前 profile 对应的 locale。
  locale: Locale

  // 当前 locale 下的主显示名称。
  name: string

  // 展示层图片键。
  imageKey?: string

  // 套装简介或说明。
  descriptionText?: string
}
```

## `drive-disc/mechanics/<id>.json`

```ts
interface DriveDiscEffectMechanics {
  // 2 件套效果真源。
  twoPiece: StructuredEffect[]

  // 4 件套效果真源。
  fourPiece: StructuredEffect[]
}

interface DriveDiscMechanicsFile {
  // 套装主键。
  id: DriveDiscId

  // 套装结构化效果真源。
  effects: DriveDiscEffectMechanics

  // 轻量来源追溯与原文保留。
  trace?: SourceTrace & {
    // 2 件套多语言原文。
    twoPieceEffectTexts?: LocalizedText

    // 4 件套多语言原文。
    fourPieceEffectTexts?: LocalizedText
  }
}
```

## 当前约定

- `data/drive-disc/mechanics` 只保存套装规则，不保存单盘主副词条
- 单盘主副词条快照继续属于 `combat-semantics` 的输入层
- 2 件套中的稳定面板属性与属性伤害默认进入 `StructuredPanelEffect`
- 2 件套与 4 件套中的条件性战斗效果默认进入 `StructuredExtraModifierEffect`
- 覆盖型规则默认进入 `StructuredOverrideEffect`
- 文本解析与 review 流程后续单独设计，不在本规格中展开
