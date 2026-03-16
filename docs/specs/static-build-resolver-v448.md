# 静态构筑解析系统 V448

## 目标

`V448` 只解决一件事：

- 把 `lookup-agent.ts` 中 `promotions` 与 `coreSkills[*].statBoosts` 的 raw progression contract 收口为显式 interface。

## 范围

1. `LookupAgentStatBoostStatId`
2. `LookupAgentStatBoostValue`
3. `LookupAgentStatBoostEntry`
4. `LookupAgentStatBoostEntryList`
5. `LookupAgentPromotionValue`
6. `LookupAgentPromotionMaxLevel`
7. `LookupAgentPromotionEntry`
8. `LookupAgentPromotionList`

## 非目标

1. 不改 `lookup-agent` 的查询、筛选或技能裁剪逻辑
2. 不改 `promotions` 与 `statBoosts` 的值、顺序或来源
3. 不改 `skills / mindscapes / stats` 等其他 nested contract

## 当前状态

- `V448.1` 已完成：范围冻结到 `lookup-agent` 的 progression raw contract
- `V448.2` 已完成：`promotions` 与 `coreSkills[*].statBoosts` 已统一复用显式 interface
