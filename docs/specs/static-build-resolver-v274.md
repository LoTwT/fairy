# 静态构筑解析系统 V274

## 目标

为 `source-utility-view` 的公开数值字段补显式 type，并让 entry / entry summary 统一复用这些 contract，不改变任何运行时行为。

## 范围

1. 新增 `utilityValue / cooldownSeconds` 的显式公开标量 type
2. `StaticBuildSourceUtilityViewEntry` 与 `StaticBuildSourceUtilityViewEntrySummary` 统一复用这些 type
3. `build/index.ts` 正式导出这些新 type

## 非目标

1. 不改变 source-utility-view 的字段集合
2. 不改变 utility value 或 cooldown 的结算逻辑
3. 不扩展 compact layer 的 utility entry contract

## 结果

- source-utility-view 公开数值字段不再以裸 `number` 暴露
- utility-view entry contract 与前面的 scalar 收口保持一致
