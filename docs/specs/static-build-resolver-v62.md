# 静态构筑解析系统 V62

`V61` 收口后，`trigger-matrix groups` 已能稳定给出局部 `requirementSummary / diagnosticSummary / sourceNoteSummary`。

但 `skill matrix` 顶层仍只有 `rowCount / commonBuckets / commonFormulaMultipliers / effectSummary / diagnosticSummary / sourceNoteSummary`。上层如果按 `row.group` 拆 section，仍要重新遍历 rows 统计组内 diagnostics / source notes。

`V62` 只解决一件事：

- 为 `skill-matrix summary` 增加局部 `groups[*].diagnosticSummary / sourceNoteSummary`

## 当前状态

- `V62.1` 已完成：冻结到 skill-matrix group summaries
- `V62.2` 已完成：`StaticBuildSkillMatrixSummary` 已新增局部 `groups[*]`
- `V62.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `matrix.summary.groups[*]`
- `V62.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步
