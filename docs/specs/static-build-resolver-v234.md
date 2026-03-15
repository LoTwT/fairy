# V234 build-tool response contracts

`V233` 收口后，`resolve-build-shared.ts` 仍同时承担 execution context helper 与高层 tool response contract 定义。

`V234` 先解决一件事：

1. 把高层 build tool 的公开 response contract types 与 `scopeLabel` 常量移到单独共享模块，不改变任何 tool 的输入输出 shape

## 234.1 分阶段

1. `V234.1` scope freeze
2. `V234.2` shared contract alignment
3. `V234.3` tests / runtime alignment
4. `V234.4` docs closeout

## 234.2 非目标

1. 不改变任何 response 的字段名与 message 文案
2. 不改变 response builder 的运行逻辑
3. 不改变任何 tool 的输入 schema 与成功/失败 shape

## 234.3 当前状态

- `V234.1` 已完成：冻结到高层 build tool response contract types 与 `scopeLabel`
- `V234.2` 已完成：相关 contract 已从 `resolve-build-shared.ts` 移到单独共享模块
- `V234.3` 已完成：现有高层回归测试与 runtime 校验已覆盖
- `V234.4` 已完成：roadmap、索引与架构文档已同步
