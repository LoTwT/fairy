# 静态构筑解析系统 V371：agent damage-type helper contracts

## 背景

`packages/zzz-agent/src/mastra/tools/zzz/resolve-build-scenario.ts` 的 `resolveBuildToolDamageType()` 仍用 `TDamageType extends string` 作为公开 helper generic 边界。

这会让 helper-level contract 回退到匿名文本，而不是复用已经存在的 `BuildToolDamageTypeValue`。

## 目标

`V371` 只解决一件事：

- 把 `resolveBuildToolDamageType()` 的公开 generic 边界收紧到 `BuildToolDamageTypeValue`。

## 范围

1. `resolveBuildToolDamageType()`
2. `TDamageType`

## 非目标

1. 不改 damage type 校验逻辑
2. 不改 response 结构
3. 不改 scenario 解析逻辑

## 完成标准

1. `resolveBuildToolDamageType()` 不再暴露匿名 `string` generic 边界
2. 与 agent damage-type contract 对齐
3. 全量校验通过
