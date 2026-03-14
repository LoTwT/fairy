# 静态构筑解析系统 V171

`V171` 继续收口 `compact` contract 中仍直接复用 raw effect summary item type 的 top-level `summary`。

目标：

1. 把 `skill-matrix summary.effectSummary`
2. 把 `trigger-matrix summary.effectSummary`
3. 把 `source-damage-views summary.effectSummary`
4. 把 `source-utility-views summary.effectSummary`
5. 把 `source-entry collection summary.effectSummary`

统一切到显式 compact effect summary item types。

非目标：

1. 不改变 `group / row / entry` 上的 effect summary type
2. 不改变 effect summary 的字段值
3. 不改变 `includeDetails` 语义

结果：

1. top-level `summary.effectSummary` contract 与 `V170` 的 result-level contract 对齐
2. 当前 effect summary 显式化范围缩小到 `group / row / entry`
