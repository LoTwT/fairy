# 静态构筑解析系统 V375：agent catalog helper score contracts

## 背景

`packages/zzz-agent/src/mastra/tools/zzz/resolve-build-catalog.ts` 里 catalog helper 仍保留一组匿名 field-list / score shape：

- `getCatalogFields(item): string[]`
- `const scored: Array<{ item: T; score: number }>`
- `bestScore` / `score` 的裸 `number`

这让 agent catalog helper 在前面已经显式化的 response/loadout/schema/utils 之后，仍留下一个局部的文本与分数 contract 漏口。

## 目标

`V375` 只解决一件事：

- 把 `resolve-build-catalog.ts` 的 field-list 与候选分数 contract 统一改成显式 alias / interface。

## 范围

1. `BuildToolCatalogFieldValue`
2. `BuildToolCatalogFieldList`
3. `BuildToolCatalogCandidateScore`
4. `BuildToolScoredCatalogCandidate<T>`
5. `BuildToolScoredCatalogCandidateList<T>`
6. `getCatalogFields()`
7. `findCatalogItem()`
8. `findCatalogCandidates()`

## 非目标

1. 不改 catalog 匹配算法
2. 不改 candidate 排序或阈值
3. 不改任何 response builder 行为

## 完成标准

1. `resolve-build-catalog.ts` 不再暴露匿名 field-list 或 score shape
2. catalog helper 测试、agent 测试与构建保持通过
3. roadmap、索引与架构文档同步
