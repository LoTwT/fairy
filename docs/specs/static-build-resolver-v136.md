# 静态构筑解析系统 V136

## 背景

`V134` 与 `V135` 已分别把 compact `source-damage-view entries`、compact `source-utility-view entries` 的 detail gating 收紧到：

1. 默认保留 entry 级 `*Summary`
2. 仅在 `includeDetails=true` 时展开逐条 `diagnostics / sourceNotes`
3. `source-damage-view` 若原始结果本来带 `build`，则在 `includeDetails=true` 时一并展开

但高层 `resolveBuildSourceEntries` 作为 mixed collection 入口，虽然 runtime 已通过 `compactStaticBuildSourceEntryCollection(collection, includeDetails)` 继承了这套 gating 行为，tool schema、prompt、测试与文档仍未把这个 contract 明确固定下来。

## 目标

只补 mixed `source-entry collection` 的 detail-gating contract：

1. 默认 compact mixed entries 不再暴露 `entry.diagnostics / entry.sourceNotes / entry.build`
2. `includeDetails=true` 时，`source-damage-view` entries 可展开 `entry.diagnostics / entry.sourceNotes`，且在原始结果带 `build` 时一并透传 `entry.build`
3. `includeDetails=true` 时，`source-utility-view` entries 可展开 `entry.diagnostics / entry.sourceNotes`

## 当前边界

本阶段只做：

1. `resolveBuildSourceEntries` 的 schema / 描述文本对齐
2. mixed source-entry 的 compact 测试与高层 tool 测试对齐
3. README / roadmap / 索引 / 架构文档同步

显式不做：

1. 不改变 `ResolveStaticBuildSourceEntriesResult` 原始返回
2. 不调整 mixed entry 的 `summary / requirementSummary / diagnosticSummary / sourceNoteSummary / assumptionSummary / caveatSummary`
3. 不修改 standalone source views 或 trigger matrix 的 detail gating

## 完成标准

1. 默认 compact mixed entries 不再携带 `entry.diagnostics / entry.sourceNotes / entry.build`
2. `includeDetails=true` 时 mixed entries 可稳定取回 `entry.diagnostics / entry.sourceNotes`，并在原始结果带 `build` 时透传 `entry.build`
3. 高层 prompt、schema 与测试已明确这一点
4. 文档与测试同步
