# 静态构筑解析系统 V71

`V70` 收口后，整张 `trigger-entry matrix` 顶层已经有稳定的 `assumptionSummary`。

但单行 `row` 仍只有 `assumptions` 裸数组。上层如果只想判断某一行是否带 assumptions、共有多少条，仍要自己统计数组长度。

`V71` 只解决一件事：

- 为 `StaticBuildTriggerMatrixRow` 与 compact row 增加局部 `assumptionSummary`

## 当前状态

- `V71.1` 已完成：冻结到 row-level trigger-matrix assumption summary
- `V71.2` 已完成：`StaticBuildTriggerMatrixRow` 与 compact row 已新增局部 `assumptionSummary`
- `V71.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `row.assumptionSummary`
- `V71.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步
