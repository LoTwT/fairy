# 静态构筑解析系统 V399：buhflipexplode enemy ref id contracts

## 背景

`packages/zzz-data/src/buhflipexplode/index.ts` 的 `SD/DA/TS` 敌人引用结构仍直接把 `id` 暴露成匿名 `string`，没有复用现有的 `BuhflipEnemyId`。

## 目标

`V399` 只解决一件事：

- 把 `buhflipexplode` 的敌人引用 `id` 统一复用显式 enemy-id alias。

## 范围

1. `SDEnemyRef.id`
2. `DAEnemyRef.id`
3. `TSEnemyRef.id`

## 非目标

1. 不改任何 raw/published JSON shape
2. 不改 `BuhflipEnemyDB` 顶层 key contract
3. 不改 enemy ref 的其他字段

## 完成标准

1. `buhflipexplode/index.ts` 不再直接暴露 `enemy ref id: string`
2. `SD/DA/TS` 敌人引用统一复用 `BuhflipEnemyId`
3. 现有测试与构建保持通过
