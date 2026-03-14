# 静态构筑解析系统 V144

## 背景

`V140` 收口后，compact mixed `source-entry entries` 的 raw `entry.requirements` 已收紧到 `includeDetails=true`。

但 compact mixed `source-entry entries` 仍默认携带原始 `entry.assumptions`，而下列稳定字段已经齐全：

- `entry.assumptionSummary`
- `collection.summary.assumptionSummary`
- `collection.summary.groups[*].assumptionSummary`
- `collection.assumptionSummary`

这导致调用方默认消费 mixed `source-entry entries` 时，仍会拿到不必要的 raw assumption arrays。

## 目标

`V144` 只解决一件事：

1. 把 compact mixed `source-entry entries` 的 `entry.assumptions` 也移动到 `includeDetails=true`

## 非目标

1. 不改变顶层 `collection.assumptions`
2. 不改变 `entry.assumptionSummary`
3. 不改变 `entry.requirements / entry.diagnostics / entry.sourceNotes / entry.build` 以外的其他 detail gating

## 变更范围

1. `compactStaticBuildSourceEntry()`
2. `resolveBuildSourceEntries` 的 `includeDetails` 描述、测试与 prompt
3. README / roadmap / 索引 / 架构文档

## 验收标准

1. 默认 compact mixed `source-entry entries` 不再携带 `entry.assumptions`
2. `includeDetails=true` 时可稳定取回 `entry.assumptions`
3. 顶层 `collection.assumptions` 当前行为保持不变
