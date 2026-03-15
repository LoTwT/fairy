# 静态构筑解析系统 V272

## 目标

为 build-layer 中 view / matrix / group 相关的公开计数字段补显式 type，并让各类 summary 统一复用这些 contract，不改变任何运行时行为。

## 范围

1. 新增 `groupCount / supportedCount / unsupportedCount / entryCount / standaloneCount / deltaCount / triggerCount / rateCount / sourceDamageViewCount / sourceUtilityViewCount / rowCount / mainFormulaCount / sourceViewCount` 的显式公开标量 type
2. `source-damage-view / source-utility-view / source-entry / trigger-matrix / skill-matrix` 的 summary / group summary 统一复用这些 type
3. `StaticBuildEntryCaveatSummary.unsupportedCount` 统一复用显式 unsupported-count contract
4. `build/index.ts` 正式导出这些新 type

## 非目标

1. 不改变各 view / matrix summary 的字段集合
2. 不处理 effect-summary 的 `applied... / total...` 计数字段
3. 不扩展 compact layer 的 count contract

## 结果

- view / matrix / group 相关公开数量 contract 不再以裸 `number` 暴露
- build-layer 计数标量与前面的 scalar 收口保持一致
