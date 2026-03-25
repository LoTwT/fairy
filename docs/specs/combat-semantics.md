# 战斗语义规格（V2）

## 范围

本规格定义面向静态伤害计算的上游输入结构，服务于：

- 角色面板截图解析
- 配装信息解析
- 文本规则结构化
- 向 `damage-core` 提供最终结算输入

共享基础类型与数值语义见 [shared-combat-types.md](./shared-combat-types.md)。
来源默认归类见 [combat-source-matrix.md](./combat-source-matrix.md)。

本规格覆盖：

- 最终面板快照 `panel`
- 装备快照 `wEngine` / `driveDiscs`
- 面板外额外效果 `extras`
- 敌方与模式上下文 `context`
- 结构化效果 `effects`

本规格不覆盖：

- 完整战斗过程模拟
- 状态机、事件流和持续时间流逝
- 特殊属性的独立建模
  - 当前 `烈霜`、`凛刃`、`玄墨` 等特殊属性暂不单独建模
  - 仍按其原始属性参与计算

## 设计目标

- 让外部调用优先围绕“最终面板 + 面板外效果”工作
- 允许截图直接提供最终面板，而不要求外部先理解来源拆解
- 同时保留装备与结构化效果，方便校验、补全与解释
- 明确 `effects` 是真源，`panel / extras / context` 是结算视图

## 核心分层

### 1. `effects` 是真源

`wEngine` 与 `driveDiscs` 中的结构化效果统一使用 `effects` 表达。

这些 `effects` 不直接等于 calculator 输入，而是后续被归并为：

- `panel`
- `extras.modifiers`
- `extras.overrides`
- `context`

### 2. `panel` 是主结算输入

`panel` 表示当前角色在某个静态快照下的最终有效面板。

这层优先来自：

- 截图直接识别
- 用户手动输入

如果某些字段截图未提供，例如 `penFlat` 或 `attributeDamageBonus`，才允许从装备信息回填。

### 3. `equipment` 是辅助输入

`wEngine` 和 `driveDiscs` 的职责是：

- 校验面板是否合理
- 在面板缺字段时回填
- 解释某个面板值或额外效果来自哪里

它们不是第一优先级的计算主输入。

### 4. `extras` 承接面板外效果

所有不会加到最终面板、但会在当前瞬间参与伤害计算的数值，统一进入：

- `extras.modifiers`
- `extras.overrides`

### 5. `context` 承接敌方与模式上下文

所有不属于角色最终面板、但属于本次计算稳定上下文的内容，统一进入 `context`。

典型内容包括：

- 敌方基础防御
- 敌方抗性
- 敌方失衡承伤倍率
- 玩法版本实例值，如 `rawHp`、`altHp`

## 常量键定义

### `AttributeKey`

沿用 [shared-combat-types.md](./shared-combat-types.md) 中的 `AttributeKey`。

说明：

- 当前角色只按单属性处理
- `attributeDamageBonus` 也只记录当前角色对应属性的那一项

### `PANEL_STAT_KEYS`

```ts
export const PANEL_STAT_KEYS = [
  "hp",
  "atk",
  "def",
  "impact",
  "sheerForce",
  "critRate",
  "critDamage",
  "anomalyMastery",
  "anomalyProficiency",
  "penRate",
  "penFlat",
  "energyRegen",
] as const

export type PanelStatKey = (typeof PANEL_STAT_KEYS)[number]
```

说明：

- 这批字段代表最终面板中直接参与静态伤害计算的核心数值
- `energyRegen` 统一承接截图中的“能量回复”与“能量自动回复”
- `sheerForce` 统一承接角色或战斗中生效的贯穿力

### `PERCENT_STAT_KEYS`

```ts
export const PERCENT_STAT_KEYS = [
  "hpPercent",
  "atkPercent",
  "defPercent",
] as const

export type PercentStatKey = (typeof PERCENT_STAT_KEYS)[number]
```

说明：

- 这组键只用于来源层表达稳定进入最终面板的百分比属性
- 最终对外结算输入仍推荐直接通过 `panel.stats` 提供已汇总后的最终数值

### `DAMAGE_BONUS_KEYS`

```ts
export const DAMAGE_BONUS_KEYS = [
  "physicalDamageBonus",
  "fireDamageBonus",
  "iceDamageBonus",
  "electricDamageBonus",
  "etherDamageBonus",
] as const

export type DamageBonusKey = (typeof DAMAGE_BONUS_KEYS)[number]
```

说明：

- 这组键只用于装备与效果来源层的结构化表达
- 最终对外结算输入仍推荐通过 `panel.attributeDamageBonus` 提供当前角色单属性伤害加成

### `SourcePanelStatKey`

```ts
type SourcePanelStatKey = PanelStatKey | PercentStatKey | DamageBonusKey
```

说明：

- `SourcePanelStatKey` 只用于处理后数据中的来源层结构化效果
- 它可以表达稳定进入最终面板、但未必直接以最终值展示的来源项
- 例如：
  - `atkPercent`
  - `hpPercent`
  - `physicalDamageBonus`

### `DRIVE_DISC_SLOTS`

```ts
export const DRIVE_DISC_SLOTS = [1, 2, 3, 4, 5, 6] as const

export type DriveDiscSlot = (typeof DRIVE_DISC_SLOTS)[number]
```

### `EXTRA_MODIFIER_KEYS`

```ts
export const EXTRA_MODIFIER_KEYS = [
  "hpPercent",
  "atkPercent",
  "defPercent",
  "impact",
  "sheerForce",
  "critRate",
  "critDamage",
  "anomalyMastery",
  "anomalyProficiency",
  "penRate",
  "penFlat",
  "energyRegen",
  "physicalDamageBonus",
  "fireDamageBonus",
  "iceDamageBonus",
  "electricDamageBonus",
  "etherDamageBonus",
  "damageBonus",
  "normalAttackDamageBonus",
  "dashAttackDamageBonus",
  "followUpAttackDamageBonus",
  "chainAttackDamageBonus",
  "ultimateDamageBonus",
  "specialAttackDamageBonus",
  "enhancedSpecialDamageBonus",
  "assistDamageBonus",
  "sheerBonus",
  "defenseReduction",
  "resistanceReduction",
  "vulnerabilityBonus",
  "dazeVulnerabilityBonus",
  "specialMultiplier",
] as const

export type ExtraModifierKey = (typeof EXTRA_MODIFIER_KEYS)[number]
```

说明：

- 这组键同时承接：
  - 面板外的伤害类乘区
  - 战斗内临时生效的面板型加成
- 也包括不会并入稳定 `panel`、但只在当前快照下生效的临时属性伤害加成
- 它们默认不会直接并入稳定 `panel`，而是进入 `extras.modifiers`

### `OVERRIDE_KEYS`

```ts
export const OVERRIDE_KEYS = ["dazeVulnerabilityBonus"] as const

export type OverrideKey = (typeof OVERRIDE_KEYS)[number]
```

## 统一数值语义

沿用 [shared-combat-types.md](./shared-combat-types.md) 中的统一数值语义。

## 结构化效果

### `StaticValueDefinition`

```ts
interface StaticValueDefinition {
  // 固定取值。
  kind: "static"

  // 数值本体。
  value: number
}
```

### `LevelTableValueDefinition`

```ts
interface LevelTableValueDefinition {
  // 按等级取值。
  kind: "by-level"

  // 用哪个输入决定当前等级。
  inputKey: string

  // 各等级对应的值。
  values: Record<number, number>
}
```

说明：

- TypeScript 类型层可视为 `Record<number, number>`
- JSON 落盘时，对象键会序列化为十进制字符串，例如 `"1": 0.15`
- 如果当前等级在 `values` 中不存在，则视为该效果当前不生效

### `ValueDefinition`

```ts
type ValueDefinition = StaticValueDefinition | LevelTableValueDefinition
```

### `StructuredPanelEffect`

```ts
interface StructuredPanelEffect {
  // 规则稳定 id。
  id: string

  // 简短标签。
  label: string

  // 该效果最终会进入面板。
  bucket: "panel"

  // 面板字段或属性伤害字段。
  key: SourcePanelStatKey

  // 数值定义。
  value: ValueDefinition

  // 单位语义。
  unit: "flat" | "ratio"
}
```

用途：

- 表达会进入最终面板的效果来源
- 例如：
  - 音擎高级属性
  - 驱动盘 2 件套中的暴击率
  - 驱动盘 2 件套中的属性伤害
  - 核心技特殊属性

### `StructuredExtraModifierEffect`

```ts
interface StructuredExtraModifierEffect {
  // 规则稳定 id。
  id: string

  // 简短标签。
  label: string

  // 该效果最终会进入面板外额外乘区。
  bucket: "modifier"

  // 额外乘区槽位。
  key: ExtraModifierKey

  // 数值定义。
  value: ValueDefinition

  // 单位语义。
  unit: "ratio" | "flat" | "multiplier"

  // 作用目标。
  target: "self" | "team" | "enemy"

  // 当前仅保留最小条件文本，说明这条效果在什么条件下生效。
  conditionText?: string
}
```

用途：

- 表达不会进入面板、但这个瞬间参与计算的效果
- 例如：
  - 普通攻击伤害提升
  - 对敌伤害提升
  - 减防
  - 减抗

### `StructuredOverrideEffect`

```ts
interface StructuredOverrideEffect {
  // 规则稳定 id。
  id: string

  // 简短标签。
  label: string

  // 该效果最终会进入覆盖规则。
  bucket: "override"

  // 被覆盖的槽位。
  key: OverrideKey

  // 覆盖值。
  value: ValueDefinition

  // 覆盖上限。
  capValue?: number

  // 当前仅保留最小条件文本，说明这条覆盖规则在什么条件下生效。
  conditionText?: string
}
```

用途：

- 表达不是普通叠加，而是覆盖某个结算槽位的规则
- 当前只开放 `dazeVulnerabilityBonus`

### `StructuredEffect`

```ts
type StructuredEffect =
  | StructuredPanelEffect
  | StructuredExtraModifierEffect
  | StructuredOverrideEffect
```

## 最终结算视图

### `AgentPanelSnapshot`

```ts
interface AgentPanelSnapshot {
  // 内部解析出的角色 id；截图本身通常不直接提供。
  agentId?: string

  // 截图中读取到的角色名。
  agentName?: string

  // 角色等级。
  level?: number

  // 影画等级。
  cinemaLevel?: number

  // 潜能激化等级。
  potentialLevel?: number

  // 最终面板数值。
  stats: Partial<Record<PanelStatKey, number>>

  // 当前角色单属性伤害加成。
  attributeDamageBonus?: {
    // 当前角色属性。
    attribute: AttributeKey

    // 该属性伤害加成；ratio 语义。
    value: number
  }
}
```

说明：

- 这是对外最重要的计算主输入
- 如果截图能直接给到该字段，应优先使用截图值
- `penFlat` 与 `attributeDamageBonus` 在截图缺失时，允许从装备信息回填

### `WEngineSnapshot`

```ts
interface WEngineSnapshot {
  // 音擎 id。
  id?: string

  // 音擎名称。
  name?: string

  // 音擎等级。
  level?: number

  // 精炼等级。
  refineRank?: number

  // 音擎基础攻击力。
  baseAtk?: number

  // 音擎高级属性。
  advancedStat?: {
    // 高级属性键。
    key: PanelStatKey | PercentStatKey

    // 高级属性值。
    value: number
  }

  // 音擎被动原文或摘要。
  descriptionText?: string

  // 从音擎信息结构化出的效果。
  effects?: StructuredEffect[]
}
```

说明：

- `baseAtk` 与 `advancedStat` 是静态面板来源
- `descriptionText` 用于展示、追溯和 review
- `effects` 是结构化真源，后续可被归并到 `panel` 或 `extras`

### `DriveDiscStatEntry`

```ts
type DriveDiscStatKey = SourcePanelStatKey

interface DriveDiscStatEntry {
  // 词条键。
  key: DriveDiscStatKey

  // 词条数值。
  value: number
}
```

### `DriveDiscSnapshot`

```ts
interface DriveDiscSnapshot {
  // 盘位。
  slot: DriveDiscSlot

  // 套装名。
  setName?: string

  // 等级。
  level?: number

  // 主词条。
  mainStat?: DriveDiscStatEntry

  // 副词条。
  subStats?: DriveDiscStatEntry[]
}
```

### `DriveDiscSetEffectSnapshot`

```ts
interface DriveDiscSetEffectSnapshot {
  // 套装名。
  setName: string

  // 2 件套原文。
  twoPieceEffectText?: string

  // 4 件套原文。
  fourPieceEffectText?: string

  // 2 件套结构化效果。
  twoPieceEffects?: StructuredEffect[]

  // 4 件套结构化效果。
  fourPieceEffects?: StructuredEffect[]
}
```

说明：

- 原文和结构化效果同时保留
- 原文用于解释与 review
- `StructuredEffect` 才是后续归并到 `panel` 或 `extras` 的正式来源

### `DriveDiscSnapshotGroup`

```ts
interface DriveDiscSnapshotGroup {
  // 六个盘位快照。
  discs?: Partial<Record<DriveDiscSlot, DriveDiscSnapshot>>

  // 套装效果快照。
  setEffects?: DriveDiscSetEffectSnapshot[]
}
```

### `CombatExtraModifier`

```ts
interface CombatExtraModifier {
  // 规则稳定 id 或临时标识。
  id?: string

  // 额外乘区槽位。
  stat: ExtraModifierKey

  // 数值本体。
  value: number

  // 单位语义。
  unit: "ratio" | "flat" | "multiplier"

  // 来源说明。
  source?: string
}
```

### `CombatOverride`

```ts
interface CombatOverride {
  // 规则稳定 id 或临时标识。
  id?: string

  // 被覆盖槽位。
  stat: OverrideKey

  // 覆盖值。
  value: number

  // 上限。
  capValue?: number

  // 来源说明。
  source?: string
}
```

### `CombatExtras`

```ts
interface CombatExtras {
  // 不进面板、但本次计算额外参与的效果。
  modifiers: CombatExtraModifier[]

  // 覆盖类效果。
  overrides: CombatOverride[]
}
```

### `EnemyContextSnapshot`

```ts
interface EnemyContextSnapshot {
  // 敌人 id。
  enemyId?: string

  // 敌人名称。
  enemyName?: string

  // 敌方基础防御。
  baseDefense?: number

  // 敌方元素抗性。
  resistanceByAttribute?: Partial<Record<AttributeKey, number>>

  // 敌方失衡承伤倍率；multiplier 语义。
  stunDamageMultiplier?: number
}
```

### `ModeContextSnapshot`

```ts
interface ModeContextSnapshot {
  // 模式名，例如 "deadly-assault"。
  mode?: string

  // 版本键，例如 "2.6.3"。
  version?: string

  // 玩法实例中的名义 HP。
  rawHp?: number

  // 玩法实例中的替代 HP。
  altHp?: number
}
```

### `CombatContext`

```ts
interface CombatContext {
  // 敌方稳定上下文。
  enemy?: EnemyContextSnapshot

  // 模式或关卡稳定上下文。
  mode?: ModeContextSnapshot
}
```

### `AgentCombatInput`

```ts
interface AgentCombatInput {
  // 最终面板主输入。
  panel: AgentPanelSnapshot

  // 音擎快照。
  wEngine?: WEngineSnapshot

  // 驱动盘快照。
  driveDiscs?: DriveDiscSnapshotGroup

  // 面板外额外效果。
  extras?: CombatExtras

  // 敌方与模式上下文。
  context?: CombatContext
}
```

## 结算优先级

1. 优先读取 `panel`
2. 如果 `panel` 缺少某些字段，例如 `penFlat` 或 `attributeDamageBonus`，允许从：
   - `wEngine`
   - `driveDiscs`
   - `effects`
     回填
3. `extras` 中的内容不进入面板，直接作为当前快照额外效果参与结算
4. `context` 提供敌方与模式稳定上下文，不与角色 `panel` 混合
5. 覆盖类规则优先于普通叠加

## 面板来源边界

当前建议按以下原则归类：

- `panel`
  - 代理人基础属性
  - 代理人突破
  - 核心技特殊属性
  - 音擎基础攻击力
  - 音擎高级属性
  - 驱动盘主词条
  - 驱动盘副词条
  - 驱动盘 2 件套中的面板型属性
  - 驱动盘 2 件套中的属性伤害

- `extras`
  - 大多数战斗内触发的被动
  - 驱动盘 4 件套
  - 场地 buff
  - 敌方 debuff
  - 不直接进入面板的临时乘区

- `context`
  - 敌方基础防御、抗性、失衡承伤倍率
  - 玩法版本实例值
  - 不属于角色面板、但属于本次计算稳定上下文的内容

## 推荐落地顺序

1. 先冻结来源矩阵
   - 哪些来源进入 `panel`
   - 哪些来源进入 `extras`
   - 哪些来源属于 `overrides`
   - 哪些来源属于 `context`
2. 再补全缺失的结构化 source
   - 尤其是驱动盘主词条和副词条
3. 再基于本规格重构静态快照示例与后续 resolver
4. 最后再处理文本派生规则的 AI 理解与人工 review 流程

## 与其他规格的边界

- 修改纯函数公式、乘区或 resolved 输入时，更新 [damage-core.md](./damage-core.md)
- 修改 `data/enemy/` 目录、字段或语义时，更新 [enemy-data.md](./enemy-data.md)
- 修改本规格中的最终输入结构、效果归类或结算视图时，更新本文档
