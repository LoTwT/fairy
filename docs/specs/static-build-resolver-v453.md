# 静态构筑解析系统 V453

## 目标

`V453` 只解决一件事：

- 把 `lookup-agent.ts` 中仍直接复用 `AgentListItem` / `AgentDetails` raw indexed-access 的基础标量 contract 收口为显式或命名上游 type。

## 范围

1. `LookupAgentId`
2. `LookupAgentName`
3. `LookupAgentRarity`
4. `LookupAgentSpecialty`
5. `LookupAgentAttribute`
6. `LookupAgentAttackType`
7. `LookupAgentStatBoostStatId`
8. `LookupAgentStatBoostValue`
9. `LookupAgentPromotionValue`
10. `LookupAgentPromotionMaxLevel`
11. `LookupAgentFullName`

## 非目标

1. 不改 `lookup-agent` 的查询、筛选、技能裁剪或计算逻辑
2. 不改任何返回字段的值、顺序或可选性
3. 不改 `skills / coreSkills / mindscapes / stats` 的更深层 nested contract

## 当前状态

- `V453.1` 已完成：范围冻结到 `lookup-agent` 的基础标量 raw contract
- `V453.2` 已完成：相关字段已统一复用显式或命名上游 type
