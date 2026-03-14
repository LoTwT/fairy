# 静态构筑解析系统 V162

`V162` 收口 `compact` contract 中仍直接复用 raw aggregate summary type 的 `row / entry` 级对象。

目标：

1. 把 `skill-matrix row`
2. 把 `trigger-matrix row`
3. 把 `source-damage-view entry`
4. 把 `source-utility-view entry`
5. 把 mixed `source-entry entry`

上的：

- `diagnosticSummary`
- `sourceNoteSummary`
- `assumptionSummary`
- `caveatSummary`

统一切到显式 compact aggregate summary type。

非目标：

1. 不改变 `summary / group` 上的 aggregate summary type
2. 不改变任一 summary 的字段值
3. 不改变 `includeDetails` 语义

结果：

1. row / entry 级 aggregate summary contract 与 `V161` 的 result-level contract 对齐
2. compact 输出不再在这些位置继续直接复用 raw aggregate summary type
