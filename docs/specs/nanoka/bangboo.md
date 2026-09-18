# Nanoka Bangboos 数据说明

## 状态

- 上游实体：`bangboo`
- 状态：已完成代表性结构调研，可由共享抓取器缓存；整合类别 `bangboos` 已按规则
  `nanoka-bangboo-reference/1` 接入生产快照
- 抓取器仍不执行 Bangboos 字段级语义验证；整合器按该规则独立校验已登记结构，字段归属、共享提取与
  等级阶段拆分见[来源数据整合规范](../data/integration.md#bangboo-单实体实现规则-nanoka-bangboo-reference1)

## 资源

```text
GET https://static.nanoka.cc/zzz/{version}/bangboo.json
GET https://static.nanoka.cc/zzz/{version}/{language}/bangboo/{bangbooId}.json
```

`bangbooId` 从索引顶层 key 动态发现。当前详情语言为 `zh`、`en`。

## 已观察结构

- 索引是以 Bangboo ID 为 key 的普通对象。
- 索引记录包含图标路径、稀有度、代号、英文说明与 `zh`/`en`/`ja`/`ko` 名称；这些字段与详情是两个独立来源，
  同名值不要求相等，也不互相回退。整合器登记这组已知顶层字段并对其余字段生成维护诊断，不校验类型或必需性。
- 详情包含基础属性、等级成长、技能、参数和材料信息。
- 合法详情可能出现空等级对象、空技能参数或空图标字段，不能仅凭空值推断资源损坏。
- 技能文本和参数中可出现详情内部引用。
- 材料 ID 属于尚未登记的 Item/Material 数据域。
- `code_name` 两语言拼写可以不同（本地 3.1 的 `54010`、`54019`）；整合后留在各自语言详情，不要求跨语言相等。

调研时 `3.0` 索引包含 40 条记录，`3.1.12+17625891` 包含 42 条。当前抓取器不验证技能引用闭合、成长结构或跨语言非本地化字段。

## 本地缓存

```text
packages/data/raw/nanoka/{version}/
├── bangboo.json
├── zh/bangboo/{bangbooId}.json
└── en/bangboo/{bangbooId}.json
```

缓存目录中可能保留旧详情；资源集合必须以当前 `bangboo.json` 为发现边界。缓存只用于本机后续观察或处理，
不是完整、不可变或可分发的版本快照。

## 整合

整合类别登记名为 `bangboos`，`data.json` 与 `details.{locale}.json` 的字段归属、共享提取、等级阶段与
`extra` 属性拆分及校验边界由
[Bangboo 单实体实现规则](../data/integration.md#bangboo-单实体实现规则-nanoka-bangboo-reference1)统一定义。
成员集合由选定来源版本 `bangboo.json` 的顶层 key 决定，不扫描详情目录推断；本层不解析技能参数引用、
不求值参数字符串、不换算百分比，也不解释成长结构。
