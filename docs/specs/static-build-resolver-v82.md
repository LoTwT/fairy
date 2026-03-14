# 静态构筑解析系统 V82

## 目标

为 `source-damage-view` 的顶层 `summary` 增加稳定 `assumptionSummary`。

`V72` 已解决 `ResolveStaticBuildSourceDamageViewsResult.assumptionSummary`，`V78` 已解决 `summary.groups[*].assumptionSummary`。但上层如果希望只消费 `views.summary` 这一个聚合对象，仍然需要额外跳回 `views.assumptionSummary`。`V82` 只补这一个顶层 summary 对称缺口。

## 本阶段完成

1. `StaticBuildSourceDamageViewSummary` 新增 `assumptionSummary`
2. 顶层 summary 直接聚合 views 级 assumptions
3. 高层 `resolve-build-source-damage-views` 断言与 Agent prompt 已对齐 `views.summary.assumptionSummary`
4. README、总规格、roadmap、索引、架构文档已同步

## 设计边界

1. 不改变既有顶层 `views.assumptionSummary`
2. 不改变 entry / group 级 `assumptionSummary`
3. 不提前引入 source-utility-view / source-entry summary 的同名字段

## 验收标准

1. 上层可以只读取 `views.summary` 完成 requirement / diagnostic / source-note / assumption 四类顶层聚合
2. `views.summary.assumptionSummary` 与既有 `views.assumptionSummary` 保持一致
3. 不影响 `entries[*]`、`summary.groups[*]` 与 compact contract
