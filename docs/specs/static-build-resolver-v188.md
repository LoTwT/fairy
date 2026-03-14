# 静态构筑解析系统 V188

## 1. 背景

`V187` 收口后，compact `trigger-matrix` row 里仍直接复用 raw metadata type 的稳定缺口是：

1. `StaticBuildCompactTriggerMatrixRow.metadata`

`V188` 只解决这一件事。

## 2. 目标

把 compact `trigger-matrix row.metadata` 改为显式 compact type，不再直接复用 raw row metadata type。

## 3. 非目标

1. 不改变 row 的字段值
2. 不改变 `row.summary`
3. 不改变 `row.damage`
4. 不改变 `includeDetails` 语义

## 4. 结果

完成后：

1. `trigger-matrix row.metadata` 使用显式 compact metadata type
2. 所有可选来源字段通过 compact helper 显式透传
3. runtime 输出保持字段与数值不变，只收紧 public contract
