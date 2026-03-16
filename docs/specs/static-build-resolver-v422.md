# 静态构筑解析系统 V422

## 目标

`V422` 只解决一件事：

- 把 `cleaned encounter` helper 与返回类型里剩余的匿名 match/text list contract 统一收口为显式 alias。

## 范围

1. `EncounterMatchList<TEncounter>`
2. `EncounterCandidateList` 在 helper 内部的直接复用
3. `EncounterWeaknessList`
4. `EncounterResistanceList`

## 非目标

1. 不改 `selectEncounterByEnemyName()` 的匹配逻辑
2. 不改 `buildEncounterDamageContext()` 的字段语义
3. 不改 build resolver、matrix 或 agent tool contract

## 当前状态

- `V422.1` 已完成：范围冻结到 encounter helper 剩余 list contract
- `V422.2` 已完成：match、候选名、弱点与抗性列表已统一复用显式 alias
