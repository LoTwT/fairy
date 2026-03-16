# 静态构筑解析系统 V459

## 目标

`V459` 只解决一件事：

- 把 `calculator/types.ts` 中 `DisorderDamageParams` 对 `Omit<AnomalyDamageParams, "damageMultiplier">` 的公开复用收口为显式 interface。

## 范围

1. `DisorderDamageParams`

## 非目标

1. 不改任何紊乱公式、乘区或返回数值
2. 不改 `AnomalyDamageParams` 的字段集合
3. 不改 `calcDisorderDamage*` 的实现逻辑

## 当前状态

- `V459.1` 已完成：范围冻结到 `DisorderDamageParams` 的公开 `Omit` 复用
- `V459.2` 已完成：`DisorderDamageParams` 已统一改为显式 interface
