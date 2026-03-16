# 静态构筑解析系统 V472

## 目标

`V472` 只解决一件事：

- 把 `cleaned/types.ts` 中 encounter/view 的位置索引与 side 标量字段统一对齐到显式 alias。

## 范围

1. `EncounterFilter.node / side`
2. `FlattenedEnemyView.node / side / wave / enemyIndex / count`
3. `EncounterDamageContext.node / side / wave / enemyIndex / sideElementMultiplier`
4. `DA / SD / TS` flattened enemy view 的位置与数量字段
5. `SDSideView / TSBossSideView / TSRegularSideView`
   - `side`
   - `nodeLevel`
   - `sideHPMult`
   - `hp60k`
   - `altHp`

## 非目标

1. 不改任何 `cleaned` helper 的遍历顺序、筛选逻辑或返回值
2. 不改 `ElementMultiplierMap` 结构
3. 不改 `buffNames / buffDescriptions` 的文本 contract

## 当前状态

- `V472.1` 已完成：范围冻结到 `cleaned/types.ts` 的位置索引与 side 标量 contract
- `V472.2` 已完成：相关字段已统一复用显式 alias 与 `game-modes` 上游数值 alias
