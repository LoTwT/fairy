# 静态构筑解析系统 V482

## 目标

`V482` 只解决一件事：

- 把 `zzz-agent` `resolve-build-schemas.ts` 中重复出现的顶层输入 scalar schema 收口为共享 schema 常量。

## 范围

1. `agentIdentifierSchema`
2. `wEngineIdentifierSchema`
3. `coreSkillLevelSchema`
4. `wEngineRefinementSchema`
5. `agentLevelSchema`
6. `agentMindscapeSchema`
7. `buildModeSchema`
8. `manualBaseModeSchema`
9. `resolveBuild*InputSchema` 中对应字段

## 非目标

1. 不改任何字段的值域、默认值或校验规则
2. 不改任何序列化结构
3. 不改 resolver 或 tool 行为

## 当前状态

- `V482.1` 已完成：范围冻结到顶层输入 scalar schema
- `V482.2` 已完成：相关字段已统一复用共享 schema 常量
