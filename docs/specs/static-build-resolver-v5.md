# 静态构筑解析系统 V5 范围

本文档冻结 `Static Build Resolver` 的下一主线范围，目标是在不引入时间轴模拟的前提下，让 resolver 能消费“用户显式提供的动态快照”。

这里的动态快照不是战斗模拟，而是：

- 当前这一轮结算已经确定的触发次数
- 当前这一轮结算已经确定的额外结算倍率
- 当前这一轮结算已经确定的 source-specific 状态

`V5` 的核心不是自动推导这些值，而是为它们提供稳定、可审计的输入 contract。

## 当前进度

当前 `V5` 已在当前 contract 下收口，状态如下：

- `V5.1` contract freeze：已完成
- `V5.2` dynamic snapshot resolver：已完成基础接线
- `V5.3` 第一批来源覆盖：已完成
- `V5.4` assumptions refinement：已完成

## 1. 为什么需要 V5

`V4` 已在当前 contract 下收口。剩余未展开项主要集中在：

- 额外结算次数
- 额外结算倍率
- 后台自动释放转成的显式命中次数
- 当前轮次已知的 source-specific 状态

这些值如果继续靠隐式假设，会把静态 resolver 做成“假精确”；如果直接进入时间轴模拟，又会越过当前系统边界。

因此，`V5` 的目标是：

- 保持静态快照模型
- 不引入时间轴 / 覆盖率 / 循环模拟
- 允许用户或上层 Agent 显式提供少量动态快照值

## 2. V5 目标

`V5` 只做一条主线：

- 为 `resolveStaticBuildDamage` 增加 source-aware dynamic snapshot context

`V5` 不做：

- 时间轴模拟
- 团队循环模拟
- anomaly / disorder skill matrix
- 自动从文本推导触发次数 / 额外倍率

## 3. V5 输入 Contract

### 3.1 `scenario.dynamicSnapshot`

`V5` 计划新增：

- `scenario.dynamicSnapshot`

用途：

- 作为当前这一轮结算的显式快照输入
- 只服务于 source-specific dynamic rules
- 不替代 `combatTags`

推荐结构：

```ts
interface StaticBuildDynamicSnapshot {
  flags?: Partial<Record<StaticBuildDynamicFlagKey, boolean>>
  counts?: Partial<Record<StaticBuildDynamicCountKey, number>>
  values?: Partial<Record<StaticBuildDynamicValueKey, number>>
}
```

约束：

- 所有 key 都必须是受控的 canonical key
- 不接受自由字符串 map
- 不做隐式推导
- 缺失时继续回退到 assumptions，而不是默认猜测

### 3.2 `combatTags` 与 `dynamicSnapshot` 的边界

边界约定：

- `combatTags`
  - 表达“当前状态是否成立”
  - 例如：是否处于某状态、目标是否满足某标记
- `dynamicSnapshot`
  - 表达“当前这一轮已经确定的数量或倍率”
  - 例如：额外结算次数、额外倍率、后台额外命中数

如果一个规则需要“是否成立 + 数值”，则：

- 状态放 `combatTags`
- 数值放 `dynamicSnapshot`

## 4. V5 第一批目标来源

`V5` 第一批只覆盖当前最值得做、且不需要时间轴模拟的来源：

1. `柏妮思`
   - `[余烬]` 额外触发次数
   - `[余烬]` 额外倍率
2. `爱芮`
   - `[异放]` 额外倍率
   - 失衡目标额外倍率

这两类规则的共同点是：

- 当前公式里已经有可落位的倍率位置
- 但缺的是“当前这次到底触发了几次 / 倍率是多少”
- 这些值可以由用户显式提供

## 5. V5 明确不做

`V5` 继续保持以下 out-of-scope：

- `雅` 的独立烈霜异常槽与 `[霜灼·破]`
- `柳` 的月相切换与能量消耗节奏
- `派派` 的动力层数积蓄效率过程
- `奥菲丝&「鬼火」` 的后台自动释放循环
- `简` / `柏妮思` / `爱芮` 的 M6 额外攻击或复杂追加结算

这些项都更接近：

- 新 damage view
- 或新的战斗过程模拟

而不是当前静态快照模型。

## 6. V5 分阶段

### 6.1 `V5.1` contract freeze

冻结：

- `scenario.dynamicSnapshot`
- `StaticBuildDynamicFlagKey`
- `StaticBuildDynamicCountKey`
- `StaticBuildDynamicValueKey`

这一阶段只改文档、类型与 tool schema，不改结算行为。

### 6.2 `V5.2` dynamic snapshot resolver

实现：

- `build/types.ts`
- `build/resolver.ts`
- `build/definitions.ts`

目标：

- 让 effect definition 能消费 `dynamicSnapshot`
- trace / assumptions 明确区分：
  - 缺状态 tag
  - 缺 dynamic snapshot key
  - 当前仍未展开的动态机制

当前状态：

- 已完成 `types.ts` / `resolver.ts` / `resolve-build-damage` schema 的基础接线
- 具体来源规则仍留在 `V5.3`

### 6.3 `V5.3` 第一批来源覆盖

第一批优先：

1. `柏妮思`
2. `爱芮`

原则：

- 只补当前公式已有稳定落点的部分
- 不把“次数自动推导”伪装成静态能力

当前状态：

- 已完成 `柏妮思` 的 `[余烬]` 动态快照：
  - `flags.burniceEmberState`
  - `counts.burniceEmberExtraTriggers`
  - `values.burniceEmberDamageRatio`
- 已完成 `爱芮` 的 `[异放]` 动态快照：
  - `values.ariaExflowDamageRatio`
  - `values.ariaStunnedDamageRatio`
- 当前这些值都会直接进入 `anomalyBonusDamageSum`，trace 中可见对应来源 effect

### 6.4 `V5.4` assumptions refinement

已完成以下细化：

- 缺少 `dynamicSnapshot`
- 缺少某个具体 key
- 当前仍未展开的动态机制

当前已能对首批来源输出更具体的 source-specific assumptions：

- `柏妮思`
  - 缺少 `flags.burniceEmberState`
  - 缺少 `counts.burniceEmberExtraTriggers`
  - 缺少 `values.burniceEmberDamageRatio`
  - 已按 `[燃点]/[余烬]` 动态快照展开额外结算倍率
- `爱芮`
  - 缺少 `values.ariaExflowDamageRatio`
  - 缺少失衡目标下的 `values.ariaStunnedDamageRatio`
  - 已按 `[异放]` 动态快照展开额外倍率

## 7. 验收标准

`V5` 完成后，至少满足：

1. `resolveStaticBuildDamage` 能显式消费 `scenario.dynamicSnapshot`
2. 缺少动态快照时，不静默猜值
3. `trace` 能说明用了哪个 key
4. `assumptions` 能说明缺的是哪个 key
5. 仍不引入时间轴模拟

当前状态：以上条件已满足，`V5` 在当前 contract 下已完成。
