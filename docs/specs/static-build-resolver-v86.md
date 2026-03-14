# 静态构筑解析系统 V86

## 目标

为 `skill-matrix` 的顶层 `summary` 增加稳定 `diagnosticSummary / sourceNoteSummary`。

`V47` 已解决顶层 `matrix.diagnosticSummary / matrix.sourceNoteSummary`，`V62` 已解决 `summary.groups[*].diagnosticSummary / sourceNoteSummary`，`V48` 已解决 `row.diagnosticSummary / row.sourceNoteSummary`。但上层如果希望只消费 `matrix.summary` 这一个聚合对象，仍然需要额外跳回顶层 `matrix.diagnosticSummary / matrix.sourceNoteSummary`。`V86` 只补这一个 summary 对称缺口。

## 本阶段完成

1. `StaticBuildSkillMatrixSummary` 新增 `diagnosticSummary / sourceNoteSummary`
2. 顶层 summary 直接聚合 matrix 级 diagnostics / source notes
3. 高层 `resolve-build-skill-matrix` 断言与 Agent prompt 已对齐 `matrix.summary.diagnosticSummary / matrix.summary.sourceNoteSummary`
4. README、总规格、roadmap、索引、架构文档已同步

## 设计边界

1. 不改变既有顶层 `matrix.diagnosticSummary / matrix.sourceNoteSummary`
2. 不改变 row / group 级 `diagnosticSummary / sourceNoteSummary`
3. 不提前把 `effectSummary` 下沉到 `summary`

## 验收标准

1. 上层可以只读取 `matrix.summary` 完成数值摘要、caveat 摘要与 diagnostics / source notes 顶层聚合
2. `matrix.summary.diagnosticSummary / sourceNoteSummary` 与既有顶层同名字段保持一致
3. 不影响 `rows[*]`、`summary.groups[*]` 与 compact contract
