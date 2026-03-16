# 静态构筑解析系统 V367：agent loadout helper contracts

## 背景

`packages/zzz-agent/src/mastra/tools/zzz/resolve-build-loadout.ts` 仍直接暴露 `agentQuery: string`、`wEngineQuery?: string`、`names: string[]`、`driveDiscs[].name: string` 这类 helper-level contract。

这层正好位于高层 tool 和 `zzz-data` loadout 输入之间，继续使用匿名 primitive 会让后面的 schema / scenario contract 很难统一。

## 目标

`V367` 只解决一件事：

- 把 `resolve-build-loadout.ts` 的公开 query/id/name/list/flag 字段统一改为复用 agent 公共 alias。

## 范围

1. `BuildToolDriveDiscInput`
2. `BuildToolLoadoutInputOptions`
3. `BuildToolSourceUtilitySupport`
4. `BuildToolResolveLoadoutContextOptions`
5. `BuildToolResolveSourceEntriesLoadoutContextOptions`
6. `resolveBuildToolAgent()`
7. `resolveBuildToolWEngine()`
8. `resolveBuildToolDriveDiscSets()`

## 非目标

1. 不改 loadout 解析逻辑
2. 不改 drive-disc 匹配逻辑
3. 不改 `StaticBuildLoadoutInput` 本身

## 完成标准

1. `resolve-build-loadout.ts` 的公开 query/id/name/list/flag 字段不再直接暴露匿名 primitive
2. 新增的 drive-disc 输入 contract 可被其他 helper 复用
3. 全量校验通过
