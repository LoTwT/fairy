# 静态构筑解析系统 V449

## 目标

`V449` 只解决一件事：

- 把 `lookup-game-mode.ts` 的 `damageContext` 中仍直接复用 `EncounterDamageContext[...]` 的字段 contract 收口为显式 alias。

## 范围

1. `LookupGameModeWeakness`
2. `LookupGameModeWeaknessList`
3. `LookupGameModeResistance`
4. `LookupGameModeResistanceList`
5. `LookupGameModeMechanicsText`
6. `LookupGameModeDamageContextNode`
7. `LookupGameModeDamageContextSide`
8. `LookupGameModeDamageContextWave`
9. `LookupGameModeSideElementMultiplier`

## 非目标

1. 不改 `lookup-game-mode` 的版本查询、敌人选择或 `damageContext` 计算逻辑
2. 不改 `damageContext` 的值、字段集合或返回条件
3. 不改 `DA/SD/TS data` 顶层 raw contract

## 当前状态

- `V449.1` 已完成：范围冻结到 `lookup-game-mode damageContext` 的剩余 raw field contract
- `V449.2` 已完成：`damageContext` 相关字段已统一复用显式 alias
