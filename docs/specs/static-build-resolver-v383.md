# 静态构筑解析系统 V383：gachabase stat helper contracts

## 背景

`packages/zzz-data/src/gachabase/agent.ts`、`bangboo.ts`、`w-engine.ts` 暴露的公式 helper 仍直接使用一组裸 `number` 输入输出：

- `calcAgentStat()`
- `calcBangbooStat()`
- `calcWEngineBaseATK()`
- `calcWEngineSecondaryStat()`

这让 `gachabase` 公开 helper 相比 `calculator / cleaned / build` 已经收口的显式标量 contract，仍留有一段局部匿名 scalar shape。

## 目标

`V383` 只解决一件事：

- 把 `gachabase` 公式 helper 的输入输出统一改成显式标量 alias。

## 范围

1. `AgentBaseStatValue`
2. `AgentStatGrowthPerLevel`
3. `AgentLevel`
4. `AgentPromotionBoost`
5. `AgentCoreSkillBoost`
6. `AgentCalculatedStatValue`
7. `BangbooBaseStatValue`
8. `BangbooStatGrowthPerLevel`
9. `BangbooLevel`
10. `BangbooOptimizationBoost`
11. `BangbooCalculatedStatValue`
12. `WEngineBaseATKValue`
13. `WEngineLevelBaseStatGrowth`
14. `WEngineStarBaseStatGrowth`
15. `WEngineCalculatedBaseATK`
16. `WEngineSecondaryBaseValue`
17. `WEngineStarAdvancedStatGrowth`
18. `WEngineCalculatedSecondaryStatValue`
19. `calcAgentStat()`
20. `calcBangbooStat()`
21. `calcWEngineBaseATK()`
22. `calcWEngineSecondaryStat()`

## 非目标

1. 不改任何计算公式
2. 不改公开 JSON contract
3. 不改调用方语义

## 完成标准

1. `gachabase` 公式 helper 不再暴露匿名 scalar input/output contract
2. 现有 `gachabase` 测试、agent 测试与构建保持通过
3. roadmap、索引与架构文档同步
