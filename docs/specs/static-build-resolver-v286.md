# 静态构筑解析系统 V286

## 目标

为 effect 公开 contract 中仍以匿名 `string` 暴露的 `effectId` 补显式公开 type，不改变任何运行时行为。

## 范围

1. 新增 `effectId` 的显式公开 type
2. `StaticBuildEffectOverride.effectId`
3. `StaticBuildEffectDefinition.id`
4. `StaticBuildTraceItem.effectId`
5. `StaticBuildResolveEffectSummaryItem.effectId`
6. `StaticBuildSourceDamageViewEffectSummaryItem.effectId`
7. `StaticBuildTriggerMatrixEffectSummaryItem.effectId`
8. `StaticBuildSkillMatrixEffectSummaryItem.effectId`
9. `build/index.ts` 正式导出这个新 type

## 非目标

1. 不改变 effectId 的字符串内容或匹配逻辑
2. 不处理 `sourceName / label`
3. 不处理 `bucket / value / condition` 文本

## 结果

- effectId 不再直接以匿名 `string` 暴露
- 相关 override / definition / trace / summary 的 `effectId` 字段拥有稳定可复用的公开类型名
