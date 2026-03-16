# 静态构筑解析系统 V416

## 目标

`V416` 只解决一件事：

- 把 `game-modes.ts` 中 `Threshold Simulation` 的 `enemy/wave` 匿名 list contract 统一收口为显式 list alias。

## 范围

1. `TSBossEnemyItemList`
2. `TSRegularEnemyItemList`
3. `TSBossWaveItemList`
4. `TSRegularWaveItemList`
5. `TSBossWaveItem.enemies`
6. `TSRegularWaveItem.enemies`
7. `TSBossSideItem.waves`
8. `TSRegularSideItem.waves`

## 非目标

1. 不改任何 published JSON shape
2. 不改 `Threshold Simulation` 的 side/node/version/mode 顶层 list
3. 不改 `cleaned` helper、resolver 或上层 tool 逻辑

## 当前状态

- `V416.1` 已完成：范围冻结到 `Threshold Simulation enemy/wave` list contract
- `V416.2` 已完成：boss/regular `enemy[]` 与 `wave[]` 已统一复用显式 list alias
