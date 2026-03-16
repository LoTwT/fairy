# 静态构筑解析系统 V454

## 目标

`V454` 只解决一件事：

- 把 `lookup-bangboo.ts` 中仍直接复用 `BangbooItem` raw indexed-access 的基础标量 contract 收口为显式或命名上游 type。

## 范围

1. `LookupBangbooId`
2. `LookupBangbooName`
3. `LookupBangbooRarity`
4. `LookupBangbooSkillStatTitle`
5. `LookupBangbooBaseStatId`
6. `LookupBangbooBaseStatName`
7. `LookupBangbooBaseStatValue`
8. `LookupBangbooBaseStatGrowthPerLevel`

## 非目标

1. 不改 `lookup-bangboo` 的查询、筛选或属性计算逻辑
2. 不改任何返回字段的值、顺序或可选性
3. 不改 `skills / baseStats / optimizations` 的更深层 nested contract

## 当前状态

- `V454.1` 已完成：范围冻结到 `lookup-bangboo` 的基础标量 raw contract
- `V454.2` 已完成：相关字段已统一复用显式或命名上游 type
