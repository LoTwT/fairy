# 静态构筑解析系统 V85

## 目标

为 `skill-matrix` 的顶层 `summary` 增加稳定 `caveatSummary`。

`V67` 已解决 `ResolveStaticBuildSkillMatrixResult.caveatSummary`，`V68` 已解决 `summary.groups[*].caveatSummary`，`V69` 已解决 `row.caveatSummary`。但上层如果希望只消费 `matrix.summary` 这一个聚合对象，仍然需要额外跳回 `matrix.caveatSummary`。`V85` 只补这一个顶层 summary 对称缺口。

## 本阶段完成

1. `StaticBuildSkillMatrixSummary` 新增 `caveatSummary`
2. 顶层 summary 直接聚合 matrix 级 assumptions / unsupportedEffects
3. 高层 `resolve-build-skill-matrix` 断言与 Agent prompt 已对齐 `matrix.summary.caveatSummary`
4. README、总规格、roadmap、索引、架构文档已同步

## 设计边界

1. 不改变既有顶层 `matrix.caveatSummary`
2. 不改变 row / group 级 `caveatSummary`
3. 不提前把 `diagnosticSummary / sourceNoteSummary / effectSummary` 下沉到 `summary`

## 验收标准

1. 上层可以只读取 `matrix.summary` 完成数值摘要与 caveat 顶层聚合
2. `matrix.summary.caveatSummary` 与既有 `matrix.caveatSummary` 保持一致
3. 不影响 `rows[*]`、`summary.groups[*]` 与 compact contract
