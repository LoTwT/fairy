# 静态构筑解析系统 V127

## 背景

`V126` 已把 standalone utility views 的 top-level / summary / group `effectSummary` 补齐，但 `skill-matrix` 仍缺少最后一个 requirement-summary 对称 contract。

当前状态不对称：

- `trigger-matrix`
- `source-damage-view`
- `source-utility-view`
- `source-entry collection`

这些路径都已经有稳定的 top-level / group / entry requirement summary。

但 `skill-matrix` 仍然没有：

1. `ResolveStaticBuildSkillMatrixResult.requirementSummary`
2. `StaticBuildSkillMatrixSummary.requirementSummary`
3. `StaticBuildSkillMatrixGroupSummary.requirementSummary`
4. `StaticBuildSkillMatrixRow.requirementSummary`
5. `CompactStaticBuildSkillMatrixResult.requirementSummary`

## 目标

只补齐 `skill-matrix` 的 requirement-summary 对称 contract：

1. `ResolveStaticBuildSkillMatrixResult.requirementSummary`
2. `StaticBuildSkillMatrixSummary.requirementSummary`
3. `StaticBuildSkillMatrixGroupSummary.requirementSummary`
4. `StaticBuildSkillMatrixRow.requirementSummary`
5. `CompactStaticBuildSkillMatrixResult.requirementSummary`

## 当前边界

本阶段只做：

1. result / summary / group / row / compact 新增稳定 `requirementSummary`
2. 当前统一固定返回空聚合
3. 高层 tool / prompt / README 对齐这些字段

显式不做：

1. 不为 skill matrix 伪造真实技能 requirements
2. 不改变 assumptions / diagnostics / source notes / caveats / effects 的既有 contract
3. 不改变 `trigger-matrix`、`source views`、`source-entry collection` 的既有 requirement-summary 语义

## 完成标准

1. `resolveStaticBuildSkillMatrix()` 直接返回 `requirementSummary`
2. `matrix.summary.requirementSummary` 固定为空聚合
3. `matrix.summary.groups[*].requirementSummary` 固定为空聚合
4. `rows[*].requirementSummary` 固定为空聚合
5. compact 结果也透传 `requirementSummary`
6. README、roadmap、索引、架构文档同步
