# 静态构筑解析系统 V61

`V60` 收口后，`source-damage-view groups` 已能稳定给出局部 `requirementSummary / diagnosticSummary / sourceNoteSummary`。

但 `trigger-entry matrix` 的 `groups[*]` 仍只有 count 级别信息。上层如果按 `main-formula / source-view` 拆 section，仍要重新遍历 rows 统计 requirement / diagnostics / source notes。

`V61` 只解决一件事：

- 为 `trigger-matrix groups` 增加局部 `requirementSummary / diagnosticSummary / sourceNoteSummary`

## 当前状态

- `V61.1` 已完成：冻结到 trigger-matrix group summaries
- `V61.2` 已完成：`StaticBuildTriggerMatrixGroupSummary` 已新增局部 summaries
- `V61.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `matrix.summary.groups[*]`
- `V61.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步
