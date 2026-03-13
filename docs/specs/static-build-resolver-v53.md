# 静态构筑解析系统 V53

`V52` 收口后，source-utility-view entry 已具备稳定 `requirements / requirementSummary`。

但 `ResolveStaticBuildSourceUtilityViewsResult.summary` 当前仍只有：

1. `entryCount`
2. `triggerCount`
3. `rateCount`
4. `diagnosticSummary`
5. `sourceNoteSummary`

也就是说，顶层 `utility views summary` 还不能直接聚合“这一组条目总体需要哪些触发 / 条件 / 冷却结构”。

`V53` 只解决一件事：

- 为 `source-utility-view summary` 增加稳定 `requirementSummary`

## 1. 目标

在不改变现有：

1. `views.summary.groups`
2. `views.summary.triggerCount`
3. `views.summary.rateCount`
4. `views.summary.diagnosticSummary`
5. `views.summary.sourceNoteSummary`

的前提下，让上层可以直接从：

1. `ResolveStaticBuildSourceUtilityViewsResult.summary.requirementSummary`

读取当前 utility-view 集合的聚合 requirement 概况。

## 2. 范围

1. `V53.1` scope freeze
2. `V53.2` summary-level requirement aggregate
3. `V53.3` high-level / prompt alignment
4. `V53.4` docs closeout

## 3. 设计边界

本阶段只做：

1. 为 `StaticBuildSourceUtilityViewSummary` 增加 `requirementSummary`
2. 聚合所有 utility entries 的 `requirements`
3. 更新 utility-view tests、高层 tool 断言与文档

显式不做：

1. 不改变 utility entry 的 `requirements / requirementSummary`
2. 不修改 `value / unit / resolutionMode / targetScope`
3. 不改变 `diagnosticSummary / sourceNoteSummary`
4. 不新增新的 utility-only panel contract

## 4. 目标 contract

新增到 `StaticBuildSourceUtilityViewSummary`：

1. `requirementSummary: StaticBuildSourceUtilityViewRequirementSummary`

该字段应聚合当前 `views.entries[*].requirements`，与单条 entry 上的 requirement contract 保持同一分组语义。

## 5. 验收标准

1. `views.summary.requirementSummary` 可直接读取
2. 高层 `resolve-build-source-utility-views` 与 compact/public shape 保持一致
3. Agent 输出 utility 条目时可以优先依赖顶层 requirement aggregate，而不是自行遍历所有 entries 统计
4. 现有 `views.summary.groups / triggerCount / rateCount` 保持兼容

## 6. 当前状态

- `V53.1` 已完成：冻结到 source-utility-view summary requirement aggregate
- `V53.2` 已完成：`StaticBuildSourceUtilityViewSummary` 现在稳定暴露 `requirementSummary`
- `V53.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `views.summary.requirementSummary`
- `V53.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步
