# 静态构筑解析系统 V116

`V115` 收口后，standalone source views、mixed source-entry collection 与
trigger-entry matrix 顶层已经把 `requirementSummary / diagnosticSummary /
sourceNoteSummary / assumptionSummary / caveatSummary` 这些兼容字段补齐。

但 `trigger-entry matrix` 仍缺少与 `skill-matrix` 对称的结构化效果聚合：

1. `matrix.summary.effectSummary` 不存在
2. `matrix.effectSummary` 不存在

这导致上层如果要生成“本次触发结算涉及的乘区变化”或“触发条目增益清单”，仍必须逐行遍历
`row.build.trace` 自己聚合。

`V116` 只解决一件事：

- 给 `trigger-entry matrix` 补齐稳定的顶层 / summary 级 `effectSummary`

## 1. 目标

在不改变现有：

1. `rows[*].build.trace`
2. `rows[*].summary`
3. `rows[*].requirementSummary`
4. `summary.groups[*]`

的前提下，让上层在 trigger-entry matrix 路径稳定依赖：

1. `matrix.summary.effectSummary`
2. `matrix.effectSummary`

## 2. 范围

1. `V116.1` scope freeze
2. `V116.2` runtime contract alignment
3. `V116.3` compact / tool assertion alignment
4. `V116.4` prompt / README / docs closeout

## 3. 设计边界

本阶段只做：

1. 在 `StaticBuildTriggerMatrixSummary` 新增稳定 `effectSummary`
2. 在 `ResolveStaticBuildTriggerMatrixResult` 顶层新增稳定 `effectSummary`
3. 让 compact trigger matrix 透传该字段
4. 更新高层 trigger-matrix tool 断言、Agent prompt、README、roadmap、索引与架构文档

显式不做：

1. 不改变 `rows[*].build.trace` 的语义
2. 不改变 `rows[*].summary` 的语义
3. 不提前扩到 `summary.groups[*].effectSummary`
4. 不提前扩到 `rows[*].effectSummary`
5. 不重命名或抽象现有 `skill-matrix effectSummary` 类型

## 4. 验收标准

1. `StaticBuildTriggerMatrixSummary` 稳定暴露 `effectSummary`
2. `ResolveStaticBuildTriggerMatrixResult` 顶层稳定暴露 `effectSummary`
3. compact trigger matrix 稳定透传 `effectSummary`
4. 高层 trigger-matrix tool 测试显式校验：
   - `matrix.effectSummary`
   - `matrix.summary.effectSummary`
5. Agent prompt 与 README 明确：
   - 优先使用 `matrix.summary.effectSummary`
   - 兼容旧调用方时可读取 `matrix.effectSummary`

## 5. 当前状态

- `V116.1` 已完成：冻结到 trigger-matrix top-level effect summary alignment
- `V116.2` 已完成：底层 result 与 `summary` 已补齐 `effectSummary`
- `V116.3` 已完成：compact trigger matrix 与高层 tool 断言已对齐顶层 `matrix.effectSummary`
- `V116.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步
