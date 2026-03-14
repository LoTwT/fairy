# 静态构筑解析系统 V154

## 目标

把 compact mixed `source-entry collection` 顶层的 raw `collection.assumptions` 收紧到 `includeDetails=true`。

## 范围

1. `CompactStaticBuildSourceEntryCollection.assumptions` 改为可选字段
2. `compactStaticBuildSourceEntryCollection()` 默认不再透传顶层 `collection.assumptions`
3. `resolveBuildSourceEntries` 的描述、测试与 Agent prompt 对齐新的 gating 语义
4. 同步 README、总规格、roadmap、索引和架构文档

## 非目标

1. 不改变 `collection.assumptionSummary`
2. 不改变 `collection.caveatSummary`
3. 不改变 `entry.assumptions / entry.requirements / entry.diagnostics / entry.sourceNotes / entry.build`
4. 不改变 `effectSummary / requirementSummary / diagnosticSummary / sourceNoteSummary`

## 验收标准

1. compact mixed `source-entry collection` 默认不再附带顶层 `collection.assumptions`
2. `includeDetails=true` 时仍能读到顶层 `collection.assumptions`
3. 高层 tool 与 Agent prompt 明确说明新的 `includeDetails` 语义
4. `zzz-data` / `zzz-agent` 测试与 build 全通过
