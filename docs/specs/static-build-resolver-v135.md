# 静态构筑解析系统 V135

## 背景

`V134` 已把 compact `source-damage-view entries` 默认返回继续收紧：

1. 默认保留 entry 级 `*Summary`
2. 仅在 `includeDetails=true` 时展开 `entry.diagnostics / entry.sourceNotes / entry.build`

但 `resolveBuildSourceUtilityViews` 默认返回的 compact `source-utility-view entries` 仍默认携带：

1. `entry.diagnostics`
2. `entry.sourceNotes`

而这些 utility entries 已经有稳定的：

- `entry.diagnosticSummary`
- `entry.sourceNoteSummary`
- `entry.requirementSummary`
- `entry.assumptionSummary`
- `entry.caveatSummary`
- `entry.effectSummary`
- `entry.summary`

## 目标

只继续收紧 `source-utility-view compact entries` 的 detail gating：

1. 默认保留 entry 级 `*Summary`
2. 把 `entry.diagnostics / entry.sourceNotes` 也移到 `includeDetails=true`

## 当前边界

本阶段只做：

1. `StaticBuildCompactSourceUtilityViewEntry` 的 detail gating 调整
2. 高层 `resolveBuildSourceUtilityViews` 增加 `includeDetails`
3. README / roadmap / 索引 / 架构文档同步

显式不做：

1. 不改变 `ResolveStaticBuildSourceUtilityViewsResult` 原始返回
2. 不移除 `entry.requirements / entry.assumptions`
3. 不把 utility views 并入 source-entry collection 的 mixed entry gating

## 完成标准

1. 默认 compact `source-utility-view entries` 不再携带 `diagnostics / sourceNotes`
2. `includeDetails=true` 时可稳定取回 `entry.diagnostics / entry.sourceNotes`
3. 高层 prompt、schema 与测试已明确这一点
4. 文档与测试同步
