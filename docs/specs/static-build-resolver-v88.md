# 静态构筑解析系统 V88

## 目标

为 `skill-matrix` 顶层结果增加稳定 `assumptionSummary`。

`V70` 已解决 `trigger-matrix` 顶层 `assumptionSummary`，`V72`-`V76` 已解决 source views / source-entry collection 顶层 `assumptionSummary`。但 `skill-matrix` 顶层仍只有原始 `assumptions` 数组和更宽口径的 `caveatSummary`。`V88` 只补 assumption-only 这一条顶层结果对称缺口。

## 本阶段完成

1. `ResolveStaticBuildSkillMatrixResult` 与 compact result 新增 `assumptionSummary`
2. 顶层 assumption summary 直接聚合 `matrix.assumptions`
3. 高层 `resolve-build-skill-matrix` 断言与 Agent prompt 已对齐 `matrix.assumptionSummary`
4. README、总规格、roadmap、索引、架构文档已同步

## 设计边界

1. 不改变既有顶层 `matrix.assumptions`
2. 不改变既有 `matrix.caveatSummary`
3. 不提前把 `assumptionSummary` 下沉到 `matrix.summary / summary.groups[*] / rows[*]`

## 验收标准

1. 上层先判断整张矩阵是否存在 assumptions 时，不再需要自己统计 `matrix.assumptions.length`
2. `matrix.assumptionSummary.count` 与 `matrix.assumptions.length` 保持一致
3. 不影响既有 `caveatSummary`、`diagnosticSummary`、`sourceNoteSummary` 与 `effectSummary` contract
