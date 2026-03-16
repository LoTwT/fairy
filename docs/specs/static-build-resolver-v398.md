# 静态构筑解析系统 V398：buhflipexplode text pair contracts

## 背景

`packages/zzz-data/src/buhflipexplode/index.ts` 的 raw contract 里，敌人的 `desc` 与 `perf` 仍直接暴露匿名二元文本 tuple。

## 目标

`V398` 只解决一件事：

- 把 `buhflipexplode` 的文本 pair 统一改成显式 tuple alias。

## 范围

1. `BuhflipTextPairValue`
2. `BuhflipTextPair`
3. `BuhflipEnemy.desc`
4. `BuhflipEnemy.perf`

## 非目标

1. 不改任何 raw/published JSON shape
2. 不改 `misc / spoilerDesc / spoilerPerf` 的单字符串语义
3. 不改 `buff` 或 `element multiplier` contract

## 完成标准

1. `buhflipexplode/index.ts` 不再直接暴露匿名文本二元 tuple
2. 现有 `buhflipexplode`、build、agent 测试与构建保持通过
3. roadmap、索引与架构文档同步
