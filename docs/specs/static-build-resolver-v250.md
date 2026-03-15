# V250 build-tool specialty label contracts

`V249` 收口后，高层 build tool 共享标签模块里仍通过 `keyof typeof specialtyLabels` 直接耦合到标签值对象。

`V250` 只解决一件事：

1. 为高层 build tool 定义显式的 `BuildToolSpecialtyKey` / `BuildToolSpecialtyLabel` type，并让 `specialtyLabels` 仅作为满足这些 contract 的值对象存在，不改变任何 tool 的输入输出 shape

## 250.1 分阶段

1. `V250.1` scope freeze
2. `V250.2` specialty label alignment
3. `V250.3` tests / runtime alignment
4. `V250.4` docs closeout

## 250.2 非目标

1. 不改变 specialty label 的字符串文案
2. 不改变高层 build tool 的控制流
3. 不改变任何 tool 的成功/失败 shape

## 250.3 当前状态

- `V250.1` 已完成：冻结到高层 build tool specialty label contract
- `V250.2` 已完成：显式 `BuildToolSpecialtyKey` / `BuildToolSpecialtyLabel` type 已固定到共享模块，`specialtyLabels` 改为显式满足这些 contract
- `V250.3` 已完成：现有高层回归测试与 runtime 校验已覆盖
- `V250.4` 已完成：roadmap、索引与架构文档已同步
