# 静态构筑解析系统 V101

## 范围

`V101` 只处理 `source-utility-view entries[*]` 的稳定 `caveatSummary`，不改变顶层或 group-level caveat contract。

## 目标

1. 为 `StaticBuildSourceUtilityViewEntry` 与 compact entry 新增稳定 `caveatSummary`
2. 保持 entry-level caveat 与现有：
   - `entry.assumptions`
   - `entry.supported`
     的统计一致
3. 让上层逐条消费 utility entries 时，不再手工组合 assumptions 与 unsupported 状态

## 设计

继续复用：

- `StaticBuildEntryCaveatSummary`

单条 entry 语义保持最小化：

- `assumptionCount = entry.assumptions.length`
- `unsupportedCount = entry.supported ? 0 : 1`

因此 `entry.caveatSummary` 仍然只表达：

- assumptions 规模
- 该条 entry 是否 unsupported

## Out of Scope

1. 不改变既有 `views.summary.caveatSummary`
2. 不改变既有 `views.summary.groups[*].caveatSummary`
3. 不同时扩到 `source-entry collection` 或 `trigger-matrix`

## 收口标准

1. `zzz-data` 类型、entry 构造、compact helper 与测试全部对齐
2. `zzz-agent` 高层 tool 测试与 prompt 说明对齐 `entry.caveatSummary`
3. roadmap、总 spec、索引、架构文档与 README 同步
