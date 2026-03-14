# 静态构筑解析系统 V186

## 1. 背景

`V185` 收口后，compact source-view entry 里仍直接复用 raw metadata type 的稳定缺口是：

1. `StaticBuildCompactSourceDamageViewEntry.metadata`
2. `StaticBuildCompactSourceUtilityViewEntry.metadata`

`V186` 只解决这一件事。

## 2. 目标

把 compact `source-damage-view / source-utility-view` entry 的 `metadata` 改为显式 compact type，不再直接复用 raw metadata type。

## 3. 非目标

1. 不改变 entry 的字段值
2. 不改变 entry `summary`
3. 不改变 entry `damage`
4. 不改变 `includeDetails` 语义

## 4. 结果

完成后：

1. source-view entry metadata 使用显式 compact metadata type
2. `source-entry` 通过复用 entry compact helper 自动继承该 contract
3. runtime 输出保持字段与数值不变，只收紧 public contract
