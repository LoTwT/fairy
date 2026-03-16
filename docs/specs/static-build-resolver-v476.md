# 静态构筑解析系统 V476

## 目标

`V476` 只解决一件事：

- 把 `zzz-agent` `resolve-build-schemas.ts` 中 `resolvedSnapshot` 的匿名嵌套对象 contract 收口为显式 interface。

## 范围

1. `BuildToolResolvedSnapshotBucketDeltas`
2. `BuildToolResolvedSnapshotMultiplierFactors`
3. `BuildToolResolvedSnapshotInput.bucketDeltas / multiplierFactors`

## 非目标

1. 不改任何 Zod schema 的字段集合、默认值或校验规则
2. 不改 `resolvedSnapshot` 的序列化结构
3. 不改 resolver 或 tool 行为

## 当前状态

- `V476.1` 已完成：范围冻结到 `resolvedSnapshot` 的嵌套对象 contract
- `V476.2` 已完成：相关字段已统一复用显式 interface
