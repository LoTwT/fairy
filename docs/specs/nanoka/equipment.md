# Nanoka Drive Discs 数据说明

## 状态

- 上游实体：`equipment`
- 状态：已完成代表性结构调研，可由共享抓取器缓存
- 当前实现不建立 Drive Discs 运行时 schema，也不执行字段级语义验证

## 资源

```text
GET https://static.nanoka.cc/zzz/{version}/equipment.json
GET https://static.nanoka.cc/zzz/{version}/{language}/equipment/{equipmentId}.json
```

`equipmentId` 从索引顶层 key 动态发现。当前详情语言为 `zh`、`en`。

## 已观察结构

- 索引是以 Equipment ID 为 key 的普通对象。
- 摘要记录内嵌多语言名称和二件套、四件套说明，并包含图标路径。
- 详情补充对应语言的名称、套装说明、故事和展示资源。
- 当前样本未发现需要解释为其他已登记实体的结构化外键。

调研时 `3.0` 索引包含 28 条记录，`3.1.12+17625891` 包含 30 条；这些数量仅是观察结果，不是抓取器阈值或完整性证明。

## 本地缓存

```text
packages/data/raw/nanoka/{version}/
├── equipment.json
├── zh/equipment/{equipmentId}.json
└── en/equipment/{equipmentId}.json
```

共享抓取器只确认索引和详情是可解析的普通 JSON 对象，不比较摘要与详情字段，也不验证跨语言一致性。
