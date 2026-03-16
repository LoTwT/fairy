# 静态构筑解析系统 V452

## 目标

`V452` 只解决一件事：

- 把 `lookup-game-mode.ts` 中 `TS` 成功结果里的 `data` 外壳 contract 从 `ThresholdSimulationJson[number]["versions"][number]` 收口为显式 interface。

## 范围

1. `LookupGameModeTSData`

## 非目标

1. 不改 `TS` 版本查询、难度解析、敌人选择或 `damageContext` 计算逻辑
2. 不改 `data` 字段的值、字段集合或返回条件
3. 不改 `nodes` 的更深层 nested contract

## 当前状态

- `V452.1` 已完成：范围冻结到 `lookup-game-mode TS` 成功结果的 `data` 外壳
- `V452.2` 已完成：`TS data` 顶层版本对象已统一复用显式 interface
