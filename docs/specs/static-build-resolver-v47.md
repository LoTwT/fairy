# 静态构筑解析系统 V47

`V46` 收口后，顶层具备聚合 `diagnosticSummary / sourceNoteSummary` 的 contract 已覆盖：

1. unified source-entry collection
2. standalone source-damage-view / source-utility-view
3. trigger-entry matrix

但 `resolveStaticBuildSkillMatrix()` 的顶层仍只有：

1. `summary`
2. `effectSummary`
3. `rows`
4. `assumptions`

这意味着：

1. 上层如果只消费整张 skill matrix，仍需自己遍历 `rows[]` 才能判断是否存在 diagnostics / source notes
2. skill matrix 与 trigger matrix / source views / source-entry collection 在顶层摘要能力上仍不完全对称
3. 高层 tool 与 compact consumer 只能透传 row-level `diagnostics / sourceNotes`，无法直接读取 matrix-level 诊断概况

`V47` 只解决一件事：

- 为 skill matrix 顶层增加聚合 `diagnosticSummary / sourceNoteSummary`

## 1. 目标

在不改变现有 `rows[]`、row-level fields、`summary` 公式字段与 `effectSummary` 的前提下，让上层可以直接从：

1. `ResolveStaticBuildSkillMatrixResult`

读取：

1. 当前整张矩阵是否存在 diagnostics
2. 是否存在 `defaulted-input / coverage-gap / unsupported-effect / fallback`
3. 当前整张矩阵是否存在 `missing-input / process-only / research-only`
4. diagnostics / source notes 主要来自哪些 owner

## 2. 范围

1. `V47.1` scope freeze
2. `V47.2` matrix-level aggregate contract
3. `V47.3` compact / high-level alignment
4. `V47.4` docs closeout

## 3. 设计边界

本阶段只做：

1. 为 `ResolveStaticBuildSkillMatrixResult` 增加聚合 `diagnosticSummary`
2. 为 `ResolveStaticBuildSkillMatrixResult` 增加聚合 `sourceNoteSummary`
3. 更新 skill-matrix tests、compact / high-level tool 与文档

显式不做：

1. 不改变现有 `summary`
2. 不改变现有 `effectSummary`
3. 不改变 row-level `diagnostics / sourceNotes / assumptions / unsupportedEffects`
4. 不新增新的 matrix groups 或新的 row metadata

## 4. 目标 contract

新增到 `ResolveStaticBuildSkillMatrixResult`：

1. `diagnosticSummary`
2. `sourceNoteSummary`

两者都按 skill matrix 内全部 rows 聚合，而不是只看单条 row。

## 5. 验收标准

1. `resolveStaticBuildSkillMatrix()` 可直接读取 `diagnosticSummary`
2. `resolveStaticBuildSkillMatrix()` 可直接读取 `sourceNoteSummary`
3. `resolve-build-skill-matrix` 高层 tool 与 compact exports 保持一致
4. 上层不需要再自己遍历 `rows` 才能得到整组 skill matrix 的 diagnostics / source-note 概况

## 6. 当前状态

- `V47.1` 已完成：冻结到 skill-matrix aggregate contract
- `V47.2` 未开始
- `V47.3` 未开始
- `V47.4` 未开始
