# 静态构筑解析系统 V197

## 1. 背景

`V196` 收口后，compact header / loadout contract 中仍直接复用 raw trait shape 的稳定缺口集中在：

1. `CompactStaticBuildProfile.id`
2. `CompactStaticBuildAgentCatalogEntry.specialty`
3. `CompactStaticBuildAgentCatalogEntry.defaultAttribute`
4. `CompactStaticBuildAgentCatalogEntry.defaultDamageType`
5. `CompactStaticBuildAgentCatalogEntry.profileId`
6. `CompactStaticBuildWEngineCatalogEntry.specialty`

`V197` 只解决这一件事。

## 2. 目标

把 compact `profile / loadout` 的 trait 字段统一改为显式 compact types。

## 3. 非目标

1. 不改变 `profile / loadout` 的运行时值
2. 不改变 catalog 解析逻辑
3. 不改变 compact header 结构
4. 不改变 matrix / source-view / trigger-view 的 runtime 生成逻辑

## 4. 结果

完成后：

1. compact `profile / loadout` 的 trait 字段不再通过 indexed access 复用 raw contract
2. compact header contract 与已有的 `sourceType / damageType / utilityType / baseDamageStat` 显式化主线保持一致
3. runtime 输出字段与数值保持不变，只收紧 public contract
