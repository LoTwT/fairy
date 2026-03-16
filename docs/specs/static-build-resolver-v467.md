# 静态构筑解析系统 V467

## 目标

`V467` 只解决一件事：

- 把 `game-modes.ts` 中元素倍率五元组收口为显式 tuple alias。

## 范围

1. `GameModeElementMultiplier`
2. `GameModeElementMultiplierTuple`
3. `ElementMult`

## 非目标

1. 不改任何 published JSON shape
2. 不改 `elementMult / sideElementMult` 字段语义
3. 不改任何 `cleaned` helper 或上层查询逻辑

## 当前状态

- `V467.1` 已完成：范围冻结到 `game-modes.ts` 的元素倍率五元组 contract
- `V467.2` 已完成：相关元素倍率五元组已统一复用显式 alias
