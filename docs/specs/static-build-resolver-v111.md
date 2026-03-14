# 静态构筑解析系统 V111

`V110` 收口后，unified `source-entry collection` 已把顶层
`diagnosticSummary / sourceNoteSummary` 固定为稳定兼容字段。

但 standalone `source-damage-view` / `source-utility-view` 顶层仍只暴露：

1. `summary`
2. `caveatSummary`
3. `assumptionSummary`

虽然它们的 `summary` 已经稳定包含：

1. `diagnosticSummary`
2. `sourceNoteSummary`

但 result 顶层还缺这两组与 mixed collection / skill-matrix / trigger-matrix
一致的兼容字段。

`V111` 只解决一件事：

- 给 standalone `source-damage-view` / `source-utility-view` 顶层补齐稳定的
  `diagnosticSummary / sourceNoteSummary`

## 1. 目标

在不改变现有：

1. `views.summary.diagnosticSummary`
2. `views.summary.sourceNoteSummary`
3. `views.entries[*]`
4. `entry.diagnosticSummary`
5. `entry.sourceNoteSummary`

的前提下，让上层在 standalone source-view 路径稳定依赖：

1. `views.diagnosticSummary`
2. `views.sourceNoteSummary`

## 2. 范围

1. `V111.1` scope freeze
2. `V111.2` runtime contract alignment
3. `V111.3` compact / tool assertion alignment
4. `V111.4` prompt / README / docs closeout

## 3. 设计边界

本阶段只做：

1. 在 `ResolveStaticBuildSourceDamageViewsResult` 顶层新增
   `diagnosticSummary / sourceNoteSummary`
2. 在 `ResolveStaticBuildSourceUtilityViewsResult` 顶层新增
   `diagnosticSummary / sourceNoteSummary`
3. 让 compact source views 透传这两个字段
4. 更新高层 source-view tool 断言、Agent prompt、README、roadmap、索引与架构文档

显式不做：

1. 不改变 `summary.diagnosticSummary / summary.sourceNoteSummary` 的语义
2. 不改变 `entry.diagnosticSummary / entry.sourceNoteSummary` 的语义
3. 不新增新的 aggregate 类型
4. 不改变 `includeDetails` 语义

## 4. 验收标准

1. `ResolveStaticBuildSourceDamageViewsResult` 顶层稳定暴露
   `diagnosticSummary / sourceNoteSummary`
2. `ResolveStaticBuildSourceUtilityViewsResult` 顶层稳定暴露
   `diagnosticSummary / sourceNoteSummary`
3. compact source views 稳定透传这两个字段
4. 高层 source-view tool 测试显式校验
   `views.diagnosticSummary / views.sourceNoteSummary`
5. Agent prompt 与 README 明确：
   - 优先使用 `views.summary.diagnosticSummary / views.summary.sourceNoteSummary`
   - 兼容旧调用方时可读取 `views.diagnosticSummary / views.sourceNoteSummary`

## 5. 当前状态

- `V111.1` 已完成：冻结到 standalone source-view top-level diagnostic/source-note summary alignment
- `V111.2` 已完成：底层 result 与 compact source views 已补齐 `diagnosticSummary / sourceNoteSummary`
- `V111.3` 已完成：高层 source-view tool 断言已对齐顶层 `views.diagnosticSummary / views.sourceNoteSummary`
- `V111.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步
