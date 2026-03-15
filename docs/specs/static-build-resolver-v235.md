# V235 build-tool catalog utils

`V234` 收口后，`resolve-build-shared.ts` 仍混合了 execution context helper 与 catalog 匹配工具。

`V235` 只解决一件事：

1. 把高层 build tool 的 catalog 匹配工具移到单独共享模块，不改变任何 tool 的输入输出 shape

## 235.1 分阶段

1. `V235.1` scope freeze
2. `V235.2` catalog helper alignment
3. `V235.3` tests / runtime alignment
4. `V235.4` docs closeout

## 235.2 非目标

1. 不改变 catalog 匹配规则
2. 不改变任何 response 的 message 文案与字段名
3. 不改变任何 tool 的输入 schema 与成功/失败 shape

## 235.3 当前状态

- `V235.1` 已完成：冻结到高层 build tool catalog helper
- `V235.2` 已完成：catalog 匹配工具已从 `resolve-build-shared.ts` 移到单独共享模块
- `V235.3` 已完成：现有高层回归测试与 runtime 校验已覆盖
- `V235.4` 已完成：roadmap、索引与架构文档已同步
