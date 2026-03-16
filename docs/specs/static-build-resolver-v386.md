# 静态构筑解析系统 V386：gachabase agent raw field contracts

## 背景

`packages/zzz-data/src/gachabase/types.ts` 里，代理人相关 published interface 仍保留一批匿名 raw field：

- shared `StatBoost` / `SplashArt`
- `agents.json`
- `agent-details.json`

这些 interface 已经是公开 contract，但字段层还直接暴露：

- `string`
- `number`
- `number | null`
- `string[]`
- 匿名内联对象

## 目标

`V386` 只解决一件事：

- 把 `gachabase/types.ts` 里代理人相关 raw published field 统一改成显式 alias / named interface。

## 范围

1. `GachabaseId`
2. `GachabaseSlug`
3. `GachabaseName`
4. `GachabaseUrl`
5. `GachabaseIcon`
6. `GachabaseRarity`
7. `GachabaseStatId`
8. `GachabaseStatValue`
9. `GachabaseStatName`
10. `GachabaseGrowthPerLevel`
11. `GachabaseLevel`
12. `GachabasePromotion`
13. `GachabaseMaxLevel`
14. `GachabaseGender`
15. `GachabaseHeight`
16. `GachabaseBirthday`
17. `GachabaseAssetPath`
18. `GachabaseStringValueList`
19. `StatBoost`
20. `SplashArt`
21. `AgentListItem`
22. `AgentStat`
23. `AgentPromotion`
24. `AgentSkillDescription`
25. `AgentSkillStat`
26. `AgentSkillGroup`
27. `CoreSkillLevel`
28. `AgentSkin`
29. `AgentMindscape`
30. `AgentPotentialVision`
31. `AgentFactionRef`
32. `AgentExclusiveWeaponRef`
33. `AgentDetailsAssets`
34. `AgentProfile`
35. `AgentDetails`

## 非目标

1. 不改 `w-engines.json`、`bangboo.json`、`drive-discs.json` 相关 contract
2. 不改公开 JSON shape
3. 不改任何 helper 计算逻辑

## 完成标准

1. `gachabase/types.ts` 里代理人相关 raw published interface 不再直接暴露这批匿名 field contract
2. `gachabase`、`cleaned`、agent 测试与构建保持通过
3. roadmap、索引与架构文档同步
