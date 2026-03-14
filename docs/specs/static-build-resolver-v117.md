# 静态构筑解析系统 V117

`V116` 收口后，`trigger-entry matrix` 顶层与 `summary` 已补齐稳定
`effectSummary`。

但按 `main-formula / source-view` 拆 section 时，组级仍缺少对应聚合：

1. `matrix.summary.groups[*].effectSummary` 不存在

这导致上层如果想分别解释“主公式结算用了哪些效果”“额外来源结算用了哪些效果”，仍要重新遍历组内 rows 聚合 `row.build.trace`。

`V117` 只解决一件事：

- 给 `trigger-entry matrix summary.groups[*]` 补齐稳定 `effectSummary`

## 1. 目标

在不改变现有：

1. `matrix.summary.effectSummary`
2. `matrix.effectSummary`
3. `rows[*].build.trace`
4. `rows[*].summary`

的前提下，让上层按组稳定依赖：

1. `matrix.summary.groups[*].effectSummary`

## 2. 范围

1. `V117.1` scope freeze
2. `V117.2` runtime contract alignment
3. `V117.3` tool assertion / prompt alignment
4. `V117.4` README / roadmap / docs closeout

## 3. 设计边界

本阶段只做：

1. 在 `StaticBuildTriggerMatrixGroupSummary` 新增稳定 `effectSummary`
2. 让组级 `effectSummary` 复用现有 trigger-matrix effect 聚合语义
3. 更新 trigger-matrix 测试、Agent prompt、README、roadmap、索引与架构文档

显式不做：

1. 不改变顶层 `matrix.summary.effectSummary / matrix.effectSummary` 的语义
2. 不提前扩到 `rows[*].effectSummary`
3. 不新增新的 effect-summary 类型

## 4. 验收标准

1. `StaticBuildTriggerMatrixGroupSummary` 稳定暴露 `effectSummary`
2. build / agent 测试显式校验 `matrix.summary.groups[*].effectSummary`
3. Agent prompt 与 README 明确：
   - 按组解释 trigger matrix 时优先读取 `matrix.summary.groups[*].effectSummary`

## 5. 当前状态

- `V117.1` 已完成：冻结到 trigger-matrix group effect summary alignment
- `V117.2` 已完成：`StaticBuildTriggerMatrixGroupSummary` 已补齐稳定 `effectSummary`
- `V117.3` 已完成：高层 trigger-matrix tool 断言与 Agent prompt 已对齐 `matrix.summary.groups[*].effectSummary`
- `V117.4` 已完成：README、roadmap、索引与架构文档已同步
