# 静态构筑解析系统 V294

## 目标

为多个 source 相关公开 contract 中仍以匿名 `string` 暴露的 `sourceId` 补显式公开 type，不改变任何运行时行为。

## 范围

1. 新增 `sourceId` 的显式公开 type
2. `StaticBuildEffectDefinition.sourceId`
3. `StaticBuildSourceNoteEntry.sourceId`
4. `StaticBuildDiagnosticEntry.sourceId`
5. `StaticBuildSourceDamageViewEntry.sourceId`
6. `StaticBuildSourceUtilityViewEntry.sourceId`
7. `StaticBuildTriggerMatrixRowMeta.sourceId`
8. `build/index.ts` 正式导出这个新 type

## 非目标

1. 不改变 sourceId 的字符串内容或匹配逻辑
2. 不处理通用 `id`
3. 不处理 `sourceViewId`

## 结果

- 多个 source 相关 contract 的 sourceId 不再直接以匿名 `string` 暴露
- 相关字段拥有稳定可复用的公开类型名
