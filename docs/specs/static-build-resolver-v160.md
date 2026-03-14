# 静态构筑解析系统 V160

## 目标

把 compact `trigger-matrix`、`source-damage-view`、`source-utility-view`、`source-entry collection` 的 top-level `summary` 从 `Omit<raw, "groups">` 改成显式 compact type。

这一步延续 `V156` 到 `V159` 的 compact contract 收口，只固定 public 类型边界，不改变 runtime 值。

## 范围

- `CompactStaticBuildTriggerMatrixSummary`
- `CompactStaticBuildSourceDamageViewsSummary`
- `CompactStaticBuildSourceUtilityViewsSummary`
- `CompactStaticBuildSourceEntryCollectionSummary`

## 非目标

1. 不改变任何 top-level summary 的字段值
2. 不改变 `includeDetails` 语义
3. 不新增业务字段

## 完成状态

- 已完成：上述 compact top-level `summary` 已从 `Omit<raw, "groups">` 解耦
- 已完成：compact helper 继续显式构造 top-level `summary`
- 已完成：测试、roadmap、索引与架构文档已同步
