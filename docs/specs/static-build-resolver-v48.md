# 静态构筑解析系统 V48

`V47` 收口后，`skill matrix` 顶层已经具备聚合：

1. `diagnosticSummary`
2. `sourceNoteSummary`

同时 `source-damage-view entry` 与 `trigger-entry matrix row` 也已经具备稳定的行级：

1. `diagnosticSummary`
2. `sourceNoteSummary`

但 `StaticBuildSkillMatrixRow` 当前仍只暴露：

1. `diagnostics`
2. `sourceNotes`

这意味着：

1. 上层如果只消费单条 skill matrix row，仍需自己遍历 `diagnostics[] / sourceNotes[]`
2. `skill matrix row` 与 `source-view entry / trigger row` 的行级摘要能力仍不对称
3. compact helper 与高层 tool 无法直接透传结构化的行级 diagnostics / source-note 概况

`V48` 只解决一件事：

- 为 `skill matrix row` 增加聚合 `diagnosticSummary / sourceNoteSummary`

## 1. 目标

在不改变现有：

1. `rows[].diagnostics`
2. `rows[].sourceNotes`
3. `rows[].damageSummary`
4. `rows[].resolvedBuckets`
5. `summary / effectSummary / diagnosticSummary / sourceNoteSummary`

的前提下，让上层可以直接从：

1. `StaticBuildSkillMatrixRow.diagnosticSummary`
2. `StaticBuildSkillMatrixRow.sourceNoteSummary`

读取当前行的 diagnostics / source-note 概况，而不再需要手工遍历数组。

## 2. 范围

1. `V48.1` scope freeze
2. `V48.2` row-level summary contract
3. `V48.3` compact / high-level alignment
4. `V48.4` docs closeout

## 3. 设计边界

本阶段只做：

1. 为 `StaticBuildSkillMatrixRow` 增加 `diagnosticSummary`
2. 为 `StaticBuildSkillMatrixRow` 增加 `sourceNoteSummary`
3. 更新 compact helper、skill-matrix tests 与高层 tool

显式不做：

1. 不为 `skill matrix row` 新增 `requirementSummary`
2. 不改变现有 `summary`
3. 不改变现有 `effectSummary`
4. 不新增新的 matrix row metadata
5. 不改变 row-level `diagnostics / sourceNotes` 原始数组

## 4. 目标 contract

新增到 `StaticBuildSkillMatrixRow`：

1. `diagnosticSummary`
2. `sourceNoteSummary`

两者都按当前单条 row 自身的 `diagnostics[] / sourceNotes[]` 聚合。

## 5. 验收标准

1. `matrix.rows[i].diagnosticSummary` 可直接读取
2. `matrix.rows[i].sourceNoteSummary` 可直接读取
3. compact helper 与高层 `resolve-build-skill-matrix` 保持一致
4. 上层不需要再自己遍历单条 row 的 `diagnostics / sourceNotes` 才能得到行级概况

## 6. 当前状态

- `V48.1` 已完成：冻结到 skill-matrix row-level summary contract
- `V48.2` 已完成：`StaticBuildSkillMatrixRow` 已新增稳定 `diagnosticSummary / sourceNoteSummary`
- `V48.3` 已完成：compact helper 与高层 `resolve-build-skill-matrix` 已对齐新的 row-level summary contract
- `V48.4` 已完成：README / 总规格 / roadmap / index / architecture 已同步到 `V48` 收口状态
