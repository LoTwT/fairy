# 静态构筑解析系统 V402：buhflipexplode enemy ref list contracts

## 背景

`packages/zzz-data/src/buhflipexplode/index.ts` 的 `SD/DA/TS` 敌人引用集合仍直接暴露匿名数组类型。

## 目标

`V402` 只解决一件事：

- 把 `buhflipexplode` 的敌人引用数组统一复用显式 list alias。

## 范围

1. `SDEnemyRefList`
2. `DAEnemyRefList`
3. `TSEnemyRefList`
4. `SDWave.enemies`
5. `DAVersionData.versionEnemies`
6. `TSWave.enemies`

## 非目标

1. 不改任何 raw/published JSON shape
2. 不改 `wave / side / node` 的上层容器
3. 不改 enemy ref 单项字段 contract

## 完成标准

1. `buhflipexplode/index.ts` 不再直接暴露 `enemy ref[]`
2. `SD/DA/TS` 敌人引用集合统一复用显式 list alias
3. 现有测试与构建保持通过
