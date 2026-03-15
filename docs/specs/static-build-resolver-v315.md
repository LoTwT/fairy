# 静态构筑解析系统 V315

## 目标

`V315` 只解决一件事：

- 为 `build/types.ts` 中仍直接暴露的 snapshot/input `Record<..., number>` contract 补显式公开 map type

## 范围

1. `StaticBuildBucketValueMap`
2. `StaticBuildFormulaMultiplierMap`
3. `StaticBuildDynamicCountMap`
4. `StaticBuildDynamicValueMap`
5. `StaticBuildStateValueMap`
6. `StaticBuildResolvedSnapshotBucketDeltaMap`
7. `StaticBuildResolvedSnapshotMultiplierFactorMap`
8. `StaticBuildEffectStacks`
9. `StaticBuildDynamicSnapshotInput`
10. `StaticBuildStateSnapshotInput`
11. `StaticBuildResolvedSnapshotInput`
12. `StaticBuildEffectCondition.minimumDynamicCounts`
13. `StaticBuildEffectCondition.minimumDynamicValues`
14. `StaticBuildEffectCondition.minimumStateValues`

## 非目标

1. 不调整任何运行时 resolver 逻辑
2. 不处理 `skill-matrix row metadata` 里的剩余 numeric contract
3. 不处理 `compact.ts`，该层已在 `V314` 收口

## 结果

完成后：

- `build/types.ts` 中剩余的 snapshot/input map contract 不再直接暴露 `Record<..., number>`
- 下一条最小缺口只剩 `skill-matrix row metadata` 的 `order / sourceSkillTypeId / sourceOccurrence / segmentIndex`
