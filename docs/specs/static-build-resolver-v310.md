# 静态构筑解析系统 V310

## 目标

`V310` 只解决一件事：

- 为 `compact.ts` 顶层和 skill-matrix 里复用最频繁的匿名 list/map/key 补显式 compact contract

## 范围

1. `CompactStaticBuildFormulaMultiplierMap`
2. `CompactStaticBuildAliasList`
3. `CompactStaticBuildAssumptionList`
4. `CompactStaticBuildUnsupportedEffectList`
5. `CompactStaticBuildDiagnosticKeyList`
6. `CompactStaticBuildSourceNoteKeyList`
7. `CompactStaticBuildCombatTagList`
8. `CompactStaticBuildSkillQualifierList`
9. `CompactStaticBuildRequirementKey`

## 非目标

1. 不处理 `compact.ts` 中剩余的匿名 `label / id / name`
2. 不处理 `commonBuckets / variableBuckets`
3. 不处理 compact helper 的运行时逻辑

## 结果

完成后：

- `CompactStaticBuildResult / ResolveSummary / CatalogEntry / DiagnosticEntry / SourceNoteEntry`
- `StaticBuildCompactSkillMatrixRow / CompactStaticBuildSkillMatrixResult`
- `CompactStaticBuildSkillMatrixRowMeta / GroupSummary / Summary`

这些公开 compact contract 将不再直接暴露匿名 `string[]` / `Record<string, number>` / requirement `key: string`。
