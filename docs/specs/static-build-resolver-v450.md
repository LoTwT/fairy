# 静态构筑解析系统 V450

## 目标

`V450` 只解决一件事：

- 把 `lookup-game-mode.ts` 中 `DA` 成功结果里的 `data` 外壳 contract 从 `DeadlyAssaultJson[number]` 收口为显式 interface。

## 范围

1. `LookupGameModeVersionTime`
2. `LookupGameModeVersionDazeMultiplier`
3. `LookupGameModeVersionAnomalyMultiplier`
4. `LookupGameModeDAData`

## 非目标

1. 不改 `DA` 版本查询、敌人选择或 `damageContext` 计算逻辑
2. 不改 `data` 字段的值、字段集合或返回条件
3. 不改 `buffs / versionEnemies` 的更深层 nested contract

## 当前状态

- `V450.1` 已完成：范围冻结到 `lookup-game-mode DA` 成功结果的 `data` 外壳
- `V450.2` 已完成：`DA data` 顶层版本对象已统一复用显式 interface
