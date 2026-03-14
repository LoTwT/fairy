# 静态构筑解析系统 V183

## 1. 背景

`V182` 收口后，compact single-build 结果里仍直接复用 raw single-build header type 的稳定缺口是：

1. `CompactStaticBuildResult.profile`
2. `CompactStaticBuildResult.mode`
3. `CompactStaticBuildResult.manualBaseMode`

`V183` 只解决这一件事。

## 2. 目标

把 compact single-build 顶层的 `profile / mode / manualBaseMode` 改为显式 compact type，不再直接复用 raw result type。

## 3. 非目标

1. 不改变 `profile / mode / manualBaseMode` 的字段值
2. 不改变 `loadout`
3. 不改变 `damage`
4. 不改变 `includeDetails` 语义

## 4. 结果

完成后：

1. `CompactStaticBuildResult.profile` 使用显式 compact profile type
2. `mode / manualBaseMode` 明确收敛到 compact alias
3. runtime 输出保持字段与数值不变，只收紧 public contract
