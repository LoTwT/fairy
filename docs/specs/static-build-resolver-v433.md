# 静态构筑解析系统 V433

## 目标

`V433` 只解决一件事：

- 把 `lookup-agent.ts` 的 trimmed result 中 `skills / coreSkills / mindscapes / stats` 的匿名嵌套 contract 统一收口为显式 alias / interface。

## 范围

1. `LookupAgentSkillDescriptionEntry`
2. `LookupAgentSkillStatEntry`
3. `LookupAgentSkillGroupEntry`
4. `LookupAgentCoreSkillEntry`
5. `LookupAgentMindscapeEntry`
6. `LookupAgentStatEntry`

## 非目标

1. 不改 `lookup-agent` 的返回字段集合
2. 不改技能过滤、文本裁剪或属性计算逻辑
3. 不改 `promotions` 与顶层 trimmed-result key contract

## 当前状态

- `V433.1` 已完成：范围冻结到 `lookup-agent` trimmed result 的匿名嵌套项 contract
- `V433.2` 已完成：`skills / coreSkills / mindscapes / stats` 已统一复用显式 alias / interface
