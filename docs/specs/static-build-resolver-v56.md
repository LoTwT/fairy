# 静态构筑解析系统 V56

`V55` 收口后，source-damage-view summary、source-utility-view summary 与 trigger-matrix summary 都已具备稳定的 requirement aggregate。

但 `ResolveStaticBuildSourceEntriesResult.summary` 当前仍只聚合：

1. `diagnosticSummary`
2. `sourceNoteSummary`
3. `groups`

也就是说，顶层 mixed collection 还不能直接分别聚合 `source-damage-view` 与 `source-utility-view` 的 requirement 分布。

`V56` 只解决一件事：

- 为 `source-entry collection summary` 增加稳定 requirement aggregates

## 1. 目标

在不改变现有：

1. `collection.summary.groups`
2. `collection.summary.sourceDamageViewCount`
3. `collection.summary.sourceUtilityViewCount`
4. `collection.summary.diagnosticSummary`
5. `collection.summary.sourceNoteSummary`

的前提下，让上层可以直接从：

1. `collection.summary.sourceDamageRequirementSummary`
2. `collection.summary.sourceUtilityRequirementSummary`

读取当前 mixed collection 中两类条目的 requirement 概况。

## 2. 范围

1. `V56.1` scope freeze
2. `V56.2` collection-level requirement aggregates
3. `V56.3` high-level / prompt alignment
4. `V56.4` docs closeout

## 3. 设计边界

本阶段只做：

1. 为 `StaticBuildSourceEntryCollectionSummary` 增加两组 requirement aggregate
2. 分别聚合 `source-damage-view` 与 `source-utility-view` entries 的 requirements
3. 更新 source-entry collection tests、高层 tool 断言与文档

显式不做：

1. 不新增新的“混合 requirement union”类型
2. 不改变单条 source entry 的 requirement contract
3. 不修改 `diagnosticSummary / sourceNoteSummary / groups`
4. 不改变 mixed collection 的排序与分组语义

## 4. 目标 contract

新增到 `StaticBuildSourceEntryCollectionSummary`：

1. `sourceDamageRequirementSummary: StaticBuildSourceDamageViewRequirementSummary`
2. `sourceUtilityRequirementSummary: StaticBuildSourceUtilityViewRequirementSummary`

两者分别聚合当前 `source-damage-view` / `source-utility-view` entries 的 requirements，不引入新的混合 requirement 类型。

## 5. 验收标准

1. `collection.summary.sourceDamageRequirementSummary` 可直接读取
2. `collection.summary.sourceUtilityRequirementSummary` 可直接读取
3. 高层 `resolve-build-source-entries` 与 compact/public shape 保持一致
4. Agent 输出 mixed collection 时可以优先依赖顶层 requirement aggregate，而不是自行遍历所有 entries 统计

## 6. 当前状态

- `V56.1` 已完成：冻结到 source-entry collection requirement aggregate
- `V56.2` 已完成：`StaticBuildSourceEntryCollectionSummary` 现在稳定暴露 `sourceDamageRequirementSummary / sourceUtilityRequirementSummary`
- `V56.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `collection.summary.sourceDamageRequirementSummary / sourceUtilityRequirementSummary`
- `V56.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步
