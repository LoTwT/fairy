# 静态构筑解析系统 V330：effect summary accumulator contracts

`V330` 只解决一件事：

- 把 `resolver / source-damage-view / trigger-matrix / skill-matrix` 中 effect-summary reducer 仍直接使用的 `Map<string>` / `Set<string>` 聚合容器统一收成显式公开 contract。

## 范围

1. `StaticBuildEffectSummaryBucketSet`
2. `StaticBuildEffectSummaryValueSet`
3. `StaticBuildEntryIdSet`
4. `StaticBuildRowIdSet`
5. `StaticBuildEffectSummaryAccumulatorMap`
6. `StaticBuildEffectSummaryAccumulator`
7. `StaticBuildResolveEffectSummaryAccumulator`
8. `StaticBuildEntryEffectSummaryAccumulator`
9. `StaticBuildRowEffectSummaryAccumulator`
10. 对应 summary reducer 与 `build/index.ts` type export

## 非目标

1. 不处理 `views.ts / utility-views.ts / definitions.ts` 中其他业务索引用的 `Set<string>` / `Map<string, ...>`
2. 不修改任何 effect-summary 输出字段
3. 不调整任何聚合顺序或判定逻辑
