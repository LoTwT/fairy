# Nanoka Simul 数据说明

## 状态

- 上游实体：`simul`
- 状态：已完成代表性结构调研，可由共享抓取器缓存
- 当前实现不建立 Simul 运行时 schema，也不执行图闭合或跨实体验证

## 资源

```text
GET https://static.nanoka.cc/zzz/{version}/simul.json
GET https://static.nanoka.cc/zzz/{version}/{language}/simul/{simulId}.json
```

`simulId` 从索引顶层 key 动态发现。当前详情语言为 `zh`、`en`。

## 已观察结构

- 索引是以 Simul ID 为 key 的普通对象。
- 调研的三个版本各有 3 条顶层记录。
- 详情是由 node、story event、battle、layer、room 和 record 组成的图状结构。
- `next_node_unlock` 与 `next_record_unlock` 指向不同目标集合。
- 非零 `prev_node` 的完整目标命名空间尚未证明，应保留为不透明 ID。
- battle 和 room 中可以包含 Monster encounter。
- Simul 中观察到 `boss_adjust`、`layer_buff` 和 `selectable_buff` 配置。

当前抓取器不验证内部 key/id、图闭合、解锁目标、Monster 引用、跨语言机器字段或与 Boss 的共享配置。

## 本地缓存

```text
packages/data/raw/nanoka/{version}/
├── simul.json
├── zh/simul/{simulId}.json
└── en/simul/{simulId}.json
```
