# 静态构筑解析系统 V418

## 目标

`V418` 只解决一件事：

- 把 `game-modes.ts` 中 `Threshold Simulation` 的 `version/mode` 匿名 list contract 统一收口为显式 list alias。

## 范围

1. `TSVersionItemList`
2. `TSModeItemList`
3. `TSModeItem.versions`
4. `ThresholdSimulationJson`

## 非目标

1. 不改任何 published JSON shape
2. 不改 `Deadly Assault / Shiyu Defense` 对应 list
3. 不改 `cleaned` helper、resolver 或上层 tool 逻辑

## 当前状态

- `V418.1` 已完成：范围冻结到 `Threshold Simulation version/mode` list contract
- `V418.2` 已完成：`TSVersionItem[]` 与 `TSModeItem[]` 已统一复用显式 list alias
