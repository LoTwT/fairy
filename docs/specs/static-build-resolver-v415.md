# 静态构筑解析系统 V415

## 目标

`V415` 只解决一件事：

- 把 `game-modes.ts` 中 `Shiyu Defense` 的 `version/mode` 匿名 list contract 统一收口为显式 list alias。

## 范围

1. `SDVersionItemList`
2. `SDModeItemList`
3. `SDModeItem.versions`
4. `ShiyuDefenseJson`

## 非目标

1. 不改任何 published JSON shape
2. 不改 `Threshold Simulation` 对应 list
3. 不改 `cleaned` helper、resolver 或上层 tool 逻辑

## 当前状态

- `V415.1` 已完成：范围冻结到 `Shiyu Defense version/mode` list contract
- `V415.2` 已完成：`SDVersionItem[]` 与 `SDModeItem[]` 已统一复用显式 list alias
