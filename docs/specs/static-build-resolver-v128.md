# 静态构筑解析系统 V128

## 背景

`V127` 已把 `skill-matrix` 的 requirement-summary contract 补齐，但单次 `resolveStaticBuildDamage()` 仍然是唯一一条没有顶层结构化 aggregate summary 的主路径。

当前状态不对称：

- `skill-matrix`
- `trigger-matrix`
- `source-damage-view`
- `source-utility-view`
- `source-entry collection`

这些路径都已经有稳定的：

1. `diagnosticSummary`
2. `sourceNoteSummary`
3. `assumptionSummary`
4. `caveatSummary`

但单次 resolver 仍然只暴露：

- `summary.diagnosticGroups`
- `summary.sourceNoteGroups`
- `summary.hasUnsupportedEffects`

## 目标

只补齐单次 `resolveStaticBuildDamage()` 的 top-level aggregate summary contract：

1. `ResolveStaticBuildResult.diagnosticSummary`
2. `ResolveStaticBuildResult.sourceNoteSummary`
3. `ResolveStaticBuildResult.assumptionSummary`
4. `ResolveStaticBuildResult.caveatSummary`

## 当前边界

本阶段只做：

1. 顶层新增稳定 `diagnosticSummary`
2. 顶层新增稳定 `sourceNoteSummary`
3. 顶层新增稳定 `assumptionSummary`
4. 顶层新增稳定 `caveatSummary`
5. 高层 tool / prompt / README 对齐这些字段

显式不做：

1. 不改变 `ResolveStaticBuildResult.summary` 的既有结构
2. 不为单次 resolver 新增 `effectSummary` 或 `requirementSummary`
3. 不改变 matrix / views / source-entry collection 的既有 aggregate summary 语义

## 完成标准

1. `resolveStaticBuildDamage()` 直接返回 `diagnosticSummary`
2. `resolveStaticBuildDamage()` 直接返回 `sourceNoteSummary`
3. `resolveStaticBuildDamage()` 直接返回 `assumptionSummary`
4. `resolveStaticBuildDamage()` 直接返回 `caveatSummary`
5. 高层 `resolveBuildDamage` prompt、测试与 README 已改为优先读取这些顶层 summary
6. roadmap、索引、架构文档同步
