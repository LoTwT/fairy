# 静态构筑解析系统 V55

`V54` 收口后，source-damage-view summary 已具备稳定 `requirementSummary`。

但 `ResolveStaticBuildTriggerMatrixResult.summary` 当前仍只有：

1. `rowCount`
2. `mainFormulaCount`
3. `sourceViewCount`
4. `supportedCount`
5. `unsupportedCount`
6. `hasSourceViews`
7. `diagnosticSummary`
8. `sourceNoteSummary`
9. `groups`

也就是说，顶层 `trigger matrix summary` 还不能直接聚合当前 rows 的 requirement 分布。

`V55` 只解决一件事：

- 为 `trigger-matrix summary` 增加稳定 `requirementSummary`

## 1. 目标

在不改变现有：

1. `matrix.summary.groups`
2. `matrix.summary.mainFormulaCount`
3. `matrix.summary.sourceViewCount`
4. `matrix.summary.diagnosticSummary`
5. `matrix.summary.sourceNoteSummary`

的前提下，让上层可以直接从：

1. `ResolveStaticBuildTriggerMatrixResult.summary.requirementSummary`

读取当前 trigger-entry matrix 集合的聚合 requirement 概况。

## 2. 范围

1. `V55.1` scope freeze
2. `V55.2` summary-level requirement aggregate
3. `V55.3` high-level / prompt alignment
4. `V55.4` docs closeout

## 3. 设计边界

本阶段只做：

1. 为 `StaticBuildTriggerMatrixSummary` 增加 `requirementSummary`
2. 聚合所有 trigger rows 的 `requirements`
3. 更新 trigger-matrix tests、高层 tool 断言与文档

显式不做：

1. 不改变 trigger row 的 `requirements / requirementSummary`
2. 不修改 `damage / summary / diagnosticSummary / sourceNoteSummary`
3. 不改变 `mainFormula / sourceView` 计数语义
4. 不新增新的 trigger-matrix metadata

## 4. 目标 contract

新增到 `StaticBuildTriggerMatrixSummary`：

1. `requirementSummary: StaticBuildSourceDamageViewRequirementSummary`

该字段应聚合当前 `matrix.rows[*].requirements`，与单条 trigger row 上的 requirement contract 保持同一分组语义。

## 5. 验收标准

1. `matrix.summary.requirementSummary` 可直接读取
2. 高层 `resolve-build-trigger-matrix` 与 compact/public shape 保持一致
3. Agent 输出 trigger-entry matrix 时可以优先依赖顶层 requirement aggregate，而不是自行遍历所有 rows 统计
4. 现有 `matrix.summary.groups / mainFormulaCount / sourceViewCount` 保持兼容

## 6. 当前状态

- `V55.1` 已完成：冻结到 trigger-matrix summary requirement aggregate
- `V55.2` 已完成：`StaticBuildTriggerMatrixSummary` 现在稳定暴露 `requirementSummary`
- `V55.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `matrix.summary.requirementSummary`
- `V55.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步
