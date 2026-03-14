# 静态构筑解析系统 V112

`V111` 收口后，standalone `source-damage-view` / `source-utility-view` 已把顶层
`diagnosticSummary / sourceNoteSummary` 固定为稳定兼容字段。

但这两条 result 顶层仍只缺最后一组与 `summary` 对齐的 requirement 聚合：

1. `views.summary.requirementSummary` 已稳定存在
2. `views.requirementSummary` 仍不存在

这导致上层如果只想先判断整组 standalone source views 的 requirement 分布，仍要退回
`views.summary.requirementSummary`，缺少与已有顶层兼容字段一致的读取路径。

`V112` 只解决一件事：

- 给 standalone `source-damage-view` / `source-utility-view` 顶层补齐稳定的
  `requirementSummary`

## 1. 目标

在不改变现有：

1. `views.summary.requirementSummary`
2. `views.entries[*].requirementSummary`
3. `views.summary.groups[*].requirementSummary`

的前提下，让上层在 standalone source-view 路径稳定依赖：

1. `views.requirementSummary`

## 2. 范围

1. `V112.1` scope freeze
2. `V112.2` runtime contract alignment
3. `V112.3` compact / tool assertion alignment
4. `V112.4` prompt / README / docs closeout

## 3. 设计边界

本阶段只做：

1. 在 `ResolveStaticBuildSourceDamageViewsResult` 顶层新增 `requirementSummary`
2. 在 `ResolveStaticBuildSourceUtilityViewsResult` 顶层新增 `requirementSummary`
3. 让 compact source views 透传该字段
4. 更新高层 source-view tool 断言、Agent prompt、README、roadmap、索引与架构文档

显式不做：

1. 不改变 `summary.requirementSummary` 的语义
2. 不改变 `entry.requirementSummary` 的语义
3. 不改变 `groups[*].requirementSummary` 的语义
4. 不新增新的 aggregate 类型

## 4. 验收标准

1. `ResolveStaticBuildSourceDamageViewsResult` 顶层稳定暴露 `requirementSummary`
2. `ResolveStaticBuildSourceUtilityViewsResult` 顶层稳定暴露 `requirementSummary`
3. compact source views 稳定透传该字段
4. 高层 source-view tool 测试显式校验 `views.requirementSummary`
5. Agent prompt 与 README 明确：
   - 优先使用 `views.summary.requirementSummary`
   - 兼容旧调用方时可读取 `views.requirementSummary`

## 5. 当前状态

- `V112.1` 已完成：冻结到 standalone source-view top-level requirement summary alignment
- `V112.2` 已完成：底层 result 与 compact source views 已补齐 `requirementSummary`
- `V112.3` 已完成：高层 source-view tool 断言已对齐顶层 `views.requirementSummary`
- `V112.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步
