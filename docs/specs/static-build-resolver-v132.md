# 静态构筑解析系统 V132

## 背景

`V131` 已把 single-build compact 默认返回进一步收紧：

1. 默认保留各类 `*Summary`
2. 仅在 `includeDetails=true` 时展开 `diagnostics / sourceNotes / trace / damageParams`

但 `resolveBuildSkillMatrix` 默认返回的 compact rows 仍默认携带：

1. `row.diagnostics`
2. `row.sourceNotes`

而这些行级明细已经有稳定的：

- `row.diagnosticSummary`
- `row.sourceNoteSummary`
- `row.assumptionSummary`
- `row.caveatSummary`

## 目标

只继续收紧 `skill-matrix compact rows` 的 detail gating：

1. 默认保留各类行级 `*Summary`
2. 把 `row.diagnostics / row.sourceNotes` 也移到 `includeDetails=true`

## 当前边界

本阶段只做：

1. `StaticBuildCompactSkillMatrixRow` 的 detail gating 调整
2. 高层 `resolveBuildSkillMatrix` 测试与 prompt 对齐
3. README / roadmap / 索引 / 架构文档同步

显式不做：

1. 不改变 `ResolveStaticBuildSkillMatrixResult` 原始返回
2. 不移除 `row.assumptions / row.unsupportedEffects`
3. 不改变 `row.build` 已有 gating 语义

## 完成标准

1. 默认 compact `skill-matrix rows` 不再携带 `diagnostics / sourceNotes`
2. `includeDetails=true` 时可稳定取回 `row.diagnostics / row.sourceNotes / row.build`
3. 高层 prompt 已明确这一点
4. 文档与测试同步
