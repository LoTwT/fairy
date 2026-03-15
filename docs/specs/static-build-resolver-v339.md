# 静态构筑解析系统 V339：modifier formatter helper contracts

## 1. 目标

`V339` 只解决一件事：

- 把 `resolver.ts / views.ts / trigger-matrix.ts / matrix.ts` 中 modifier formatter helper 仍直接使用的裸 `bucket/value/combine` 参数统一收成既有显式公开 modifier contract。

## 2. 范围

1. `StaticBuildModifierCombine`
2. `StaticBuildViewModifierCombine`
3. `StaticBuildModifierDefinition.combine`
4. `StaticBuildTraceModifier.combine`
5. `resolver.ts:formatEffectModifier()`
6. `resolver.ts:mergeBucket()`
7. `views.ts:formatSourceDamageViewModifier()`
8. `trigger-matrix.ts:formatTriggerMatrixModifier()`
9. `matrix.ts:formatModifier()`
10. `build/index.ts` 对应导出

## 3. 非目标

1. 不改变 modifier 文案
2. 不调整 bucket label 映射
3. 不修改任何运行时 merge 逻辑

## 4. 完成条件

1. formatter helper 不再使用裸 `bucket: string`
2. formatter helper 不再使用裸 `value: number`
3. modifier combine 统一复用显式公开 contract
4. 全量校验通过
