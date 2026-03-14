# 静态构筑解析系统 V159

## 目标

把 compact `trigger-matrix`、`source-damage-view`、`source-utility-view`、`source-entry collection` 的 `group summary` 从“直接复用 raw group summary type”改成显式 compact type。

这一步延续 `V156`、`V157`、`V158` 的方向，只固定 public compact contract，不改变 runtime 值。

## 范围

- `CompactStaticBuildTriggerMatrixGroupSummary`
- `CompactStaticBuildSourceDamageViewGroupSummary`
- `CompactStaticBuildSourceUtilityViewGroupSummary`
- `CompactStaticBuildSourceEntryGroupSummary`

## 非目标

1. 不改变任何 group summary 的字段值
2. 不改变 `includeDetails` 语义
3. 不新增业务字段

## 完成状态

- 已完成：上述 compact `group summary` 已从 raw group summary type 解耦
- 已完成：compact helper 继续显式构造 group summary
- 已完成：测试、roadmap、索引与架构文档已同步
