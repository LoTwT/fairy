# 静态构筑解析系统 V176

`V176` 继续收口 `compact` contract 中仍直接复用 raw detail entry type 的 `requirements[]`。

目标：

1. 把 `trigger-matrix row.requirements`
2. 把 `source-damage-view entry.requirements`
3. 把 `source-utility-view entry.requirements`
4. 把 mixed `source-entry entry.requirements`

统一切到显式 compact requirement item types。

非目标：

1. 不改变这些 requirement item 的字段值
2. 不改变 `includeDetails` gating 语义
3. 不改变现有 `requirementSummary` 聚合统计语义

结果：

1. compact detail arrays 不再直接复用 raw `StaticBuildSourceDamageViewRequirement / StaticBuildSourceUtilityViewRequirement`
2. 当前 compact contract 的 detail-entry 规范化主线继续推进到 `requirements[]`
