# 静态构筑解析系统 V478

## 目标

`V478` 只解决一件事：

- 把 `zzz-agent` `resolve-build-schemas.ts` 中 `dynamicSnapshot` 的匿名 nested Zod schema 收口为共享 schema 常量。

## 范围

1. `dynamicSnapshotFlagsSchema`
2. `dynamicSnapshotCountsSchema`
3. `dynamicSnapshotValuesSchema`
4. `dynamicSnapshotSchema.flags / counts / values`

## 非目标

1. 不改任何字段集合、默认值或校验规则
2. 不改 `dynamicSnapshot` 的序列化结构
3. 不改 resolver 或 tool 行为

## 当前状态

- `V478.1` 已完成：范围冻结到 `dynamicSnapshot` 的共享 nested schema
- `V478.2` 已完成：相关字段已统一复用共享 schema 常量
