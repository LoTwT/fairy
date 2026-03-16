# 静态构筑解析系统 V458

## 目标

`V458` 只解决一件事：

- 把 `zzz-agent` 各 lookup 工具中 `loadJson<T[]>` 直接复用的 raw 列表容器收口为命名 list contract。

## 范围

1. `LookupAgentDetailsList`
2. `LookupAgentRawListItemList`
3. `LookupBangbooItemList`
4. `LookupDriveDiscItemList`
5. `LookupWEngineRawListItemList`
6. `LookupWEngineDetailsList`

## 非目标

1. 不改任何 lookup 工具的查询、筛选或返回逻辑
2. 不改任何列表元素的字段值、顺序或可选性
3. 不改更深层 nested object contract

## 当前状态

- `V458.1` 已完成：范围冻结到 `loadJson<T[]>` 的 raw list container
- `V458.2` 已完成：相关列表已统一复用命名 list contract
