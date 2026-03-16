# 静态构筑解析系统 V457

## 目标

`V457` 只解决一件事：

- 把 `lookup-drive-disc.ts` 中仍直接复用 `DriveDiscItem` raw indexed-access 的基础标量 contract 收口为命名上游 type。

## 范围

1. `LookupDriveDiscId`
2. `LookupDriveDiscName`

## 非目标

1. 不改 `lookup-drive-disc` 的查询、筛选或返回逻辑
2. 不改任何返回字段的值、顺序或可选性
3. 不改 `setEffects` 的 nested contract

## 当前状态

- `V457.1` 已完成：范围冻结到 `lookup-drive-disc` 的基础标量 raw contract
- `V457.2` 已完成：相关字段已统一复用命名上游 type
