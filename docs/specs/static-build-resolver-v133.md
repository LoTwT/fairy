# 静态构筑解析系统 V133

## 背景

`V132` 已把 compact `skill-matrix rows` 默认返回进一步收紧：

1. 默认保留各类行级 `*Summary`
2. 仅在 `includeDetails=true` 时展开 `row.diagnostics / row.sourceNotes / row.build`

但 `resolveBuildTriggerMatrix` 默认返回的 compact rows 仍默认携带：

1. `row.diagnostics`
2. `row.sourceNotes`

而这些 trigger rows 已经有稳定的：

- `row.diagnosticSummary`
- `row.sourceNoteSummary`
- `row.requirementSummary`
- `row.assumptionSummary`
- `row.caveatSummary`

## 目标

只继续收紧 `trigger-matrix compact rows` 的 detail gating：

1. 默认保留各类行级 `*Summary`
2. 把 `row.diagnostics / row.sourceNotes` 也移到 `includeDetails=true`

## 当前边界

本阶段只做：

1. `StaticBuildCompactTriggerMatrixRow` 的 detail gating 调整
2. 高层 `resolveBuildTriggerMatrix` 测试与 prompt 对齐
3. README / roadmap / 索引 / 架构文档同步

显式不做：

1. 不改变 `ResolveStaticBuildTriggerMatrixResult` 原始返回
2. 不移除 `row.requirements / row.assumptions`
3. 不改变 `row.build` 已有 gating 语义

## 完成标准

1. 默认 compact `trigger-matrix rows` 不再携带 `diagnostics / sourceNotes`
2. `includeDetails=true` 时可稳定取回 `row.diagnostics / row.sourceNotes / row.build`
3. 高层 prompt 已明确这一点
4. 文档与测试同步
