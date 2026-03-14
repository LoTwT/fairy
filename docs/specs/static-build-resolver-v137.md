# 静态构筑解析系统 V137

## 背景

`V133` 已把 compact `trigger-matrix rows` 的 `diagnostics / sourceNotes / build` 收紧到 `includeDetails=true`。

但 compact rows 仍默认携带原始 `row.requirements`，而下列稳定字段已经齐全：

- `row.requirementSummary`
- `matrix.summary.requirementSummary`
- `matrix.summary.groups[*].requirementSummary`

这和前面已经建立的“summary 优先、raw detail 按需展开”方向不一致。

## 目标

只继续收紧 compact `trigger-matrix rows` 的 requirement gating：

1. 默认保留 `row.requirementSummary`
2. 把 `row.requirements` 移动到 `includeDetails=true`

## 当前边界

本阶段只做：

1. `StaticBuildCompactTriggerMatrixRow` 的 requirement gating 调整
2. 高层 `resolveBuildTriggerMatrix` schema / prompt / tests 对齐
3. README / roadmap / 索引 / 架构文档同步

显式不做：

1. 不改变原始 `StaticBuildTriggerMatrixRow.requirements`
2. 不改变 `row.requirementSummary`、`matrix.summary.requirementSummary`、`groups[*].requirementSummary` 的语义
3. 不调整 source-view / source-entry / skill-matrix 的 requirement gating

## 完成标准

1. 默认 compact `trigger-matrix rows` 不再携带 `row.requirements`
2. `includeDetails=true` 时可稳定取回 `row.requirements`
3. 高层 prompt、schema 与测试已明确这一点
4. 文档与测试同步
