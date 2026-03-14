# 静态构筑解析系统 V143

## 背景

`V139` 已经把 compact standalone `source-utility-view entries` 的 raw `entry.requirements` 收紧到 `includeDetails=true`。

但 compact standalone `source-utility-view entries` 仍默认携带原始 `entry.assumptions`，而下列稳定字段已经齐全：

- `entry.assumptionSummary`
- `views.summary.assumptionSummary`
- `views.summary.groups[*].assumptionSummary`
- `views.assumptionSummary`

这导致调用方默认消费 standalone source-utility-view entries 时，仍会拿到不必要的 raw assumption arrays。

## 目标

`V143` 只解决一件事：

1. 把 compact standalone `source-utility-view entries` 的 `entry.assumptions` 也移动到 `includeDetails=true`

## 非目标

1. 不改变顶层 `views.assumptions`
2. 不改变 `entry.assumptionSummary`
3. 不改变 `entry.requirements / entry.diagnostics / entry.sourceNotes` 以外的其他 detail gating

## 变更范围

1. `compactStaticBuildSourceUtilityViewEntry()`
2. `resolveBuildSourceUtilityViews` 的 `includeDetails` 描述、测试与 prompt
3. README / roadmap / 索引 / 架构文档

## 验收标准

1. 默认 compact standalone `source-utility-view entries` 不再携带 `entry.assumptions`
2. `includeDetails=true` 时可稳定取回 `entry.assumptions`
3. 顶层 `views.assumptions` 当前行为保持不变
