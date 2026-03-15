# 静态构筑解析系统 V200

## 1. 背景

`V199` 收口后，`build/types.ts` 的公开 contract 中仍直接复用 raw `sourceType` 的稳定缺口集中在：

1. `StaticBuildTraceItem.sourceType`
2. `StaticBuildSourceNoteEntry.sourceType`
3. `StaticBuildDiagnosticEntry.sourceType`
4. `StaticBuildSourceDamageViewEntry.sourceType`
5. `StaticBuildSourceUtilityViewEntry.sourceType`
6. `StaticBuildTriggerMatrixRowMeta.sourceType`

`V200` 只解决这一件事。

## 2. 目标

把 `build/types.ts` 公开 contract 中的 `sourceType` 统一改为显式 `StaticBuildSourceType`。

## 3. 非目标

1. 不改变任何 `sourceType` 的运行时值
2. 不改变 compact contract
3. 不改变 resolver / matrix / views 的 runtime 逻辑
4. 不新增新的 source type

## 4. 结果

完成后：

1. `build/types.ts` 的公开 `sourceType` 字段不再通过 indexed access 复用 effect definition shape
2. `build` 层和 `compact` 层的 `sourceType` 都有独立、显式的公开类型
3. runtime 输出字段与数值保持不变，只收紧 public contract
