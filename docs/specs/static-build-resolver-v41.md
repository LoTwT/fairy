# 静态构筑解析系统 V41

`V40` 收口后，`source-damage-view entry` 与 `trigger-entry matrix row` 已经具备稳定的 `requirementSummary`。

当前剩下的一处高频上层负担，落在 `diagnostics[]`：

1. `source-damage-view entry` 仍只有逐条 diagnostics 数组
2. `trigger-entry matrix row` 也仍只有逐条 diagnostics 数组
3. 上层如果只是想知道“是否存在 defaulted input / coverage gap / fallback”，仍需要自己扫描整组数组
4. 若需要判断问题主要来自 `finalPanel` / `scenario` / `source` / `process`，也只能自行统计

`V41` 只解决一件事：

- 为 `source-damage-view` 与 `trigger-entry matrix row` 增加稳定的 diagnostic summary

## 1. 目标

为 `diagnostics[]` 补一层结构化摘要，让上层可以直接判断：

1. 当前条目有多少条 diagnostics
2. 是否存在 `defaulted-input / coverage-gap / unsupported-effect / fallback`
3. 哪些 diagnostic kind 出现过
4. diagnostics 主要来自哪些 owner

## 2. 范围

1. `V41.1` scope freeze
2. `V41.2` source-view diagnostic-summary contract
3. `V41.3` trigger-row alignment
4. `V41.4` docs closeout

## 3. 设计边界

本阶段只做：

1. 为 `StaticBuildSourceDamageViewEntry` 增加 `diagnosticSummary`
2. 为 `StaticBuildTriggerMatrixRow` 增加 `diagnosticSummary`
3. 更新 compact helper、测试与文档

显式不做：

1. 不改变现有 `diagnostics[]` 原始数组
2. 不新增新的 source-view / trigger coverage
3. 不新增新的 summary 顶层 key 以外的解释字段
4. 不改 `ResolveStaticBuildResult.summary` 的既有结构

## 4. 目标 contract

新增通用 diagnostic summary 结构：

1. `count`
2. `hasDiagnostics`
3. `hasDefaultedInput`
4. `hasCoverageGap`
5. `hasUnsupportedEffect`
6. `hasFallback`
7. `kindGroups[]`
   - `key`
   - `count`
8. `ownerGroups[]`
   - `key`
   - `count`

其中：

- `kindGroups[].key` 复用现有 `StaticBuildDiagnosticKind`
- `ownerGroups[].key` 复用现有 `StaticBuildDiagnosticOwner`

## 5. 验收标准

1. source-damage-view entry 可直接读取 diagnostic summary
2. trigger row 可直接读取 diagnostic summary
3. 上层不需要再为了统计 diagnostic kind / owner 而手工遍历数组
4. 现有 `diagnostics[]` 与 compact helper contract 保持兼容

## 6. 当前状态

- `V41.1` 已完成：冻结到 diagnostic-summary contract
- `V41.2` 未开始
- `V41.3` 未开始
- `V41.4` 未开始
