# 静态构筑解析系统 V147

## 背景

`V131` 收口后，compact single-build 默认已不再携带 `diagnostics / sourceNotes / trace / damageParams`。

但顶层 compact single-build 结果仍默认携带原始 `build.assumptions`，而下列稳定字段已经齐全：

- `build.assumptionSummary`
- `build.caveatSummary`
- `build.summary`

这导致调用方默认消费 compact single-build 时，仍会拿到不必要的 raw assumption arrays。

## 目标

`V147` 只解决一件事：

1. 把 compact single-build 的顶层 `build.assumptions` 移动到 `includeDetails=true`

## 非目标

1. 不改变顶层 `build.unsupportedEffects`
2. 不改变 `build.assumptionSummary / build.caveatSummary`
3. 不改变 `build.diagnostics / build.sourceNotes / build.trace / build.damageParams` 之外的其他 detail gating

## 变更范围

1. `compactStaticBuildResult()`
2. `resolveBuildDamage` 的 `includeDetails` 描述、测试与 prompt
3. README / roadmap / 索引 / 架构文档

## 验收标准

1. 默认 compact single-build 不再携带 `build.assumptions`
2. `includeDetails=true` 时可稳定取回 `build.assumptions`
3. 顶层 `build.unsupportedEffects` 当前行为保持不变
