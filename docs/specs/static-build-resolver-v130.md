# 静态构筑解析系统 V130

## 背景

`V129` 已把单次 `resolveStaticBuildDamage()` 的 top-level `effectSummary` 补齐，但单次高层 tool 仍然是唯一一条没有 compact result 的主路径。

当前状态不对称：

- `skill-matrix`
- `trigger-matrix`
- `source-damage-view`
- `source-utility-view`
- `source-entry collection`

这些路径都已经有稳定的 compact helper，并默认通过 `includeDetails=false` 控制上下文大小。

但 `resolveBuildDamage` 仍直接返回完整 `ResolveStaticBuildResult`，默认携带 `trace / damageParams`。

## 目标

只补齐单次 `resolveStaticBuildDamage()` 的 compact contract：

1. `CompactStaticBuildResult`
2. `compactStaticBuildResult(build, includeDetails = false)`
3. 高层 `resolveBuildDamage` 默认返回 compact build，并在 `includeDetails=true` 时暴露 `trace / damageParams`

## 当前边界

本阶段只做：

1. 为单次 resolver 新增 compact helper export
2. 默认省略 `trace / damageParams`
3. 高层 tool、prompt、测试与 README 对齐 compact 语义

显式不做：

1. 不改变 `ResolveStaticBuildResult` 的既有字段
2. 不修改单次 resolver 的公式或 summary 语义
3. 不把 `diagnostics / sourceNotes / assumptions / unsupportedEffects` 从 compact build 中移除

## 完成标准

1. `zzz-data` 导出 `compactStaticBuildResult`
2. `resolve-build-damage` 默认返回 compact build
3. `includeDetails=true` 时单次 tool 可稳定拿到 `build.trace / build.damageParams`
4. README、roadmap、索引与架构文档同步
