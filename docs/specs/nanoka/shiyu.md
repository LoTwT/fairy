# Nanoka Shiyu 数据说明

## 状态

- 上游实体：`shiyu`
- 状态：已完成代表性结构调研，可由共享抓取器缓存
- 当前实现不建立 Shiyu 运行时 schema，也不执行图关系或 Monster 引用验证

## 资源

```text
GET https://static.nanoka.cc/zzz/{version}/shiyu.json
GET https://static.nanoka.cc/zzz/{version}/{language}/shiyu/{shiyuId}.json
```

`shiyuId` 从索引顶层 key 动态发现。当前详情语言为 `zh`、`en`。

## 已观察结构

- 索引是以 Shiyu ID 为 key 的普通对象。
- 常驻和轮换记录使用不同时间字段组合；观察到 `begin/end` 和 `live_begin/live_end`。
- 详情的阶段从顶层 `zone` 对象 key 发现，不能由详情 ID 或 `stage_num` 推导。
- `stage_num` 不保证全局唯一。
- zone 可以包含 parent/child、room、buff 和 Monster encounter 等嵌套结构。
- Monster 身份来自 `monster_list.*.id`，不是外层 entry key。

调研时 `3.0` 索引包含 56 条记录，`3.1.12+17625891` 包含 59 条。当前抓取器不验证时间字段配对、child 闭合、room 结构或 Monster 引用。

## 本地缓存

```text
packages/data/raw/nanoka/{version}/
├── shiyu.json
├── zh/shiyu/{shiyuId}.json
└── en/shiyu/{shiyuId}.json
```
