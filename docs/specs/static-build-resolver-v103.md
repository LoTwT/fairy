# 静态构筑解析系统 V103

## 范围

`V103` 只处理 unified `source-entry collection` 对 utility-entry `summary` 的消费对齐，不改变底层 entry contract。

## 目标

1. 把 `entry.summary` 在 `resolveBuildSourceEntries` 路径下提升为明确公共接口
2. 让 mixed collection 的 utility entry 与 standalone `resolveBuildSourceUtilityViews` 使用同一套 entry-level summary 读取方式

## 设计

本阶段不新增 `zzz-data` 运行时字段。

只做：

- 高层 `resolve-build-source-entries` 测试对齐 `entry.summary`
- Agent prompt 对齐 `entry.summary`
- README / 总 spec / roadmap / 索引 / 架构文档同步

## Out of Scope

1. 不改变 `ResolveStaticBuildSourceEntriesResult`
2. 不新增 collection-level aggregate
3. 不扩到 source-damage-view entry 的新字段

## 收口标准

1. 高层 source-entry tool 测试对齐 `entry.summary`
2. Agent prompt 与 README 把 mixed collection 中 utility entry 的 `summary` 视为正式 contract
3. roadmap、总 spec、索引、架构文档同步
