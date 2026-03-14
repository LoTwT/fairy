# 静态构筑解析系统 V95

## 范围

`V95` 只处理 `source-utility-view groups[*]` 的稳定 `caveatSummary`，不扩到单条 `entry`，也不同时改 `source-damage-view`、`source-entry collection` 或 `trigger-matrix`。

## 目标

1. 为 `StaticBuildSourceUtilityViewGroupSummary` 新增稳定 `caveatSummary`
2. 保持 group-level caveat 与现有：
   - `groups[*].assumptionSummary`
   - `groups[*].supportedCount / unsupportedCount`
     的统计一致
3. 让上层按组拆 trigger / rate utility 条目时，不再手工组合组级 caveat

## 设计

复用 `V94` 已引入的：

- `StaticBuildEntryCaveatSummary`

按组聚合时使用：

- 该组内 `entries[*].assumptions`
- 该组内 `entries[*].supported`

因此 `groups[*].caveatSummary` 的语义仍然是：

- assumptions
- unsupported entries

## Out of Scope

1. 不为单条 `source-utility-view entry` 新增 `caveatSummary`
2. 不提前把同一套 group-level caveat contract 扩到：
   - `source-entry collection`
   - `trigger-matrix`
3. 不改变既有 `views.summary.caveatSummary` / `views.caveatSummary`

## 收口标准

1. `zzz-data` 公开类型、group-level summary 实现、测试全部对齐
2. `zzz-agent` 的高层 tool 测试与 prompt 说明对齐 `views.summary.groups[*].caveatSummary`
3. roadmap、总 spec、索引、架构文档与 README 同步
