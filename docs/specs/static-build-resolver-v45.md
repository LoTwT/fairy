# 静态构筑解析系统 V45

`V44` 收口后，unified `source-entry collection` 顶层已经具备聚合后的：

1. `diagnosticSummary`
2. `sourceNoteSummary`

但 `resolveStaticBuildSourceDamageViews()` / `resolveStaticBuildSourceUtilityViews()` 各自的顶层 `summary` 仍只有：

1. entry 数量
2. group 数量
3. supported / unsupported 统计

这意味着：

1. 上层如果只消费 standalone source damage views，仍需自己遍历 `entries[]` 才能判断 diagnostics / source notes 概况
2. utility-only 入口与 unified collection 入口的顶层摘要能力不一致
3. standalone source-view result 与 `V41` ~ `V44` 已完成的 entry / collection summary contract 仍不完全对称

`V45` 只解决一件事：

- 为 standalone source-damage-view / source-utility-view 的顶层 `summary` 增加聚合 `diagnosticSummary / sourceNoteSummary`

## 1. 目标

在不改变现有 `entries[]` 与单条 entry summary 的前提下，让上层可以直接从：

1. `ResolveStaticBuildSourceDamageViewsResult.summary`
2. `ResolveStaticBuildSourceUtilityViewsResult.summary`

读取：

1. 当前整组 entries 是否存在 diagnostics
2. 是否存在 `defaulted-input / coverage-gap / unsupported-effect / fallback`
3. 当前整组 entries 是否存在 `missing-input / process-only / research-only`
4. diagnostics / source notes 主要来自哪些 owner

## 2. 范围

1. `V45.1` scope freeze
2. `V45.2` source-view summary contract
3. `V45.3` compact / high-level alignment
4. `V45.4` docs closeout

## 3. 设计边界

本阶段只做：

1. 为 `StaticBuildSourceDamageViewSummary` 增加 `diagnosticSummary`
2. 为 `StaticBuildSourceDamageViewSummary` 增加 `sourceNoteSummary`
3. 为 `StaticBuildSourceUtilityViewSummary` 增加 `diagnosticSummary`
4. 为 `StaticBuildSourceUtilityViewSummary` 增加 `sourceNoteSummary`
5. 更新 source-view tests、compact / high-level tool 与文档

显式不做：

1. 不改变现有 `entries[]`
2. 不新增新的 source-view group
3. 不改单条 entry 既有 `requirementSummary / diagnosticSummary / sourceNoteSummary`
4. 不改 unified source-entry collection 的既有 contract

## 4. 目标 contract

新增到：

1. `StaticBuildSourceDamageViewSummary`
   - `diagnosticSummary`
   - `sourceNoteSummary`
2. `StaticBuildSourceUtilityViewSummary`
   - `diagnosticSummary`
   - `sourceNoteSummary`

两类顶层 summary 都按各自 result 内全部 entries 聚合，而不是只看单条 entry。

## 5. 验收标准

1. `resolveStaticBuildSourceDamageViews().summary` 可直接读取 `diagnosticSummary`
2. `resolveStaticBuildSourceDamageViews().summary` 可直接读取 `sourceNoteSummary`
3. `resolveStaticBuildSourceUtilityViews().summary` 可直接读取 `diagnosticSummary`
4. `resolveStaticBuildSourceUtilityViews().summary` 可直接读取 `sourceNoteSummary`
5. standalone source-view result 与 unified source-entry collection 在 summary 语义上保持对称

## 6. 当前状态

- `V45.1` 已完成：冻结到 standalone source-view summary aggregate contract
- `V45.2` 未开始
- `V45.3` 未开始
- `V45.4` 未开始
