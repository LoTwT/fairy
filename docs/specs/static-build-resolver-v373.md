# 静态构筑解析系统 V373：agent utils helper contracts

## 背景

`packages/zzz-agent/src/mastra/tools/zzz/utils.ts` 里仍有一组公开 helper contract 直接暴露匿名 primitive：

- `zzzDataRoot: string`
- `createAliasLookup(groups: Record<string, string[]>)`
- `jsonCache: Map<string, unknown>`
- `findTopMatches(..., limit = 3)`
- `scored: { item: T; score: number }[]`

这会让 agent 公共工具层在 `response/loadout/schema/catalog` 之外继续保留一段未显式化的 helper contract。

## 目标

`V373` 只解决一件事：

- 把 `utils.ts` 中这组公开 helper 的路径、alias-group、缓存与匹配分数字段统一改成显式 alias / interface。

## 范围

1. `ZzzAgentPackageRootPath`
2. `ZzzAgentAliasGroupKey`
3. `ZzzAgentAliasValue`
4. `ZzzAgentAliasGroup`
5. `ZzzAgentAliasGroupMap`
6. `ZzzAgentAliasLookup`
7. `ZzzAgentJsonCacheValue`
8. `ZzzAgentJsonCache`
9. `ZzzAgentMatchScore`
10. `ZzzAgentScoredMatch<T>`
11. `ZzzAgentScoredMatchList<T>`
12. `ZzzAgentMatchLimit`
13. `createAliasLookup()`
14. `findTopMatches()`

## 非目标

1. 不改 alias 归一化逻辑
2. 不改 `findBestMatch()` / `findTopMatches()` 算法
3. 不改 `loadJson()` 的读盘与缓存行为

## 完成标准

1. `utils.ts` 不再暴露匿名路径、alias-map、缓存或匹配分数 contract
2. 既有测试与构建保持通过
3. roadmap、索引与架构文档同步
