# 静态构筑解析系统 V407

## 1. 目标

`V407` 只解决一件事：

- 把 `buhflipexplode` 的顶层 mode list 容器统一复用显式 list alias。

## 2. 范围

1. `SDVersionsModeList`
2. `TSVersionsModeList`
3. `SDVersionsJson`
4. `TSVersionsJson`

## 3. 非目标

1. 不改任何 raw/published JSON shape
2. 不改 `version record` contract
3. 不改 mode name 或 version data 文本字段

## 4. 当前状态

- `V407.1` 已完成：范围冻结到 buhflipexplode versions mode list contract
- `V407.2` 已完成：`SD/TS` 顶层 mode list 已统一复用显式 list alias
