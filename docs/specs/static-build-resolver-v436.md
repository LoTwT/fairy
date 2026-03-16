# 静态构筑解析系统 V436

## 目标

`V436` 只解决一件事：

- 把 `lookup-game-mode.ts` 中 `versionEnemies` 的匿名引用项 contract 统一收口为显式 alias / interface，并对齐 `enemyName` 文本 alias。

## 范围

1. `LookupGameModeEnemyName`
2. `LookupGameModeVersionEnemyRef`
3. `LookupGameModeVersionEnemyRefList`

## 非目标

1. 不改 `lookup-game-mode` 的返回字段集合
2. 不改 DA/SD/TS 查询、敌人选择或 `damageContext` 生成逻辑
3. 不改 `LookupGameModeEncounterCandidate` 与版本搜索结果字段语义

## 当前状态

- `V436.1` 已完成：范围冻结到 `lookup-game-mode` 的匿名版本敌人引用项 contract
- `V436.2` 已完成：`versionEnemies` 与 `enemyName` 已统一复用显式 alias / interface
