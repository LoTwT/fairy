# 静态构筑解析系统 V470

## 目标

`V470` 只解决一件事：

- 把 `cleaned/types.ts` 中 encounter / DA buff 视图的文本字段统一对齐到 `game-modes` 上游 alias。

## 范围

1. `EncounterWeakness`
2. `EncounterResistance`
3. `EncounterDamageContext.mechanics`
4. `DABuffViewName`
5. `DABuffView.key / effect / iconUrl`

## 非目标

1. 不改任何 `cleaned` helper 的返回内容
2. 不改弱点、抗性、机制文案或 buff 文案的值
3. 不改 `ElementMultiplierMap`、敌人筛选或视图分组逻辑

## 当前状态

- `V470.1` 已完成：范围冻结到 `cleaned/types.ts` 的 encounter / DA buff 文本字段 contract
- `V470.2` 已完成：相关文本字段已统一复用上游 `game-modes` alias
