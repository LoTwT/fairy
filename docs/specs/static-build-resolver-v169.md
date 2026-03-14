# 静态构筑解析系统 V169

`V169` 继续收口 `compact` contract 中仍直接复用 raw requirement summary type 的 `entry` 对象。

目标：

1. 把 `source-damage-view entry.requirementSummary`
2. 把 `source-utility-view entry.requirementSummary`
3. 把 mixed `source-entry entry.requirementSummary`

统一切到显式 compact requirement summary type。

非目标：

1. 不改变 requirement summary 的字段值
2. 不改变 `includeDetails` 语义
3. 不改变 compact payload 的业务含义

结果：

1. `entry` requirement summary contract 与 `V168` 的 `row` contract 对齐
2. 当前 `compact requirement summary` 规范化主线在 `result / summary / group / row / entry` 五层全部收口
