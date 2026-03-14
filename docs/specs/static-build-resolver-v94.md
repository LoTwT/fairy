# 静态构筑解析系统 V94

## 范围

`V94` 只处理 `source-utility-view` 的顶层结果与 `summary` 级 `caveatSummary`，不扩到 group / entry，也不同时改 `source-damage-view`、`source-entry collection` 或 `trigger-matrix`。

## 目标

1. 为 `ResolveStaticBuildSourceUtilityViewsResult` 新增稳定 `caveatSummary`
2. 为 `StaticBuildSourceUtilityViewSummary` 新增稳定 `caveatSummary`
3. 保持与现有：
   - `assumptions`
   - `assumptionSummary`
   - `supportedCount / unsupportedCount`
     的统计一致

## 设计

复用现有：

- `StaticBuildEntryCaveatSummary`

当前 `source-utility-view` 的 caveat 语义仍然是：

- assumptions
- unsupported entries

因此 `V94` 不引入新的 unsupported effect 统计，也不改变 group / entry 的 contract。

## Out of Scope

1. 不为 `source-utility-view groups[*]` 新增 `caveatSummary`
2. 不为单条 `source-utility-view entry` 新增 `caveatSummary`
3. 不提前把同一套 caveat contract 扩到：
   - `source-entry collection`
   - `trigger-matrix`

## 收口标准

1. `zzz-data` 公开类型、utility-view tests 全部对齐
2. `zzz-agent` 高层 tool 测试与 prompt 说明对齐 `views.summary.caveatSummary` / `views.caveatSummary`
3. roadmap、总 spec、索引、架构文档与 README 同步
