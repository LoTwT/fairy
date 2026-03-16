# 静态构筑解析系统 V401：buhflipexplode enemy text contracts

## 背景

`packages/zzz-data/src/buhflipexplode/index.ts` 的敌人条目仍直接把 `name / image / misc / spoiler*` 暴露成匿名文本字段。

## 目标

`V401` 只解决一件事：

- 把 `buhflipexplode` 的敌人文本字段统一复用显式 text alias。

## 范围

1. `BuhflipEnemyName`
2. `BuhflipEnemyImage`
3. `BuhflipEnemyMiscText`
4. `BuhflipEnemySpoilerText`
5. `BuhflipEnemy.name`
6. `BuhflipEnemy.image`
7. `BuhflipEnemy.misc`
8. `BuhflipEnemy.spoilerDesc`
9. `BuhflipEnemy.spoilerPerf`

## 非目标

1. 不改任何 raw/published JSON shape
2. 不改 `desc / perf` pair contract
3. 不改版本容器或 enemy ref contract

## 完成标准

1. `buhflipexplode/index.ts` 不再直接暴露敌人文本字段的匿名 `string`
2. 敌人条目统一复用显式 text alias
3. 现有测试与构建保持通过
