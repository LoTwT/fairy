# 静态构筑解析系统 V481

## 目标

`V481` 只解决一件事：

- 把 `zzz-agent` `resolve-build-schemas.ts` 中重复出现的 `combatTags` 列表 schema 收口为共享 schema 常量。

## 范围

1. `combatTagListSchema`
2. `resolveBuildScenarioSchema` 四个分支中的 `combatTags`
3. `resolveBuildSkillMatrixContextSchema.combatTags`

## 非目标

1. 不改 `combatTags` 的值域或校验规则
2. 不改任何序列化结构
3. 不改 resolver 或 tool 行为

## 当前状态

- `V481.1` 已完成：范围冻结到 `combatTags` 列表 schema
- `V481.2` 已完成：相关字段已统一复用共享 schema 常量
