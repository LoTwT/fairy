# 静态构筑解析系统 V444

## 目标

`V444` 只解决一件事：

- 把 `lookup-bangboo.ts` 中 `skills[*].stats` 与 `baseStats` 的 raw list contract 收口为显式 alias。

## 范围

1. `LookupBangbooSkillStatEntry`
2. `LookupBangbooSkillStatList`
3. `LookupBangbooBaseStatEntry`
4. `LookupBangbooBaseStatList`

## 非目标

1. 不改 `lookup-bangboo` 的查询、筛选或属性计算逻辑
2. 不改 `stats` 与 `baseStats` 的字段 shape、内容或顺序
3. 不改其他 `lookup-*` 工具的 raw contract

## 当前状态

- `V444.1` 已完成：范围冻结到 `lookup-bangboo` 的 raw list contract
- `V444.2` 已完成：`skills[*].stats` 与 `baseStats` 已统一复用显式 alias
