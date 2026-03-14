# 静态构筑解析系统 V180

## 1. 背景

`V179` 收口后，compact single-build 结果里仍直接复用 raw calculator type 的稳定缺口是：

1. `CompactStaticBuildResult.damageParams`

`V180` 只解决这一件事。

## 2. 目标

把 compact single-build 顶层的 `damageParams` 及其嵌套参数改为显式 compact type，不再直接复用 raw calculator params。

## 3. 非目标

1. 不改变 `damageParams` 的字段值
2. 不改变 `includeDetails` 语义
3. 不改变 `resolvedPanel`
4. 不改变 `resolvedBuckets`

## 4. 结果

完成后：

1. `CompactStaticBuildResult.damageParams` 使用显式 compact union type
2. `normal / sheer / anomaly / disorder` 四种模式都通过 compact helper 显式映射
3. runtime 输出保持字段与数值不变，只收紧 public contract
