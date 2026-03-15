# V255 build source-note source type contracts

`V254` 收口后，`definitions.ts` 的 source-note / coverage helper 仍通过 `StaticBuildEffectDefinition["sourceType"]` 反推来源类型。

`V255` 只解决一件事：

1. 让 source-note / coverage helper 统一改用显式公开的 `StaticBuildSourceType`，不改变任何运行时行为

## 255.1 分阶段

1. `V255.1` scope freeze
2. `V255.2` source-note sourceType alignment
3. `V255.3` tests / runtime alignment
4. `V255.4` docs closeout

## 255.2 非目标

1. 不改变 `StaticBuildEffectDefinition` 的结构
2. 不改变 source-note / coverage helper 的控制流
3. 不扩展新的 source-note 字段

## 255.3 当前状态

- `V255.1` 已完成：冻结到 source-note / coverage helper 的 sourceType contract
- `V255.2` 已完成：`definitions.ts` 已统一复用显式 `StaticBuildSourceType`
- `V255.3` 已完成：现有 build / agent 测试与 runtime 校验已覆盖
- `V255.4` 已完成：roadmap、索引与架构文档已同步
