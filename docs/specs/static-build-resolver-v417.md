# 静态构筑解析系统 V417

## 目标

`V417` 只解决一件事：

- 把 `game-modes.ts` 中 `Threshold Simulation` 的 `side/node` 匿名 list contract 统一收口为显式 alias。

## 范围

1. `TSSideSlot`
2. `TSSideSlotList`
3. `TSNodeItemList`
4. `TSNodeItem.sides`
5. `TSVersionItem.nodes`

## 非目标

1. 不改任何 published JSON shape
2. 不改 `Threshold Simulation` 的 version/mode 顶层 list
3. 不改 `cleaned` helper、resolver 或上层 tool 逻辑

## 当前状态

- `V417.1` 已完成：范围冻结到 `Threshold Simulation side/node` list contract
- `V417.2` 已完成：`TSBossSideItem | TSRegularSideItem | null` 与 `TSNodeItem[]` 已统一复用显式 alias
