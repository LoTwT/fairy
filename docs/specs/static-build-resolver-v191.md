# 静态构筑解析系统 V191

## 1. 背景

`V190` 收口后，compact `source-utility-view` contract 中仍直接复用 raw entry enum/summary shape 的稳定缺口集中在：

1. `StaticBuildCompactSourceUtilityViewEntry.sourceType`
2. `StaticBuildCompactSourceUtilityViewEntry.utilityType`
3. `StaticBuildCompactSourceUtilityViewEntry.resolutionMode`
4. `StaticBuildCompactSourceUtilityViewEntry.targetScope`
5. `StaticBuildCompactSourceUtilityViewEntry.unit`
6. `CompactStaticBuildSourceUtilityViewEntrySummary`
7. `CompactStaticBuildSourceUtilityViewMeta`

`V191` 只解决这一件事。

## 2. 目标

把 compact `source-utility-view` 这组公开枚举/summary contract 改成显式 compact types，不再通过 indexed access 复用 raw entry type。

## 3. 非目标

1. 不改变 utility entry 的字段值
2. 不改变 `includeDetails` 语义
3. 不改变 source-damage-view / skill-matrix / trigger-matrix 的 metadata contract
4. 不改变 runtime 生成逻辑

## 4. 结果

完成后：

1. `source-utility-view` 的 entry/header/meta/summary 对外只暴露 compact 自身类型
2. `compact.ts` 中 `source-utility-view` 相关公开 contract 不再依赖 raw indexed access
3. runtime 输出字段与数值保持不变，只收紧 public contract
