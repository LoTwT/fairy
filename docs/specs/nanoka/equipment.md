# Nanoka Drive Discs 数据说明

## 状态

- 上游实体：`equipment`；整合类别登记名为 `drive-discs`，类型与函数统一使用 `DriveDisc` 命名。
- 状态：已完成代表性结构调研，可由共享抓取器缓存；单实体纯整合（规则 `nanoka-drive-disc-reference/1`）已实现，生产类别尚未接入。
- 抓取器仍只确认索引和详情是可解析的普通 JSON 对象，不比较摘要与详情字段，也不验证跨语言一致性。
- 字段级结构校验、跨语言一致性与保真边界由包内纯整合函数执行；规则以[来源数据整合规范](../data/integration.md#驱动盘单实体实现规则-nanoka-drive-disc-reference1)为准。

## 资源

```text
GET https://static.nanoka.cc/zzz/{version}/equipment.json
GET https://static.nanoka.cc/zzz/{version}/{language}/equipment/{equipmentId}.json
```

`equipmentId` 从索引顶层 key 动态发现。当前详情语言为 `zh`、`en`。

## 已观察结构

- 索引是以 Equipment ID 为 key 的普通对象。
- 摘要记录内嵌 `icon` 与 `zh`、`en`、`ja`、`ko` 语言对象，每个语言对象含 `name`、`desc2`、`desc4`。
- 详情补充对应语言的 `id`、`name`、`desc2`、`desc4`、`story`、`icon`、`icon2`。
- 本地 `3.1` 样本中同一条记录的 `icon` 与 `icon2` 取值相同，详情 `icon` 与摘要 `icon` 也相同。这只是观察结果，
  不是结构要求：整合产物把 `icon` 与 `icon2` 分开保存，也不要求摘要与详情的同名字段相等。
- 索引摘要与语言详情是两个独立来源，整合不在两者之间回退或去重。
- `desc2`、`desc4` 的槽位对应关系、效果语义与数值缩放尚未确认；本层只按字符串保留原文，不解析效果。
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
