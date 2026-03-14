# 静态构筑解析系统 V140

## 背景

`V136` 已经把 mixed `source-entry collection` 的 raw details 收紧到 `includeDetails=true`：

- `entry.diagnostics`
- `entry.sourceNotes`
- `entry.build`

但 compact mixed entries 仍默认携带原始 `entry.requirements`，而下列稳定字段已经齐全：

- `entry.requirementSummary`
- `collection.summary.sourceDamageRequirementSummary`
- `collection.summary.sourceUtilityRequirementSummary`
- `collection.summary.groups[*].sourceDamageRequirementSummary`
- `collection.summary.groups[*].sourceUtilityRequirementSummary`

这导致调用方默认消费 mixed `source-entry collection` 时，仍会拿到不必要的 raw requirement arrays。

## 目标

`V140` 只解决一件事：

1. 把 compact mixed `source-entry entries` 的 `entry.requirements` 也移动到 `includeDetails=true`

## 非目标

1. 不改变 standalone `source-damage-view / source-utility-view` 的 compact contract
2. 不改变 `entry.requirementSummary`
3. 不改变 `entry.assumptions / entry.diagnostics / entry.sourceNotes / entry.build` 以外的字段

## 变更范围

1. `compactStaticBuildSourceEntryCollection()`
2. `compactStaticBuildSourceEntry()`
3. `resolveBuildSourceEntries` 的 `includeDetails` 描述、测试与 prompt
4. README / roadmap / 索引 / 架构文档

## 验收标准

1. 默认 compact mixed `source-entry entries` 不再携带 `entry.requirements`
2. `includeDetails=true` 时可稳定取回 `entry.requirements`
3. standalone `source-damage-view / source-utility-view` 当前行为保持不变
