# 静态构筑解析系统 V110

`V109` 收口后，unified `source-entry collection` 已把 mixed entry 的 `requirementSummary` 视为正式公共 contract。

但 `ResolveStaticBuildSourceEntriesResult` 顶层仍只暴露：

1. `summary`
2. `caveatSummary`
3. `assumptionSummary`

而没有和其他 result 类型对齐的：

1. `diagnosticSummary`
2. `sourceNoteSummary`

这导致上层如果只想判断整组 mixed collection 是否存在 diagnostics / source notes，仍要退回 `collection.summary.*`，缺少与 `source-damage-view`、`trigger-matrix`、`skill-matrix` 一致的顶层兼容字段。

`V110` 只解决一件事：

- 给 unified `source-entry collection` 顶层补齐稳定的 `diagnosticSummary / sourceNoteSummary`

## 1. 目标

在不改变现有：

1. `collection.summary.diagnosticSummary`
2. `collection.summary.sourceNoteSummary`
3. `collection.entries[*]`
4. `entry.diagnosticSummary`
5. `entry.sourceNoteSummary`

的前提下，让上层在 mixed `source-entry collection` 路径稳定依赖：

1. `collection.diagnosticSummary`
2. `collection.sourceNoteSummary`

## 2. 范围

1. `V110.1` scope freeze
2. `V110.2` runtime contract alignment
3. `V110.3` compact / tool assertion alignment
4. `V110.4` prompt / README / docs closeout

## 3. 设计边界

本阶段只做：

1. 在 `ResolveStaticBuildSourceEntriesResult` 顶层新增 `diagnosticSummary / sourceNoteSummary`
2. 让 compact source-entry collection 透传这两个字段
3. 更新高层 source-entry tool 断言、Agent prompt、README、roadmap、索引与架构文档

显式不做：

1. 不改变 `summary.diagnosticSummary / summary.sourceNoteSummary` 的语义
2. 不改变 `entry.diagnosticSummary / entry.sourceNoteSummary` 的语义
3. 不新增新的 aggregate 类型
4. 不改变 `includeDetails` 语义

## 4. 验收标准

1. `ResolveStaticBuildSourceEntriesResult` 顶层稳定暴露 `diagnosticSummary / sourceNoteSummary`
2. compact source-entry collection 稳定透传这两个字段
3. 高层 source-entry tool 测试显式校验 `collection.diagnosticSummary / collection.sourceNoteSummary`
4. Agent prompt 与 README 明确：
   - 优先使用 `collection.summary.diagnosticSummary / collection.summary.sourceNoteSummary`
   - 兼容旧调用方时可读取 `collection.diagnosticSummary / collection.sourceNoteSummary`

## 5. 当前状态

- `V110.1` 已完成：冻结到 source-entry top-level diagnostic/source-note summary alignment
- `V110.2` 已完成：底层 result 与 compact collection 已补齐 `diagnosticSummary / sourceNoteSummary`
- `V110.3` 已完成：高层 source-entry tool 断言已对齐顶层 `collection.diagnosticSummary / collection.sourceNoteSummary`
- `V110.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步
