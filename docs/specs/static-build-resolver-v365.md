# 静态构筑解析系统 V365：agent response helper option contracts

## 背景

在 `resolve-build-contracts.ts` 完成公共 alias 之后，`packages/zzz-agent/src/mastra/tools/zzz/resolve-build-responses.ts` 里的 helper option 与 builder 参数仍保留匿名 `string` / `string[]` / `boolean`。

如果这一层不跟进，公共 alias 只能停留在 response shape，不能真正约束 helper 输入。

## 目标

`V365` 只解决一件事：

- 把 `resolve-build-responses.ts` 的公开 option 与 builder 参数统一改为复用 `resolve-build-contracts.ts` 的显式 alias。

## 范围

1. `BuildToolResolveSourceUtilityCoverageResponseOptions`
2. `BuildToolResolveSourceDamageCoverageResponseOptions`
3. `BuildToolResolveSourceEntryCoverageResponseOptions`
4. `buildUnsupported*Response()` 系列参数
5. `buildUncovered*Response()` 系列参数
6. `buildUnsupportedAnomalyTypeResponse()`
7. `buildUnsupportedDamageTypeResponse()`

## 非目标

1. 不改 response builder 的返回结构
2. 不改 candidates / supported list 的生成逻辑
3. 不改高层 tool 行为

## 完成标准

1. `resolve-build-responses.ts` 的公开 option 与 helper 参数不再直接暴露匿名 `string` / `string[]` / `boolean`
2. 文件内只复用公共 alias，不复制一套新 primitive contract
3. 全量校验通过
