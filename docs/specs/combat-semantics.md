# 战斗语义快照规格（V1）

## 范围

本规格定义一套面向静态伤害计算的通用语义结构，用于承载：

- `agent`
- `w-engine`
- `drive-disc`
- `buff`
- 其他未来需要参与伤害计算的实体

本规格只解决：

- 某个瞬间需要参与计算的静态规则如何表达
- 哪些数值属于“面板组装”
- 哪些数值属于“当前快照额外效果”
- 上层如何把这些规则汇总为 `damage-core` 需要的数值输入

本规格明确不解决：

- 完整战斗过程模拟
- 状态机、事件流、持续时间流逝
- 从原始 source 文本自动抽取全部规则
- 特殊属性的独立建模
  - 当前 `烈霜`、`凛刃`、`玄墨` 等特殊属性暂不单独建模
  - 在本规格范围内，先按其原始属性参与计算

## 设计目标

- 让“静态快照计算”只组合强相关的数据
- 把“组装面板”和“当前快照额外效果”分开
- 支持用户直接输入最终面板，避免重复叠加
- 作为 `damage-core` 之上的轻量规则层，不引入完整战斗引擎
- 给后续 `agent / w-engine / drive-disc / buff` 的处理后数据提供统一结构

## 设计原则

### 1. 计算时只组合强相关内容

一次静态计算真正需要组合的只有两组数据：

1. 当前已经确定的有效面板
2. 这个瞬间额外生效的快照规则

其他内容，例如：

- 展示文案
- 图片
- 原始 source 结构
- 非当前瞬间生效的说明

都不应进入这层结构。

### 2. 面板组装和快照加成分开

有些数值会进入最终面板，有些不会；并不存在一个始终可靠的通用规则。

因此本规格不尝试在抽象层面强行判断“所有来源里哪些一定进面板”，而是只做这两个区分：

- `panel`
  - 只用于“系统根据规则组装面板”的场景
- `snapshot`
  - 只表示这个瞬间会额外参与计算的效果

### 3. `final-panel` 优先于 `assembled-panel`

如果调用方直接提供最终面板：

- `panel` 整块应被忽略
- 只使用 `snapshot` 参与计算

如果调用方没有提供最终面板，而是希望系统根据结构化规则组装：

- 才使用 `panel.contributions`

### 4. 先解决静态快照，不做过程模拟

本规格只描述“这个瞬间需要哪些输入和规则”，不模拟：

- buff 何时获得
- 状态如何流转
- 层数如何随时间变化

这些都由外部在这个瞬间以输入值的形式提供。

## 与 `damage-core` 的关系

`docs/specs/damage-core.md` 负责定义纯函数公式层。

本规格位于其上游，作用是把处理后实体数据整理成更接近 `damage-core` 的输入语义。

职责分层如下：

- `damage-core`
  - 只关心已归一化好的数值乘区
- `combat-semantics`
  - 关心某个实体在当前快照下可能提供哪些面板贡献和额外乘区
- `profile`
  - 关心展示与文本

## 核心概念

### `PanelInputMode`

```ts
// 调用方是直接提供最终面板，还是让系统根据规则组装面板。
type PanelInputMode = "final-panel" | "assembled-panel"
```

约定：

- `final-panel`
  - 调用方已经提供最终有效面板
  - `panel.contributions` 不再参与本次计算
- `assembled-panel`
  - 调用方没有提供最终面板
  - 系统可根据 `panel.contributions` 与外部输入组装面板

### `PanelStatKey`

```ts
// 会进入最终有效面板的属性键。
type PanelStatKey =
  | "atk"
  | "critRate"
  | "critDamage"
  | "penFlat"
  | "penRate"
  | "impact"
  | "anomalyMastery"
  | "anomalyProficiency"
```

约定：

- 这里只保留当前静态伤害计算最相关的面板属性
- `ratio` 语义统一用小数表示，例如 `0.15` 表示 `15%`

### `SnapshotModifierKey`

```ts
// 不默认进入面板、但在当前瞬间直接参与伤害计算的槽位。
type SnapshotModifierKey =
  | "damageBonus"
  | "sheerBonus"
  | "defenseReduction"
  | "resistanceReduction"
  | "vulnerabilityBonus"
  | "dazeVulnerabilityBonus"
  | "specialMultiplier"
  | "critRate"
  | "critDamage"
  | "penFlat"
  | "penRate"
```

约定：

- 这些键表示的是“这个瞬间额外参与计算的贡献”
- 并不意味着它们一定不显示在游戏 UI 面板里
- 它们只是“不作为最终面板的默认组成部分”来处理

## 通用结构

### `SnapshotInputDefinition`

```ts
interface SnapshotInputDefinition {
  // 输入键，供 condition / stack / override 引用。
  key: string

  // 给 AI / UI 展示的短名称。
  label: string

  // 输入类型；stack 本质上仍是 number，但语义更明确。
  kind: "boolean" | "number" | "stack"

  // 对这个输入的说明。
  description: string

  // 数值单位；ratio 用 0.15 表示 15%。
  unit?: "flat" | "ratio" | "stack"

  // 外部未显式提供时的默认值。
  defaultValue?: boolean | number

  // 数值下限。
  min?: number

  // 数值上限。
  max?: number
}
```

目标：

- 描述“这个瞬间必须由外部告诉系统”的状态值
- 例如：
  - 是否处于某状态
  - 当前层数
  - 当前某个快照 bonus ratio

### `ActivationCondition`

```ts
interface ActivationCondition {
  // 引用哪个 snapshot input。
  inputKey: string

  // 条件比较方式。
  operator: "equals" | "gte" | "lte"

  // 条件需要满足的值。
  value: boolean | number
}
```

目标：

- 描述某条规则在什么快照输入下生效
- 只表达“这一刻是否生效”，不表达过程

### `PanelContributionDefinition`

```ts
interface PanelContributionDefinition {
  // 规则稳定 id。
  id: string

  // 简短标签，给 AI / UI 展示。
  label: string

  // 作用到哪个面板属性。
  stat: PanelStatKey

  // 固定数值；ratio 用 0.15 表示 15%。
  value?: number

  // 数值单位。
  unit?: "flat" | "ratio"

  // 生效条件；为空表示默认参与面板组装。
  activation?: ActivationCondition[]

  // 如果这是层数型面板收益，层数从哪个输入读取。
  stackInputKey?: string

  // 每层提供多少数值。
  valuePerStack?: number

  // 最大层数。
  maxStacks?: number
}
```

目标：

- 描述“如果系统要组装最终面板，这条规则会给面板带来什么贡献”
- 这类规则只在 `assembled-panel` 模式下使用

约定：

- 如果同时存在 `value` 和 `stackInputKey`，则总值按：
  - `value + valuePerStack × stacks`
  - 其中 `stacks` 需要 clamp 到 `maxStacks`
- 如果调用方提供的是 `final-panel`，则整条规则不参与本次计算

### `SnapshotModifierDefinition`

```ts
interface SnapshotModifierDefinition {
  // 规则稳定 id。
  id: string

  // 简短标签。
  label: string

  // 作用到哪个快照计算槽位。
  stat: SnapshotModifierKey

  // 固定数值；ratio 用 0.10 表示 10%。
  value?: number

  // 数值单位。
  unit?: "flat" | "ratio" | "multiplier"

  // 作用目标。
  target: "self" | "team" | "enemy"

  // 生效条件。
  activation?: ActivationCondition[]

  // 如果是层数型效果，层数从哪个输入读取。
  stackInputKey?: string

  // 每层提供多少数值。
  valuePerStack?: number

  // 最大层数。
  maxStacks?: number
}
```

目标：

- 描述当前瞬间额外参与计算的贡献项
- 不要求它们进入最终面板

约定：

- `ratio` 统一用加成语义
  - `0.25` 表示 `+25%`
- `multiplier` 统一用最终倍率语义
  - `1.5` 表示 `1.5x`
- 如果是层数型效果，总值按：
  - `value + valuePerStack × stacks`
  - 其中 `stacks` 需要 clamp 到 `maxStacks`

### `SnapshotOverrideDefinition`

```ts
interface SnapshotOverrideDefinition {
  // 规则稳定 id。
  id: string

  // 简短标签。
  label: string

  // 被覆盖的目标槽位。
  stat: "dazeVulnerabilityBonus"

  // 从哪个 snapshot input 取覆盖值。
  inputKey: string

  // 生效条件。
  activation?: ActivationCondition[]

  // 覆盖值上限；ratio 语义下 1.10 表示 110% bonus。
  capValue?: number
}
```

目标：

- 描述“某个槽位不是普通叠加，而是由当前快照输入直接给定”
- 当前只保留最明确需要的 `dazeVulnerabilityBonus` 覆盖场景

约定：

- 这不是普通加法，而是槽位覆盖
- 上层 resolver 应在进入 `damage-core` 前先处理覆盖逻辑

### `CombatSemanticsBlock`

```ts
interface CombatSemanticsBlock {
  // 只用于组装最终面板的规则。
  panel?: {
    // 所有可能参与面板组装的贡献项。
    contributions: PanelContributionDefinition[]
  }

  // 当前快照下直接参与计算的规则。
  snapshot: {
    // 外部在这个瞬间需要补充的输入。
    inputs: SnapshotInputDefinition[]

    // 当前瞬间额外生效的乘区或数值贡献。
    modifiers: SnapshotModifierDefinition[]

    // 当前瞬间的槽位覆盖规则。
    overrides: SnapshotOverrideDefinition[]
  }
}
```

目标：

- 作为 `agent / w-engine / drive-disc / buff` 可复用的通用结构
- 用最少的分层表达“组装面板”和“当前快照计算”

## 计算时的组合方式

### `final-panel`

如果调用方已经提供最终有效面板：

1. 忽略 `panel.contributions`
2. 读取 `snapshot.inputs`
3. 根据 `activation`、层数和 `overrides` 得到当前快照的额外效果
4. 将结果汇总为 `damage-core` 所需的 resolved 数值

### `assembled-panel`

如果调用方没有提供最终面板：

1. 读取 `panel.contributions`
2. 根据 `snapshot.inputs` 和 `activation` 组装出最终有效面板
3. 再处理 `snapshot.modifiers`
4. 再处理 `snapshot.overrides`
5. 汇总为 `damage-core` 所需的 resolved 数值

## 统一数值语义

为避免字段解释不一致，统一采用以下规则：

- 百分比加成统一使用 `ratio`
  - `0.15` 表示 `15%`
- 固定值统一使用 `flat`
  - `200` 表示固定增加 `200`
- 最终倍率统一使用 `multiplier`
  - `1.5` 表示 `1.5x`

本规格不接受：

- 带 `%` 的字符串数值
- 同一字段既可能是百分比又可能是倍率

## 当前限制

- 当前不单独建模特殊属性替换
  - `烈霜`、`凛刃`、`玄墨` 暂时仍按原始属性参与计算
- 当前 `SnapshotOverrideDefinition.stat` 只开放 `dazeVulnerabilityBonus`
- 当前结构只描述“静态快照下如何结算”，不描述获取过程

## 推荐落地顺序

1. 先以 `agent` 为第一批试点
2. 先验证：
   - `panel.contributions`
   - `snapshot.inputs`
   - `snapshot.modifiers`
   - `snapshot.overrides`
3. 再扩展到 `buff`
4. 再扩展到 `w-engine` 和 `drive-disc`

## 与其他规格的边界

- 修改纯函数公式、乘区或 resolved 输入时，更新 [damage-core.md](./damage-core.md)
- 修改 `data/enemy/` 目录、字段或语义时，更新 [enemy-data.md](./enemy-data.md)
- 修改本规格中的静态快照语义结构时，更新本文档
