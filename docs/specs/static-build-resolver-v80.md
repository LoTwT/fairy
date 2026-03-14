# 静态构筑解析系统 V80

## 目标

为 `trigger-entry matrix` 的 `summary.groups[*]` 增加局部 `assumptionSummary`。

`V70`、`V71` 已解决顶层与 row 级 assumptions 摘要，但按“主公式 / 额外来源”拆 section 时，组内 assumptions 仍需要上层自行遍历 rows 统计。`V80` 只补这一处组级对称缺口。

## 本阶段完成

1. `StaticBuildTriggerMatrixGroupSummary` 新增 `assumptionSummary`
2. `main-formula / source-view` 分组聚合时直接派生组级 assumptions 摘要
3. 高层 `resolve-build-trigger-matrix` 断言与 Agent prompt 已对齐 `matrix.summary.groups[*].assumptionSummary`
4. README、总规格、roadmap、索引、架构文档已同步

## 设计边界

1. 不改变 row 级 `assumptions` 的原始数组语义
2. 不改变顶层 `matrix.assumptionSummary`
3. 不提前引入 skill-matrix groups 的同名字段

## 验收标准

1. 上层可以直接通过 `matrix.summary.groups[*].assumptionSummary` 判断某一组是否带 assumptions
2. `main-formula / source-view` 组级 assumptions 不再依赖手工遍历组内 rows
3. 不影响顶层 `summary`、顶层 `assumptionSummary` 与 `rows[*]` contract
