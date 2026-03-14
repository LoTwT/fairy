# 静态构筑解析系统 V196

## 1. 背景

`V195` 收口后，compact header/summary 里仍直接复用 raw `baseDamageStat` 的稳定缺口剩下两处：

1. `CompactStaticBuildResolveSummary.baseDamageStat`
2. `CompactStaticBuildSkillMatrixSummary.baseDamageStat`

`V196` 只解决这一件事。

## 2. 目标

把 compact summary 层的 `baseDamageStat` 统一改为显式 compact type。

## 3. 非目标

1. 不改变 `baseDamageStat` 的值域
2. 不改变 `resolvedPanel.baseDamageStat`
3. 不改变其他 summary 字段
4. 不改变 runtime 生成逻辑

## 4. 结果

完成后：

1. compact summary 层不再通过 indexed access 复用 raw `baseDamageStat`
2. compact header/summary contract 更一致
3. runtime 输出字段与数值保持不变，只收紧 public contract
