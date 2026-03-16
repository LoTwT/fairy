# 静态构筑解析系统 V485

## 目标

`V485` 只解决一件事：

- 把 `zzz-agent` `resolve-build-schemas.ts` 中 `scenario/context` 的重复 scalar schema 收口为共享 schema 常量。

## 范围

1. `scenarioAttributeSchema`
2. `scenarioExtraAbilityActiveSchema`
3. `scenarioSkillMultiplierSchema`
4. `scenarioDamageMultiplierSchema`
5. `scenarioAnomalyTypeSchema`
6. `scenarioRemainingTimeSchema`
7. `resolveBuildScenarioSchema` 四个分支中的对应字段
8. `resolveBuildSkillMatrixContextSchema.attribute / extraAbilityActive`

## 非目标

1. 不改任何字段的值域、默认值或校验规则
2. 不改任何分支结构或序列化结构
3. 不改 resolver 或 tool 行为

## 当前状态

- `V485.1` 已完成：范围冻结到 `scenario/context` 的共享 scalar schema
- `V485.2` 已完成：相关字段已统一复用共享 schema 常量
