# 静态构筑解析系统 V270

## 目标

为 build-layer 中最常用的 summary 计数补显式 type，并让 `diagnostic / source-note / assumption / unsupported-effect` 相关 summary 统一复用这些 contract，不改变任何运行时行为。

## 范围

1. 新增 `diagnosticCount / sourceNoteCount / assumptionCount / unsupportedEffectCount` 的显式公开标量 type
2. `StaticBuildDiagnosticSummary`、`StaticBuildSourceNoteSummary`、`StaticBuildCaveatSummary`、`StaticBuildResolveSummary`、`StaticBuildAssumptionSummary`、`StaticBuildSourceUtilityViewEntrySummary`、`StaticBuildEntryCaveatSummary` 统一复用这些 type
3. `build/index.ts` 正式导出这些新 type

## 非目标

1. 不改变各 summary 的字段集合
2. 不处理 requirement/view-specific 的 count contract
3. 不扩展 compact layer 的 summary count contract

## 结果

- 最常用的 summary count 不再以裸 `number` 暴露
- `diagnostic / source-note / assumption / unsupported-effect` 这组计数 contract 与前面的 scalar 收口保持一致
