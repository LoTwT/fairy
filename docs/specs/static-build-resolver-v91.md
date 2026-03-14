# 静态构筑解析系统 V91

## 目标

为 `skill-matrix rows[*]` 增加稳定 `assumptionSummary`。

`V90` 已解决 `matrix.summary.groups[*].assumptionSummary`，但如果上层只想快速判断某一行是否带 assumptions，仍然要自己统计 `row.assumptions.length`。`V91` 只补这一条 row 级对称缺口。

## 本阶段完成

1. `StaticBuildSkillMatrixRow` 与 compact row 新增稳定 `assumptionSummary`
2. `row.assumptionSummary` 直接聚合对应行的 `assumptions`
3. 高层 `resolve-build-skill-matrix` 断言与 Agent prompt 已对齐 `row.assumptionSummary`
4. README、总规格、roadmap、索引、架构文档已同步

## 设计边界

1. 不改变既有 `row.assumptions`
2. 不改变既有 `row.caveatSummary`
3. 不改变 `matrix.summary` 与 `groups[*]` 的既有 contract

## 验收标准

1. 上层逐行消费矩阵时，不再需要自己统计 `row.assumptions.length`
2. `row.assumptionSummary` 与对应 `row.assumptions` 保持一致
3. 不影响既有 `caveatSummary`、`diagnosticSummary`、`sourceNoteSummary` 与 `summary` contract
