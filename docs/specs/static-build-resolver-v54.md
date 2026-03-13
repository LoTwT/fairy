# 静态构筑解析系统 V54

`V53` 收口后，source-utility-view summary 已具备稳定 `requirementSummary`。

但 `ResolveStaticBuildSourceDamageViewsResult.summary` 当前仍只有：

1. `entryCount`
2. `standaloneCount`
3. `deltaCount`
4. `diagnosticSummary`
5. `sourceNoteSummary`

也就是说，顶层 `source damage views summary` 还不能直接聚合当前条目的 requirement 分布。

`V54` 只解决一件事：

- 为 `source-damage-view summary` 增加稳定 `requirementSummary`

## 1. 目标

在不改变现有：

1. `views.summary.groups`
2. `views.summary.standaloneCount`
3. `views.summary.deltaCount`
4. `views.summary.diagnosticSummary`
5. `views.summary.sourceNoteSummary`

的前提下，让上层可以直接从：

1. `ResolveStaticBuildSourceDamageViewsResult.summary.requirementSummary`

读取当前 source-damage-view 集合的聚合 requirement 概况。

## 2. 范围

1. `V54.1` scope freeze
2. `V54.2` summary-level requirement aggregate
3. `V54.3` high-level / prompt alignment
4. `V54.4` docs closeout

## 3. 设计边界

本阶段只做：

1. 为 `StaticBuildSourceDamageViewSummary` 增加 `requirementSummary`
2. 聚合所有 source-damage-view entries 的 `requirements`
3. 更新 source-damage-view tests、高层 tool 断言与文档

显式不做：

1. 不改变 source-damage-view entry 的 `requirements / requirementSummary`
2. 不修改 `damage / summary / diagnosticSummary / sourceNoteSummary`
3. 不改变 standalone / delta 计数语义
4. 不新增新的 source-view metadata

## 4. 目标 contract

新增到 `StaticBuildSourceDamageViewSummary`：

1. `requirementSummary: StaticBuildSourceDamageViewRequirementSummary`

该字段应聚合当前 `views.entries[*].requirements`，与单条 source-damage-view entry 上的 requirement contract 保持同一分组语义。

## 5. 验收标准

1. `views.summary.requirementSummary` 可直接读取
2. 高层 `resolve-build-source-damage-views` 与 compact/public shape 保持一致
3. Agent 输出 source-damage-view 列表时可以优先依赖顶层 requirement aggregate，而不是自行遍历所有 entries 统计
4. 现有 `views.summary.groups / standaloneCount / deltaCount` 保持兼容

## 6. 当前状态

- `V54.1` 已完成：冻结到 source-damage-view summary requirement aggregate
- `V54.2` 已完成：`StaticBuildSourceDamageViewSummary` 现在稳定暴露 `requirementSummary`
- `V54.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `views.summary.requirementSummary`
- `V54.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步
