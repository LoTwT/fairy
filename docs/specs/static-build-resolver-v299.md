# 静态构筑解析系统 V299

## 目标

为 effect-summary 公开 contract 中仍以匿名 `string` 暴露的 `bucket / value / condition` 补显式公开 type，不改变任何运行时行为。

## 范围

1. 新增 `effectSummaryBucket` 的显式公开 type
2. 新增 `effectSummaryValue` 的显式公开 type
3. 新增 `effectSummaryCondition` 的显式公开 type
4. `StaticBuildResolveEffectSummaryItem`
5. `StaticBuildSourceDamageViewEffectSummaryItem`
6. `StaticBuildTriggerMatrixEffectSummaryItem`
7. `StaticBuildSkillMatrixEffectSummaryItem`
8. `build/index.ts` 正式导出这些新 type

## 非目标

1. 不改变 effect-summary 的字符串内容或展示逻辑
2. 不处理 `effectLabel`
3. 不处理 trace modifier 的 `label / value`

## 结果

- effect-summary 公开 contract 中的 `bucket / value / condition` 不再直接以匿名 `string` 暴露
- 这些文本字段拥有稳定可复用的公开类型名
