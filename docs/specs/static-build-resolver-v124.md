# 静态构筑解析系统 V124

`V123` 收口后，unified `source-entry collection` 已在顶层与组级补齐稳定 `effectSummary`。

但 mixed collection 的 entry-level contract 仍不对称：

- source-damage-view entry 已有稳定 `entry.effectSummary`
- utility entry 仍然缺这个字段

这会迫使调用方在逐条读取 mixed entries 时继续按 `entryKind` 分支，只为了给 utility entry 补一个默认空数组。

`V124` 只解决一件事：

1. 给 unified `source-entry collection` 中的 mixed entry 补齐稳定 `entry.effectSummary`

## 阶段范围

1. `V124.1` scope freeze
2. `V124.2` runtime contract alignment
3. `V124.3` tool assertion / prompt alignment
4. `V124.4` docs closeout

## 当前状态

- `V124.1` 已完成：冻结到 source-entry mixed-entry effect summary alignment
- `V124.2` 已完成：utility entry 已补齐稳定 `effectSummary: []`
- `V124.3` 已完成：高层 source-entry / source-utility tool 断言与 Agent prompt 已对齐 `entry.effectSummary`
- `V124.4` 已完成：README、roadmap、索引与架构文档已同步

## 当前边界

本阶段只做：

1. 为 `StaticBuildSourceUtilityViewEntry` 新增稳定 `effectSummary`
2. 明确 utility entry 当前固定返回空数组
3. 明确解释 mixed source-entry entry 时优先读取 `entry.effectSummary`

显式不做：

1. 不改变顶层 `collection.summary.effectSummary / collection.effectSummary` 的语义
2. 不改变组级 `collection.summary.groups[*].effectSummary` 的语义
3. 不为 utility entry 伪造非空 effect 明细
