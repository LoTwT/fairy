# 静态构筑解析系统 V456

## 目标

`V456` 只解决一件事：

- 把 `lookup-game-mode.ts` 中 `damageContext` 的最后几项 leaf alias 从 `EncounterDamageContext[...]` 收口为显式标量 contract。

## 范围

1. `LookupGameModeWeakness`
2. `LookupGameModeResistance`
3. `LookupGameModeMechanicsText`
4. `LookupGameModeDamageContextNode`
5. `LookupGameModeDamageContextSide`
6. `LookupGameModeDamageContextWave`
7. `LookupGameModeSideElementMultiplier`

## 非目标

1. 不改 `lookup-game-mode` 的版本查询、敌人选择或 `damageContext` 计算逻辑
2. 不改任何返回字段的值、顺序或可选性
3. 不改 `damageContext` 的字段集合

## 当前状态

- `V456.1` 已完成：范围冻结到 `lookup-game-mode damageContext` 的 leaf scalar contract
- `V456.2` 已完成：相关字段已统一复用显式标量 alias
