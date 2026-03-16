# 静态构筑解析系统 V432

## 目标

`V432` 只解决一件事：

- 把 `lookup-agent.ts` 中列表模式与未命中候选项的结果 contract 统一收口为显式 alias / interface。

## 范围

1. `LookupAgentId / Name / Rarity`
2. `LookupAgentSpecialty`
3. `LookupAgentAttributeList / LookupAgentAttackTypeList`
4. `LookupAgentListItemSummary`
5. `LookupAgentCandidate`

## 非目标

1. 不改 `lookup-agent` 的返回字段集合
2. 不改代理人查询、筛选、模糊匹配或属性计算逻辑
3. 不改 trimmed result 的既有字段与技能裁剪逻辑

## 当前状态

- `V432.1` 已完成：范围冻结到 `lookup-agent` 的匿名列表项/候选项 contract
- `V432.2` 已完成：列表项与候选项结果已统一复用显式 alias / interface
