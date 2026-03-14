# 静态构筑解析系统 V163

`V163` 收口 `compact` contract 中仍直接复用 raw aggregate summary type 的 top-level `summary` 对象。

目标：

1. 把 `skill-matrix summary`
2. 把 `trigger-matrix summary`
3. 把 `source-damage-views summary`
4. 把 `source-utility-views summary`
5. 把 `source-entry collection summary`

上的：

- `diagnosticSummary`
- `sourceNoteSummary`
- `assumptionSummary`
- `caveatSummary`

统一切到显式 compact aggregate summary type。

非目标：

1. 不改变 `group` 上的 aggregate summary type
2. 不改变任一 summary 的字段值
3. 不改变 `includeDetails` 语义

结果：

1. compact top-level `summary` aggregate summary contract 与 `V162` 的 row / entry contract 对齐
2. `compact` 中剩余直接复用 raw aggregate summary type 的主缺口缩小到 `group`
