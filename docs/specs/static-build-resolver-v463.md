# 静态构筑解析系统 V463

## 目标

`V463` 只解决一件事：

- 把 `cleaned/types.ts` 中 `EnemyDamageContextSource` 与 `DABuffSource` 的公开 `Omit/Pick` 复用收口为显式 interface。

## 范围

1. `EnemyDamageContextSource`
2. `DABuffSource`

## 非目标

1. 不改任何 `cleaned` helper 的返回值或筛选逻辑
2. 不改 `EnemyBase`、`DABuff` 的 published JSON shape
3. 不改 `EncounterDamageContext` 的字段集合

## 当前状态

- `V463.1` 已完成：范围冻结到 `EnemyDamageContextSource / DABuffSource` 的公开 `Omit/Pick` 复用
- `V463.2` 已完成：相关来源对象已统一改为显式 interface
