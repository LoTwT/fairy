# 静态构筑解析系统 V148

## 背景

`V147` 收口后，compact single-build 顶层的 raw `build.assumptions` 已收紧到 `includeDetails=true`。

但 compact single-build 顶层结果仍默认携带原始 `build.unsupportedEffects`，而下列稳定字段已经齐全：

- `build.caveatSummary`
- `build.summary`

这导致调用方默认消费 compact single-build 时，仍会拿到不必要的 raw unsupported-effect arrays。

## 目标

`V148` 只解决一件事：

1. 把 compact single-build 的顶层 `build.unsupportedEffects` 移动到 `includeDetails=true`

## 非目标

1. 不改变 `build.caveatSummary`
2. 不改变 `build.assumptionSummary`
3. 不改变 `build.assumptions / build.diagnostics / build.sourceNotes / build.trace / build.damageParams` 之外的其他 detail gating

## 变更范围

1. `compactStaticBuildResult()`
2. `resolveBuildDamage` 的 `includeDetails` 描述、测试与 prompt
3. README / roadmap / 索引 / 架构文档

## 验收标准

1. 默认 compact single-build 不再携带 `build.unsupportedEffects`
2. `includeDetails=true` 时可稳定取回 `build.unsupportedEffects`
3. `build.caveatSummary` 当前行为保持不变
