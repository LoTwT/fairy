# 静态构筑解析系统 V97

## 范围

`V97` 只处理 unified `source-entry collection groups[*]` 的稳定 `caveatSummary`，不扩到单条 `entry`，也不同时改 `trigger-matrix`。

## 目标

1. 为 `StaticBuildSourceEntryGroupSummary` 新增稳定 `caveatSummary`
2. 保持 group-level caveat 与现有：
   - `groups[*].assumptionSummary`
   - `groups[*].supportedCount / unsupportedCount`
     的统计一致
3. 让上层按 `source-damage-view / source-utility-view` 拆 section 时，不再手工组合组级 caveat

## 设计

复用 `V96` 已引入并在 `source-entry collection` 顶层使用的：

- `StaticBuildEntryCaveatSummary`

按组聚合时使用：

- 该组内 `entries[*].assumptions`
- 该组内 `entries[*].supported`

因此 `groups[*].caveatSummary` 的语义仍然只包含：

- assumptions
- unsupported entries

## Out of Scope

1. 不为单条 `source-entry` 新增 `caveatSummary`
2. 不改变既有 `collection.summary.caveatSummary` / `collection.caveatSummary`
3. 不同时扩到 `trigger-matrix`

## 收口标准

1. `zzz-data` 公开类型、group-level summary 实现、测试全部对齐
2. `zzz-agent` 的高层 tool 测试与 prompt 说明对齐 `collection.summary.groups[*].caveatSummary`
3. roadmap、总 spec、索引、架构文档与 README 同步
