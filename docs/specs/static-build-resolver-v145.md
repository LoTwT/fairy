# 静态构筑解析系统 V145

## 背景

`V132` 收口后，compact `skill-matrix rows` 的 `row.diagnostics / row.sourceNotes` 已收紧到 `includeDetails=true`。

但 compact `skill-matrix rows` 仍默认携带原始 `row.assumptions`，而下列稳定字段已经齐全：

- `row.assumptionSummary`
- `matrix.summary.assumptionSummary`
- `matrix.summary.groups[*].assumptionSummary`
- `matrix.assumptionSummary`

这导致调用方默认消费 compact `skill-matrix rows` 时，仍会拿到不必要的 raw assumption arrays。

## 目标

`V145` 只解决一件事：

1. 把 compact `skill-matrix rows` 的 `row.assumptions` 移动到 `includeDetails=true`

## 非目标

1. 不改变顶层 `matrix.assumptions`
2. 不改变 `row.assumptionSummary`
3. 不改变 `row.diagnostics / row.sourceNotes / row.build` 之外的其他 detail gating

## 变更范围

1. `compactStaticBuildSkillMatrixRow()`
2. `resolveBuildSkillMatrix` 的 `includeDetails` 描述、测试与 prompt
3. README / roadmap / 索引 / 架构文档

## 验收标准

1. 默认 compact `skill-matrix rows` 不再携带 `row.assumptions`
2. `includeDetails=true` 时可稳定取回 `row.assumptions`
3. 顶层 `matrix.assumptions` 当前行为保持不变
