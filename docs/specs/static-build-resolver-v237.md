# V237 build-tool specialty labels

`V236` 收口后，`resolve-build-shared.ts` 里仍保留了高层 build tool 的 `specialtyLabels` 常量，影响后续把 reject-path response helper 继续拆出。

`V237` 只解决一件事：

1. 把高层 build tool 的 `specialtyLabels` 常量移到单独共享模块，不改变任何 tool 的输入输出 shape

## 237.1 分阶段

1. `V237.1` scope freeze
2. `V237.2` label alignment
3. `V237.3` tests / runtime alignment
4. `V237.4` docs closeout

## 237.2 非目标

1. 不改变任何 label 文案
2. 不改变 execution context helper 的 reject path
3. 不改变任何 tool 的输入 schema 与成功/失败 shape

## 237.3 当前状态

- `V237.1` 已完成：冻结到高层 build tool `specialtyLabels`
- `V237.2` 已完成：`specialtyLabels` 已从 `resolve-build-shared.ts` 移到单独共享模块
- `V237.3` 已完成：现有高层回归测试与 runtime 校验已覆盖
- `V237.4` 已完成：roadmap、索引与架构文档已同步
