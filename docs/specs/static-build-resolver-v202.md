# 静态构筑解析系统 V202

## 1. 背景

`V201` 收口后，`build/types.ts` 中仍有一处直接复用 raw source-damage resolution mode 的稳定缺口：

1. `StaticBuildSourceDamageViewMeta.resolutionMode`
2. `StaticBuildSourceDamageViewEntry.resolutionMode`
3. `StaticBuildTriggerMatrixRowMeta.sourceViewResolutionMode`

`V202` 只解决这一件事。

## 2. 目标

把 `build/types.ts` 中 source-damage-view 的 resolution mode 统一改为显式 `StaticBuildSourceDamageViewResolutionMode`。

## 3. 非目标

1. 不改变 `resolutionMode` 的值域
2. 不改变 utility view 的 resolution mode
3. 不改变 trigger row runtime 值
4. 不改变 resolver / matrix / views 的 runtime 逻辑

## 4. 结果

完成后：

1. `build/types.ts` 的 source-damage resolution mode 不再通过字段索引复用 entry shape
2. source-damage-view 和 trigger-matrix 之间的 resolution mode 语义保持一致，但通过显式公开类型表达
3. runtime 输出字段与数值保持不变，只收紧 public contract
