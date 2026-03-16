# 静态构筑解析系统 V420

## 目标

`V420` 只解决一件事：

- 把 `cleaned/types.ts` 中 `Shiyu Defense` 视图的匿名嵌套 list contract 统一收口为显式 alias。

## 范围

1. `SDSideEnemyViewList`
2. `SDNodeBuffNameList`
3. `SDNodeBuffDescriptionList`
4. `SDSideViewList`

## 非目标

1. 不改任何 `cleaned` helper 行为
2. 不改 `Threshold Simulation` 视图
3. 不改 build resolver、matrix 或 agent tool contract

## 当前状态

- `V420.1` 已完成：范围冻结到 `Shiyu Defense` 视图嵌套 list contract
- `V420.2` 已完成：敌人列表、buff 名称/描述列表与 side 列表已统一复用显式 alias
