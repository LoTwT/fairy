# 静态构筑解析系统 V43

`V42` 收口后，`source-damage-view entry` 与 `trigger-entry matrix row` 已经具备稳定的：

1. `requirementSummary`
2. `diagnosticSummary`
3. `sourceNoteSummary`

但 `source-utility-view entry` 仍只有逐条数组字段：

1. `diagnostics[]`
2. `sourceNotes[]`

这会带来一个明显的不对称：

1. 上层消费 `source-entry collection` 时，仍需按 entry kind 分支判断
2. 同样是 source-specific 条目，damage view 已有结构化摘要，utility view 仍要手工扫数组
3. compact helper 也无法为 utility entry 提供与 damage entry 对称的 summary contract

`V43` 只解决一件事：

- 为 `source-utility-view entry` 增加与 source-damage-view 对称的 summary contract

## 1. 目标

为 `StaticBuildSourceUtilityViewEntry` 增加稳定的：

1. `diagnosticSummary`
2. `sourceNoteSummary`

让上层可以直接判断：

1. 当前 utility entry 是否存在 diagnostics
2. 是否存在 `defaulted-input / coverage-gap / unsupported-effect / fallback`
3. 当前 utility entry 是否存在 `missing-input / process-only / research-only`
4. diagnostics / source notes 主要来自哪些 owner

## 2. 范围

1. `V43.1` scope freeze
2. `V43.2` utility-entry summary contract
3. `V43.3` compact / high-level alignment
4. `V43.4` docs closeout

## 3. 设计边界

本阶段只做：

1. 为 `StaticBuildSourceUtilityViewEntry` 增加 `diagnosticSummary`
2. 为 `StaticBuildSourceUtilityViewEntry` 增加 `sourceNoteSummary`
3. 更新 compact helper、source-entry collection、测试与文档

显式不做：

1. 不新增 `requirements[]`
2. 不改变现有 `diagnostics[]` 与 `sourceNotes[]` 原始数组
3. 不新增新的 utility coverage
4. 不改 `ResolveStaticBuildSourceUtilityViewsResult.summary` 的既有结构

## 4. 目标 contract

### 4.1 Utility entry diagnostic summary

复用现有：

- `StaticBuildDiagnosticSummary`

新增字段：

- `StaticBuildSourceUtilityViewEntry.diagnosticSummary`

### 4.2 Utility entry source-note summary

复用现有：

- `StaticBuildSourceNoteSummary`

新增字段：

- `StaticBuildSourceUtilityViewEntry.sourceNoteSummary`

## 5. 验收标准

1. utility entry 可直接读取 `diagnosticSummary`
2. utility entry 可直接读取 `sourceNoteSummary`
3. compact utility entry 与 unified source-entry collection 保持对称
4. 上层消费 source-entry union 时，不需要再因为 utility entry 缺 summary 而额外分支

## 6. 当前状态

- `V43.1` 已完成：冻结到 utility-entry summary contract
- `V43.2` 已完成：utility entry 已新增稳定 `diagnosticSummary / sourceNoteSummary`
- `V43.3` 已完成：compact helper 与高层 tool 已对齐 utility-entry summaries
- `V43.4` 已完成：README / architecture / roadmap 已同步收口
