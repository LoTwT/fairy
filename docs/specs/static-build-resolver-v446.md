# 静态构筑解析系统 V446

## 目标

`V446` 只解决一件事：

- 把 `lookup-bangboo.ts` 中 `baseStats[*]` 与 `skills[*].stats[*]` 的 raw entry object 收口为显式 interface。

## 范围

1. `LookupBangbooSkillStatTitle`
2. `LookupBangbooSkillStatValueText`
3. `LookupBangbooSkillStatValueList`
4. `LookupBangbooSkillStatEntry`
5. `LookupBangbooBaseStatId`
6. `LookupBangbooBaseStatName`
7. `LookupBangbooBaseStatValue`
8. `LookupBangbooBaseStatGrowthPerLevel`
9. `LookupBangbooBaseStatEntry`

## 非目标

1. 不改 `lookup-bangboo` 的查询、筛选或属性计算逻辑
2. 不改 `baseStats` 与 `skills[*].stats` 的字段 shape、内容或顺序
3. 不改其他 `lookup-*` 工具的 raw contract

## 当前状态

- `V446.1` 已完成：范围冻结到 `lookup-bangboo` 的 raw entry object contract
- `V446.2` 已完成：`baseStats[*]` 与 `skills[*].stats[*]` 已统一复用显式 interface
