# 静态构筑解析系统 V57

`V56` 收口后，source-entry collection 顶层 summary 已能分别给出 mixed collection 中 source-damage-view / source-utility-view 的 requirement aggregate。

但 `collection.summary.groups[*]` 当前仍然只有：

1. `count`
2. `supportedCount`
3. `unsupportedCount`

也就是说，上层按组渲染“额外结算条目 / 回能条目”两个 section 时，仍然需要先过滤 entries 再自行统计组内 diagnostics / source notes。

`V57` 只解决一件事：

- 为 `source-entry collection groups` 增加局部 `diagnosticSummary / sourceNoteSummary`

## 1. 目标

在不改变现有：

1. `collection.summary.groups[*].count`
2. `collection.summary.groups[*].supportedCount`
3. `collection.summary.groups[*].unsupportedCount`
4. `collection.summary.groups[*].label`

的前提下，让上层可以直接从：

1. `collection.summary.groups[*].diagnosticSummary`
2. `collection.summary.groups[*].sourceNoteSummary`

读取当前组内条目的解释性摘要。

## 2. 范围

1. `V57.1` scope freeze
2. `V57.2` group-level summaries
3. `V57.3` high-level / prompt alignment
4. `V57.4` docs closeout

## 3. 设计边界

本阶段只做：

1. 为 `StaticBuildSourceEntryGroupSummary` 增加局部 `diagnosticSummary / sourceNoteSummary`
2. 按组聚合当前 grouped entries 的 diagnostics / source notes
3. 更新 source-entry collection tests、高层 tool 断言与文档

显式不做：

1. 不改变顶层 `collection.summary` 既有字段
2. 不新增 group-level requirement aggregate
3. 不改变 mixed collection 的排序与 grouping 规则
4. 不把 source-view / utility-view 的完整 summary 嵌回 groups

## 4. 目标 contract

新增到 `StaticBuildSourceEntryGroupSummary`：

1. `diagnosticSummary: StaticBuildDiagnosticSummary`
2. `sourceNoteSummary: StaticBuildSourceNoteSummary`

两者分别聚合当前组内 entries 的 diagnostics / source notes。

## 5. 验收标准

1. `collection.summary.groups[*].diagnosticSummary` 可直接读取
2. `collection.summary.groups[*].sourceNoteSummary` 可直接读取
3. 高层 `resolve-build-source-entries` 与 public shape 保持一致
4. Agent 输出 mixed collection 时可以按组直接解释，不再需要先过滤 entries 再自行统计组内 diagnostics / source notes

## 6. 当前状态

- `V57.1` 已完成：冻结到 source-entry group summaries
- `V57.2` 已完成：`StaticBuildSourceEntryGroupSummary` 现在稳定暴露局部 `diagnosticSummary / sourceNoteSummary`
- `V57.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `collection.summary.groups[*].diagnosticSummary / sourceNoteSummary`
- `V57.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步
