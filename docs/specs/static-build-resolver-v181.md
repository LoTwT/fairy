# 静态构筑解析系统 V181

## 1. 背景

`V180` 收口后，compact single-build 结果里仍直接复用 raw calculator result type 的稳定缺口是：

1. `CompactStaticBuildResult.damage`

`V181` 只解决这一件事。

## 2. 目标

把 compact single-build 顶层的 `damage.expected / crit / noCrit` 及其 `breakdown` 改为显式 compact type，不再直接复用 raw `DamageResult`。

## 3. 非目标

1. 不改变 `damage` 的字段值
2. 不改变 `damageParams`
3. 不改变 `resolvedPanel`
4. 不改变 `resolvedBuckets`

## 4. 结果

完成后：

1. `CompactStaticBuildResult.damage` 使用显式 compact damage result type
2. `breakdown` 也通过 compact helper 显式映射
3. runtime 输出保持字段与数值不变，只收紧 public contract
