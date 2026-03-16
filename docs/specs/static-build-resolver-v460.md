# 静态构筑解析系统 V460

## 目标

`V460` 只解决一件事：

- 把 `build/compact.ts` 中 `CompactStaticBuildDisorderDamageParams` 对 `Omit<CompactStaticBuildAnomalyDamageParams, "damageMultiplier">` 的公开复用收口为显式 interface。

## 范围

1. `CompactStaticBuildDisorderDamageParams`

## 非目标

1. 不改 compact helper 的输出值、字段顺序或可选性
2. 不改 `CompactStaticBuildAnomalyDamageParams` 的字段集合
3. 不改 compact disorder 结果的序列化逻辑

## 当前状态

- `V460.1` 已完成：范围冻结到 compact disorder damage params 的公开 `Omit` 复用
- `V460.2` 已完成：`CompactStaticBuildDisorderDamageParams` 已统一改为显式 interface
