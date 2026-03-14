# 静态构筑解析系统 V122

`V121` 收口后，`source-damage-view` 已在 top-level / group / entry 三层补齐稳定 `effectSummary`。

但 unified `source-entry collection` 仍然只能给出 requirement / diagnostic / source-note / assumption / caveat 聚合；如果调用方想先判断“当前额外来源条目整体涉及了哪些乘区变化”，仍然只能先过滤 `source-damage-view` entries 再自行聚合。

`V122` 只解决一件事：

1. 给 unified `source-entry collection` 的顶层与 `summary` 补齐稳定 `effectSummary`

## 阶段范围

1. `V122.1` scope freeze
2. `V122.2` runtime contract alignment
3. `V122.3` tool assertion / prompt alignment
4. `V122.4` docs closeout

## 当前状态

- `V122.1` 已完成：冻结到 source-entry collection top-level effect summary alignment
- `V122.2` 已完成：`collection.summary.effectSummary` 与顶层兼容字段 `collection.effectSummary` 已补齐
- `V122.3` 已完成：高层 source-entry tool 断言与 Agent prompt 已对齐 `collection.summary.effectSummary`
- `V122.4` 已完成：README、roadmap、索引与架构文档已同步

## 当前边界

本阶段只做：

1. 为 `StaticBuildSourceEntryCollectionSummary` 新增稳定 `effectSummary`
2. 为 `ResolveStaticBuildSourceEntriesResult` 新增兼容字段 `effectSummary`
3. 明确解释 mixed source-entry collection 的乘区变化时优先读取 `collection.summary.effectSummary`

显式不做：

1. 不提前扩到 `collection.summary.groups[*].effectSummary`
2. 不改变 `entry` 级 mixed union 的结构
3. 不为 utility-only collection 伪造非空 effect 明细
