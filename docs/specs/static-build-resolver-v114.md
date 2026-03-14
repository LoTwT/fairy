# 静态构筑解析系统 V114

`V113` 收口后，`trigger-entry matrix` 顶层已经把
`diagnosticSummary / sourceNoteSummary` 固定为稳定兼容字段。

但同一路径顶层仍缺最后一组与 `summary` 对齐的 requirement 聚合：

1. `matrix.summary.requirementSummary` 已稳定存在
2. `matrix.requirementSummary` 仍不存在

这导致上层如果只想先判断整张 trigger matrix 的 requirement 分布，仍必须跳回
`matrix.summary.requirementSummary`，缺少与现有顶层兼容字段一致的读取路径。

`V114` 只解决一件事：

- 给 `trigger-entry matrix` 顶层补齐稳定的 `requirementSummary`

## 1. 目标

在不改变现有：

1. `matrix.summary.requirementSummary`
2. `matrix.rows[*].requirementSummary`
3. `matrix.summary.groups[*].requirementSummary`

的前提下，让上层在 trigger-matrix 路径稳定依赖：

1. `matrix.requirementSummary`

## 2. 范围

1. `V114.1` scope freeze
2. `V114.2` runtime contract alignment
3. `V114.3` compact / tool assertion alignment
4. `V114.4` prompt / README / docs closeout

## 3. 设计边界

本阶段只做：

1. 在 `ResolveStaticBuildTriggerMatrixResult` 顶层新增 `requirementSummary`
2. 让 compact trigger matrix 透传该字段
3. 更新高层 trigger-matrix tool 断言、Agent prompt、README、roadmap、索引与架构文档

显式不做：

1. 不改变 `summary.requirementSummary` 的语义
2. 不改变 `rows[*].requirementSummary` 的语义
3. 不改变 `groups[*].requirementSummary` 的语义
4. 不新增新的 aggregate 类型

## 4. 验收标准

1. `ResolveStaticBuildTriggerMatrixResult` 顶层稳定暴露 `requirementSummary`
2. compact trigger matrix 稳定透传该字段
3. 高层 trigger-matrix tool 测试显式校验 `matrix.requirementSummary`
4. Agent prompt 与 README 明确：
   - 优先使用 `matrix.summary.requirementSummary`
   - 兼容旧调用方时可读取 `matrix.requirementSummary`

## 5. 当前状态

- `V114.1` 已完成：冻结到 trigger-matrix top-level requirement summary alignment
- `V114.2` 已完成：底层 result 与 compact trigger matrix 已补齐 `requirementSummary`
- `V114.3` 已完成：高层 trigger-matrix tool 断言已对齐顶层 `matrix.requirementSummary`
- `V114.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步
