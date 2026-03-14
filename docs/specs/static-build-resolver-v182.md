# 静态构筑解析系统 V182

## 1. 背景

`V181` 收口后，compact single-build 结果里仍直接复用 raw build catalog/loadout type 的稳定缺口是：

1. `CompactStaticBuildResult.loadout`

`V182` 只解决这一件事。

## 2. 目标

把 compact single-build 顶层的 `loadout` 改为显式 compact type，不再直接复用 raw `StaticBuildResolvedLoadout`。

## 3. 非目标

1. 不改变 `loadout` 的字段值
2. 不改变 `profile`
3. 不改变 `damage`
4. 不改变 `includeDetails` 语义

## 4. 结果

完成后：

1. `CompactStaticBuildResult.loadout` 使用显式 compact loadout type
2. `agent / wEngine / driveDiscSets` 都通过 compact helper 显式映射
3. runtime 输出保持字段与数值不变，只收紧 public contract
