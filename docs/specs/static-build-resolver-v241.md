# V241 build-tool scenario helpers

`V240` 收口后，`resolve-build-shared.ts` 里仍混合了 execution-context helper 与高层 build tool 的 scenario 归一化逻辑。

`V241` 只解决一件事：

1. 把高层 build tool 的 `attribute / disorder.anomalyType / damageType` 归一化 helper 移到单独共享模块，不改变任何 tool 的输入输出 shape

## 241.1 分阶段

1. `V241.1` scope freeze
2. `V241.2` scenario helper alignment
3. `V241.3` tests / runtime alignment
4. `V241.4` docs closeout

## 241.2 非目标

1. 不改变任何 `scenario` 字段名、默认值或兼容性规则
2. 不改变 execution-context helper 的控制流
3. 不改变任何 tool 的成功/失败 shape

## 241.3 当前状态

- `V241.1` 已完成：冻结到高层 build tool scenario helper
- `V241.2` 已完成：相关 scenario helper 已从 `resolve-build-shared.ts` 移到单独共享模块
- `V241.3` 已完成：现有高层回归测试与 runtime 校验已覆盖
- `V241.4` 已完成：roadmap、索引与架构文档已同步
