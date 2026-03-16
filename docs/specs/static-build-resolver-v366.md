# 静态构筑解析系统 V366：agent execution context contracts

## 背景

`packages/zzz-agent/src/mastra/tools/zzz/resolve-build-execution.ts` 的执行上下文里，`utilityOnly` 和 `supportedUtilityWEngineNames` 等字段仍直接使用匿名 `boolean` / `string[]`。

这些字段会继续透传给高层 tool，属于 `zzz-agent` 的公开 helper contract。

## 目标

`V366` 只解决一件事：

- 把 `resolve-build-execution.ts` 的公开 execution context 字段改为复用 `resolve-build-contracts.ts` 的显式 alias。

## 范围

1. `BuildToolResolvedSourceUtilityExecutionContext`
2. `BuildToolResolvedSourceEntriesExecutionContext`
3. `supportedUtilityWEngineNames`
4. `supportedUtilityWEngines`
5. `utilityOnly`

## 非目标

1. 不改 execution helper 的分支逻辑
2. 不改 source-entry context gating
3. 不改 `resolve-build-loadout.ts` 的返回结构

## 完成标准

1. `resolve-build-execution.ts` 的公开 execution context 不再直接暴露匿名 `boolean` / `string[]`
2. 和 `resolve-build-contracts.ts` 的公共 alias 对齐
3. 全量校验通过
