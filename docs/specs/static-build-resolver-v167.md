# 静态构筑解析系统 V167

`V167` 继续收口 `compact` contract 中仍直接复用 raw requirement summary type 的 `group` 对象。

目标：

1. 把 `skill-matrix summary.groups[*].requirementSummary`
2. 把 `trigger-matrix summary.groups[*].requirementSummary`
3. 把 `source-damage-views summary.groups[*].requirementSummary`
4. 把 `source-utility-views summary.groups[*].requirementSummary`
5. 把 `source-entry collection summary.groups[*]` 上的：
   - `sourceDamageRequirementSummary`
   - `sourceUtilityRequirementSummary`

统一切到显式 compact requirement summary type。

非目标：

1. 不改变 `row / entry` 上的 requirement summary type
2. 不改变 requirement summary 的字段值
3. 不改变 `includeDetails` 语义

结果：

1. `group` requirement summary contract 与 `V166` 的 top-level `summary` contract 对齐
2. `compact` 中 requirement summary 的剩余显式化范围缩小到 `row / entry`
