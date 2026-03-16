# 静态构筑解析系统 V469

## 目标

`V469` 只解决一件事：

- 把 `game-modes.ts` 中 buff 名称与描述的匿名联合值收口为显式 alias。

## 范围

1. `GameModeBuffNameValue`
2. `GameModeBuffEffectValue`
3. `SDNodeItem.buffName`
4. `SDNodeItem.buffDesc`

## 非目标

1. 不改任何 published JSON shape
2. 不改 `buffName / buffDesc` 的单值或多值语义
3. 不改任何 `cleaned` helper 或 `lookup-game-mode` 行为

## 当前状态

- `V469.1` 已完成：范围冻结到 `game-modes.ts` 的 buff 联合值 contract
- `V469.2` 已完成：相关联合值已统一复用显式 alias
