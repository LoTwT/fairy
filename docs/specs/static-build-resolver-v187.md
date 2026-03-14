# 静态构筑解析系统 V187

## 1. 背景

`V186` 收口后，compact `skill-matrix` row 里仍直接复用 raw metadata type 的稳定缺口是：

1. `StaticBuildCompactSkillMatrixRow.metadata`

`V187` 只解决这一件事。

## 2. 目标

把 compact `skill-matrix row.metadata` 改为显式 compact type，不再直接复用 raw row metadata type。

## 3. 非目标

1. 不改变 row 的字段值
2. 不改变 `row.summary`
3. 不改变 `row.resolvedBuckets`
4. 不改变 `includeDetails` 语义

## 4. 结果

完成后：

1. `skill-matrix row.metadata` 使用显式 compact metadata type
2. metadata 内的数组字段通过 compact helper 显式复制
3. runtime 输出保持字段与数值不变，只收紧 public contract
