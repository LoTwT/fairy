# 静态构筑解析系统 V64

`V63` 收口后，`skill-matrix summary groups` 已能稳定给出局部 `effectSummary / diagnosticSummary / sourceNoteSummary`。

但按 `row.group` 拆 section 时，各组仍没有自己的 `commonBuckets / commonFormulaMultipliers`。上层如果要在“普通攻击 / 特殊技 / 连携技”分组下分别展示局部乘区摘要，仍要重新遍历 rows 再自行聚合。

`V64` 只解决一件事：

- 为 `skill-matrix summary groups` 增加局部 `commonBuckets / variableBuckets / commonFormulaMultipliers / variableFormulaMultipliers`

## 当前状态

- `V64.1` 已完成：冻结到 skill-matrix group formula summaries
- `V64.2` 已完成：`StaticBuildSkillMatrixGroupSummary` 已新增局部 multiplier summaries
- `V64.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `matrix.summary.groups[*].commonFormulaMultipliers`
- `V64.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步
