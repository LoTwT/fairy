# 静态构筑解析系统 V172

`V172` 继续收口 `compact` contract 中仍直接复用 raw effect summary item type 的 `group` 对象。

目标：

1. 把 `skill-matrix summary.groups[*].effectSummary`
2. 把 `trigger-matrix summary.groups[*].effectSummary`
3. 把 `source-damage-views summary.groups[*].effectSummary`
4. 把 `source-utility-views summary.groups[*].effectSummary`
5. 把 `source-entry collection summary.groups[*].effectSummary`

统一切到显式 compact effect summary item types。

非目标：

1. 不改变 `row / entry` 上的 effect summary type
2. 不改变 effect summary 的字段值
3. 不改变 `includeDetails` 语义

结果：

1. `group.effectSummary` contract 与 `V171` 的 top-level `summary` contract 对齐
2. 当前 effect summary 显式化范围缩小到 `row / entry`
