# 静态构筑解析系统 V311

## 目标

`V311` 只解决一件事：

- 为 `compact.ts` 中仍然直接暴露的 `id / label / name / sourceId / reason / effect-summary text` 补显式 compact contract

## 范围

1. `CompactStaticBuildDisplayName`
2. `CompactStaticBuildEntryId`
3. `CompactStaticBuildEntryLabel`
4. `CompactStaticBuildRowId`
5. `CompactStaticBuildRowLabel`
6. `CompactStaticBuildCanonicalLabel`
7. `CompactStaticBuildStableKey`
8. `CompactStaticBuildSourceId`
9. `CompactStaticBuildSourceName`
10. `CompactStaticBuildEffectId`
11. `CompactStaticBuildEffectLabel`
12. `CompactStaticBuildEffectSummaryBucket`
13. `CompactStaticBuildEffectSummaryValue`
14. `CompactStaticBuildEffectSummaryCondition`
15. `CompactStaticBuildTraceReason`
16. `CompactStaticBuildGroupLabel`
17. `CompactStaticBuildSkillMatrixGroupKey`

## 非目标

1. 不处理 `commonBuckets / variableBuckets`
2. 不处理 `sourceStatId / sourceStatName / segmentLabel`
3. 不处理 compact helper 的运行时逻辑

## 结果

完成后：

- `compact.ts` 里的 profile/catalog/group/source-note/diagnostic/effect-summary
- `skill-matrix row/group/meta`
- `trace item`

将不再继续直接暴露这批匿名文本 contract。
