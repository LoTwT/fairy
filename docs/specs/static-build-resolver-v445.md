# 静态构筑解析系统 V445

## 目标

`V445` 只解决一件事：

- 把 `lookup-w-engine.ts` 中 `baseStat / advancedStat` 的 raw object contract 收口为显式 interface。

## 范围

1. `LookupWEngineBaseStatName`
2. `LookupWEngineBaseStatValue`
3. `LookupWEngineBaseStat`
4. `LookupWEngineAdvancedStatName`
5. `LookupWEngineAdvancedStatValue`
6. `LookupWEngineAdvancedStat`

## 非目标

1. 不改 `lookup-w-engine` 的查询、筛选或属性计算逻辑
2. 不改 `baseStat / advancedStat` 的字段 shape、数值或展示语义
3. 不改 `activeEffect / calculatedSecondaryStat` 等其他返回字段

## 当前状态

- `V445.1` 已完成：范围冻结到 `lookup-w-engine` 的 raw stat object contract
- `V445.2` 已完成：`baseStat / advancedStat` 已统一复用显式 interface
