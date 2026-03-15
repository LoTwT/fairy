# 静态构筑解析系统 V349：agent catalog helper text contracts

## 背景

`zzz-data` 根入口的公开 helper contract 已基本收口，下一条最小缺口落在 `zzz-agent` 的 build-resolver 适配层：

- [resolve-build-catalog.ts](/Users/caoyujie/codes/zzz-data/packages/zzz-agent/src/mastra/tools/zzz/resolve-build-catalog.ts)

这里的 catalog 归一化与候选匹配 helper 仍直接使用裸 `string`：

1. `normalizeCatalogValue(value: string)`
2. `findCatalogItem(items, query: string)`
3. `findCatalogCandidates(items, query: string)`
4. `catalogNames(items)` / `candidateNames(items, query)`

## 目标

`V349` 只解决一件事：

- 给 `zzz-agent` 的 catalog helper 文本 contract 补显式公开 alias，不改变任何匹配逻辑。

## 范围

1. `BuildToolCatalogValue`
2. `BuildToolNormalizedCatalogValue`
3. `BuildToolCatalogName`
4. `BuildToolCatalogNameList`
5. `CatalogItem.name / aliases`
6. `normalizeCatalogValue()`
7. `findCatalogItem()`
8. `findCatalogCandidates()`
9. `catalogNames()` / `candidateNames()`

## 非目标

1. 不调整 fuzzy match 规则
2. 不改变候选排序阈值
3. 不修改高层 tool schema

## 完成标准

1. 上述 helper 不再以裸 `string` 暴露 catalog 文本 contract
2. 运行时匹配结果不变
3. 全量校验通过
