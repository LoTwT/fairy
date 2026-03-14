# 静态构筑解析系统 V84

## 目标

为 unified `source-entry collection` 的顶层 `summary` 增加稳定 `assumptionSummary`。

`V76` 已解决 `ResolveStaticBuildSourceEntriesResult.assumptionSummary`，`V77` 已解决 `summary.groups[*].assumptionSummary`。但上层如果希望只消费 `collection.summary` 这一个聚合对象，仍然需要额外跳回 `collection.assumptionSummary`。`V84` 只补这一个顶层 summary 对称缺口。

## 本阶段完成

1. `StaticBuildSourceEntryCollectionSummary` 新增 `assumptionSummary`
2. 顶层 summary 直接聚合 collection 级 assumptions
3. 高层 `resolve-build-source-entries` 断言与 Agent prompt 已对齐 `collection.summary.assumptionSummary`
4. README、总规格、roadmap、索引、架构文档已同步

## 设计边界

1. 不改变既有顶层 `collection.assumptionSummary`
2. 不改变 entry / group 级 `assumptionSummary`
3. 不提前引入其他新 summary 字段

## 验收标准

1. 上层可以只读取 `collection.summary` 完成 requirement / diagnostic / source-note / assumption 四类顶层聚合
2. `collection.summary.assumptionSummary` 与既有 `collection.assumptionSummary` 保持一致
3. 不影响 `entries[*]`、`summary.groups[*]` 与 compact contract
