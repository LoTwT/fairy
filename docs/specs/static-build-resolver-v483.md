# 静态构筑解析系统 V483

## 目标

`V483` 只解决一件事：

- 把 `zzz-agent` `resolve-build-schemas.ts` 中 `enemySchema` 的重复 scalar schema 收口为共享 schema 常量。

## 范围

1. `enemyAttackerLevelSchema`
2. `enemyDefenderBaseDefenseSchema`
3. `enemyDefenderResistanceSchema`
4. `enemyDefenseBonusSchema`
5. `enemyDefenseReductionSchema`
6. `enemyResistanceReductionSchema`
7. `enemyIgnoreResistanceSchema`
8. `enemyVulnerabilityBonusSchema`
9. `enemyDamageReductionSchema`
10. `enemyIsStunnedSchema`
11. `enemyStunVulnerabilitySchema`
12. `enemyNonStunVulnerabilitySchema`
13. `enemySpecialMultiplierSchema`
14. `enemySchema` 中对应字段

## 非目标

1. 不改任何字段的值域、默认值或校验规则
2. 不改任何序列化结构
3. 不改 resolver 或 tool 行为

## 当前状态

- `V483.1` 已完成：范围冻结到 `enemySchema` 的共享 scalar schema
- `V483.2` 已完成：相关字段已统一复用共享 schema 常量
