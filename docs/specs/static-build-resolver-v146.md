# 静态构筑解析系统 V146

## 背景

`V145` 收口后，compact `skill-matrix rows` 的 raw `row.assumptions` 已收紧到 `includeDetails=true`。

但 compact `skill-matrix rows` 仍默认携带原始 `row.unsupportedEffects`，而下列稳定字段已经齐全：

- `row.caveatSummary`
- `matrix.summary.caveatSummary`
- `matrix.summary.groups[*].caveatSummary`
- `matrix.caveatSummary`

这导致调用方默认消费 compact `skill-matrix rows` 时，仍会拿到不必要的 raw unsupported-effect arrays。

## 目标

`V146` 只解决一件事：

1. 把 compact `skill-matrix rows` 的 `row.unsupportedEffects` 移动到 `includeDetails=true`

## 非目标

1. 不改变顶层 `matrix.unsupportedEffects`
2. 不改变 `row.caveatSummary`
3. 不改变 `row.assumptions / row.diagnostics / row.sourceNotes / row.build` 之外的其他 detail gating

## 变更范围

1. `compactStaticBuildSkillMatrixRow()`
2. `resolveBuildSkillMatrix` 的 `includeDetails` 描述、测试与 prompt
3. README / roadmap / 索引 / 架构文档

## 验收标准

1. 默认 compact `skill-matrix rows` 不再携带 `row.unsupportedEffects`
2. `includeDetails=true` 时可稳定取回 `row.unsupportedEffects`
3. 顶层 `matrix.unsupportedEffects` 当前行为保持不变
