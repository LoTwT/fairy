# 静态构筑解析系统 V287

## 目标

为 effect 公开 contract 中仍以匿名 `string` 暴露的 `sourceName` 补显式公开 text type，不改变任何运行时行为。

## 范围

1. 新增 `sourceName` 的显式公开 type
2. `StaticBuildEffectDefinition.sourceName`
3. `StaticBuildTraceItem.sourceName`
4. `StaticBuildResolveEffectSummaryItem.sourceName`
5. `StaticBuildSourceDamageViewEffectSummaryItem.sourceName`
6. `StaticBuildTriggerMatrixEffectSummaryItem.sourceName`
7. `StaticBuildSkillMatrixEffectSummaryItem.sourceName`
8. `build/index.ts` 正式导出这个新 type

## 非目标

1. 不改变 sourceName 的字符串内容或来源逻辑
2. 不处理 `label`
3. 不处理 `bucket / value / condition` 文本

## 结果

- effect 相关 contract 的 sourceName 不再直接以匿名 `string` 暴露
- 相关 definition / trace / summary 的 `sourceName` 字段拥有稳定可复用的公开类型名
