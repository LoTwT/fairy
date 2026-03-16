# 静态构筑解析系统 V397：buhflipexplode element multiplier tuple contracts

## 背景

`packages/zzz-data/src/buhflipexplode/index.ts` 的 raw contract 里，敌人与 SD side 的元素倍率仍直接暴露匿名五元组。

## 目标

`V397` 只解决一件事：

- 把 `buhflipexplode` 的元素倍率五元组统一改成显式 tuple alias。

## 范围

1. `BuhflipElementMultiplier`
2. `BuhflipElementMultiplierTuple`
3. `BuhflipEnemy.elementMult`
4. `SDSide.sideElementMult`

## 非目标

1. 不改任何 raw/published JSON shape
2. 不改倍率数组顺序语义
3. 不改 desc/perf pair 或其他 text contract

## 完成标准

1. `buhflipexplode/index.ts` 不再直接暴露匿名元素倍率五元组
2. 现有 `buhflipexplode`、build、agent 测试与构建保持通过
3. roadmap、索引与架构文档同步
