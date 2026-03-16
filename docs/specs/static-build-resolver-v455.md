# 静态构筑解析系统 V455

## 目标

`V455` 只解决一件事：

- 把 `lookup-w-engine.ts` 中仍直接复用 `WEngineListItem` raw indexed-access 的基础标量 contract 收口为显式或命名上游 type。

## 范围

1. `LookupWEngineListItemId`
2. `LookupWEngineListItemName`
3. `LookupWEngineListItemRarity`
4. `LookupWEngineBaseStatName`
5. `LookupWEngineBaseStatValue`
6. `LookupWEngineAdvancedStatName`
7. `LookupWEngineAdvancedStatValue`

## 非目标

1. 不改 `lookup-w-engine` 的查询、筛选或属性计算逻辑
2. 不改任何返回字段的值、顺序或可选性
3. 不改 `effects / details / stars / levels` 的更深层 nested contract

## 当前状态

- `V455.1` 已完成：范围冻结到 `lookup-w-engine` 的基础标量 raw contract
- `V455.2` 已完成：相关字段已统一复用显式或命名上游 type
