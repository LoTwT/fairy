# 静态构筑解析系统 V174

`V174` 继续收口 `compact` contract 中仍直接复用 raw summary group item type 的内部 group 数组。

目标：

1. 把 `build.summary.diagnosticGroups`
2. 把 `build.summary.sourceNoteGroups`
3. 把 `diagnosticSummary.kindGroups / ownerGroups`
4. 把 `sourceNoteSummary.statusGroups / ownerGroups`

统一切到显式 compact group item types。

非目标：

1. 不改变这些 group 数组的字段值
2. 不改变外层 `summary / diagnosticSummary / sourceNoteSummary` 的统计语义
3. 不改变 `includeDetails` 语义

结果：

1. `resolveSummary / diagnosticSummary / sourceNoteSummary` 的内部 group item contract 不再直接复用 raw type
2. 当前 compact summary 规范化主线进一步收口到嵌套 group item 层
