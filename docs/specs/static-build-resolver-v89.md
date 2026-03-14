# 静态构筑解析系统 V89

## 目标

为 `skill-matrix summary` 增加稳定 `assumptionSummary`。

`V88` 已解决 `skill-matrix` 顶层结果的 `assumptionSummary`，但如果上层只消费 `matrix.summary`，仍然要额外跳回 `matrix.assumptionSummary`。`V89` 只补这一条 summary 级对称缺口。

## 本阶段完成

1. `StaticBuildSkillMatrixSummary` 新增稳定 `assumptionSummary`
2. `matrix.summary.assumptionSummary` 直接聚合整张矩阵的 `assumptions`
3. 高层 `resolve-build-skill-matrix` 断言与 Agent prompt 已对齐 `matrix.summary.assumptionSummary`
4. README、总规格、roadmap、索引、架构文档已同步

## 设计边界

1. 不改变既有顶层 `matrix.assumptionSummary`
2. 不改变既有 `matrix.summary.caveatSummary`
3. 不提前把 `assumptionSummary` 下沉到 `matrix.summary.groups[*] / rows[*]`

## 验收标准

1. 上层只消费 `matrix.summary` 时，不再需要额外跳回 `matrix.assumptionSummary`
2. `matrix.summary.assumptionSummary` 与 `matrix.assumptionSummary` 保持一致
3. 不影响既有 `effectSummary`、`caveatSummary`、`diagnosticSummary` 与 `sourceNoteSummary` contract
