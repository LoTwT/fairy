# 静态构筑解析系统 V173

`V173` 继续收口 `compact` contract 中仍直接复用 raw effect summary item type 的 `row / entry` 对象。

目标：

1. 把 `trigger-matrix row.effectSummary`
2. 把 `source-damage-view entry.effectSummary`
3. 把 `source-utility-view entry.effectSummary`
4. 把 mixed `source-entry entry.effectSummary`

统一切到显式 compact effect summary item types。

非目标：

1. 不改变 effect summary 的字段值
2. 不改变 `includeDetails` 语义
3. 不改变 result / summary / group 已完成的 effect summary contract

结果：

1. `row / entry.effectSummary` contract 与 `V172` 的 `group.effectSummary` contract 对齐
2. 当前 compact effect summary 规范化主线在 `result / summary / group / row / entry` 五层全部收口
