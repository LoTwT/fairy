# 静态构筑解析系统 V493

## 目标

`V493` 只解决一件事：

- 把 `zzz-agent` `resolve-build-schemas.ts` 中 `scenarioSkillMultiplier / scenarioDamageMultiplier` 共享的 `number|string` scalar schema 收口为共享 schema 常量。

## 范围

1. `scenarioMultiplierNumberSchema`
2. `scenarioMultiplierTextSchema`
3. `scenarioSkillMultiplierSchema`
4. `scenarioDamageMultiplierSchema`

## 非目标

1. 不改任何字段的值域、默认值或校验规则
2. 不改任何 union 结构或序列化结构
3. 不改 resolver 或 tool 行为

## 当前状态

- `V493.1` 已完成：范围冻结到 `scenario` multiplier 的共享 scalar schema
- `V493.2` 已完成：两个 multiplier union 已统一复用共享 scalar schema 常量
