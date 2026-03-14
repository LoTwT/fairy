# 静态构筑解析系统 V131

## 背景

`V130` 已为单次 `resolveStaticBuildDamage()` 补齐 compact helper，并让高层 `resolveBuildDamage` 默认返回 compact build。

但当前 compact build 仍默认携带：

1. `diagnostics`
2. `sourceNotes`

这使得单次 tool 仍比 `skill-matrix / trigger-matrix / source views` 更重。

## 目标

只继续收紧 single-build compact 的 detail gating：

1. 默认保留各类 `*Summary`
2. 把 `diagnostics / sourceNotes` 也移到 `includeDetails=true`

## 当前边界

本阶段只做：

1. `CompactStaticBuildResult` 的 detail gating 调整
2. 高层 `resolveBuildDamage` 测试与 prompt 对齐
3. README / roadmap / 索引 / 架构文档同步

显式不做：

1. 不改变 `ResolveStaticBuildResult` 原始返回
2. 不移除 `assumptions / unsupportedEffects`
3. 不改变 `trace / damageParams` 已有 gating 语义

## 完成标准

1. 默认 compact single-build 不再携带 `diagnostics / sourceNotes`
2. `includeDetails=true` 时可稳定取回 `diagnostics / sourceNotes / trace / damageParams`
3. 高层 prompt 已明确这一点
4. 文档与测试同步
