# 静态构筑解析系统 V277

## 目标

为 `skill-matrix summary / group summary` 中仍以 `string[]` 暴露的 `variableBuckets / variableFormulaMultipliers` 补显式公开 type，不改变任何运行时行为。

## 范围

1. 新增 `variableBucketList / variableFormulaMultiplierList` 的显式公开 type
2. `StaticBuildSkillMatrixSummary.variableBuckets / variableFormulaMultipliers` 与 `StaticBuildSkillMatrixGroupSummary.variableBuckets / variableFormulaMultipliers` 统一复用这些 type
3. `build/index.ts` 正式导出这些新 type

## 非目标

1. 不改变这组列表的元素语义和顺序
2. 不改变 skill-matrix summary / group summary 的字段集合
3. 不处理其他 `string[]` 字段，例如 `assumptions / unsupportedEffects / combatTags`

## 结果

- skill-matrix 公开 summary 中的可变 bucket / formula multiplier 列表不再直接以匿名 `string[]` 暴露
- 相关列表字段拥有稳定可复用的公开类型名
