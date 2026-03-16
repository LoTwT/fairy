# 静态构筑解析系统 V414

## 目标

`V414` 只解决一件事：

- 把 `game-modes.ts` 中 `Shiyu Defense` 的 `side/node` 匿名 list contract 统一收口为显式 alias。

## 范围

1. `SDSideSlot`
2. `SDSideSlotList`
3. `SDNodeItemList`
4. `SDNodeItem.sides`
5. `SDVersionItem.nodes`

## 非目标

1. 不改任何 published JSON shape
2. 不改 `Shiyu Defense` 的 version/mode 顶层 list
3. 不改 `cleaned` helper、resolver 或上层 tool 逻辑

## 当前状态

- `V414.1` 已完成：范围冻结到 `Shiyu Defense side/node` list contract
- `V414.2` 已完成：`SDSideItem | null` 与 `SDNodeItem[]` 已统一复用显式 alias
