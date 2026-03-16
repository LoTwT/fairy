# 静态构筑解析系统 V412

## 目标

`V412` 只解决一件事：

- 把 `game-modes.ts` 中 `Deadly Assault` 的匿名 list contract 统一收口为显式 list alias。

## 范围

1. `DABuffList`
2. `DAEnemyItemList`
3. `DAVersionItemList`
4. `DAVersionItem.buffs`
5. `DAVersionItem.versionEnemies`
6. `DeadlyAssaultJson`

## 非目标

1. 不改任何 published JSON shape
2. 不改 `Deadly Assault` 字段语义
3. 不改 `cleaned` helper、resolver 或上层 tool 逻辑

## 当前状态

- `V412.1` 已完成：范围冻结到 `Deadly Assault` list contract
- `V412.2` 已完成：`DABuff`、`DAEnemyItem`、`DAVersionItem` 的匿名 list 已统一复用显式 alias
