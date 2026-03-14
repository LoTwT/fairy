# 静态构筑解析系统 V178

## 1. 背景

`V177` 收口后，compact contract 中下一处仍直接复用 raw build type 的稳定缺口是：

1. `CompactStaticBuildResult.resolvedBuckets`
2. `StaticBuildCompactSkillMatrixRow.resolvedBuckets`

这两处都直接复用了 `StaticBuildResolvedBuckets`。`V178` 只解决这一个问题。

## 2. 目标

把 compact single-build 与 compact skill-matrix row 上的 `resolvedBuckets` 改为显式 compact type，不再直接复用 raw `StaticBuildResolvedBuckets`。

## 3. 非目标

1. 不改 `resolvedBuckets` 的字段值
2. 不改 `resolvedPanel`
3. 不改 `damageParams`
4. 不改 `includeDetails` 语义

## 4. 结果

完成后：

1. `CompactStaticBuildResult.resolvedBuckets` 使用显式 `CompactStaticBuildResolvedBuckets`
2. `StaticBuildCompactSkillMatrixRow.resolvedBuckets` 使用同一 compact type
3. runtime 输出保持字段与数值不变，只收紧 public contract
