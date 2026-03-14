# 静态构筑解析系统 V190

## 1. 背景

`V189` 收口后，compact `includeDetails` 路径里仍直接复用 raw single-build result 的稳定缺口是：

1. `StaticBuildCompactSkillMatrixRow.build`
2. `StaticBuildCompactTriggerMatrixRow.build`
3. `StaticBuildCompactSourceDamageViewEntry.build`

`V190` 只解决这一件事。

## 2. 目标

把 compact `includeDetails.build` 改为 nested compact build，不再直接复用 raw `ResolveStaticBuildResult`。

## 3. 非目标

1. 不改变 `build` 的字段值
2. 不改变 `includeDetails` 开关语义
3. 不改变 `summary`
4. 不改变 row / entry 的非 `build` 字段

## 4. 结果

完成后：

1. `includeDetails.build` 统一复用 `CompactStaticBuildResult`
2. `skill-matrix / trigger-matrix / source-damage-view` 的 nested build contract 保持对称
3. runtime 输出保持字段与数值不变，只收紧 public contract
