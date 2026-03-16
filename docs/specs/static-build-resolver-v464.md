# 静态构筑解析系统 V464

## 目标

`V464` 只解决一件事：

- 把 `cleaned/types.ts` 中 `DA / SD / TS` 的 flattened enemy specialization 从泛型实例化收口为显式 interface。

## 范围

1. `DAEnemyView`
2. `SDSideEnemyView`
3. `TSBossSideEnemyView`
4. `TSRegularSideEnemyView`

## 非目标

1. 不改任何 flatten helper 的遍历顺序、筛选逻辑或返回值
2. 不改 `FlattenedEnemyView` 基础字段集合
3. 不改 `TSFlattenedEnemyView` 的语义

## 当前状态

- `V464.1` 已完成：范围冻结到 `cleaned` 里的 flattened enemy specialization contract
- `V464.2` 已完成：相关 specialization 已统一改为显式 interface
