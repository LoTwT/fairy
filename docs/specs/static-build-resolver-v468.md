# 静态构筑解析系统 V468

## 目标

`V468` 只解决一件事：

- 把 `cleaned/types.ts` 中本地的元素倍率 tuple contract 对齐到 `game-modes` 上游 alias。

## 范围

1. `ElementMultiplierTuple`
2. `ElementMultiplierCarrier`
3. `EnemyDamageContextSource`
4. 所有使用 `sideElementMultRaw` 的 `cleaned` view contract

## 非目标

1. 不改任何 `cleaned` helper 的返回值
2. 不改任何元素倍率字段的索引顺序或语义
3. 不改 `ElementMultiplierMap` 的结构

## 当前状态

- `V468.1` 已完成：范围冻结到 `cleaned/types.ts` 的元素倍率 tuple 来源对齐
- `V468.2` 已完成：本地 tuple 联合类型已统一复用 `GameModeElementMultiplierTuple`
