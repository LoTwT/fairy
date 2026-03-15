# V262 build condition threshold iteration contracts

`V261` 收口后，`resolver.ts` 在处理 `minimumDynamicCounts / minimumDynamicValues / minimumStateValues` 时，仍通过 `keyof NonNullable<...>` cast 从条件 map 里取值。

`V262` 只解决一件事：

1. 让这些 threshold 条件统一走显式 typed iteration helper，不再依赖 `keyof NonNullable<...>` cast，不改变任何运行时行为

## 262.1 分阶段

1. `V262.1` scope freeze
2. `V262.2` threshold helper alignment
3. `V262.3` tests / runtime alignment
4. `V262.4` docs closeout

## 262.2 非目标

1. 不改变 effect condition 字段集合
2. 不改变 threshold 判定逻辑
3. 不扩展新的 condition helper

## 262.3 当前状态

- `V262.1` 已完成：冻结到 condition threshold iteration contract
- `V262.2` 已完成：`resolver.ts` 已统一走 typed threshold helper
- `V262.3` 已完成：现有 build / agent 测试与 runtime 校验已覆盖
- `V262.4` 已完成：roadmap、索引与架构文档已同步
