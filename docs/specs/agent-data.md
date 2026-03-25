# Agent 数据结构规格（V1）

## 范围

本规格定义 `packages/zzz-data/data/agent/` 的处理后数据结构。

共享基础类型与数值语义见 [shared-combat-types.md](./shared-combat-types.md)。
最终结算输入结构见 [combat-semantics.md](./combat-semantics.md)。
来源默认归类见 [combat-source-matrix.md](./combat-source-matrix.md)。

当前版本覆盖：

- `agent` 维度的处理后数据
- 会进入最终角色面板的静态来源
- 核心被动、额外能力、影画、潜能激化中的首批高置信度、非叠层 modifier 结构化效果
- 核心技、额外能力、影画、潜能激化原文的轻量 trace 保留

当前版本不覆盖：

- `cinema` / `potential` 的结构化面板效果生成
- 复杂叠层、快照、替换类战斗效果与覆盖规则的完整结构化生成
- 文本规则的 AI 解析与人工 review 流程
- 完整战斗过程模拟
- 截图识别输入本身
- `buff`、`mode`、`enemy` 以外的场景级 resolver

## 设计目标

- `profile` 负责语言相关展示信息
- `mechanics` 负责结构化的面板真源，并为战斗效果预留结构化槽位
- `agent` 的处理后数据可以直接为 `combat-semantics` 提供：
  - `panel`
- - 后续补齐后的 `extras.modifiers`
- - 后续补齐后的 `extras.overrides`
- `cinema` 与 `potential` 分开建模，不混用

## 目录结构

```text
data/
└── agent/
    ├── index.json
    ├── profile/
    │   ├── en/
    │   │   └── <agentId>.json
    │   └── zh-CN/
    │       └── <agentId>.json
    └── mechanics/
        └── <agentId>.json
```

约定：

- `index.json` 是轻量索引，负责检索、跨语言映射和 source trace
- `profile/` 按 locale 拆分
- `mechanics/` 不按 locale 拆分

## 共享类型

```ts
// 当前处理后数据支持的 locale。
type Locale = "en" | "zh-CN"

// 角色主键；当前建议直接沿用 source 数据里的 agent id。
type AgentId = string

// 角色原始属性名；保持 source 语义，不强行映射到计算属性键。
// 例如：物理、火、冰、电、以太、烈霜、凛刃、玄墨。
type RawAgentAttribute = string

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

// 属性伤害字段键，沿用 combat-semantics.md。
type DamageBonusKey =
  | "physicalDamageBonus"
  | "fireDamageBonus"
  | "iceDamageBonus"
  | "electricDamageBonus"
  | "etherDamageBonus"

// 百分比面板字段键，沿用 combat-semantics.md。
type PercentStatKey = "hpPercent" | "atkPercent" | "defPercent"

// 来源层允许进入面板的字段键。
type SourcePanelStatKey = PanelStatKey | PercentStatKey | DamageBonusKey

// 标准化效果里的数值定义，沿用 combat-semantics.md。
type ValueDefinition =
  | { kind: "static"; value: number }
  | { kind: "by-level"; inputKey: string; values: Record<number, number> }

// 当前 agent 面板块使用的标准数值结构。
interface PanelStatBlock {
  // 最终生命值。
  hp?: number

  // 最终攻击力。
  atk?: number

  // 最终防御力。
  def?: number

  // 最终冲击力。
  impact?: number

  // 最终贯穿力。
  sheerForce?: number

  // 最终暴击率，ratio 语义。
  critRate?: number

  // 最终暴击伤害，ratio 语义。
  critDamage?: number

  // 最终异常掌控。
  anomalyMastery?: number

  // 最终异常精通。
  anomalyProficiency?: number

  // 最终穿透率，ratio 语义。
  penRate?: number

  // 最终穿透值。
  penFlat?: number

  // 最终能量自动回复。
  energyRegen?: number
}

// 通用等级表结构。
type StatsByLevel<T> = Record<number, T>

// 多语言文本块。
interface LocalizedText {
  "en"?: string
  "zh-CN"?: string
}

// 会进入 panel 的结构化效果。
interface StructuredPanelEffect {
  // 稳定规则 id。
  id: string

  // 短标签。
  label: string

  // 固定属于 panel。
  bucket: "panel"

  // 最终落到哪个 panel 字段。
  key: SourcePanelStatKey

  // 取值定义。
  value: ValueDefinition

  // 数值单位语义。
  unit: "flat" | "ratio"
}

// 不进面板，但会进入 extras.modifiers 的结构化效果。
interface StructuredExtraModifierEffect {
  // 稳定规则 id。
  id: string

  // 短标签。
  label: string

  // 固定属于 modifier。
  bucket: "modifier"

  // 最终落到哪个额外乘区槽位。
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

  // 取值定义。
  value: ValueDefinition

  // 数值单位语义。
  unit: "ratio" | "flat" | "multiplier"

  // 作用目标。
  target: "self" | "team" | "enemy"

  // 当前仅保留最小条件文本。
  conditionText?: string
}

// 会进入 extras.overrides 的结构化效果。
interface StructuredOverrideEffect {
  // 稳定规则 id。
  id: string

  // 短标签。
  label: string

  // 固定属于 override。
  bucket: "override"

  // 当前只保留最明确需要的覆盖槽位。
  key: "dazeVulnerabilityBonus"

  // 取值定义。
  value: ValueDefinition

  // 可选上限；ratio 语义。
  capValue?: number

  // 当前仅保留最小条件文本。
  conditionText?: string
}

// 公共来源追溯块。
interface SourceTrace {
  // 用于回溯到 source 数据的引用列表。
  sourceRefs: string[]
}
```

## `agent/index.json`

### 目标

- 通过名字快速定位角色
- 维护中英文映射
- 提供图片、稀有度、属性、特性等轻量元信息

### 类型

```ts
interface AgentIndexEntry {
  // 角色主键。
  id: AgentId

  // 用于 URL / 检索的稳定 slug。
  slug: string

  // 轻量多语言名称映射。
  names: Partial<Record<Locale, string>>

  // 展示层图片键。
  imageKey?: string

  // 稀有度，例如 A / S。
  rank?: "A" | "S"

  // 当前角色原始属性名；保持 source 语义。
  attribute?: RawAgentAttribute

  // 当前角色特性，如强攻 / 异常 / 支援等。
  specialty?: string

  // 当前已经生成的 locale 列表。
  locales: Locale[]
}

// 以 agentId 为键的轻量索引文件。
type AgentIndexFile = Record<AgentId, AgentIndexEntry>
```

## `agent/profile/<locale>/<id>.json`

### 目标

- 承载语言相关展示信息
- 给 AI / UI 查看角色资料
- 与计算数值解耦

### 类型

```ts
interface AgentProfileFile {
  // 角色主键。
  id: AgentId

  // 当前 profile 对应的 locale。
  locale: Locale

  // 当前 locale 下的主显示名称。
  name: string

  // 当前 locale 下的别名列表。
  aliases: string[]

  // 展示层图片键。
  imageKey?: string

  // 稀有度。
  rank?: "A" | "S"

  // 当前角色原始属性名；保持 source 语义。
  attribute?: RawAgentAttribute

  // 当前角色特性。
  specialty?: string

  // 角色资料摘要或简介。
  descriptionText?: string
}
```

## `agent/mechanics/<id>.json`

### 目标

- 承载面板真源与战斗效果真源
- 直接为 `combat-semantics` 提供 panel / extras 的来源
- 将 `cinema` 与 `potential` 分开建模

### 类型

```ts
interface AgentPanelMechanics {
  // 角色基础属性等级表。
  baseStatsByLevel: StatsByLevel<PanelStatBlock>

  // 角色突破提供的三围等级表；当前只保留 hp / atk / def。
  promotionStatsByLevel?: StatsByLevel<
    Partial<Pick<PanelStatBlock, "hp" | "atk" | "def">>
  >

  // 核心技特殊属性；会进入最终面板。
  coreSpecialPanelEffects?: StructuredPanelEffect[]

  // 影画中会进入最终面板的稳定属性效果；当前生成结果可能为空。
  cinemaPanelEffects?: StructuredPanelEffect[]

  // 潜能激化中会进入最终面板的稳定属性效果；当前生成结果可能为空。
  potentialPanelEffects?: StructuredPanelEffect[]
}

interface AgentEffectMechanics {
  // 当前已覆盖首批高置信度、非叠层的 modifier 结构化效果。
  modifiers: StructuredExtraModifierEffect[]

  // 预留给后续结构化的 override 槽位；当前生成结果仍为空。
  overrides: StructuredOverrideEffect[]
}

interface AgentMechanicsFile {
  // 角色主键。
  id: AgentId

  // 形成最终面板的真源。
  panel: AgentPanelMechanics

  // 预留给后续结构化的不进面板战斗效果。
  effects: AgentEffectMechanics

  // 轻量来源追溯与文本保留。
  trace?: SourceTrace & {
    // 核心技相关原文。
    coreTexts?: LocalizedText

    // 额外能力相关原文。
    additionalAbilityTexts?: LocalizedText

    // 影画原文列表。
    cinemaTexts?: LocalizedText[]

    // 潜能激化原文列表。
    potentialTexts?: LocalizedText[]
  }
}
```

## 当前约定

- `baseStatsByLevel` 与 `promotionStatsByLevel` 是角色最终面板的静态真源
- `sheerForce` 作为正式面板键处理，不与 `penFlat` 混用
- `cinema` 与 `potential` 分开建模，不混用
- 只有稳定形成最终面板的效果进入 `panel`
- 当前生成结果已覆盖首批高置信度、非叠层的 `effects.modifiers`
- 复杂叠层、快照、替换规则当前继续保留在 `trace` 中，不强行压平成结构化效果
- `cinemaPanelEffects` / `potentialPanelEffects` 仍作为后续结构化槽位
- 文本解析与 review 流程后续单独设计，不在本规格中展开
