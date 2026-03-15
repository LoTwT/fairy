# 静态构筑解析系统 V290

## 目标

为 source-view entry 与 matrix row 公开 contract 中仍以匿名 `string` 暴露的 `label` 补显式公开 text type，不改变任何运行时行为。

## 范围

1. 新增 `entryLabel` 与 `rowLabel` 的显式公开 type
2. `StaticBuildSourceDamageViewEntry.label`
3. `StaticBuildSourceUtilityViewEntry.label`
4. `StaticBuildTriggerMatrixRow.label`
5. `StaticBuildSkillMatrixRow.label`
6. `build/index.ts` 正式导出这些新 type

## 非目标

1. 不改变 entry / row label 的字符串内容或生成逻辑
2. 不处理 `group`
3. 不处理 `canonicalLabel / stableKey`

## 结果

- source-view entry 与 matrix row 的 label 不再直接以匿名 `string` 暴露
- 相关 entry / row 的 `label` 字段拥有稳定可复用的公开类型名
