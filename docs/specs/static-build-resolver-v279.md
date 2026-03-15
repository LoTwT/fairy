# 静态构筑解析系统 V279

## 目标

为 single-build / skill-matrix 中仍以 `string[]` 暴露的 `unsupportedEffects` 补显式公开 type，不改变任何运行时行为。

## 范围

1. 新增 `unsupportedEffectList` 的显式公开 type
2. 所有公开 `unsupportedEffects` 字段统一复用该 type
3. `build/index.ts` 正式导出这个新 type

## 非目标

1. 不改变 unsupportedEffects 的字符串内容、顺序或生成逻辑
2. 不处理 `assumptions`
3. 不处理 `combatTags / aliases / qualifiers / keys`

## 结果

- 公开的 unsupportedEffects 列表不再直接以匿名 `string[]` 暴露
- single-build / skill-matrix 各层结果上的 unsupportedEffects 字段拥有稳定可复用的公开类型名
