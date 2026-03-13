# 静态构筑解析系统 V60

`V59` 收口后，source-utility-view groups 已能稳定给出局部 `requirementSummary / diagnosticSummary / sourceNoteSummary`。

但独立 `source-damage-view` 结果的 `groups[*]` 仍只有 count 级别信息。上层如果按“独立结算 / 增量结算”拆 section，仍要重新遍历 entries 统计 requirement / diagnostics / source notes。

`V60` 只解决一件事：

- 为 `source-damage-view groups` 增加局部 `requirementSummary / diagnosticSummary / sourceNoteSummary`

## 当前状态

- `V60.1` 已完成：冻结到 source-damage-view group summaries
- `V60.2` 已完成：`StaticBuildSourceDamageViewGroupSummary` 已新增局部 summaries
- `V60.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `views.summary.groups[*]`
- `V60.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步
