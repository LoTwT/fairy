# 静态构筑解析系统 V90

## 目标

为 `skill-matrix summary groups[*]` 增加稳定 `assumptionSummary`。

`V89` 已解决 `matrix.summary.assumptionSummary`，但如果上层按 `group` 拆 section，仍然要额外回退到 `groups[*].assumptions` 自己统计 assumptions 数量。`V90` 只补这一条 group 级对称缺口。

## 本阶段完成

1. `StaticBuildSkillMatrixGroupSummary` 新增稳定 `assumptionSummary`
2. `matrix.summary.groups[*].assumptionSummary` 直接聚合对应组的 `assumptions`
3. 高层 `resolve-build-skill-matrix` 断言与 Agent prompt 已对齐 `matrix.summary.groups[*].assumptionSummary`
4. README、总规格、roadmap、索引、架构文档已同步

## 设计边界

1. 不改变既有 `matrix.summary.groups[*].assumptions`
2. 不改变既有 `matrix.summary.groups[*].caveatSummary`
3. 不提前把 `assumptionSummary` 下沉到 `rows[*]`

## 验收标准

1. 上层按 group 拆 section 时，不再需要自己统计 `groups[*].assumptions.length`
2. `matrix.summary.groups[*].assumptionSummary` 与对应 `groups[*].assumptions` 保持一致
3. 不影响既有 `effectSummary`、`caveatSummary`、`diagnosticSummary` 与 `sourceNoteSummary` contract
