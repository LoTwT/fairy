# 静态构筑解析系统 V269

## 目标

为 build-layer 中表示结算结果的公开标量补显式 type，并让 `resolvedPanel / resolveSummary / entryDamage / rowDamageSummary / traceModifier` 统一复用这些 contract，不改变任何运行时行为。

## 范围

1. 新增 `baseDamageValue / expectedTotal / critTotal / noCritTotal / modifierValue` 的显式公开标量 type
2. `StaticBuildResolvedPanel`、`StaticBuildResolveSummary`、`StaticBuildEntryDamage`、`StaticBuildSkillMatrixRowDamageSummary`、`StaticBuildTraceModifier` 统一复用这些 type
3. `build/index.ts` 正式导出这些新 type

## 非目标

1. 不改变 damage result 字段集合
2. 不改变 trace modifier 结算逻辑
3. 不扩展 compact layer 的 damage result contract

## 结果

- build-layer 的结算结果标量不再以裸 `number` 暴露
- 公开 `summary / row / entry / trace` 的 damage-related scalar contract 与前面的 snapshot / panel / enemy / bucket 标量收口保持一致
