# 静态构筑解析系统 V100

## 范围

`V100` 只处理 `trigger-matrix rows[*]` 的稳定 `caveatSummary`，不改变顶层或 group-level caveat contract。

## 目标

1. 为 `StaticBuildTriggerMatrixRow` 与 compact row 新增稳定 `caveatSummary`
2. 保持 row-level caveat 与现有：
   - `row.assumptions`
   - `row.supported`
     的统计一致
3. 让上层逐行消费 trigger rows 时，不再手工组合 assumptions 与 unsupported 状态

## 设计

继续复用：

- `StaticBuildEntryCaveatSummary`

单行语义保持最小化：

- `assumptionCount = row.assumptions.length`
- `unsupportedCount = row.supported ? 0 : 1`

因此 `row.caveatSummary` 仍然只表达：

- assumptions 规模
- 该行是否 unsupported

## Out of Scope

1. 不改变既有 `matrix.summary.caveatSummary`
2. 不改变既有 `matrix.summary.groups[*].caveatSummary`
3. 不同时扩到 `source-damage-view entry` 或 `source-entry`

## 收口标准

1. `zzz-data` 类型、row 构造、compact helper 与测试全部对齐
2. `zzz-agent` 高层 tool 测试与 prompt 说明对齐 `row.caveatSummary`
3. roadmap、总 spec、索引、架构文档与 README 同步
