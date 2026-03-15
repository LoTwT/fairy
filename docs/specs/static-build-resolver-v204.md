# 静态构筑解析系统 V204

## 1. 背景

`V203` 收口后，`compact.ts` 中仍有一批导出的 helper 函数参数通过 indexed access 复用上游 shape：

1. `compactStaticBuildDamageBreakdown`
2. `compactStaticBuildSkillMatrixSummary`
3. `compactStaticBuildTriggerMatrixSummary`
4. `compactStaticBuildEntryDamageSummary`
5. `compactStaticBuildSourceEntryCollectionSummary`
6. `compactStaticBuildSourceDamageViewsSummary`
7. `compactStaticBuildSourceDamageViewMeta`
8. `compactStaticBuildSourceUtilityViewsSummary`
9. `compactStaticBuildSourceUtilityViewEntrySummary`
10. `compactStaticBuildSourceUtilityViewMeta`

`V204` 只解决这一件事。

## 2. 目标

把这批导出 helper 的参数签名改为显式公开类型，不再通过 indexed access 复用上游对象字段。

## 3. 非目标

1. 不改变 helper 的 runtime 逻辑
2. 不改变 compact 输出字段
3. 不改变 build / calculator 的值域
4. 不新增新的运行时分支

## 4. 结果

完成后：

1. `compact.ts` 的导出 helper 参数签名不再通过 indexed access 复用上游字段
2. `calculator/types.ts` 新增显式 `DamageBreakdown`
3. `build/types.ts` 新增显式 `StaticBuildEntryDamage`
4. runtime 输出字段与数值保持不变，只收紧 public contract
