# 静态构筑解析系统 V396：buhflipexplode buff text contracts

## 背景

`packages/zzz-data/src/buhflipexplode/index.ts` 的 raw contract 里，`buffName / buffDesc / buffNames` 仍直接暴露 `string | string[] / string[]`。

## 目标

`V396` 只解决一件事：

- 把 `buhflipexplode` 的 buff 文本 contract 统一改成显式 alias。

## 范围

1. `BuhflipBuffText`
2. `BuhflipBuffTextList`
3. `BuhflipBuffTextValue`
4. `SDNode.buffName`
5. `SDNode.buffDesc`
6. `SDVersionData.buffName`
7. `SDVersionData.buffDesc`
8. `DAVersionData.buffNames`
9. `TSNode.buffNames`

## 非目标

1. 不改任何 raw/published JSON shape
2. 不改 buff 的上层 cleaned/helper 语义
3. 不改 element multiplier 或 desc/perf pair contract

## 完成标准

1. `buhflipexplode/index.ts` 不再直接暴露 `string | string[] / string[]` buff 文本 contract
2. 现有 `buhflipexplode`、build、agent 测试与构建保持通过
3. roadmap、索引与架构文档同步
