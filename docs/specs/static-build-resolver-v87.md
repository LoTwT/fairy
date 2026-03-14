# 静态构筑解析系统 V87

## 目标

为 `skill-matrix` 的顶层 `summary` 增加稳定 `effectSummary`。

`V31` 已解决顶层 `matrix.effectSummary`，`V63` 已解决 `summary.groups[*].effectSummary`。但上层如果希望只消费 `matrix.summary` 这一个聚合对象，仍然需要额外跳回顶层 `matrix.effectSummary`。`V87` 只补这一个 summary 对称缺口。

## 本阶段完成

1. `StaticBuildSkillMatrixSummary` 新增 `effectSummary`
2. 顶层 summary 直接聚合 matrix 级 effect summary
3. 高层 `resolve-build-skill-matrix` 断言与 Agent prompt 已对齐 `matrix.summary.effectSummary`
4. README、总规格、roadmap、索引、架构文档已同步

## 设计边界

1. 不改变既有顶层 `matrix.effectSummary`
2. 不改变 group 级 `effectSummary`
3. 不改变 row / group 级 diagnostics、source notes 或 caveats contract

## 验收标准

1. 上层可以只读取 `matrix.summary` 完成数值摘要、effect summary、caveat 摘要与 diagnostics / source notes 顶层聚合
2. `matrix.summary.effectSummary` 与既有顶层 `matrix.effectSummary` 保持一致
3. 不影响 `summary.groups[*].effectSummary`、`rows[*]` 与 compact contract
