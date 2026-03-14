# 静态构筑解析系统 V175

`V175` 继续收口 `compact` contract 中仍直接复用 raw detail entry type 的 `diagnostics / sourceNotes`。

目标：

1. 把 single-build `diagnostics / sourceNotes`
2. 把 `skill-matrix row.diagnostics / sourceNotes`
3. 把 `trigger-matrix row.diagnostics / sourceNotes`
4. 把 `source-damage-view entry.diagnostics / sourceNotes`
5. 把 `source-utility-view entry.diagnostics / sourceNotes`
6. 把 mixed `source-entry entry.diagnostics / sourceNotes`

统一切到显式 compact entry item types。

非目标：

1. 不改变这些 detail entry 的字段值
2. 不改变 `includeDetails` gating 语义
3. 不改变各类 `diagnosticSummary / sourceNoteSummary` 的聚合统计语义

结果：

1. compact detail arrays 不再直接复用 raw `StaticBuildDiagnosticEntry / StaticBuildSourceNoteEntry`
2. 当前 compact contract 的 detail-entry 规范化主线从 summary 聚合继续推进到 includeDetails 明细层
