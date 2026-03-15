# V236 build-tool response helpers

`V235` 收口后，`resolve-build-shared.ts` 仍同时承担 execution context helper 与高层 build tool 的成功/coverage response helper。

`V236` 只解决一件事：

1. 把高层 build tool 的成功 response 与 source-view/source-entry coverage response helper 移到单独共享模块，不改变任何 tool 的输入输出 shape

## 236.1 分阶段

1. `V236.1` scope freeze
2. `V236.2` response helper alignment
3. `V236.3` tests / runtime alignment
4. `V236.4` docs closeout

## 236.2 非目标

1. 不改变任何 response 的字段名与 message 文案
2. 不改变 execution context helper 的 reject path
3. 不改变任何 tool 的输入 schema 与成功/失败 shape

## 236.3 当前状态

- `V236.1` 已完成：冻结到高层 build tool success / coverage response helper
- `V236.2` 已完成：相关 response helper 已从 `resolve-build-shared.ts` 移到单独共享模块
- `V236.3` 已完成：现有高层回归测试与 runtime 校验已覆盖
- `V236.4` 已完成：roadmap、索引与架构文档已同步
