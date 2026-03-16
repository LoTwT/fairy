# 静态构筑解析系统 V474

## 目标

`V474` 只解决一件事：

- 把 `zzz-agent` `resolve-build-schemas.ts` 中 `dynamicSnapshot` 的匿名嵌套对象 contract 收口为显式 interface。

## 范围

1. `BuildToolDynamicSnapshotFlags`
2. `BuildToolDynamicSnapshotCounts`
3. `BuildToolDynamicSnapshotValues`
4. `BuildToolDynamicSnapshotInput.flags / counts / values`

## 非目标

1. 不改任何 Zod schema 的字段集合、默认值或校验规则
2. 不改 `dynamicSnapshot` 的序列化结构
3. 不改 resolver 或 tool 行为

## 当前状态

- `V474.1` 已完成：范围冻结到 `dynamicSnapshot` 的嵌套对象 contract
- `V474.2` 已完成：相关字段已统一复用显式 interface
