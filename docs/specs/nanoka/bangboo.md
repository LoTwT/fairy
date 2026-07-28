# Nanoka Bangboos 数据说明

## 状态

- 上游实体：`bangboo`
- 状态：已完成代表性结构调研，可由共享抓取器缓存
- 当前实现不建立 Bangboos 运行时 schema，也不执行字段级语义验证

## 资源

```text
GET https://static.nanoka.cc/zzz/{version}/bangboo.json
GET https://static.nanoka.cc/zzz/{version}/{language}/bangboo/{bangbooId}.json
```

`bangbooId` 从索引顶层 key 动态发现。当前详情语言为 `zh`、`en`。

## 已观察结构

- 索引是以 Bangboo ID 为 key 的普通对象。
- 详情包含基础属性、等级成长、技能、参数和材料信息。
- 合法详情可能出现空等级对象、空技能参数或空图标字段，不能仅凭空值推断资源损坏。
- 技能文本和参数中可出现详情内部引用。
- 材料 ID 属于尚未登记的 Item/Material 数据域。

调研时 `3.0` 索引包含 40 条记录，`3.1.12+17625891` 包含 42 条。当前抓取器不验证技能引用闭合、成长结构或跨语言非本地化字段。

## 本地缓存

```text
packages/data/raw/nanoka/{version}/
├── bangboo.json
├── zh/bangboo/{bangbooId}.json
└── en/bangboo/{bangbooId}.json
```

缓存目录中可能保留旧详情；资源集合必须以当前 `bangboo.json` 为发现边界。
