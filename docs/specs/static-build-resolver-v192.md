# 静态构筑解析系统 V192

## 1. 背景

`V191` 收口后，compact `source-damage-view` contract 中仍直接复用 raw entry enum shape 的稳定缺口集中在：

1. `StaticBuildCompactSourceDamageViewEntry.sourceType`
2. `StaticBuildCompactSourceDamageViewEntry.damageType`
3. `StaticBuildCompactSourceDamageViewEntry.resolutionMode`
4. `CompactStaticBuildSourceDamageViewMeta`

`V192` 只解决这一件事。

## 2. 目标

把 compact `source-damage-view` 的 entry/meta 公共枚举字段改为显式 compact types，不再通过 indexed access 复用 raw damage-view entry contract。

## 3. 非目标

1. 不改变 damage entry 的字段值
2. 不改变 `damage / summary / build`
3. 不改变 `includeDetails` 语义
4. 不改变 trigger-matrix metadata contract

## 4. 结果

完成后：

1. `source-damage-view` 的 entry/meta 对外只暴露 compact 自身类型
2. compact `source-damage-view` 与 `source-utility-view` 的公开 contract 对称
3. runtime 输出字段与数值保持不变，只收紧 public contract
