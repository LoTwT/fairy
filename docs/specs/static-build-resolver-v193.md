# 静态构筑解析系统 V193

## 1. 背景

`V192` 收口后，compact `trigger-matrix row.metadata` 中仍直接复用 raw metadata enum/source shape 的稳定缺口是：

1. `entryKind`
2. `templateSource`
3. `damageType`
4. `sourceType`
5. `sourceViewResolutionMode`

`V193` 只解决这一件事。

## 2. 目标

把 compact `trigger-matrix row.metadata` 改为显式 compact metadata contract，不再通过 indexed access 复用 raw trigger metadata type。

## 3. 非目标

1. 不改变 row 值
2. 不改变 `summary / damage / build`
3. 不改变 `includeDetails` 语义
4. 不改变 skill-matrix row metadata contract

## 4. 结果

完成后：

1. `trigger-matrix row.metadata` 只暴露 compact 自身类型
2. compact `trigger-matrix` 与 `source-damage-view` 的 metadata contract 更一致
3. runtime 输出字段与数值保持不变，只收紧 public contract
