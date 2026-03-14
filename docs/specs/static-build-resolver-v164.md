# 静态构筑解析系统 V164

`V164` 收口 `compact` contract 中最后一批仍直接复用 raw aggregate summary type 的 `group` 级对象。

目标：

1. 把 `skill-matrix group`
2. 把 `trigger-matrix group`
3. 把 `source-damage-view group`
4. 把 `source-utility-view group`
5. 把 `source-entry collection group`

上的：

- `diagnosticSummary`
- `sourceNoteSummary`
- `assumptionSummary`
- `caveatSummary`

统一切到显式 compact aggregate summary type。

非目标：

1. 不改变 aggregate summary 的字段值
2. 不改变 `includeDetails` 语义
3. 不改变 compact payload 的业务含义

结果：

1. `compact` contract 在 `result / summary / group / row / entry` 五层上的 aggregate summary 都已显式化
2. 这条 “explicit compact aggregate summaries” 对称化主线在当前 contract 下自然收口
