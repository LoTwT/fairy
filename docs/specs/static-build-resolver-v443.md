# 静态构筑解析系统 V443

## 目标

`V443` 只解决一件事：

- 把 `lookup-agent.ts` 中技能数值列表的匿名文本数组收口为显式 alias。

## 范围

1. `LookupAgentSkillStatValueText`
2. `LookupAgentSkillStatValueList`

## 非目标

1. 不改 `lookup-agent` 的查询、筛选或技能裁剪逻辑
2. 不改 `skills[*].stats[*].values` 的文本内容或顺序
3. 不改其他 `lookup-*` 工具的 raw contract

## 当前状态

- `V443.1` 已完成：范围冻结到 `lookup-agent` 的技能数值文本列表 contract
- `V443.2` 已完成：`LookupAgentSkillStatValueList` 已统一复用显式文本 alias
