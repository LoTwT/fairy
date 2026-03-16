# 静态构筑解析系统 V465

## 目标

`V465` 只解决一件事：

- 把 `game-modes.ts` 中 `BuffsJson` 的 record value 从 `BuffItem` 内联复用收口为显式 value alias。

## 范围

1. `GameModeBuffRecordValue`
2. `BuffsJson`

## 非目标

1. 不改 `buffs.json` 的 published JSON shape
2. 不改 `BuffItem` 的字段集合
3. 不改任何 `lookup-game-mode` 或 cleaned helper 逻辑

## 当前状态

- `V465.1` 已完成：范围冻结到 `BuffsJson` 的 record value contract
- `V465.2` 已完成：相关 record value 已统一复用显式 alias
