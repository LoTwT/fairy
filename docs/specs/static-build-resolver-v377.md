# 静态构筑解析系统 V377：game-mode lookup helper contracts

## 背景

`packages/zzz-agent/src/mastra/tools/zzz/lookup-game-mode.ts` 里仍有一组本地 helper 使用匿名 contract：

- `attributeInput: string | undefined`
- `toEncounterCandidate()` 的内联返回 shape
- `toLookupDamageContext()` 的内联返回 shape
- `recommendedDefenderResistance` 的裸数值字段

这让 game-mode lookup 层仍保留一段未显式化的 helper output。

## 目标

`V377` 只解决一件事：

- 把 `lookup-game-mode.ts` 的 attribute 输入、encounter candidate 与 damageContext 输出统一改成显式 alias / interface。

## 范围

1. `LookupGameModeAttributeInput`
2. `LookupGameModeEncounterCandidateName`
3. `LookupGameModeEncounterNode`
4. `LookupGameModeEncounterSide`
5. `LookupGameModeEncounterWave`
6. `LookupGameModeEncounterCandidate`
7. `LookupGameModeRecommendedResistance`
8. `LookupGameModeDamageContext`
9. `toLookupDamageContext()`
10. `toEncounterCandidate()`

## 非目标

1. 不改 DA/SD/TS 查询逻辑
2. 不改敌人定位或 damageContext 生成逻辑
3. 不改 tool 返回字段语义

## 完成标准

1. `lookup-game-mode.ts` 不再暴露匿名 attribute / candidate / damageContext helper contract
2. `lookup-game-mode` 测试、agent 测试与构建保持通过
3. roadmap、索引与架构文档同步
