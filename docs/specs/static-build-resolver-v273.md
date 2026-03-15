# 静态构筑解析系统 V273

## 目标

为 build-layer 中 effect-summary 的公开计数字段补显式 type，并让 damage-view / trigger-matrix / skill-matrix 统一复用这些 contract，不改变任何运行时行为。

## 范围

1. 新增 `appliedEntryCount / totalEntryCount / appliedRowCount / totalRowCount` 的显式公开标量 type
2. `StaticBuildSourceDamageViewEffectSummaryItem`、`StaticBuildTriggerMatrixEffectSummaryItem`、`StaticBuildSkillMatrixEffectSummaryItem` 统一复用这些 type
3. `build/index.ts` 正式导出这些新 type

## 非目标

1. 不改变 effect-summary 的字段集合
2. 不改变 effect 应用范围或计数逻辑
3. 不扩展 compact layer 的 effect-summary contract

## 结果

- effect-summary 相关公开数量 contract 不再以裸 `number` 暴露
- build-layer 计数标量与前面的 scalar 收口保持一致
