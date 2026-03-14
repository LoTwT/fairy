# 静态构筑解析系统 V161

## 目标

把 compact result-level contract 里仍直接复用 raw aggregate summary type 的部分做成显式 compact types。

本阶段只处理 compact 结果对象顶层的：

- `diagnosticSummary`
- `sourceNoteSummary`
- `assumptionSummary`
- `caveatSummary`
- `entry caveatSummary`

## 范围

- `CompactStaticBuildDiagnosticSummary`
- `CompactStaticBuildSourceNoteSummary`
- `CompactStaticBuildAssumptionSummary`
- `CompactStaticBuildCaveatSummary`
- `CompactStaticBuildEntryCaveatSummary`

## 非目标

1. 不改变 row / entry / group 上的 aggregate summary type
2. 不改变任何 aggregate summary 的字段值
3. 不改变 `includeDetails` 语义

## 完成状态

- 已完成：compact result-level aggregate summary 已从 raw type 解耦
- 已完成：compact helper 已显式构造这些 aggregate summary
- 已完成：测试、roadmap、索引与架构文档已同步
