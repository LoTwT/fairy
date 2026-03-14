# 静态构筑解析系统 V118

`V117` 收口后，`trigger-entry matrix` 已在顶层与 group 层补齐稳定
`effectSummary`。

但逐行消费时，调用方仍只能：

1. 继续读 `row.build.trace`
2. 或自己把单行 trace 重新聚合成 effect 概况

`V118` 只解决一件事：

- 给 `trigger-entry matrix rows[*]` 补齐稳定 `effectSummary`

## 1. 目标

在不改变现有：

1. `matrix.summary.effectSummary`
2. `matrix.effectSummary`
3. `matrix.summary.groups[*].effectSummary`
4. `rows[*].build.trace`

的前提下，让上层逐行稳定依赖：

1. `rows[*].effectSummary`

## 2. 范围

1. `V118.1` scope freeze
2. `V118.2` runtime contract alignment
3. `V118.3` tool assertion / prompt alignment
4. `V118.4` README / roadmap / docs closeout

## 3. 设计边界

本阶段只做：

1. 在 `StaticBuildTriggerMatrixRow` 新增稳定 `effectSummary`
2. 让 row-level `effectSummary` 复用现有 trigger-matrix effect 聚合语义
3. 更新 compact row、trigger-matrix 测试、Agent prompt、README、roadmap、索引与架构文档

显式不做：

1. 不改变顶层 `matrix.summary.effectSummary / matrix.effectSummary` 的语义
2. 不改变组级 `matrix.summary.groups[*].effectSummary` 的语义
3. 不新增新的 effect-summary 类型

## 4. 验收标准

1. `StaticBuildTriggerMatrixRow` 稳定暴露 `effectSummary`
2. build / agent 测试显式校验 `rows[*].effectSummary`
3. Agent prompt 与 README 明确：
   - 逐行解释 trigger matrix 时优先读取 `row.effectSummary`

## 5. 当前状态

- `V118.1` 已完成：冻结到 trigger-matrix row effect summary alignment
- `V118.2` 已完成：`StaticBuildTriggerMatrixRow` 与 compact row 已补齐稳定 `effectSummary`
- `V118.3` 已完成：高层 trigger-matrix tool 断言与 Agent prompt 已对齐 `row.effectSummary`
- `V118.4` 已完成：README、roadmap、索引与架构文档已同步
