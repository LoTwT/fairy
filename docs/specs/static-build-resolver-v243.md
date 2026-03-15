# V243 build-tool specialty key contracts

`V242` 收口后，高层 build tool 共享模块里仍通过 `keyof typeof specialtyLabels` 直接耦合到标签值对象。

`V243` 只解决一件事：

1. 为高层 build tool 定义显式的 `BuildToolSpecialtyKey` type，并让 loadout / execution / response helper 统一复用它，不改变任何 tool 的输入输出 shape

## 243.1 分阶段

1. `V243.1` scope freeze
2. `V243.2` specialty key alignment
3. `V243.3` tests / runtime alignment
4. `V243.4` docs closeout

## 243.2 非目标

1. 不改变 `specialtyLabels` 的值或显示文案
2. 不改变任何 catalog / loadout / response helper 的控制流
3. 不改变任何 tool 的成功/失败 shape

## 243.3 当前状态

- `V243.1` 已完成：冻结到高层 build tool specialty key contract
- `V243.2` 已完成：`BuildToolSpecialtyKey` 已固定到共享模块，并在 loadout / execution / response helper 中统一复用
- `V243.3` 已完成：现有高层回归测试与 runtime 校验已覆盖
- `V243.4` 已完成：roadmap、索引与架构文档已同步
