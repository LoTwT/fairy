# 静态构筑解析系统 V484

## 目标

`V484` 只解决一件事：

- 把 `zzz-agent` `resolve-build-schemas.ts` 中 `finalPanelSchema` 的重复 scalar schema 收口为共享 schema 常量。

## 范围

1. `finalPanelAttackSchema`
2. `finalPanelBaseAttackSchema`
3. `finalPanelCritRateSchema`
4. `finalPanelCritDamageSchema`
5. `finalPanelHPSchema`
6. `finalPanelSheerForceSchema`
7. `finalPanelEnergyGenerationRateSchema`
8. `finalPanelAnomalyProficiencySchema`
9. `finalPanelAnomalyMasterySchema`
10. `finalPanelAnomalyCritRateSchema`
11. `finalPanelAnomalyCritDamageSchema`
12. `finalPanelPenetrationRateSchema`
13. `finalPanelPenetrationValueSchema`
14. `finalPanelSchema` 中对应字段

## 非目标

1. 不改任何字段的值域、默认值或校验规则
2. 不改任何序列化结构
3. 不改 resolver 或 tool 行为

## 当前状态

- `V484.1` 已完成：范围冻结到 `finalPanelSchema` 的共享 scalar schema
- `V484.2` 已完成：相关字段已统一复用共享 schema 常量
