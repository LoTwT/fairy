# 静态构筑解析系统 V150

## 背景

`V149` 收口后，compact skill-matrix 顶层的 raw `matrix.assumptions` 已收紧到 `includeDetails=true`。

但 compact skill-matrix 顶层结果仍默认携带原始 `matrix.unsupportedEffects`，而下列稳定字段已经齐全：

- `matrix.summary.caveatSummary`
- `matrix.caveatSummary`

这导致调用方默认消费 compact skill-matrix 时，仍会拿到不必要的 raw unsupported-effect arrays。

## 目标

`V150` 只解决一件事：

1. 把 compact skill-matrix 的顶层 `matrix.unsupportedEffects` 移动到 `includeDetails=true`

## 非目标

1. 不改变 `matrix.assumptionSummary`
2. 不改变 `matrix.caveatSummary`
3. 不改变 `matrix.assumptions / row.assumptions / row.unsupportedEffects / row.diagnostics / row.sourceNotes / row.build` 之外的其他 detail gating

## 变更范围

1. `compactStaticBuildSkillMatrixResult()`
2. `resolveBuildSkillMatrix` 的 `includeDetails` 描述、测试与 prompt
3. README / roadmap / 索引 / 架构文档

## 验收标准

1. 默认 compact skill-matrix 不再携带顶层 `matrix.unsupportedEffects`
2. `includeDetails=true` 时可稳定取回 `matrix.unsupportedEffects`
3. `matrix.caveatSummary` 当前行为保持不变
