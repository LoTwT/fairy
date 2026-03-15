# V256 build source-note condition key contracts

`V255` 收口后，`definitions.ts` 的 `StaticBuildSourceNote` 仍手写了一组 dynamic/state/damage/disorder 条件字面量 union。

`V256` 只解决一件事：

1. 让 `StaticBuildSourceNote` 统一复用显式公开的 `StaticBuildDynamicFlagKey` / `StaticBuildDynamicCountKey` / `StaticBuildDynamicValueKey` / `StaticBuildStateFlagKey` / `StaticBuildStateValueKey` / `StaticBuildDamageType` / `AnomalyType`，不改变任何运行时行为

## 256.1 分阶段

1. `V256.1` scope freeze
2. `V256.2` source-note condition key alignment
3. `V256.3` tests / runtime alignment
4. `V256.4` docs closeout

## 256.2 非目标

1. 不改变 source-note 的匹配逻辑
2. 不新增新的 source-note condition 字段
3. 不改变 source-note 的 message / guidance 输出

## 256.3 当前状态

- `V256.1` 已完成：冻结到 source-note 条件 key contract
- `V256.2` 已完成：`StaticBuildSourceNote` 已统一复用显式 dynamic/state/damage/disorder key type
- `V256.3` 已完成：现有 build / agent 测试与 runtime 校验已覆盖
- `V256.4` 已完成：roadmap、索引与架构文档已同步
