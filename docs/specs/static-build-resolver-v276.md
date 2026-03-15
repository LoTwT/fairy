# 静态构筑解析系统 V276

## 目标

为 `resolve summary / skill-matrix summary` 中仍以 `Record<string, number>` 暴露的公开 map contract 补显式 type，不改变任何运行时行为。

## 范围

1. 新增 `bucketValueMap / formulaMultiplierMap` 的显式公开 type
2. `StaticBuildResolveSummary.formulaMultipliers`、`StaticBuildSkillMatrixSummary.commonBuckets / commonFormulaMultipliers`、`StaticBuildSkillMatrixGroupSummary.commonBuckets / commonFormulaMultipliers` 统一复用这些 type
3. `build/index.ts` 正式导出这些新 type

## 非目标

1. 不改变相关 map 的 key 或 value 语义
2. 不改变 skill-matrix / resolve summary 的字段集合
3. 不处理 `variableBuckets / variableFormulaMultipliers` 这类字符串列表 contract

## 结果

- 公开的 map contract 不再直接以匿名 `Record<string, number>` 暴露
- resolve summary 与 skill-matrix summary 的 map 字段拥有稳定可复用的公开类型名
