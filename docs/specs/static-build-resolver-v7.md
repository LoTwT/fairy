# 静态构筑解析系统 V7 范围

本文档冻结 `Static Build Resolver` 的下一主线范围，目标是在不引入时间轴模拟的前提下，为“上层已经算出最终贡献、但当前 resolver 没有专用来源 key”的剩余机制提供稳定的显式 override contract。

`V6` 解决的是：

- source-specific 状态是否成立
- source-specific 状态对应的倍率快照

但当前仍有一类剩余机制不适合继续扩 `dynamicSnapshot` / `stateSnapshot`：

- 上层已经知道该机制对当前伤害结算的最终 bucket 贡献
- 但该贡献不一定对应新的 source-specific state key
- 若继续为每个来源新增专用 key，会让 contract 快速膨胀

因此，`V7` 的目标是：

- 继续保持静态快照模型
- 不引入时间轴 / 循环 / 资源过程模拟
- 为“已解析完成的最终 bucket 贡献”提供受控的 snapshot override contract

## 当前进度

- `V7.1` contract freeze：已完成
- `V7.2` resolver wiring：已完成
- `V7.3` source adoption：前两批已完成（`柏妮思 M6` 的 `25% 火抗无视 -> resolvedSnapshot.bucketDeltas.ignoreResistance`；`格莉丝 M2`、`简` 的异常积蓄效率 / 异常倍率折算 -> `resolvedSnapshot.multiplierFactors.skillMultiplierFactor`）

## 1. 为什么需要 V7

当前 remaining assumptions 中，已经有一批规则不是“缺少状态”，而是：

- 上层已经知道最终额外增伤 / 减防 / 无视抗性 / 异常精通 / 结算倍率
- 但这些值没有对应的 canonical 输入位
- 只能让用户手动改 `finalPanel`、`damageMultiplier` 或继续接受 assumptions

这会带来两个问题：

1. 明明已经知道最终贡献，却没有稳定入口
2. 用户被迫把 source-specific 结果伪装成别的输入字段

`V7` 用来解决这个问题。

## 2. V7 目标

`V7` 只做一条主线：

- 为 `resolveStaticBuildDamage` 增加 `scenario.resolvedSnapshot`

该字段用于表达：

- 上层已经显式计算出的最终 bucket 增量
- 或已经确定的最终倍率 factor

## 3. V7 输入 Contract

### 3.1 `scenario.resolvedSnapshot`

推荐结构：

```ts
interface StaticBuildResolvedSnapshotInput {
  bucketDeltas?: Partial<Record<StaticBuildResolvedSnapshotBucketKey, number>>
  multiplierFactors?: Partial<
    Record<StaticBuildResolvedSnapshotMultiplierKey, number>
  >
}
```

第一批冻结 key：

```ts
type StaticBuildResolvedSnapshotBucketKey =
  | "bonusDamageSum"
  | "defenseReduction"
  | "penetrationRate"
  | "resistanceReduction"
  | "ignoreResistance"
  | "sheerBonusSum"
  | "anomalyProficiency"
  | "anomalyBonusDamageSum"
  | "anomalyCritRate"
  | "anomalyCritDamage"

type StaticBuildResolvedSnapshotMultiplierKey = "skillMultiplierFactor"
```

### 3.2 语义约定

- `bucketDeltas`
  - 表达对当前 resolver bucket 的显式增量
- `multiplierFactors.skillMultiplierFactor`
  - 表达最终的 factor，而不是“相对 1 的增量”
  - resolver 在内部接线时自行转换到现有 bucket 语义

### 3.3 与其他 snapshot 的边界

- `dynamicSnapshot`
  - 当前这一轮已经确定的次数 / 倍率快照
- `stateSnapshot`
  - 当前这一轮已经确定的 source-specific 状态与倍率
- `resolvedSnapshot`
  - 上层已经计算好的最终 bucket 贡献或最终 factor

如果一个值已经能直接表达成最终 bucket 贡献，优先放 `resolvedSnapshot`，不要再为它扩新的 source-specific key。

## 4. V7 明确不做

`V7` 不做：

- 自由字符串 bucket 覆盖
- 任意 raw key 到 bucket 的自动映射
- skill matrix 的 override contract
- 时间轴 / 团队循环 / 资源过程模拟
- 额外命中次数与额外攻击条目的统一抽象

## 5. V7 分阶段

### 5.1 `V7.1` contract freeze

冻结：

- `scenario.resolvedSnapshot`
- `StaticBuildResolvedSnapshotBucketKey`
- `StaticBuildResolvedSnapshotMultiplierKey`

这一阶段只改：

- 文档
- public types
- `resolve-build-damage` tool schema

不改 resolver 结算行为。

### 5.2 `V7.2` resolver wiring

目标：

- 让 resolver 能消费 `resolvedSnapshot`
- `bucketDeltas` 叠加到现有 bucket
- `multiplierFactors.skillMultiplierFactor` 转成当前内部 bucket 语义
- assumptions 明确标记“当前已使用 scenario.resolvedSnapshot”

当前状态：

- `bucketDeltas` 已接入 resolver，并在结算前叠加到当前 bucket
- `multiplierFactors.skillMultiplierFactor` 已作为最终 factor 接入，并转到现有内部语义
- assumptions 已能显式标记：
  - `scenario.resolvedSnapshot.bucketDeltas`
  - `scenario.resolvedSnapshot.multiplierFactors.skillMultiplierFactor`

### 5.3 `V7.3` source adoption

优先把那些“上层已知最终贡献、但当前只能写 assumptions”的来源迁移到：

- `resolvedSnapshot.bucketDeltas`
- `resolvedSnapshot.multiplierFactors`

这一阶段只迁移高价值来源，不追求一次性清空全部 assumptions。

当前状态：

- 已完成第一批来源迁移：
  - `柏妮思` 影画 6 的 `25% 火抗无视`
  - 当前可通过 `scenario.resolvedSnapshot.bucketDeltas.ignoreResistance` 显式提供
- 已完成第二批来源迁移：
  - `格莉丝` 影画 2 的电能层数 / 电属性异常积蓄效率折算
  - `简` 的物理异常积蓄效率折算
  - 当前可通过 `scenario.resolvedSnapshot.multiplierFactors.skillMultiplierFactor` 显式提供
- 仍保留在 assumptions 的部分：
  - `柏妮思` 特殊 `[余烬]`
  - 额外 `[灼烧]` 结算

## 6. 验收标准

`V7` 完成后，至少满足：

1. `resolveStaticBuildDamage` 能显式消费 `scenario.resolvedSnapshot`
2. `bucketDeltas` 与 `multiplierFactors` 语义清晰，不和 `dynamicSnapshot` / `stateSnapshot` 混淆
3. 不允许自由字符串 bucket 注入
4. assumptions 能说明当前是否使用了显式 resolved snapshot
5. 仍不引入时间轴模拟
