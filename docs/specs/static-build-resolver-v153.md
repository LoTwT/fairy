# 静态构筑解析系统 V153

## 目标

把 compact standalone `source-utility-view` 顶层的 raw `views.assumptions` 收紧到 `includeDetails=true`。

## 范围

1. `CompactStaticBuildSourceUtilityViewsResult.assumptions` 改为可选字段
2. `compactStaticBuildSourceUtilityViewsResult()` 默认不再透传顶层 `views.assumptions`
3. `resolveBuildSourceUtilityViews` 的描述、测试与 Agent prompt 对齐新的 gating 语义
4. 同步 README、总规格、roadmap、索引和架构文档

## 非目标

1. 不改变 `views.assumptionSummary`
2. 不改变 `views.caveatSummary`
3. 不改变 `entry.assumptions / entry.requirements / entry.diagnostics / entry.sourceNotes`
4. 不改变 `effectSummary / requirementSummary / diagnosticSummary / sourceNoteSummary`

## 验收标准

1. compact standalone `source-utility-view` 默认不再附带顶层 `views.assumptions`
2. `includeDetails=true` 时仍能读到顶层 `views.assumptions`
3. 高层 tool 与 Agent prompt 明确说明新的 `includeDetails` 语义
4. `zzz-data` / `zzz-agent` 测试与 build 全通过
