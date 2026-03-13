# 静态构筑解析系统 V66

`V65` 收口后，`skill-matrix summary groups` 已能稳定给出局部 `assumptions / unsupportedEffects`。

但整张 skill matrix 顶层仍只有 `assumptions`，没有对称的 `unsupportedEffects`。上层如果想先判断整张矩阵是否存在 unsupported coverage gap，仍要重新遍历 rows 再自行去重聚合。

`V66` 只解决一件事：

- 为 `ResolveStaticBuildSkillMatrixResult` 增加顶层 `unsupportedEffects`

## 当前状态

- `V66.1` 已完成：冻结到 top-level skill-matrix unsupportedEffects
- `V66.2` 已完成：`ResolveStaticBuildSkillMatrixResult` 与 compact result 已新增顶层 `unsupportedEffects`
- `V66.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `matrix.unsupportedEffects`
- `V66.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步
