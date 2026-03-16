# 静态构筑解析系统 V406

## 1. 目标

`V406` 只解决一件事：

- 把 `buhflipexplode` 的 version record 容器统一复用显式 `Record` alias。

## 2. 范围

1. `SDVersionRecord`
2. `DAVersionRecord`
3. `TSVersionRecord`
4. `SDVersionsMode.versions`
5. `DAVersionsJson`
6. `TSVersionsMode.versions`

## 3. 非目标

1. 不改任何 raw/published JSON shape
2. 不改 `node list` contract
3. 不改 `SD/TS` 顶层 mode list

## 4. 当前状态

- `V406.1` 已完成：范围冻结到 buhflipexplode version record contract
- `V406.2` 已完成：`SD/DA/TS` version record 已统一复用显式 alias
