# 静态构筑解析系统 V98

## 范围

`V98` 只处理 `trigger-matrix` 顶层结果与 `summary` 的稳定 `caveatSummary`，不扩到 `groups[*]` 或单条 `row`。

## 目标

1. 为 `ResolveStaticBuildTriggerMatrixResult` 新增稳定 `caveatSummary`
2. 为 `StaticBuildTriggerMatrixSummary` 新增稳定 `caveatSummary`
3. 保持 caveat 语义与现有：
   - `assumptions`
   - `assumptionSummary`
   - `supportedCount / unsupportedCount`
     的统计一致
4. 让上层只消费 `matrix.summary` 时，不再手工组合 assumptions 与 unsupported 计数来判断整张 trigger matrix 是否带 caveat

## 设计

复用已经在 `source-damage-view`、`source-utility-view`、`source-entry collection` 使用的：

- `StaticBuildEntryCaveatSummary`

聚合来源保持简单：

- `rows[*].supported`
- 顶层 `assumptions`

因此 `caveatSummary` 继续只表达两类信息：

- `assumptionCount`
- `unsupportedCount`

以及对应布尔位：

- `hasAssumptions`
- `hasUnsupported`

## Out of Scope

1. 不为 `trigger-matrix groups[*]` 新增 `caveatSummary`
2. 不为单条 `trigger row` 新增 `caveatSummary`
3. 不改变既有 `groups[*].assumptionSummary`
4. 不同时扩到 `source-view` 或 `source-entry collection`

## 收口标准

1. `zzz-data` 类型、实现、compact helper 与测试全部对齐
2. `zzz-agent` 高层 tool 测试与 prompt 说明对齐 `matrix.summary.caveatSummary` / `matrix.caveatSummary`
3. roadmap、总 spec、索引、架构文档与 README 同步
