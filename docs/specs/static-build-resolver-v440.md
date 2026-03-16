# 静态构筑解析系统 V440

## 目标

`V440` 只解决一件事：

- 把 `lookup-game-mode.ts` 中“未找到版本 / 未找到难度”的顶层返回结构收口为显式 interface。

## 范围

1. `LookupGameModeLookupMessage`
2. `LookupGameModeUnavailableVersionsResult`
3. `LookupGameModeUnavailableDifficultiesResult`

## 非目标

1. 不改 `lookup-game-mode` 的成功返回字段集合
2. 不改 DA/SD/TS 查询、敌人选择或 `damageContext` 生成逻辑
3. 不改 boss 搜索结果或成功路径的字段语义

## 当前状态

- `V440.1` 已完成：范围冻结到 `lookup-game-mode` 的未命中返回结构
- `V440.2` 已完成：版本 / 难度未命中结果已统一复用显式 interface
