# 静态构筑解析系统 V395：buhflipexplode enemy db key contracts

## 背景

`packages/zzz-data/src/buhflipexplode/index.ts` 的 raw contract 里，敌人库顶层 shape 仍直接暴露 `Record<string, BuhflipEnemy>`。

## 目标

`V395` 只解决一件事：

- 把 `buhflipexplode` 敌人库的 record key 统一改成显式 alias。

## 范围

1. `BuhflipEnemyDB`
2. `BuhflipEnemyId`

## 非目标

1. 不改任何 raw/published JSON shape
2. 不改 enemy field contract
3. 不改 SD/DA/TS 版本或 buff text contract

## 完成标准

1. `buhflipexplode/index.ts` 不再直接暴露 `Record<string, BuhflipEnemy>` contract
2. 现有 `buhflipexplode`、build、agent 测试与构建保持通过
3. roadmap、索引与架构文档同步
