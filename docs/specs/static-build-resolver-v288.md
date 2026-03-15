# 静态构筑解析系统 V288

## 目标

为 effect 公开 contract 中仍以匿名 `string` 暴露的 `label` 补显式公开 text type，不改变任何运行时行为。

## 范围

1. 新增 `effectLabel` 的显式公开 type
2. `StaticBuildEffectDefinition.label`
3. `StaticBuildTraceItem.label`
4. `StaticBuildResolveEffectSummaryItem.label`
5. `StaticBuildSourceDamageViewEffectSummaryItem.label`
6. `StaticBuildTriggerMatrixEffectSummaryItem.label`
7. `StaticBuildSkillMatrixEffectSummaryItem.label`
8. `build/index.ts` 正式导出这个新 type

## 非目标

1. 不改变 effect label 的字符串内容或生成逻辑
2. 不处理 group / entry 的 label
3. 不处理 `bucket / value / condition` 文本

## 结果

- effect 相关 contract 的 label 不再直接以匿名 `string` 暴露
- 相关 definition / trace / summary 的 `label` 字段拥有稳定可复用的公开类型名
