# 静态构筑解析系统 V408

## 1. 目标

`V408` 只解决一件事：

- 把 `buhflipexplode` 的顶层 enemy record 容器统一复用显式 `Record` alias。

## 2. 范围

1. `BuhflipEnemyRecord`
2. `BuhflipEnemyDB`

## 3. 非目标

1. 不改任何 raw/published JSON shape
2. 不改 enemy field contract
3. 不改 `SD/DA/TS` enemy ref list

## 4. 当前状态

- `V408.1` 已完成：范围冻结到 buhflipexplode enemy record contract
- `V408.2` 已完成：顶层 enemy record 已统一复用显式 alias
