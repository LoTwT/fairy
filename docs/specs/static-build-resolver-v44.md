# 静态构筑解析系统 V44

`V43` 收口后：

1. `source-damage-view entry` 已有 `requirementSummary / diagnosticSummary / sourceNoteSummary`
2. `trigger-entry matrix row` 已有 `requirementSummary / diagnosticSummary / sourceNoteSummary`
3. `source-utility-view entry` 也已具备 `diagnosticSummary / sourceNoteSummary`

但顶层 `source-entry collection summary` 仍只有：

1. entry 数量
2. group 数量
3. supported / unsupported 统计
4. utility-only 判定

这意味着：

1. 上层若只想知道“当前整组 mixed entries 是否存在 diagnostics / source notes”，仍需遍历所有 entries
2. 若只想知道 collection 主要有哪些 diagnostic kind / source-note status，也要自行聚合
3. `resolve-build-source-entries` 作为 unified 入口，缺少与主 resolver / matrix / source view 对称的顶层摘要能力

`V44` 只解决一件事：

- 为 unified source-entry collection 的 `summary` 增加聚合后的 `diagnosticSummary / sourceNoteSummary`

## 1. 目标

在不改变现有 `entries[]` 的前提下，让上层可以直接从 collection summary 读取：

1. 当前 mixed collection 是否存在 diagnostics
2. 是否存在 `defaulted-input / coverage-gap / unsupported-effect / fallback`
3. 当前 mixed collection 是否存在 `missing-input / process-only / research-only`
4. 当前 collection 的 diagnostics / source notes 主要来自哪些 owner

## 2. 范围

1. `V44.1` scope freeze
2. `V44.2` collection-summary contract
3. `V44.3` compact / high-level alignment
4. `V44.4` docs closeout

## 3. 设计边界

本阶段只做：

1. 为 `StaticBuildSourceEntryCollectionSummary` 增加 `diagnosticSummary`
2. 为 `StaticBuildSourceEntryCollectionSummary` 增加 `sourceNoteSummary`
3. 更新 source-entry tests、compact / high-level tool 与文档

显式不做：

1. 不改变现有 `entries[]`
2. 不新增新的 source-entry group
3. 不改 source damage / utility 单条 entry 的既有 summary contract
4. 不改 `resolveStaticBuildSourceDamageViews()` / `resolveStaticBuildSourceUtilityViews()` 顶层 summary

## 4. 目标 contract

新增到 `StaticBuildSourceEntryCollectionSummary`：

1. `diagnosticSummary`
   - 复用 `StaticBuildDiagnosticSummary`
2. `sourceNoteSummary`
   - 复用 `StaticBuildSourceNoteSummary`

两者都按 collection 内全部 entries 聚合，而不是只看单条 entry。

## 5. 验收标准

1. `resolveStaticBuildSourceEntries().summary` 可直接读取 `diagnosticSummary`
2. `resolveStaticBuildSourceEntries().summary` 可直接读取 `sourceNoteSummary`
3. `resolve-build-source-entries` 高层 tool 与 compact exports 保持一致
4. 上层不需要再自己遍历 mixed entries 才能得到整组 diagnostics / source-note 概况

## 6. 当前状态

- `V44.1` 已完成：冻结到 collection-summary aggregate contract
- `V44.2` 未开始
- `V44.3` 未开始
- `V44.4` 未开始
