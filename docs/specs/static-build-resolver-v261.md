# V261 build effect trait contracts

`V260` 收口后，`build/types.ts` 里还剩两处公开 trait 没复用现成 alias：`StaticBuildEffectCondition.minimumMindscape` 仍是裸 `number`，`StaticBuildEffectDefinition.sourceType` 仍手写 source literal union。

`V261` 只解决一件事：

1. 让 `StaticBuildEffectCondition` 与 `StaticBuildEffectDefinition` 统一复用显式 `StaticBuildAgentMindscape` / `StaticBuildSourceType`，不改变任何运行时行为

## 261.1 分阶段

1. `V261.1` scope freeze
2. `V261.2` effect trait alignment
3. `V261.3` tests / runtime alignment
4. `V261.4` docs closeout

## 261.2 非目标

1. 不改变 effect condition 匹配逻辑
2. 不改变 effect definition 的字段集合
3. 不扩展新的 progression trait

## 261.3 当前状态

- `V261.1` 已完成：冻结到 effect condition / definition 的公开 trait contract
- `V261.2` 已完成：`minimumMindscape` / `sourceType` 已统一复用显式 alias
- `V261.3` 已完成：现有 build / agent 测试与 runtime 校验已覆盖
- `V261.4` 已完成：roadmap、索引与架构文档已同步
