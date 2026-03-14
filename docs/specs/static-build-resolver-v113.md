# 静态构筑解析系统 V113

`V112` 收口后，standalone source views 已把顶层
`requirementSummary / diagnosticSummary / sourceNoteSummary` 固定为稳定兼容字段。

但 `trigger-entry matrix` 顶层仍存在最后一组与 `summary` 不对称的 diagnostics / source-note 聚合：

1. `matrix.summary.diagnosticSummary` 已稳定存在
2. `matrix.summary.sourceNoteSummary` 已稳定存在
3. `matrix.diagnosticSummary / matrix.sourceNoteSummary` 仍不存在

这导致上层如果只想先判断整张 trigger matrix 是否存在 diagnostics / source notes，仍必须跳回
`matrix.summary.*`，缺少与现有顶层兼容字段一致的读取路径。

`V113` 只解决一件事：

- 给 `trigger-entry matrix` 顶层补齐稳定的 `diagnosticSummary / sourceNoteSummary`

## 1. 目标

在不改变现有：

1. `matrix.summary.diagnosticSummary`
2. `matrix.summary.sourceNoteSummary`
3. `matrix.rows[*].diagnosticSummary`
4. `matrix.rows[*].sourceNoteSummary`
5. `matrix.summary.groups[*].diagnosticSummary`
6. `matrix.summary.groups[*].sourceNoteSummary`

的前提下，让上层在 trigger-matrix 路径稳定依赖：

1. `matrix.diagnosticSummary`
2. `matrix.sourceNoteSummary`

## 2. 范围

1. `V113.1` scope freeze
2. `V113.2` runtime contract alignment
3. `V113.3` compact / tool assertion alignment
4. `V113.4` prompt / README / docs closeout

## 3. 设计边界

本阶段只做：

1. 在 `ResolveStaticBuildTriggerMatrixResult` 顶层新增 `diagnosticSummary`
2. 在 `ResolveStaticBuildTriggerMatrixResult` 顶层新增 `sourceNoteSummary`
3. 让 compact trigger matrix 透传这两个字段
4. 更新高层 trigger-matrix tool 断言、Agent prompt、README、roadmap、索引与架构文档

显式不做：

1. 不改变 `summary.diagnosticSummary / summary.sourceNoteSummary` 的语义
2. 不改变 `rows[*].diagnosticSummary / rows[*].sourceNoteSummary` 的语义
3. 不改变 `groups[*].diagnosticSummary / groups[*].sourceNoteSummary` 的语义
4. 不新增新的 aggregate 类型

## 4. 验收标准

1. `ResolveStaticBuildTriggerMatrixResult` 顶层稳定暴露 `diagnosticSummary / sourceNoteSummary`
2. compact trigger matrix 稳定透传这两个字段
3. 高层 trigger-matrix tool 测试显式校验 `matrix.diagnosticSummary / matrix.sourceNoteSummary`
4. Agent prompt 与 README 明确：
   - 优先使用 `matrix.summary.diagnosticSummary / matrix.summary.sourceNoteSummary`
   - 兼容旧调用方时可读取 `matrix.diagnosticSummary / matrix.sourceNoteSummary`

## 5. 当前状态

- `V113.1` 已完成：冻结到 trigger-matrix top-level diagnostic/source-note summary alignment
- `V113.2` 已完成：底层 result 与 compact trigger matrix 已补齐 `diagnosticSummary / sourceNoteSummary`
- `V113.3` 已完成：高层 trigger-matrix tool 断言已对齐顶层 `matrix.diagnosticSummary / matrix.sourceNoteSummary`
- `V113.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步
