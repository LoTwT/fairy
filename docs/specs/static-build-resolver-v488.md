# 静态构筑解析系统 V488

## 目标

`V488` 只解决一件事：

- 把 `zzz-agent` `resolve-build-schemas.ts` 中 `resolvedSnapshot` 的 delta/factor leaf scalar schema 收口为共享 schema 常量。

## 范围

1. `resolvedSnapshotBonusDamageSumSchema`
2. `resolvedSnapshotDefenseReductionSchema`
3. `resolvedSnapshotPenetrationRateSchema`
4. `resolvedSnapshotResistanceReductionSchema`
5. `resolvedSnapshotIgnoreResistanceSchema`
6. `resolvedSnapshotSheerBonusSumSchema`
7. `resolvedSnapshotAnomalyProficiencySchema`
8. `resolvedSnapshotAnomalyBonusDamageSumSchema`
9. `resolvedSnapshotAnomalyCritRateSchema`
10. `resolvedSnapshotAnomalyCritDamageSchema`
11. `resolvedSnapshotSkillMultiplierFactorSchema`
12. `resolvedSnapshotBucketDeltasSchema / MultiplierFactorsSchema` 中对应字段

## 非目标

1. 不改任何字段的值域、默认值或校验规则
2. 不改任何对象结构或序列化结构
3. 不改 resolver 或 tool 行为

## 当前状态

- `V488.1` 已完成：范围冻结到 `resolvedSnapshot` 的 leaf scalar schema
- `V488.2` 已完成：相关字段已统一复用共享 schema 常量
