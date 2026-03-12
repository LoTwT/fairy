# 静态构筑解析系统 V6 范围

本文档冻结 `Static Build Resolver` 的下一主线范围，目标是在不引入时间轴模拟的前提下，为 anomaly / disorder 的剩余高价值机制提供更明确的 source-state snapshot contract。

`V5` 已解决“当前这一轮已经确定的额外次数 / 额外倍率”输入问题，但仍有一类剩余机制无法稳定表达：

- 依赖 source-specific 状态是否成立
- 依赖独立异常槽或特殊异常状态是否进入某个结算分支
- 依赖当前 source-specific 伤害倍率快照，而不是单纯的额外次数

这类场景若继续塞进 `dynamicSnapshot` 的 count/value 语义，会让 contract 含义继续混杂；但若直接进入时间轴模拟，又会越过当前系统边界。

因此，`V6` 的目标是：

- 保持静态快照模型
- 不引入时间轴 / 循环 / 覆盖率模拟
- 为 source-specific anomaly / disorder 状态快照提供稳定、可审计的输入 contract

## 当前进度

当前 `V6` 状态如下：

- `V6.1` contract freeze：已完成
- `V6.2` state snapshot resolver：已完成基础接线
- `V6.3` 第一批来源覆盖：已完成首批 `爱丽丝` / `雅`
- `V6.4` assumptions refinement：已完成首批 state-aware note 拆分

## 1. 为什么需要 V6

`V5` 收口后，剩余未展开项主要集中在：

- `爱丽丝` 的 `[极性强击]`
- `雅` 的独立烈霜异常槽、`[冰焰]` / `[霜灼]` / `[霜灼·破]`

这些项的共同点是：

- 不是简单的“这次额外触发了几次”
- 更接近“当前已知处于哪个 source-specific 结算状态”
- 一部分结果可由用户或上层 Agent 显式提供
- 但不适合由 resolver 自动猜测

## 2. V6 目标

`V6` 只做一条主线：

- 为 `resolveStaticBuildDamage` 增加 source-state snapshot context

`V6` 不做：

- 时间轴模拟
- 团队循环模拟
- anomaly / disorder skill matrix
- 独立异常槽积蓄过程模拟

## 3. V6 输入 Contract

### 3.1 `scenario.stateSnapshot`

`V6` 计划新增：

- `scenario.stateSnapshot`

用途：

- 表达当前这一轮结算已经确定的 source-specific 状态
- 与 `dynamicSnapshot` 并列存在，语义上区分“状态快照”和“次数/倍率快照”
- 只服务于 anomaly / disorder 的剩余高价值静态展开

推荐结构：

```ts
interface StaticBuildStateSnapshot {
  flags?: Partial<Record<StaticBuildStateFlagKey, boolean>>
  values?: Partial<Record<StaticBuildStateValueKey, number>>
}
```

约束：

- 所有 key 都必须是受控 canonical key
- 不接受自由字符串 map
- 缺失时继续回退到 assumptions，而不是默认猜测

### 3.2 `dynamicSnapshot` 与 `stateSnapshot` 的边界

边界约定：

- `dynamicSnapshot`
  - 表达“当前这一轮已经确定的次数或倍率”
  - 例如：额外触发次数、额外倍率
- `stateSnapshot`
  - 表达“当前这一轮已经确定处于哪个 source-specific 状态”
  - 例如：某个独立异常状态是否成立、某个特殊结算分支是否已经命中

如果一个规则同时需要“状态 + 比率”：

- 状态放 `stateSnapshot.flags`
- 比率放 `stateSnapshot.values` 或 `dynamicSnapshot.values`

## 4. V6 第一批目标来源

`V6` 第一批只覆盖当前最值得做、且可以通过静态状态快照表达的来源：

1. `爱丽丝`
   - `[极性强击]` 的 source-specific 结算倍率
2. `雅`
   - `[霜灼·破]` 的 source-specific 结算状态与倍率

这两类规则的共同点是：

- 当前 resolver 已能结算 anomaly / disorder
- 缺的是“当前这次是否进入该特殊结算状态，以及倍率是多少”
- 这些值可以由用户显式提供

## 5. V6 明确不做

`V6` 继续保持以下 out-of-scope：

- `雅` 的独立烈霜异常槽完整积蓄过程
- `柏妮思` 的触发链与间隔降低过程
- `爱丽丝` 的完整剑仪 / 追击过程
- anomaly / disorder skill matrix
- 时间轴与资源过程模拟

## 6. V6 分阶段

### 6.1 `V6.1` contract freeze

冻结：

- `scenario.stateSnapshot`
- `StaticBuildStateFlagKey`
- `StaticBuildStateValueKey`

第一批预留 key：

- `alicePolarityAssaultState`
- `miyabiFrostburnBreakState`
- `alicePolarityAssaultDamageRatio`
- `miyabiFrostburnBreakDamageRatio`

这一阶段只改文档、类型与 tool schema，不改结算行为。

### 6.2 `V6.2` state snapshot resolver

实现：

- `build/types.ts`
- `build/resolver.ts`
- `build/definitions.ts`

目标：

- 让 effect definition 能消费 `stateSnapshot`
- trace / assumptions 明确区分：
  - 缺少状态 flag
  - 缺少 state snapshot value
  - 当前仍未展开的动态机制

当前状态：

- 已完成 `types.ts` / `resolver.ts` / `resolve-build-damage` schema 的基础接线
- effect condition 已可消费 `stateSnapshot`
- 具体来源规则留在 `V6.3`

### 6.3 `V6.3` 第一批来源覆盖

第一批优先：

1. `爱丽丝`
2. `雅`

原则：

- 只补当前公式已有稳定落点的部分
- 不把独立异常槽积蓄过程伪装成静态能力

当前首批已完成：

1. `爱丽丝`
   - `scenario.stateSnapshot.flags.alicePolarityAssaultState`
   - `scenario.stateSnapshot.values.alicePolarityAssaultDamageRatio`
   - 已可作为 `anomaly` 路径中的 source-specific 结算倍率快照展开到 `skillMultiplierFactor`
2. `雅`
   - `scenario.stateSnapshot.flags.miyabiFrostburnBreakState`
   - `scenario.stateSnapshot.values.miyabiFrostburnBreakDamageRatio`
   - 当前仍不强行并入现有 anomaly / disorder 公式，只用于 state-aware assumptions 与来源记录

### 6.4 `V6.4` assumptions refinement

把 assumptions 继续细化成：

- 缺少 `stateSnapshot`
- 缺少某个具体 `flag`
- 缺少某个具体 `value`
- 当前仍未展开的动态机制

当前首批已完成：

- `爱丽丝`
  - 当 `[极性强击]` 状态存在但缺倍率值时，显式提示缺少 `alicePolarityAssaultDamageRatio`
  - 当状态与倍率值都提供时，显式提示已按 `scenario.stateSnapshot` 展开
- `雅`
  - 当 `[霜灼·破]` 状态存在但缺倍率值时，显式提示缺少 `miyabiFrostburnBreakDamageRatio`
  - 当状态与倍率值都提供时，显式提示当前仅记录状态与倍率快照，未把独立烈霜异常槽并入现有公式

## 7. 验收标准

`V6` 完成后，至少满足：

1. `resolveStaticBuildDamage` 能显式消费 `scenario.stateSnapshot`
2. 缺少 state snapshot 时，不静默猜值
3. `trace` 能说明用了哪个 state key
4. `assumptions` 能说明缺的是哪个 state key
5. 仍不引入时间轴模拟
