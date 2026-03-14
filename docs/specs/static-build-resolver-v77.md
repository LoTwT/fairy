# 静态构筑解析系统 V77

## 目标

为 unified `source-entry collection` 的 `groups[*]` 增加局部 `assumptionSummary`。

`V76` 已解决 mixed collection 顶层 assumptions 摘要，但按组拆“额外结算条目 / 回能条目”时，组内 assumptions 仍需要上层自行遍历 entries 统计。`V77` 只补这一处组级对称缺口。

## 本阶段完成

1. `StaticBuildSourceEntryGroupSummary` 新增 `assumptionSummary`
2. mixed collection 分组聚合时直接派生组级 assumptions 摘要
3. 高层 `resolve-build-source-entries` 断言与 Agent prompt 已对齐 `collection.summary.groups[*].assumptionSummary`
4. README、总规格、roadmap、索引、架构文档已同步

## 设计边界

1. 不改变组内 entry 的 `assumptions` 原始数组语义
2. 不改变顶层 `collection.assumptionSummary`
3. 不引入 standalone source views 的 group-level `assumptionSummary`

## 验收标准

1. 上层可以直接通过 `collection.summary.groups[*].assumptionSummary` 判断某一组是否带 assumptions
2. mixed collection 的组级 assumptions 不再依赖手工遍历组内 entries
3. 不影响顶层 `summary`、顶层 `assumptionSummary` 与 `entries[*]` contract
