# 静态构筑解析系统 V65

`V64` 收口后，`skill-matrix summary groups` 已能稳定给出局部 `commonBuckets / commonFormulaMultipliers / effectSummary / diagnosticSummary / sourceNoteSummary`。

但按 `row.group` 拆 section 时，组级 caveat 仍只有 row 级版本。上层如果想在“普通攻击 / 特殊技 / 连携技”分组下分别解释组内 assumptions / unsupportedEffects，仍要重新遍历 rows 再自行去重聚合。

`V65` 只解决一件事：

- 为 `skill-matrix summary groups` 增加局部 `assumptions / unsupportedEffects`

## 当前状态

- `V65.1` 已完成：冻结到 skill-matrix group caveat summaries
- `V65.2` 已完成：`StaticBuildSkillMatrixGroupSummary` 已新增局部 `assumptions / unsupportedEffects`
- `V65.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `matrix.summary.groups[*].assumptions / unsupportedEffects`
- `V65.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步
