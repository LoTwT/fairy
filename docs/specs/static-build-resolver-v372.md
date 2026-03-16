# 静态构筑解析系统 V372：agent catalog specialty contracts

## 背景

`packages/zzz-agent/src/mastra/tools/zzz/resolve-build-contracts.ts` 里的 `CatalogItem<TSpecialty extends string = string>` 仍把 specialty generic 暴露为匿名 `string`。

这会让 catalog 基础 contract 和前面已经显式化的 response/loadout/schema contract 之间出现一个残留 primitive 漏口。

## 目标

`V372` 只解决一件事：

- 给 `CatalogItem` 的 specialty generic 补显式 alias 边界。

## 范围

1. `BuildToolCatalogSpecialtyValue`
2. `CatalogItem<TSpecialty>`

## 非目标

1. 不改 catalog 结构
2. 不改 `SpecialtyCatalogItem`
3. 不改 lookup / resolver 行为

## 完成标准

1. `CatalogItem` 不再暴露匿名 `string` specialty generic
2. 与 agent catalog contract 对齐
3. 全量校验通过
