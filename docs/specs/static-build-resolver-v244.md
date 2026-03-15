# V244 build-tool source-entry context helpers

`V243` 收口后，`resolve-build-execution.ts` 里仍混合了 execution-context helper 与 source-entry 的 panel/scenario gating 逻辑。

`V244` 只解决一件事：

1. 把 source-entry 的 panel/scenario gating helper 固定到单独共享模块，不改变任何 tool 的输入输出 shape

## 244.1 分阶段

1. `V244.1` scope freeze
2. `V244.2` source-entry context alignment
3. `V244.3` tests / runtime alignment
4. `V244.4` docs closeout

## 244.2 非目标

1. 不改变 source-entry `utilityOnly` 判定规则
2. 不改变 `finalPanel` 对 anomaly / disorder 的 gating 语义
3. 不改变任何 tool 的成功/失败 shape

## 244.3 当前状态

- `V244.1` 已完成：冻结到高层 build tool source-entry context helper
- `V244.2` 已完成：相关 source-entry context helper 已固定到单独共享模块
- `V244.3` 已完成：现有高层回归测试与 runtime 校验已覆盖
- `V244.4` 已完成：roadmap、索引与架构文档已同步
