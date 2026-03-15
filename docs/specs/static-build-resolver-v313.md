# 静态构筑解析系统 V313

## 目标

`V313` 只解决一件事：

- 为 `compact.ts` 中 `skill-matrix` 与 `source-utility-view` 剩余最大的匿名 scalar/list contract 补显式 compact alias

## 范围

1. `CompactStaticBuildBucketValueMap`
2. `CompactStaticBuildVariableBucketList`
3. `CompactStaticBuildVariableFormulaMultiplierList`
4. `CompactStaticBuildAttack`
5. `CompactStaticBuildHP`
6. `CompactStaticBuildCritRate`
7. `CompactStaticBuildCritDamage`
8. `CompactStaticBuildPenetrationRate`
9. `CompactStaticBuildPenetrationValue`
10. `CompactStaticBuildBaseDamageValue`
11. `CompactStaticBuildSourceStatId`
12. `CompactStaticBuildSourceStatName`
13. `CompactStaticBuildSegmentLabel`
14. `CompactStaticBuildUtilityValue`
15. `CompactStaticBuildCooldownSeconds`
16. `CompactStaticBuildTriggerLabel`
17. `CompactStaticBuildConditionLabel`

## 非目标

1. 不处理 `sheerForce` 的 compact scalar alias
2. 不处理 `order / sourceOccurrence / segmentIndex`
3. 不处理 compact helper 的运行时逻辑

## 结果

完成后：

- `skill-matrix row meta / group summary / summary`
- `source-utility-view entry / entry summary`

将不再继续直接暴露这批匿名 scalar/list contract。
