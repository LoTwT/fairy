# 静态构筑解析系统 V129

## 背景

`V128` 已把单次 `resolveStaticBuildDamage()` 的 `diagnosticSummary / sourceNoteSummary / assumptionSummary / caveatSummary` 补齐，但“增益清单”仍然是最后一个未对齐的单场景 contract 缺口。

当前状态不对称：

- `skill-matrix`
- `trigger-matrix`
- `source-damage-view`
- `source-utility-view`
- `source-entry collection`

这些路径都已经有稳定的 `effectSummary`。

但单次 resolver 仍然只有原始 `trace`，上层如果要生成“增益清单”，还得自己遍历 applied modifiers。

## 目标

只补齐单次 `resolveStaticBuildDamage()` 的 top-level `effectSummary` contract：

1. `ResolveStaticBuildResult.effectSummary`

## 当前边界

本阶段只做：

1. 顶层新增稳定 `effectSummary`
2. 用 applied trace modifiers 生成单场景 effect summary
3. 高层 tool / prompt / README 对齐 `build.effectSummary`

显式不做：

1. 不改变 `ResolveStaticBuildResult.summary` 的既有结构
2. 不改变 `trace` 的既有明细语义
3. 不重构 matrix / views / source-entry collection 的既有 effect-summary 类型

## 完成标准

1. `resolveStaticBuildDamage()` 直接返回 `effectSummary`
2. `effectSummary` 能稳定生成单场景“增益清单”需要的 `bucket / value`
3. 高层 `resolveBuildDamage` prompt、测试与 README 已改为优先读取 `build.effectSummary`
4. roadmap、索引、架构文档同步
