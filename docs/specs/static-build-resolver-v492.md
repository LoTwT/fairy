# 静态构筑解析系统 V492

## 目标

`V492` 只解决一件事：

- 把 `zzz-agent` `resolve-build-schemas.ts` 中 `scenario.damageType` 的 branch literal schema 收口为共享 schema 常量。

## 范围

1. `normalDamageTypeSchema`
2. `sheerDamageTypeSchema`
3. `anomalyDamageTypeSchema`
4. `disorderDamageTypeSchema`
5. `resolveBuildScenarioSchema` 四个分支中的 `damageType`

## 非目标

1. 不改任何字段的值域、默认值或校验规则
2. 不改任何分支结构或序列化结构
3. 不改 resolver 或 tool 行为

## 当前状态

- `V492.1` 已完成：范围冻结到 `scenario.damageType` 的 branch literal schema
- `V492.2` 已完成：`resolveBuildScenarioSchema` 四个分支已统一复用共享 literal schema 常量
