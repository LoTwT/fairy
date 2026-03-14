# 静态构筑解析系统 V152

## 背景

`V151` 收口后，compact trigger-matrix 顶层的 raw `matrix.assumptions` 已收紧到 `includeDetails=true`。

但 compact source-damage-views 顶层结果仍默认携带原始 `views.assumptions`，而下列稳定字段已经齐全：

- `views.summary.assumptionSummary`
- `views.assumptionSummary`
- `views.caveatSummary`

这导致调用方默认消费 compact source-damage-views 时，仍会拿到不必要的 raw assumption arrays。

## 目标

`V152` 只解决一件事：

1. 把 compact source-damage-views 的顶层 `views.assumptions` 移动到 `includeDetails=true`

## 非目标

1. 不改变 `views.caveatSummary`
2. 不改变 `views.assumptionSummary`
3. 不改变 `entry.assumptions / entry.requirements / entry.diagnostics / entry.sourceNotes / entry.build` 之外的其他 detail gating

## 变更范围

1. `compactStaticBuildSourceDamageViewsResult()`
2. `resolveBuildSourceDamageViews` 的 `includeDetails` 描述、测试与 prompt
3. README / roadmap / 索引 / 架构文档

## 验收标准

1. 默认 compact source-damage-views 不再携带顶层 `views.assumptions`
2. `includeDetails=true` 时可稳定取回 `views.assumptions`
3. `views.assumptionSummary` 与 `views.caveatSummary` 当前行为保持不变
