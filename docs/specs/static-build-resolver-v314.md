# 静态构筑解析系统 V314

## 目标

`V314` 只解决一件事：

- 为 `compact.ts` 中剩余的 build scalar、count、matrix metadata scalar/text contract 补显式 compact alias，并完成当前 `compact` 公开 contract 的 raw `number/string` 收口

## 范围

1. `CompactStaticBuildAgentLevel`
2. `CompactStaticBuildAgentMindscape`
3. `CompactStaticBuildCoreSkillLevel`
4. `CompactStaticBuildWEngineRefinement`
5. `CompactStaticBuildAttackPercent`
6. `CompactStaticBuildFlatAttack`
7. `CompactStaticBuildBonusDamageSum`
8. `CompactStaticBuildAnomalyMastery`
9. `CompactStaticBuildAnomalyProficiency`
10. `CompactStaticBuildAnomalyBonusDamageSum`
11. `CompactStaticBuildAnomalyCritRate`
12. `CompactStaticBuildAnomalyCritDamage`
13. `CompactStaticBuildSkillMultiplierFactor`
14. `CompactStaticBuildDefenderBaseDefense`
15. `CompactStaticBuildDefenderResistance`
16. `CompactStaticBuildDefenseBonus`
17. `CompactStaticBuildSpecialMultiplier`
18. `CompactStaticBuildExpectedTotal`
19. `CompactStaticBuildCriticalTotal`
20. `CompactStaticBuildNonCriticalTotal`
21. `CompactStaticBuildDamageResultTotal`
22. `CompactStaticBuildRequirementCount`
23. `CompactStaticBuildDiagnosticCount`
24. `CompactStaticBuildSourceNoteCount`
25. `CompactStaticBuildAssumptionCount`
26. `CompactStaticBuildUnsupportedEffectCount`
27. `CompactStaticBuildGroupCount`
28. `CompactStaticBuildSupportedCount`
29. `CompactStaticBuildUnsupportedCount`
30. `CompactStaticBuildEntryCount`
31. `CompactStaticBuildStandaloneCount`
32. `CompactStaticBuildDeltaCount`
33. `CompactStaticBuildTriggerCount`
34. `CompactStaticBuildRateCount`
35. `CompactStaticBuildSourceDamageViewCount`
36. `CompactStaticBuildSourceUtilityViewCount`
37. `CompactStaticBuildRowCount`
38. `CompactStaticBuildMainFormulaCount`
39. `CompactStaticBuildSourceViewCount`
40. `CompactStaticBuildAppliedEntryCount`
41. `CompactStaticBuildTotalEntryCount`
42. `CompactStaticBuildAppliedRowCount`
43. `CompactStaticBuildTotalRowCount`
44. `CompactStaticBuildStackCount`
45. `CompactStaticBuildOrder`
46. `CompactStaticBuildSourceSkillTypeId`
47. `CompactStaticBuildSourceOccurrence`
48. `CompactStaticBuildSegmentIndex`
49. `CompactStaticBuildActionName`
50. `CompactStaticBuildSkillName`
51. `CompactStaticBuildSkillMultiplierText`

## 非目标

1. 不修改 compact helper 的运行时行为
2. 不调整 `zzz-agent` tool 的输入输出 shape
3. 不处理 `boolean` flag 的进一步语义收口

## 结果

完成后：

- `compact.ts` 公开 contract 中不再残留匿名 `number` / `string` 字段
- 当前 `compact` 主线的 raw scalar/text 泄漏在既有范围内完成收口
