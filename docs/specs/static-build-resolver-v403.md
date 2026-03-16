# 静态构筑解析系统 V403：buhflipexplode wave list contracts

## 背景

`packages/zzz-data/src/buhflipexplode/index.ts` 的 `SD/TS side.waves` 仍直接暴露匿名数组类型。

## 目标

`V403` 只解决一件事：

- 把 `buhflipexplode` 的 wave 集合统一复用显式 list alias。

## 范围

1. `SDWaveList`
2. `TSWaveList`
3. `SDSide.waves`
4. `TSSide.waves`

## 非目标

1. 不改任何 raw/published JSON shape
2. 不改 `enemy ref list` contract
3. 不改 `side / node / versions` 上层容器

## 完成标准

1. `buhflipexplode/index.ts` 不再直接暴露 `wave[]`
2. `SD/TS` wave 集合统一复用显式 list alias
3. 现有测试与构建保持通过
