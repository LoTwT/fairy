# 静态构筑解析系统 V289

## 目标

为各类 group summary 公开 contract 中仍以匿名 `string` 暴露的 `label` 补显式公开 text type，不改变任何运行时行为。

## 范围

1. 新增 `groupLabel` 的显式公开 type
2. `StaticBuildDiagnosticGroupSummary.label`
3. `StaticBuildSourceNoteGroupSummary.label`
4. `StaticBuildSourceDamageViewGroupSummary.label`
5. `StaticBuildSourceUtilityViewGroupSummary.label`
6. `StaticBuildSourceEntryGroupSummary.label`
7. `StaticBuildTriggerMatrixGroupSummary.label`
8. `StaticBuildSkillMatrixGroupSummary.label`
9. `build/index.ts` 正式导出这个新 type

## 非目标

1. 不改变 group label 的字符串内容或生成逻辑
2. 不处理 entry / row 的 label
3. 不处理 effect label

## 结果

- 各类 group summary 的 label 不再直接以匿名 `string` 暴露
- 相关 group summary 的 `label` 字段拥有稳定可复用的公开类型名
