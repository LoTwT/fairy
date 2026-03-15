# 静态构筑解析系统 V325：skill matrix map and list contracts

`V325` 只解决一件事：

- 把 `matrix.ts` 中 `commonBuckets / variableBuckets / commonFormulaMultipliers / variableFormulaMultipliers` 仍直接使用的 map/list shape，统一收成显式公开 contract。

## 范围

1. `summarizeBuckets()`
2. `summarizeFormulaMultipliers()`
3. `StaticBuildBucketValueMap`
4. `StaticBuildVariableBucketList`
5. `StaticBuildFormulaMultiplierMap`
6. `StaticBuildVariableFormulaMultiplierList`

## 非目标

1. 不修改 skill-matrix summary runtime 逻辑
2. 不处理 `SkillMatrixTemplate.combatTags`
3. 不处理 effect summary 内部 `Set<string>` 聚合
