# 静态构筑解析系统 V185

## 1. 背景

`V184` 收口后，compact source-view result 顶层仍直接复用 raw header type 的稳定缺口是：

1. `CompactStaticBuildSourceDamageViewsResult.mode / manualBaseMode / loadout`
2. `CompactStaticBuildSourceUtilityViewsResult.loadout`
3. `CompactStaticBuildSourceEntryCollection.loadout`

`V185` 只解决这一件事。

## 2. 目标

把 compact `source-damage-views / source-utility-views / source-entry collection` 顶层的 `mode / manualBaseMode / loadout` 改为显式 compact type，不再直接复用 raw result type。

## 3. 非目标

1. 不改变 `entries` 的字段值
2. 不改变 `summary`
3. 不改变 entry-level metadata
4. 不改变 `includeDetails` 语义

## 4. 结果

完成后：

1. 所有 source-view 顶层 header 与 single-build / matrix result 的 compact header contract 对齐
2. `loadout` 统一复用 `CompactStaticBuildLoadout`
3. `mode / manualBaseMode` 在需要的结果上统一复用 compact alias
