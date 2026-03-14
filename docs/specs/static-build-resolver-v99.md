# 静态构筑解析系统 V99

## 范围

`V99` 只处理 `trigger-matrix summary.groups[*]` 的稳定 `caveatSummary`，不扩到单条 `row`。

## 目标

1. 为 `StaticBuildTriggerMatrixGroupSummary` 新增稳定 `caveatSummary`
2. 保持组级 caveat 与现有：
   - `groups[*].assumptionSummary`
   - `groups[*].supportedCount / unsupportedCount`
     的统计一致
3. 让上层按 `main-formula / source-view` 拆 section 时，不再手工组合组级 caveat

## 设计

复用 `V98` 已引入并在 `trigger-matrix` 顶层使用的：

- `StaticBuildEntryCaveatSummary`

组级聚合仍只依赖：

- 该组内 `rows[*].assumptions`
- 该组内 `rows[*].supported`

因此 `groups[*].caveatSummary` 的语义仍然只表达：

- `assumptionCount`
- `unsupportedCount`
- `hasAssumptions`
- `hasUnsupported`

## Out of Scope

1. 不为单条 `trigger row` 新增 `caveatSummary`
2. 不改变既有 `matrix.summary.caveatSummary` / `matrix.caveatSummary`
3. 不同时扩到 `source-damage-view` 或 `source-entry collection`

## 收口标准

1. `zzz-data` 类型、组级 summary 实现、测试全部对齐
2. `zzz-agent` 高层 tool 测试与 prompt 说明对齐 `matrix.summary.groups[*].caveatSummary`
3. roadmap、总 spec、索引、架构文档与 README 同步
