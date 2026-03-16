# 静态构筑解析系统 V364：agent response contract aliases

## 背景

`packages/zzz-agent/src/mastra/tools/zzz/resolve-build-contracts.ts` 仍直接暴露 `message: string`、`supportedWEngines: string[]`、`candidates: string[]` 这类响应字段。

这些字段已经是 `zzz-agent` 的公开工具 contract，继续裸露 primitive/list 会让后续的 helper 和 response builder 难以稳定复用。

## 目标

`V364` 只解决一件事：

- 给 `resolve-build-contracts.ts` 里的公共 response text/list/id/flag 字段补显式 alias，不改变任何响应语义。

## 范围

1. `BuildToolCatalogId`
2. `BuildToolResponseMessageText`
3. `BuildToolSupportedCatalogNameList`
4. `BuildToolCandidateCatalogNameList`
5. `BuildToolSupportedAnomalyTypeList`
6. `BuildToolSupportedDamageTypeList`
7. `BuildToolSourceEntryUtilityOnlyFlag`
8. `resolve-build-contracts.ts` 中的 response interfaces

## 非目标

1. 不改 tool 的运行时分支
2. 不改 message 文案
3. 不改 lookup / resolver 逻辑

## 完成标准

1. `resolve-build-contracts.ts` 的公共 response 字段不再直接暴露匿名 `string` / `string[]` / `boolean`
2. 现有 response builder 与调用方可以直接复用这些 alias
3. 全量校验通过
