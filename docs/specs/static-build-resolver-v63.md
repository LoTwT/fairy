# 静态构筑解析系统 V63

`V62` 收口后，`skill-matrix summary` 已能稳定给出局部 `groups[*].diagnosticSummary / sourceNoteSummary`。

但按 `row.group` 拆 section 时，`effectSummary` 仍只有整张矩阵版本。上层如果想在“普通攻击 / 特殊技 / 连携技”分组下分别解释哪些效果生效，仍要重新遍历 rows 再自行聚合。

`V63` 只解决一件事：

- 为 `skill-matrix summary groups` 增加局部 `effectSummary`

## 当前状态

- `V63.1` 已完成：冻结到 skill-matrix group effect summaries
- `V63.2` 已完成：`StaticBuildSkillMatrixGroupSummary` 已新增局部 `effectSummary`
- `V63.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `matrix.summary.groups[*].effectSummary`
- `V63.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步
