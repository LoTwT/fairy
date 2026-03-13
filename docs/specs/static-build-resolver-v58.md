# 静态构筑解析系统 V58

`V57` 收口后，source-entry collection group 已能稳定给出局部 `diagnosticSummary / sourceNoteSummary`。

但当上层按组拆分“额外结算条目 / 回能条目”两个 section 时，组内 requirement 分布仍只能回退到顶层 aggregate 或重新遍历 `entries[*].requirements`。

`V58` 只解决一件事：

- 为 `source-entry collection groups` 增加局部 requirement aggregates

## 目标 contract

`StaticBuildSourceEntryGroupSummary` 新增：

1. `sourceDamageRequirementSummary`
2. `sourceUtilityRequirementSummary`

## 设计边界

本阶段只做：

1. 为 `source-entry group` 暴露局部 requirement aggregates
2. 保持 group 现有 `count / supportedCount / unsupportedCount` 兼容
3. 保持 group 现有 `diagnosticSummary / sourceNoteSummary` 兼容
4. 对齐高层 source-entry tool 与 prompt 消费方式

显式不做：

1. 不改变顶层 `collection.summary.sourceDamageRequirementSummary / sourceUtilityRequirementSummary`
2. 不改变 grouping key / ordering
3. 不引入新的 source-entry metadata

## 验收标准

1. `collection.summary.groups[*].sourceDamageRequirementSummary` 可直接读取
2. `collection.summary.groups[*].sourceUtilityRequirementSummary` 可直接读取
3. 上层按组拆 section 时不再需要重新统计 group 内 requirement 分布
4. 相关测试、README、索引、架构与总规格同步

## 当前状态

- `V58.1` 已完成：冻结到 source-entry group requirement aggregates
- `V58.2` 已完成：`StaticBuildSourceEntryGroupSummary` 已新增局部 requirement aggregates
- `V58.3` 已完成：高层 tool 断言与 agent prompt 已对齐 group-level requirement summaries
- `V58.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步
