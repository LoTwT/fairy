# 静态构筑解析系统 V59

`V58` 收口后，source-entry group 已能稳定给出局部 requirement / diagnostics / source notes 摘要。

但独立 `source-utility-view` 结果的 `groups[*]` 仍只有 count 级别信息。上层如果按“按次触发 / 按速率”拆 section，仍要重新遍历 entries 统计 requirement / diagnostics / source notes。

`V59` 只解决一件事：

- 为 `source-utility-view groups` 增加局部 `requirementSummary / diagnosticSummary / sourceNoteSummary`

## 目标 contract

`StaticBuildSourceUtilityViewGroupSummary` 新增：

1. `requirementSummary`
2. `diagnosticSummary`
3. `sourceNoteSummary`

## 设计边界

本阶段只做：

1. 为 `source-utility-view group` 暴露局部 summaries
2. 保持顶层 `views.summary.requirementSummary / diagnosticSummary / sourceNoteSummary` 兼容
3. 保持 group key / ordering 兼容
4. 对齐高层 utility-view tool 与 prompt 消费方式

显式不做：

1. 不改变 `entry.requirements / requirementSummary`
2. 不新增新的 utility metadata
3. 不改变 `value / unit / resolutionMode / targetScope`

## 当前状态

- `V59.1` 已完成：冻结到 source-utility-view group summaries
- `V59.2` 已完成：`StaticBuildSourceUtilityViewGroupSummary` 已新增局部 requirement / diagnostic / source-note summaries
- `V59.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `views.summary.groups[*]`
- `V59.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步
