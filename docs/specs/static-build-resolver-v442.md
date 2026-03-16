# 静态构筑解析系统 V442

## 目标

`V442` 只解决一件事：

- 把 `lookup-game-mode.ts` 的成功解析顶层返回结构收口为显式 interface，并统一 DA/SD/TS 的 `enemyCandidates` 为结构化候选项。

## 范围

1. `LookupGameModeDAData`
2. `LookupGameModeSDData`
3. `LookupGameModeTSData`
4. `LookupGameModeSelectedEnemyValue`
5. `LookupGameModeEncounterCandidateValueList`
6. `LookupGameModeDamageContextValue`
7. `LookupGameModeDAResolvedResult`
8. `LookupGameModeSDResolvedResult`
9. `LookupGameModeTSResolvedResult`
10. `toEncounterCandidateFromName()`

## 非目标

1. 不改 DA/SD/TS 的版本查找、难度解析或 `damageContext` 公式逻辑
2. 不改 `selectedEnemy / damageContext` 字段语义
3. 不改 boss-search 或未命中返回结构

## 当前状态

- `V442.1` 已完成：范围冻结到 `lookup-game-mode` 的成功解析顶层返回结构
- `V442.2` 已完成：DA/SD/TS 成功路径已统一复用显式 interface，DA `enemyCandidates` 也已改为结构化候选项
