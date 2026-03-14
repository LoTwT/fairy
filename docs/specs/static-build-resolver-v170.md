# 静态构筑解析系统 V170

`V170` 开始收口 `compact` contract 中仍直接复用 raw effect summary item type 的结果对象顶层。

目标：

1. 把 single-build `effectSummary`
2. 把 `skill-matrix result.effectSummary`
3. 把 `trigger-matrix result.effectSummary`
4. 把 `source-damage-views result.effectSummary`
5. 把 `source-utility-views result.effectSummary`
6. 把 `source-entry collection.effectSummary`

统一切到显式 compact effect summary item types。

非目标：

1. 不改变 `summary / group / row / entry` 上的 effect summary type
2. 不改变 effect summary 的字段值
3. 不改变 `includeDetails` 语义

结果：

1. result-level `effectSummary` contract 不再直接复用 raw item type
2. 为后续 `summary / group / row / entry` 的 effect summary 显式化提供稳定 compact item types
