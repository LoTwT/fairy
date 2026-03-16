# 静态构筑解析系统 V391：game-modes buff record key contracts

## 背景

`packages/zzz-data/src/game-modes.ts` 的 raw published contract 已经基本显式化，但 `BuffsJson` 仍直接暴露 `Record<string, BuffItem>` 的匿名 key。

## 目标

`V391` 只解决一件事：

- 把 `BuffsJson` 的 record key 统一改成显式 alias。

## 范围

1. `GameModeBuffRecordKey`
2. `BuffsJson`

## 非目标

1. 不改任何 published JSON shape
2. 不改 buff item field contract
3. 不改上层 cleaned/helper 或 resolver 逻辑

## 完成标准

1. `game-modes.ts` 不再直接暴露匿名 `Record<string, BuffItem>` contract
2. 现有 `game-modes`、`cleaned`、agent 测试与构建保持通过
3. roadmap、索引与架构文档同步
