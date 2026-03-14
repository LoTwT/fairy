# 静态构筑解析系统 V165

`V165` 开始收口 `compact` contract 中仍直接复用 raw requirement summary type 的结果对象。

目标：

1. 把 `skill-matrix result.requirementSummary`
2. 把 `trigger-matrix result.requirementSummary`
3. 把 `source-damage-views result.requirementSummary`
4. 把 `source-utility-views result.requirementSummary`
5. 把 `source-entry collection` 顶层的：
   - `sourceDamageRequirementSummary`
   - `sourceUtilityRequirementSummary`

统一切到显式 compact requirement summary type。

非目标：

1. 不改变 `summary / group / row / entry` 上的 requirement summary type
2. 不改变 requirement summary 的字段值
3. 不改变 `includeDetails` 语义

结果：

1. result-level requirement summary contract 与之前 `aggregate summaries` 的处理方式对齐
2. `compact` 中 requirement summary 的后续显式化范围缩小到 `summary / group / row / entry`
