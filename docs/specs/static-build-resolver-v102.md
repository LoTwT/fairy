# 静态构筑解析系统 V102

## 范围

`V102` 只处理 `source-utility-view entries[*]` 的稳定 `summary`，不改变顶层 / group-level summary contract，也不重命名现有 raw entry 字段。

## 目标

1. 为 `StaticBuildSourceUtilityViewEntry` 与 compact entry 新增稳定 `summary`
2. 让上层逐条消费 utility entry 时，不再散读：
   - `value`
   - `unit`
   - `targetScope`
   - `resolutionMode`
   - 多组 count / flag
3. 保持当前 utility entry 的 requirement / diagnostic / source-note / assumption / caveat contract 不变

## 设计

新增：

- `StaticBuildSourceUtilityViewEntrySummary`

字段只覆盖当前 entry 级最稳定、最常消费的摘要：

- 数值与单位
- 目标范围与触发模式
- requirement / diagnostics / source notes / assumptions 的计数
- 是否存在 unsatisfied requirements
- 是否 unsupported

继续保留原字段：

- `value`
- `unit`
- `targetScope`
- `resolutionMode`
- `requirements`
- `triggerLabel`
- `conditionLabel`
- `cooldownSeconds`

因此 `entry.summary` 是稳定摘要层，不替代原始 entry 字段。

## Out of Scope

1. 不改变 `views.summary`
2. 不改变 `views.summary.groups[*]`
3. 不引入新的 utility-only top-level aggregate
4. 不把 utility entry summary 并回 `source-entry collection`

## 收口标准

1. `zzz-data` 类型、entry 构造、compact helper 与测试全部对齐
2. `zzz-agent` 高层 tool 测试与 prompt 说明对齐 `entry.summary`
3. roadmap、总 spec、索引、架构文档与 README 同步
