# 静态构筑解析系统 V115

`V114` 收口后，`trigger-entry matrix` 顶层已经把 requirement / diagnostics /
source-note 兼容字段补齐。

但 mixed `source-entry collection` 顶层仍缺最后一组与 `summary` 对齐的 requirement 聚合：

1. `collection.summary.sourceDamageRequirementSummary` 已稳定存在
2. `collection.summary.sourceUtilityRequirementSummary` 已稳定存在
3. `collection.sourceDamageRequirementSummary / collection.sourceUtilityRequirementSummary` 仍不存在

这导致上层如果只想先判断整组 mixed collection 的 source-damage / source-utility requirement 分布，
仍必须跳回 `collection.summary.*`，缺少与现有顶层兼容字段一致的读取路径。

`V115` 只解决一件事：

- 给 mixed `source-entry collection` 顶层补齐稳定的
  `sourceDamageRequirementSummary / sourceUtilityRequirementSummary`

## 1. 目标

在不改变现有：

1. `collection.summary.sourceDamageRequirementSummary`
2. `collection.summary.sourceUtilityRequirementSummary`
3. `collection.summary.groups[*].sourceDamageRequirementSummary`
4. `collection.summary.groups[*].sourceUtilityRequirementSummary`
5. `entry.requirementSummary`

的前提下，让上层在 mixed `source-entry collection` 路径稳定依赖：

1. `collection.sourceDamageRequirementSummary`
2. `collection.sourceUtilityRequirementSummary`

## 2. 范围

1. `V115.1` scope freeze
2. `V115.2` runtime contract alignment
3. `V115.3` compact / tool assertion alignment
4. `V115.4` prompt / README / docs closeout

## 3. 设计边界

本阶段只做：

1. 在 `ResolveStaticBuildSourceEntriesResult` 顶层新增
   `sourceDamageRequirementSummary`
2. 在 `ResolveStaticBuildSourceEntriesResult` 顶层新增
   `sourceUtilityRequirementSummary`
3. 让 compact source-entry collection 透传这两个字段
4. 更新高层 source-entry tool 断言、Agent prompt、README、roadmap、索引与架构文档

显式不做：

1. 不改变 `summary.sourceDamageRequirementSummary` 的语义
2. 不改变 `summary.sourceUtilityRequirementSummary` 的语义
3. 不改变 `groups[*].sourceDamageRequirementSummary / groups[*].sourceUtilityRequirementSummary` 的语义
4. 不改变 `entry.requirementSummary` 的语义
5. 不新增新的 aggregate 类型

## 4. 验收标准

1. `ResolveStaticBuildSourceEntriesResult` 顶层稳定暴露
   `sourceDamageRequirementSummary / sourceUtilityRequirementSummary`
2. compact source-entry collection 稳定透传这两个字段
3. 高层 source-entry tool 测试显式校验
   `collection.sourceDamageRequirementSummary / collection.sourceUtilityRequirementSummary`
4. Agent prompt 与 README 明确：
   - 优先使用
     `collection.summary.sourceDamageRequirementSummary / collection.summary.sourceUtilityRequirementSummary`
   - 兼容旧调用方时可读取
     `collection.sourceDamageRequirementSummary / collection.sourceUtilityRequirementSummary`

## 5. 当前状态

- `V115.1` 已完成：冻结到 source-entry top-level dual requirement summary alignment
- `V115.2` 已完成：底层 result 与 compact source-entry collection 已补齐
  `sourceDamageRequirementSummary / sourceUtilityRequirementSummary`
- `V115.3` 已完成：高层 source-entry tool 断言已对齐顶层
  `collection.sourceDamageRequirementSummary / collection.sourceUtilityRequirementSummary`
- `V115.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步
