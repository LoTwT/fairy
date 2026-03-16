# 静态构筑解析系统 V376：agent lookup helper contracts

## 背景

`packages/zzz-agent/src/mastra/tools/zzz/lookup-agent.ts` 里仍保留一组本地 helper 的匿名 query/list/map contract：

- `findAgent(name: string, locale: string)`
- `normalizeSkillToken(value: string): string`
- `skillTypes?: string[]`
- `calculatedStats: Record<string, number>`
- `result: Record<string, unknown>`

这让 agent lookup 层在 catalog/utils/scorer 之后，仍有一段 helper contract 没有被显式化。

## 目标

`V376` 只解决一件事：

- 把 `lookup-agent.ts` 的 helper query、skill-type list、calculated-stat map 统一改成显式 alias。

## 范围

1. `LookupAgentQueryName`
2. `LookupAgentLocale`
3. `LookupAgentSkillTypeValue`
4. `LookupAgentSkillTypeList`
5. `LookupAgentCalculatedStatName`
6. `LookupAgentCalculatedStatValue`
7. `LookupAgentCalculatedStatMap`
8. `LookupAgentTrimmedResultValue`
9. `LookupAgentTrimmedResult`
10. `findAgent()`
11. `normalizeSkillToken()`
12. `trimAgent()`

## 非目标

1. 不改任何 lookup 行为
2. 不改 skill 过滤逻辑
3. 不改面板计算或返回字段语义

## 完成标准

1. `lookup-agent.ts` 不再暴露匿名 query/list/map helper contract
2. 现有 lookup 测试、agent 测试与构建保持通过
3. roadmap、索引与架构文档同步
