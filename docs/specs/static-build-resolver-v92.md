# 静态构筑解析系统 V92

## 范围

`V92` 只处理 `source-damage-view` 的顶层与 `summary` 级 `caveatSummary`，不扩到 group / entry，也不同时改 `source-utility-view`、`source-entry collection` 或 `trigger-matrix`。

## 目标

1. 为 `ResolveStaticBuildSourceDamageViewsResult` 新增稳定 `caveatSummary`
2. 为 `StaticBuildSourceDamageViewSummary` 新增稳定 `caveatSummary`
3. 保持与现有：
   - `assumptions`
   - `assumptionSummary`
   - `supportedCount / unsupportedCount`
     的统计一致

## 设计

新增统一类型：

- `StaticBuildEntryCaveatSummary`

字段：

- `assumptionCount`
- `unsupportedCount`
- `hasAssumptions`
- `hasUnsupported`

当前 `source-damage-view` 没有 `unsupportedEffects[]`，因此 `V92` 的 caveat 语义是：

- assumptions
- unsupported entries

而不是 `skill-matrix` 那种：

- assumptions
- unsupported effects

## Out of Scope

1. 不为 `source-damage-view entry` 新增 `caveatSummary`
2. 不为 `source-damage-view groups[*]` 新增 `caveatSummary`
3. 不提前把同一套 caveat contract 扩到：
   - `source-utility-view`
   - `source-entry collection`
   - `trigger-matrix`

## 收口标准

1. `zzz-data` 公开类型、compact helper、source-damage-view tests 全部对齐
2. `zzz-agent` 的高层 tool 测试与 prompt 说明对齐 `views.summary.caveatSummary` / `views.caveatSummary`
3. 文档入口与 roadmap 同步
