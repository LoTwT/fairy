# 静态构筑解析系统 V471

## 目标

`V471` 只解决一件事：

- 把 `cleaned/types.ts` 中 `EnemyDamageContext` 的核心标识与数值字段对齐到 `game-modes` 上游 alias。

## 范围

1. `enemyId`
2. `enemyName`
3. `baseDefense`
4. `dazeGauge`
5. `dazeMultiplier`
6. `dazeDuration`

## 非目标

1. 不改任何 `cleaned` helper 的计算逻辑
2. 不改 `resistanceBucket / elementMultiplier / multipliers`
3. 不改 encounter 选择或伤害上下文字段语义

## 当前状态

- `V471.1` 已完成：范围冻结到 `EnemyDamageContext` 的核心标识与数值字段 contract
- `V471.2` 已完成：相关字段已统一复用 `game-modes` 上游 alias
