# 静态构筑解析系统 V157

## 目标

把 compact row / entry 上的 `summary` 从“直接复用 raw summary type”改成显式 compact type。

这一步和 `V156` 一样，不改变 runtime 值，只固定 public compact contract 的边界。

## 范围

- `CompactStaticBuildResult.summary`
- `StaticBuildCompactSkillMatrixRow.summary`
- `StaticBuildCompactTriggerMatrixRow.summary`
- `StaticBuildCompactSourceDamageViewEntry.summary`
- `StaticBuildCompactSourceUtilityViewEntry.summary`
- unified `source-entry collection` 中复用这些 compact entry shape 的 `summary`

## 非目标

1. 不改变 summary 的字段值
2. 不改变 `includeDetails` 语义
3. 不新增业务字段

## 完成状态

- 已完成：compact row / entry 的 summary 已从 raw summary type 解耦
- 已完成：compact helper 已显式构造 summary
- 已完成：测试、roadmap、索引与架构文档已同步
