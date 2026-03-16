# 静态构筑解析系统 V426

## 目标

`V426` 只解决一件事：

- 把 `gachabase/types.ts` 中 `w-engine / bangboo / drive-disc` 剩余外层 list contract 统一收口为显式 alias。

## 范围

1. `WEngineEffectList`
2. `WEngineLevelList`
3. `WEngineStarList`
4. `BangbooSkillStatList`
5. `BangbooStatList`
6. `BangbooOptimizationList`
7. `BangbooSkillList`
8. `DriveDiscSetEffectList`

## 非目标

1. 不改任何 published JSON shape
2. 不改字段语义或顺序
3. 不改 resolver、lookup 或 cleaned helper 逻辑

## 当前状态

- `V426.1` 已完成：范围冻结到 `w-engine / bangboo / drive-disc` 外层 list contract
- `V426.2` 已完成：剩余外层列表已统一复用显式 alias
