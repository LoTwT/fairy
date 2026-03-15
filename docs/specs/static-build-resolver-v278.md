# 静态构筑解析系统 V278

## 目标

为 single-build / source views / source-entry / trigger-matrix / skill-matrix 中仍以 `string[]` 暴露的 `assumptions` 补显式公开 type，不改变任何运行时行为。

## 范围

1. 新增 `assumptionList` 的显式公开 type
2. 所有公开 `assumptions` 字段统一复用该 type
3. `build/index.ts` 正式导出这个新 type

## 非目标

1. 不改变 assumptions 的字符串内容、顺序或生成逻辑
2. 不处理 `unsupportedEffects`
3. 不处理 `combatTags / aliases / qualifiers / keys`

## 结果

- 公开的 assumptions 列表不再直接以匿名 `string[]` 暴露
- 各层结果与视图上的 assumptions 字段拥有稳定可复用的公开类型名
