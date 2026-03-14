# 静态构筑解析系统 V123

`V122` 收口后，unified `source-entry collection` 已在顶层与 `summary` 补齐稳定 `effectSummary`。

但调用方如果按 `collection.summary.groups[*]` 拆成“额外结算条目 / 回能条目”两个 section，仍然拿不到局部 effect 聚合；要解释“这一组条目涉及了哪些乘区变化”，还得先过滤组内 entries 再自行聚合。

`V123` 只解决一件事：

1. 给 unified `source-entry collection groups[*]` 补齐稳定 `effectSummary`

## 阶段范围

1. `V123.1` scope freeze
2. `V123.2` runtime contract alignment
3. `V123.3` tool assertion / prompt alignment
4. `V123.4` docs closeout

## 当前状态

- `V123.1` 已完成：冻结到 source-entry collection group effect summary alignment
- `V123.2` 已完成：`collection.summary.groups[*].effectSummary` 已补齐
- `V123.3` 已完成：高层 source-entry tool 断言与 Agent prompt 已对齐 `collection.summary.groups[*].effectSummary`
- `V123.4` 已完成：README、roadmap、索引与架构文档已同步

## 当前边界

本阶段只做：

1. 为 `StaticBuildSourceEntryGroupSummary` 新增稳定 `effectSummary`
2. 让 group-level `effectSummary` 复用现有 source-damage-view effect 聚合语义
3. 明确按组解释 mixed source-entry collection 时优先读取 `collection.summary.groups[*].effectSummary`

显式不做：

1. 不改变顶层 `collection.summary.effectSummary / collection.effectSummary` 的语义
2. 不提前给 mixed union `entry` 增加新的 effect 字段
3. 不为 utility-only group 伪造非空 effect 明细
