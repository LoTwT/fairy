# 静态构筑解析系统 V413

## 目标

`V413` 只解决一件事：

- 把 `game-modes.ts` 中 `Shiyu Defense` 的 `enemy/wave` 匿名 list contract 统一收口为显式 list alias。

## 范围

1. `SDEnemyItemList`
2. `SDWaveItemList`
3. `SDWaveItem.enemies`
4. `SDSideItem.waves`

## 非目标

1. 不改任何 published JSON shape
2. 不改 `Shiyu Defense` 其他 node/version/mode list
3. 不改 `cleaned` helper、resolver 或上层 tool 逻辑

## 当前状态

- `V413.1` 已完成：范围冻结到 `Shiyu Defense enemy/wave` list contract
- `V413.2` 已完成：`SDEnemyItem[]` 与 `SDWaveItem[]` 已统一复用显式 list alias
