# 静态构筑解析系统 V168

`V168` 继续收口 `compact` contract 中仍直接复用 raw requirement summary type 的 `row` 对象。

目标：

1. 把 `skill-matrix row.requirementSummary`
2. 把 `trigger-matrix row.requirementSummary`

统一切到显式 compact requirement summary type。

非目标：

1. 不改变 `entry` 上的 requirement summary type
2. 不改变 requirement summary 的字段值
3. 不改变 `includeDetails` 语义

结果：

1. `row` requirement summary contract 与 `V167` 的 `group` contract 对齐
2. `compact` 中 requirement summary 的剩余显式化范围缩小到 `entry`
