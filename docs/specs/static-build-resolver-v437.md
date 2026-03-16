# 静态构筑解析系统 V437

## 目标

`V437` 只解决一件事：

- 把 `lookup-agent.ts` 的顶层 trimmed result contract 从泛型 `Record` 收口为显式 interface。

## 范围

1. `LookupAgentPromotionList`
2. `LookupAgentFullName`
3. `LookupAgentOptionalRarity`
4. `LookupAgentOptionalSpecialty`
5. `LookupAgentOptionalAttributeList`
6. `LookupAgentOptionalAttackTypeList`
7. `LookupAgentTrimmedResult`

## 非目标

1. 不改 `lookup-agent` 的返回字段集合
2. 不改代理人查询、筛选、模糊匹配、技能过滤或属性计算逻辑
3. 不改 `skills / coreSkills / mindscapes / stats / promotions` 的字段语义

## 当前状态

- `V437.1` 已完成：范围冻结到 `lookup-agent` 的顶层 trimmed result contract
- `V437.2` 已完成：`agent` 顶层返回值已统一复用显式 interface
