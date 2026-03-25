# W-Engine 数据结构规格（V1）

## 范围

本规格定义 `packages/zzz-data/data/w-engine/` 的处理后数据结构。

共享基础类型与数值语义见 [shared-combat-types.md](./shared-combat-types.md)。
最终结算输入结构见 [combat-semantics.md](./combat-semantics.md)。
来源默认归类见 [combat-source-matrix.md](./combat-source-matrix.md)。

当前版本覆盖：

- `w-engine` 维度的处理后数据
- 会进入最终面板的音擎基础攻击力与高级属性
- 首批高置信度、非叠层的被动 `modifier` 结构化效果
- 音擎被动原文的轻量 trace 保留

当前版本不覆盖：

- 依赖叠层、快照或更复杂状态流转的被动结构化效果
- 音擎被动的 AI 解析与人工 review 流程
- 截图识别输入本身
- 场景级 resolver

## 设计目标

- `profile` 承载语言相关展示信息
- `mechanics` 承载音擎静态面板来源，以及首批高置信度被动效果
- 音擎基础攻击力与高级属性直接服务于 `combat-semantics.panel`
- 已能稳定解析的音擎被动进入 `combat-semantics.extras`
- 复杂被动继续保留在 `trace`，后续再扩结构化范围

## 目录结构

```text
data/
└── w-engine/
    ├── index.json
    ├── profile/
    │   ├── en/
    │   │   └── <wEngineId>.json
    │   └── zh-CN/
    │       └── <wEngineId>.json
    └── mechanics/
        └── <wEngineId>.json
```

## 共享类型

```ts
// 当前处理后数据支持的 locale。
type Locale = "en" | "zh-CN"

// 音擎主键；当前建议直接沿用 source 数据里的 w-engine id。
type WEngineId = string

// 面板主字段键，沿用 combat-semantics.md。
type PanelStatKey =
  | "hp"
  | "atk"
  | "def"
  | "impact"
  | "sheerForce"
  | "critRate"
  | "critDamage"
  | "anomalyMastery"
  | "anomalyProficiency"
  | "penRate"
  | "penFlat"
  | "energyRegen"

// 百分比面板字段键，沿用 combat-semantics.md。
type PercentStatKey = "hpPercent" | "atkPercent" | "defPercent"

// 音擎高级属性允许的键；单独定义，避免误用宽 union。
type WEngineAdvancedStatKey =
  | "hpPercent"
  | "atkPercent"
  | "defPercent"
  | "critRate"
  | "critDamage"
  | "impact"
  | "anomalyMastery"
  | "anomalyProficiency"
  | "penRate"
  | "energyRegen"

// 标准化效果里的数值定义，沿用 combat-semantics.md。
type ValueDefinition =
  | { kind: "static"; value: number }
  | { kind: "by-level"; inputKey: string; values: Record<number, number> }

// 精炼等级。
type RefineRank = 1 | 2 | 3 | 4 | 5

// 多语言文本块。
interface LocalizedText {
  "en"?: string
  "zh-CN"?: string
}

// 通用等级表结构。
type StatsByLevel<T> = Record<number, T>

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
    | "sheerForce"
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

// 公共来源追溯块。
interface SourceTrace {
  sourceRefs: string[]
}
```

## `w-engine/index.json`

```ts
interface WEngineIndexEntry {
  // 音擎主键。
  id: WEngineId

  // 用于 URL / 检索的稳定 slug。
  slug: string

  // 轻量多语言名称映射。
  names: Partial<Record<Locale, string>>

  // 展示层图片键。
  imageKey?: string

  // 稀有度，例如 A / S。
  rank?: "A" | "S"

  // 当前已经生成的 locale 列表。
  locales: Locale[]
}

type WEngineIndexFile = Record<WEngineId, WEngineIndexEntry>
```

## `w-engine/profile/<locale>/<id>.json`

```ts
interface WEngineProfileFile {
  // 音擎主键。
  id: WEngineId

  // 当前 profile 对应的 locale。
  locale: Locale

  // 当前 locale 下的主显示名称。
  name: string

  // 展示层图片键。
  imageKey?: string

  // 稀有度。
  rank?: "A" | "S"

  // 当前 locale 下的简短摘要。
  summaryText?: string

  // 当前 locale 下的长描述或简介。
  descriptionText?: string
}
```

## `w-engine/mechanics/<id>.json`

```ts
interface WEngineAdvancedStatByLevelEntry {
  // 高级属性键。
  key: WEngineAdvancedStatKey

  // 当前等级下的高级属性值。
  value: number
}

interface WEnginePanelMechanics {
  // 基础攻击力等级表。
  baseAtkByLevel: StatsByLevel<number>

  // 高级属性等级表；每级只有一条高级属性。
  advancedStatByLevel?: StatsByLevel<WEngineAdvancedStatByLevelEntry>
}

interface WEngineEffectMechanics {
  // 已结构化的高置信度被动 modifier；复杂规则可能仍留在 trace。
  modifiers: StructuredExtraModifierEffect[]

  // 预留给后续结构化的被动 override 槽位；当前生成结果可能为空。
  overrides: StructuredOverrideEffect[]
}

interface WEngineMechanicsFile {
  // 音擎主键。
  id: WEngineId

  // 形成最终面板的音擎静态真源。
  panel: WEnginePanelMechanics

  // 已结构化的音擎被动效果，以及后续待扩的预留槽位。
  effects: WEngineEffectMechanics

  // 轻量来源追溯与被动原文保留。
  trace?: SourceTrace & {
    // 多语言被动名。
    skillNameTexts?: LocalizedText

    // 多语言精炼 1-5 被动原文；当前版本主要依赖它做 trace。
    skillDescriptionsByRefine?: Record<RefineRank, LocalizedText>
  }
}
```

## 当前约定

- `baseAtkByLevel` 直接服务于最终攻击力组装
- `advancedStatByLevel` 只保留音擎高级属性允许出现的键
- 当前优先结构化高置信度、非叠层的被动 `modifier`
- 依赖叠层、快照或复杂条件链的规则继续留在 `trace`
- 文本解析与 review 流程后续单独设计，不在本规格中展开
