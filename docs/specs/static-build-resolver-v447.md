# 静态构筑解析系统 V447

## 目标

`V447` 只解决一件事：

- 把 `lookup-agent.ts` 中 `attributes / attackTypes` 的 raw list contract 收口为显式 alias。

## 范围

1. `LookupAgentAttribute`
2. `LookupAgentAttributeList`
3. `LookupAgentAttackType`
4. `LookupAgentAttackTypeList`

## 非目标

1. 不改 `lookup-agent` 的查询、筛选或技能裁剪逻辑
2. 不改 `attributes / attackTypes` 的列表内容、顺序或来源
3. 不改 `promotions / statBoosts` 等其他 raw contract

## 当前状态

- `V447.1` 已完成：范围冻结到 `lookup-agent` 的 display list contract
- `V447.2` 已完成：`attributes / attackTypes` 已统一复用显式 alias
