# 静态构筑解析系统 V46

`V45` 收口后，standalone `source-damage-view` / `source-utility-view` 的顶层 `summary` 已具备聚合后的：

1. `diagnosticSummary`
2. `sourceNoteSummary`

但 `resolveStaticBuildTriggerMatrix()` 的顶层 `summary` 仍只有：

1. row 数量
2. group 数量
3. supported / unsupported 统计
4. `hasSourceViews`

这意味着：

1. 上层如果只消费 trigger-entry matrix，仍需自己遍历 `rows[]` 才能判断整组 rows 是否存在 diagnostics / source notes
2. trigger matrix 与 `V44` / `V45` 已完成的 collection / source-view summary contract 仍不完全对称
3. 高层 tool 与 compact consumer 只能透传 `rows[]` 的 row-level summary，无法直接读取 matrix-level 诊断概况

`V46` 只解决一件事：

- 为 trigger-entry matrix 顶层 `summary` 增加聚合 `diagnosticSummary / sourceNoteSummary`

## 1. 目标

在不改变现有 `rows[]` 与单条 row summary 的前提下，让上层可以直接从：

1. `ResolveStaticBuildTriggerMatrixResult.summary`

读取：

1. 当前整组 trigger rows 是否存在 diagnostics
2. 是否存在 `defaulted-input / coverage-gap / unsupported-effect / fallback`
3. 当前整组 trigger rows 是否存在 `missing-input / process-only / research-only`
4. diagnostics / source notes 主要来自哪些 owner

## 2. 范围

1. `V46.1` scope freeze
2. `V46.2` trigger-matrix summary contract
3. `V46.3` compact / high-level alignment
4. `V46.4` docs closeout

## 3. 设计边界

本阶段只做：

1. 为 `StaticBuildTriggerMatrixSummary` 增加 `diagnosticSummary`
2. 为 `StaticBuildTriggerMatrixSummary` 增加 `sourceNoteSummary`
3. 更新 trigger-matrix tests、compact / high-level tool 与文档

显式不做：

1. 不改变现有 `rows[]`
2. 不新增新的 trigger-matrix group
3. 不改单条 row 既有 `requirementSummary / diagnosticSummary / sourceNoteSummary`
4. 不改 standalone source-view / unified source-entry collection 既有 summary contract

## 4. 目标 contract

新增到 `StaticBuildTriggerMatrixSummary`：

1. `diagnosticSummary`
2. `sourceNoteSummary`

两者都按 trigger matrix 内全部 rows 聚合，而不是只看单条 row。

## 5. 验收标准

1. `resolveStaticBuildTriggerMatrix().summary` 可直接读取 `diagnosticSummary`
2. `resolveStaticBuildTriggerMatrix().summary` 可直接读取 `sourceNoteSummary`
3. `resolve-build-trigger-matrix` 高层 tool 与 compact exports 保持一致
4. 上层不需要再自己遍历 `rows` 才能得到整组 trigger rows 的 diagnostics / source-note 概况

## 6. 当前状态

- `V46.1` 已完成：冻结到 trigger-matrix summary aggregate contract
- `V46.2` 已完成：trigger-matrix 顶层 `summary` 已新增稳定 `diagnosticSummary / sourceNoteSummary`
- `V46.3` 已完成：compact helper 与高层 `resolve-build-trigger-matrix` 已对齐新的 trigger-matrix summary contract
- `V46.4` 已完成：README / 总规格 / roadmap / index / architecture 已同步到 `V46` 收口状态
