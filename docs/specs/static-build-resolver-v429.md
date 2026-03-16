# 静态构筑解析系统 V429

## 目标

`V429` 只解决一件事：

- 把 `lookup-game-mode.ts` 中版本搜索、候选敌人与可选列表的结果 contract 统一收口为显式 alias / interface。

## 范围

1. `LookupGameModeMode`
2. `LookupGameModeEncounterCandidateList`
3. `LookupGameModeSelectedEnemy`
4. `LookupGameModeDifficultyName / LookupGameModeDifficultyList`
5. `LookupGameModeVersionKey / LookupGameModeVersionKeyList`
6. `LookupGameModeBossName / LookupGameModeBossNameList`
7. `LookupGameModeVersionSearchResult`
8. `LookupGameModeDAVersionSearchResult`

## 非目标

1. 不改 `lookup-game-mode` 的返回字段集合
2. 不改 `DA / SD / TS` 查询、敌人选择或 `damageContext` 生成逻辑
3. 不改 `zzz-data` 的 `game-modes` 或 `cleaned` published contract

## 当前状态

- `V429.1` 已完成：范围冻结到 `lookup-game-mode` 的匿名结果列表/候选项 contract
- `V429.2` 已完成：版本搜索结果、候选敌人与可选列表已统一复用显式 alias / interface
