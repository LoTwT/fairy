# 静态构筑解析系统 V374：agent scorer match contracts

## 背景

`packages/zzz-agent/src/mastra/scorers/zzz-scorer.ts` 里输出格式评分 helper 仍暴露一组匿名 primitive：

- `ZzzAgentOutputFormatMatch.matched: boolean`
- `getOutputFormatMatches(): ZzzAgentOutputFormatMatch[]`
- `scoreOutputFormat(): number`
- `found: string[]`
- `missing: string[]`

这会让 agent scorer 的公开 helper contract 相比前面已经显式化的 response/schema/loadout/utils 仍残留一段未收口的 flag/list/score shape。

## 目标

`V374` 只解决一件事：

- 把 `zzz-scorer.ts` 中输出格式评分 helper 的匹配 flag、section list 和 score contract 统一改成显式 alias。

## 范围

1. `ZzzAgentOutputFormatMatchedFlag`
2. `ZzzAgentOutputFormatSectionNameList`
3. `ZzzAgentOutputFormatMatchList`
4. `ZzzAgentOutputFormatScore`
5. `ZzzAgentOutputFormatMatch`
6. `getOutputFormatMatches()`
7. `scoreOutputFormat()`

## 非目标

1. 不改 output-format 评分逻辑
2. 不改 `multiplierAccuracyScorer`
3. 不改任何 judge prompt 或 zod schema

## 完成标准

1. `zzz-scorer.ts` 不再暴露匿名匹配 flag、section list 或 score contract
2. scorer 测试与构建保持通过
3. roadmap、索引与架构文档同步
