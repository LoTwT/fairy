# 静态构筑解析系统 V298

## 目标

为 requirement item 与通用 requirement summary group 中仍以匿名 `string` 暴露的 `key` 补显式公开 type，不改变任何运行时行为。

## 范围

1. 新增 `requirementKey` 的显式公开 type
2. `StaticBuildSourceDamageViewRequirement.key`
3. `StaticBuildSourceUtilityViewRequirement.key`
4. `StaticBuildRequirementSummaryGroup` 的默认 `TKey`
5. `StaticBuildRequirementSummary` 的默认 `TKey`
6. `build/index.ts` 正式导出这个新 type

## 非目标

1. 不改变 requirement key 的字符串内容或分组逻辑
2. 不处理 skill-matrix group `key`
3. 不处理 source-note / diagnostic `keys`

## 结果

- requirement 公开 contract 中的通用 `key` 不再直接以匿名 `string` 暴露
- requirement item 与 summary group 默认拥有稳定可复用的公开类型名
