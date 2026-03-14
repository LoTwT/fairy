# 静态构筑解析系统 V138

## 背景

`V134` 已经把 standalone `source-damage-view entries` 的 raw details 收紧到 `includeDetails=true`：

- `entry.diagnostics`
- `entry.sourceNotes`
- `entry.build`

但 compact standalone entries 仍默认携带原始 `entry.requirements`，而下列稳定字段已经齐全：

- `entry.requirementSummary`
- `views.summary.requirementSummary`
- `views.summary.groups[*].requirementSummary`

这导致调用方默认消费 standalone source-damage views 时，仍会拿到不必要的 raw requirement arrays。

## 目标

`V138` 只解决一件事：

1. 把 compact standalone `source-damage-view entries` 的 `entry.requirements` 也移动到 `includeDetails=true`

## 非目标

1. 不改变 mixed `source-entry collection` 中 `source-damage-view` entries 的 compact contract
2. 不改变 `entry.requirementSummary`
3. 不改变 `entry.assumptions / entry.diagnostics / entry.sourceNotes / entry.build` 以外的字段

## 变更范围

1. `StaticBuildCompactSourceDamageViewEntry`
2. `compactStaticBuildSourceDamageViewsResult()`
3. `resolveBuildSourceDamageViews` 的 `includeDetails` 描述、测试与 prompt
4. README / roadmap / 索引 / 架构文档

## 验收标准

1. 默认 compact standalone `source-damage-view entries` 不再携带 `entry.requirements`
2. `includeDetails=true` 时可稳定取回 `entry.requirements`
3. mixed `source-entry collection` 当前行为保持不变
