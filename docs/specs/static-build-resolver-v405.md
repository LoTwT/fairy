# 静态构筑解析系统 V405：buhflipexplode node list contracts

## 背景

`packages/zzz-data/src/buhflipexplode/index.ts` 的 `SD/TS versionEnemies.nodes` 仍直接暴露匿名数组类型。

## 目标

`V405` 只解决一件事：

- 把 `buhflipexplode` 的 node 集合统一复用显式 list alias。

## 范围

1. `SDNodeList`
2. `TSNodeList`
3. `SDVersionEnemies.nodes`
4. `TSVersionEnemies.nodes`

## 非目标

1. 不改任何 raw/published JSON shape
2. 不改 `side slot list` contract
3. 不改 `versions` 顶层容器

## 完成标准

1. `buhflipexplode/index.ts` 不再直接暴露 `node[]`
2. `SD/TS` node 集合统一复用显式 list alias
3. 现有测试与构建保持通过
