# 静态构筑解析系统 V96

## 范围

`V96` 只处理 unified `source-entry collection` 的稳定 `caveatSummary`，覆盖：

- 顶层 `collection.caveatSummary`
- `collection.summary.caveatSummary`

不扩到 `groups[*]`，也不扩到单条 `entry`。

## 目标

1. 为 `ResolveStaticBuildSourceEntriesResult` 新增稳定 `caveatSummary`
2. 为 `StaticBuildSourceEntryCollectionSummary` 新增稳定 `caveatSummary`
3. 保持 mixed collection 的 caveat 与现有：
   - `collection.assumptions`
   - `collection.summary.supportedCount / unsupportedCount`
     的统计一致
4. 让上层判断整组 mixed collection 是否带 caveat 时，不再手工组合 assumptions 与 unsupported 计数

## 设计

复用既有的：

- `StaticBuildEntryCaveatSummary`

collection-level caveat 仍然只统计两类信息：

- assumptions
- unsupported entries

因此：

- `collection.caveatSummary`
- `collection.summary.caveatSummary`

都不引入新的来源，也不改变 `groups[*]` / `entries[*]` 的既有 contract。

## Out of Scope

1. 不为 `StaticBuildSourceEntryGroupSummary` 新增 `caveatSummary`
2. 不为单条 `source-entry` 新增 `caveatSummary`
3. 不改变既有 `collection.assumptionSummary` / `collection.summary.assumptionSummary`
4. 不同时扩到 `trigger-matrix`

## 收口标准

1. `zzz-data` 公开类型、summary 实现、compact helper 与测试全部对齐
2. `zzz-agent` 的高层 tool 测试与 prompt 说明对齐 `collection.summary.caveatSummary` / `collection.caveatSummary`
3. roadmap、总 spec、索引、架构文档与 README 同步
