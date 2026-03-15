# 静态构筑解析系统 V296

## 目标

为 source-note / source-view / matrix row 公开 contract 中仍以匿名 `string` 暴露的通用 entry / row `id` 补显式公开 type，不改变任何运行时行为。

## 范围

1. 新增 `entryId` 的显式公开 type
2. 新增 `rowId` 的显式公开 type
3. `StaticBuildSourceNoteEntry.id`
4. `StaticBuildSourceDamageViewEntry.id`
5. `StaticBuildSourceUtilityViewEntry.id`
6. `StaticBuildTriggerMatrixRow.id`
7. `StaticBuildSkillMatrixRow.id`
8. `build/index.ts` 正式导出这两个新 type

## 非目标

1. 不改变 entry / row id 的字符串内容或生成逻辑
2. 不处理 `sourceId`
3. 不处理 `sourceViewId`

## 结果

- source-note / source-view / matrix row 相关 contract 的通用 `id` 不再直接以匿名 `string` 暴露
- 这些字段拥有稳定可复用的公开类型名
