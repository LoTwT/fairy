# 静态构筑解析系统 V22

`V20` 和 `V21` 已经分别把：

- source-specific utility / energy views
- anomaly / disorder trigger-entry matrix

落成独立 contract。

但它们当前仍主要依赖：

- `id`
- `label`

来给上层消费。相比 `skill matrix` 已经具备的 `canonicalLabel / stableKey / entryKind`，source entry 这层还不够稳定。

`V22` 的目标是：

- 为 `source damage view` 和 `source utility view` 补齐稳定 metadata
- 让 Agent / UI 优先消费 metadata，而不是继续解析自由文本 label

## 1. 目标

为两类 source entry 补齐统一 metadata：

1. `StaticBuildSourceDamageViewEntry`
2. `StaticBuildSourceUtilityViewEntry`

## 2. 为什么现在做

当前已有问题很明确：

1. 上层如果只靠 `label`，仍需要自己拆字符串
2. `id` 虽然稳定，但不适合作为直接展示字段
3. `V21 trigger-entry matrix` 的 source-view 行已经有 `canonicalLabel / stableKey / entryKind`
4. `V20 utility view` 还没有同等级的稳定 metadata

所以 `V22` 要做的是把 source entry contract 对齐到 matrix 风格，而不是继续扩更多 view 种类。

## 3. V22 contract

### 3.1 source damage view metadata

新增：

- `StaticBuildSourceDamageViewMeta`

最小字段：

- `canonicalLabel`
- `stableKey`
- `entryKind`
- `damageType`
- `resolutionMode`

其中：

- `entryKind` 固定为 `source-damage-view`
- `stableKey` 以 `source-view:${id}` 为主

### 3.2 source utility view metadata

新增：

- `StaticBuildSourceUtilityViewMeta`

最小字段：

- `canonicalLabel`
- `stableKey`
- `entryKind`
- `utilityType`
- `resolutionMode`
- `targetScope`
- `unit`

其中：

- `entryKind` 固定为 `source-utility-view`
- `stableKey` 以 `source-utility:${id}` 为主

### 3.3 不做新的矩阵

`V22` 不新增：

1. utility matrix
2. 新的 trigger matrix 类型
3. 新的 damage type
4. 新的 snapshot key

## 4. 实施顺序

1. `V22.1` scope freeze
2. `V22.2` source damage view metadata
3. `V22.3` source utility view metadata
4. `V22.4` agent / docs integration
5. `V22.5` closeout

## 5. 验收标准

`V22` 完成后，至少满足：

1. source damage view 不再只有 `id + label`
2. source utility view 不再只有 `id + label`
3. `zzz-agent` prompt 明确优先使用 metadata
4. README / architecture / roadmap 已同步

## 6. 当前实现状态

当前已完成：

1. `StaticBuildSourceDamageViewMeta`
2. `StaticBuildSourceUtilityViewMeta`
3. `source-view:${id}` / `source-utility:${id}` 稳定键
4. `zzz-agent` prompt 已优先消费 `entry.metadata`
