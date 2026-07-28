# Nanoka Boss 数据说明

## 状态

- 上游实体：`boss`
- 状态：已完成代表性结构调研，可由共享抓取器缓存
- 当前实现不建立 Boss 运行时 schema，也不执行分支、引用或共享配置验证

## 资源

```text
GET https://static.nanoka.cc/zzz/{version}/boss.json
GET https://static.nanoka.cc/zzz/{version}/{language}/boss/{bossId}.json
```

`bossId` 从索引顶层 key 动态发现。当前详情语言为 `zh`、`en`。

## 已观察结构

- 索引是以 Boss ID 为 key 的普通对象。
- `3.0` 详情使用顶层 `zone`。
- `3.1.5+17516165` 和 `3.1.12+17625891` 的已检查详情使用顶层 `modes`。
- mode ID 是详情内结构，不是顶层 Boss 实体或独立远端资源。
- mode 顺序可能具有来源意义，不应在后续处理中擅自排序。
- 顶层与 mode 的 `zone_type` 不保证相等。
- zone/mode 中可以包含 Monster encounter、buff 和调整配置。
- Boss 与 Simul 观察到相交的 `boss_adjust`、`layer_buff` 和 `selectable_buff` 配置。

调研时 `3.0` 索引包含 41 条记录，`3.1.12+17625891` 包含 44 条。当前抓取器不根据版本选择结构，不验证 mode 唯一性、Monster 引用、内部重复配置或 Boss/Simul 一致性。

## 本地缓存

```text
packages/data/raw/nanoka/{version}/
├── boss.json
├── zh/boss/{bossId}.json
└── en/boss/{bossId}.json
```
