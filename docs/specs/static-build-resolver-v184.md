# 静态构筑解析系统 V184

## 1. 背景

`V183` 收口后，compact matrix result 顶层仍直接复用 raw header type 的稳定缺口是：

1. `CompactStaticBuildSkillMatrixResult.profile / mode / manualBaseMode / loadout`
2. `CompactStaticBuildTriggerMatrixResult.profile / mode / manualBaseMode / loadout`

`V184` 只解决这一件事。

## 2. 目标

把 compact `skill-matrix / trigger-matrix` 顶层的 `profile / mode / manualBaseMode / loadout` 改为显式 compact type，不再直接复用 raw result type。

## 3. 非目标

1. 不改变 `rows` 的字段值
2. 不改变 `summary`
3. 不改变 `includeDetails` 语义
4. 不改变 standalone source views

## 4. 结果

完成后：

1. `skill-matrix / trigger-matrix` 顶层 header 与 single-build 的 compact header contract 对齐
2. `profile` 复用 `CompactStaticBuildProfile`
3. `loadout` 复用 `CompactStaticBuildLoadout`
