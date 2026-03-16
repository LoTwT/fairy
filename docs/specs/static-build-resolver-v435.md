# 静态构筑解析系统 V435

## 目标

`V435` 只解决一件事：

- 把 `lookup-bangboo.ts` trimmed result 中 `skills` 的匿名 entry contract 统一收口为显式 alias / interface。

## 范围

1. `LookupBangbooSkillTypeId`
2. `LookupBangbooSkillName`
3. `LookupBangbooSkillDescriptionText`
4. `LookupBangbooSkillStatList`
5. `LookupBangbooSkillEntry`

## 非目标

1. 不改 `lookup-bangboo` 的返回字段集合
2. 不改邦布查询、模糊匹配、属性计算或技能裁剪逻辑
3. 不改 `stats` 列表内部字段语义

## 当前状态

- `V435.1` 已完成：范围冻结到 `lookup-bangboo` trimmed result 的匿名 skill entry contract
- `V435.2` 已完成：`skills` 已统一复用显式 alias / interface
