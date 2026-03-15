# V246 build-tool scope key contracts

`V245` 收口后，高层 build tool 共享模块里仍通过 `keyof typeof buildToolScopeLabels` 直接耦合到 scope 标签值对象。

`V246` 只解决一件事：

1. 为高层 build tool 定义显式的 `BuildToolScopeKey` / `BuildToolScopeLabel` type，并让 `buildToolScopeLabels` 仅作为满足这些 contract 的值对象存在，不改变任何 tool 的输入输出 shape

## 246.1 分阶段

1. `V246.1` scope freeze
2. `V246.2` scope key alignment
3. `V246.3` tests / runtime alignment
4. `V246.4` docs closeout

## 246.2 非目标

1. 不改变任何 scope label 的字符串文案
2. 不改变任何高层 build tool 的控制流
3. 不改变任何 tool 的成功/失败 shape

## 246.3 当前状态

- `V246.1` 已完成：冻结到高层 build tool scope key / scope label contract
- `V246.2` 已完成：`BuildToolScopeKey` / `BuildToolScopeLabel` 已固定到共享模块，`buildToolScopeLabels` 改为显式满足这些 contract
- `V246.3` 已完成：现有高层回归测试与 runtime 校验已覆盖
- `V246.4` 已完成：roadmap、索引与架构文档已同步
