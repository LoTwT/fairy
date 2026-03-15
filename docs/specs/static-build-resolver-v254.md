# V254 build snapshot helper contracts

`V253` 收口后，`zzz-data` 的 build-layer 里仍有少量 helper 通过 `StaticBuildValueContext["dynamicSnapshot"]`、`StaticBuildValueContext["stateSnapshot"]` 和对应的 `keyof NonNullable<...>` 反推快照 key / 输入类型。

`V254` 只解决一件事：

1. 让 `definitions.ts` 与 `resolver.ts` 统一改用显式公开的 `StaticBuildDynamicSnapshotInput` / `StaticBuildStateSnapshotInput` / `StaticBuildDynamicValueKey` / `StaticBuildDynamicCountKey` / `StaticBuildStateValueKey`，不改变任何运行时行为

## 254.1 分阶段

1. `V254.1` scope freeze
2. `V254.2` snapshot helper alignment
3. `V254.3` tests / runtime alignment
4. `V254.4` docs closeout

## 254.2 非目标

1. 不改变 `StaticBuildValueContext` 的字段定义
2. 不改变任何 effect/source-note 的条件判断逻辑
3. 不新增新的 public snapshot 字段

## 254.3 当前状态

- `V254.1` 已完成：冻结到 build-layer snapshot helper contract
- `V254.2` 已完成：`definitions.ts` 与 `resolver.ts` 已统一复用显式 snapshot input / key type
- `V254.3` 已完成：现有 build / agent 测试与 runtime 校验已覆盖
- `V254.4` 已完成：roadmap、索引与架构文档已同步
