# 静态构筑解析系统 V134

## 背景

`V133` 已把 compact `trigger-matrix rows` 默认返回继续收紧：

1. 默认保留各类行级 `*Summary`
2. 仅在 `includeDetails=true` 时展开 `row.diagnostics / row.sourceNotes / row.build`

但 `resolveBuildSourceDamageViews` 默认返回的 compact `source-damage-view entries` 仍默认携带：

1. `entry.diagnostics`
2. `entry.sourceNotes`

而这些 entries 已经有稳定的：

- `entry.diagnosticSummary`
- `entry.sourceNoteSummary`
- `entry.requirementSummary`
- `entry.assumptionSummary`
- `entry.caveatSummary`
- `entry.effectSummary`
- `entry.summary`

## 目标

只继续收紧 `source-damage-view compact entries` 的 detail gating：

1. 默认保留 entry 级 `*Summary`
2. 把 `entry.diagnostics / entry.sourceNotes` 也移到 `includeDetails=true`

## 当前边界

本阶段只做：

1. `StaticBuildCompactSourceDamageViewEntry` 的 detail gating 调整
2. 高层 `resolveBuildSourceDamageViews` 测试与 prompt 对齐
3. README / roadmap / 索引 / 架构文档同步

显式不做：

1. 不改变 `ResolveStaticBuildSourceDamageViewsResult` 原始返回
2. 不移除 `entry.requirements / entry.assumptions`
3. 不改变 `entry.build` 已有 gating 语义

## 完成标准

1. 默认 compact `source-damage-view entries` 不再携带 `diagnostics / sourceNotes`
2. `includeDetails=true` 时可稳定取回 `entry.diagnostics / entry.sourceNotes / entry.build`
3. 高层 prompt 已明确这一点
4. 文档与测试同步
