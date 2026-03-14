# 静态构筑解析系统 V179

## 1. 背景

`V178` 收口后，compact single-build 结果里仍直接复用 raw build type 的稳定缺口是：

1. `CompactStaticBuildResult.resolvedPanel`

`V179` 只解决这一件事。

## 2. 目标

把 compact single-build 顶层的 `resolvedPanel` 改为显式 compact type，不再直接复用 raw `StaticBuildResolvedPanel`。

## 3. 非目标

1. 不改变 `resolvedPanel` 的字段值
2. 不改变 `resolvedBuckets`
3. 不改变 `damageParams`
4. 不改变 `includeDetails` 语义

## 4. 结果

完成后：

1. `CompactStaticBuildResult.resolvedPanel` 使用显式 `CompactStaticBuildResolvedPanel`
2. runtime 输出保持字段与数值不变，只收紧 public contract
