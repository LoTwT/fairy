# 静态构筑解析系统 V81

## 目标

为 `trigger-entry matrix` 的顶层 `summary` 增加稳定 `assumptionSummary`。

`V70` 已解决 `ResolveStaticBuildTriggerMatrixResult.assumptionSummary`，`V80` 已解决 `summary.groups[*].assumptionSummary`。但上层如果希望只消费 `matrix.summary` 这一个聚合对象，仍然需要额外跳回 `matrix.assumptionSummary`。`V81` 只补这一个顶层 summary 对称缺口。

## 本阶段完成

1. `StaticBuildTriggerMatrixSummary` 新增 `assumptionSummary`
2. 顶层 summary 直接聚合所有 rows 的 assumptions
3. 高层 `resolve-build-trigger-matrix` 断言与 Agent prompt 已对齐 `matrix.summary.assumptionSummary`
4. README、总规格、roadmap、索引、架构文档已同步

## 设计边界

1. 不改变既有顶层 `matrix.assumptionSummary`
2. 不改变 row / group 级 `assumptionSummary`
3. 不提前引入 source-view / source-entry / skill-matrix summary 的同名字段

## 验收标准

1. 上层可以只读取 `matrix.summary` 完成 requirement / diagnostic / source-note / assumption 四类顶层聚合
2. `matrix.summary.assumptionSummary` 与既有 `matrix.assumptionSummary` 保持一致
3. 不影响 `rows[*]`、`summary.groups[*]` 与 compact contract
