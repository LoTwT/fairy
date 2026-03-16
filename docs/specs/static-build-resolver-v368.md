# 静态构筑解析系统 V368：source-entry context flag contracts

## 背景

`packages/zzz-agent/src/mastra/tools/zzz/resolve-build-source-entry-context.ts` 的 `utilityOnly` 仍然直接暴露匿名 `boolean`。

这虽然只是一个小字段，但它会跨越 `source-entry context -> execution context -> response` 多层 helper，应该和前面已经显式化的 `sourceEntry` alias 保持一致。

## 目标

`V368` 只解决一件事：

- 把 `resolve-build-source-entry-context.ts` 的 `utilityOnly` 字段改为复用 `BuildToolSourceEntryUtilityOnlyFlag`。

## 范围

1. `BuildToolResolvedSourceEntriesContext`
2. `resolveBuildToolSourceEntriesContext()`

## 非目标

1. 不改 source-entry context 的 gating 逻辑
2. 不改 finalPanel 校验
3. 不改 scenario 解析

## 完成标准

1. `resolve-build-source-entry-context.ts` 的公开 `utilityOnly` 字段不再直接暴露匿名 `boolean`
2. 与 `resolve-build-contracts.ts` / `resolve-build-execution.ts` 保持同一 alias
3. 全量校验通过
