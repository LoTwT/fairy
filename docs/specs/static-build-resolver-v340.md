# 静态构筑解析系统 V340：modifier scalar tail contracts

## 1. 目标

`V340` 只解决一件事：

- 把当前公开 contract 尾部仍遗留的少量 modifier/scalar 裸类型统一收成既有显式 alias，包括 compact trace combine、resolver formatter value、以及 skill-matrix metadata 的 segment scalar。

## 2. 范围

1. `CompactStaticBuildModifierCombine`
2. `CompactStaticBuildTraceModifier.combine`
3. `resolver.ts:formatEffectValue()`
4. `matrix.ts:segmentLabel`
5. `matrix.ts:segmentIndex`

## 3. 非目标

1. 不改变 compact 输出 shape
2. 不调整 skill-matrix metadata 语义
3. 不新增新的运行时字段

## 4. 完成条件

1. compact trace combine 不再直接使用裸 `"sum" | "multiply"`
2. `formatEffectValue()` 不再直接使用裸 `number`
3. `segmentLabel / segmentIndex` 统一复用显式 metadata scalar alias
4. 全量校验通过
