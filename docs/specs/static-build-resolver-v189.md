# 静态构筑解析系统 V189

## 1. 背景

`V188` 收口后，compact entry 级结果里仍直接复用 raw damage summary shape 的稳定缺口是：

1. `StaticBuildCompactTriggerMatrixRow.damage`
2. `StaticBuildCompactSourceDamageViewEntry.damage`

`V189` 只解决这一件事。

## 2. 目标

把 compact `trigger-row / source-damage-view entry` 的 `damage` 改为显式 compact type，不再直接复用 raw damage summary shape。

## 3. 非目标

1. 不改变 `damage` 的字段值
2. 不改变 `summary`
3. 不改变 `build`
4. 不改变 `includeDetails` 语义

## 4. 结果

完成后：

1. entry 级 `damage` 统一复用显式 compact summary type
2. `trigger-matrix` 与 `source-damage-view` 的 entry damage contract 保持对称
3. runtime 输出保持字段与数值不变，只收紧 public contract
