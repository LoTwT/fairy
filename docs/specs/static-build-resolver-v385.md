# 静态构筑解析系统 V385：game-modes raw field contracts

## 背景

`packages/zzz-data/src/game-modes.ts` 描述的是公开发布的：

- `buffs.json`
- `deadly-assault.json`
- `shiyu-defense.json`
- `threshold-simulation.json`

这些 raw published interface 仍直接暴露一批匿名字段 contract：

- `string`
- `number`
- `string[]`

虽然语义已经通过注释固定，但类型层还没有把这些 raw field 统一收成显式 alias。

## 目标

`V385` 只解决一件事：

- 把 `game-modes.ts` raw published interface 的公开字段统一改成显式 alias / list alias。

## 范围

1. `GameModeEnemyId`
2. `GameModeEnemyName`
3. `GameModeImageSlug`
4. `GameModeStunMultiplier`
5. `GameModeStunTime`
6. `GameModeEnemyHP`
7. `GameModeEnemyDefense`
8. `GameModeEnemyDaze`
9. `GameModeBuffName`
10. `GameModeBuffKey`
11. `GameModeBuffIconUrl`
12. `GameModeBuffEffect`
13. `GameModeBuffEffectList`
14. `GameModeAttributeText`
15. `GameModeAttributeTextList`
16. `GameModeMechanicsText`
17. `GameModeEnemyCount`
18. `GameModeEnemyHPMult`
19. `GameModeBossHPMult`
20. `GameModeNodeLevel`
21. `GameModeHP60k`
22. `GameModeAltHP`
23. `GameModeVersionKey`
24. `GameModeVersionName`
25. `GameModeVersionTime`
26. `GameModeVersionDazeMultiplier`
27. `GameModeVersionAnomalyMultiplier`
28. `GameModeModeName`
29. `GameModeBuffNameList`
30. `EnemyBase`
31. `BuffItem`
32. `DABuff`
33. `DAEnemyItem`
34. `DAVersionItem`
35. `SDEnemyItem`
36. `SDSideItem`
37. `SDNodeItem`
38. `SDVersionItem`
39. `SDModeItem`
40. `TSBossEnemyItem`
41. `TSRegularEnemyItem`
42. `TSBossSideItem`
43. `TSRegularSideItem`
44. `TSNodeItem`
45. `TSVersionItem`
46. `TSModeItem`

## 非目标

1. 不改任何 published JSON shape
2. 不改 `cleaned` helper 的消费语义
3. 不改 `game-modes` 上层 lookup 或 resolver 逻辑

## 完成标准

1. `game-modes.ts` raw published interface 不再直接暴露这批匿名 field contract
2. 现有 `game-modes`、`cleaned`、agent 测试与构建保持通过
3. roadmap、索引与架构文档同步
