# 静态构筑解析系统 V421

## 目标

`V421` 只解决一件事：

- 把 `cleaned/types.ts` 中 `Threshold Simulation` 视图的匿名嵌套 list contract 统一收口为显式 alias。

## 范围

1. `TSBossSideEnemyViewList`
2. `TSRegularSideEnemyViewList`
3. `TSNodeBuffNameList`
4. `TSSideViewList`

## 非目标

1. 不改任何 `cleaned` helper 行为
2. 不改 `Shiyu Defense` 视图
3. 不改 build resolver、matrix 或 agent tool contract

## 当前状态

- `V421.1` 已完成：范围冻结到 `Threshold Simulation` 视图嵌套 list contract
- `V421.2` 已完成：boss/regular 敌人列表、buff 名称列表与 side 列表已统一复用显式 alias
