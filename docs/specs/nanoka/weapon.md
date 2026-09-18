# Nanoka W-Engines 数据说明

## 状态

- 上游实体：`weapon`
- 状态：已完成代表性结构调研，可由共享抓取器缓存；整合类别 `w-engines` 已按规则
  `nanoka-w-engine-reference/1` 接入生产快照
- 抓取器仍不执行 W-Engines 字段级语义验证；整合器按该规则独立校验已登记结构，字段归属、共享提取与
  派生分类见[来源数据整合规范](../data/integration.md#wengine-单实体实现规则-nanoka-w-engine-reference1)

## 资源

```text
GET https://static.nanoka.cc/zzz/{version}/weapon.json
GET https://static.nanoka.cc/zzz/{version}/{language}/weapon/{weaponId}.json
```

`weaponId` 从索引顶层 key 动态发现。当前详情语言为 `zh`、`en`。

## 已观察结构

- 索引是以 W-Engine ID 为 key 的普通对象。
- 详情包含基础信息、等级成长、突破、天赋和材料等嵌套结构。
- 部分成长数据使用以等级为 key 的对象。
- 材料字段包含紧凑的上游字符串语法；其中的 Item/Material ID 不属于当前登记实体。
- 本地化文本、富文本标记和展示资源路径在不同语言间可以不同。

调研时 `3.0` 索引包含 93 条记录，`3.1.12+17625891` 包含 95 条。当前抓取器不验证成长公式、材料语法或跨语言机器字段。

## 本地缓存

```text
packages/data/raw/nanoka/{version}/
├── weapon.json
├── zh/weapon/{weaponId}.json
└── en/weapon/{weaponId}.json
```

缓存只用于本机后续观察或处理，不是完整、不可变或可分发的版本快照。

## 整合

整合类别登记名为 `w-engines`，`data.json` 与 `details.{locale}.json` 的字段归属、共享提取、分类 ID 派生与
校验边界由[WEngine 单实体实现规则](../data/integration.md#wengine-单实体实现规则-nanoka-w-engine-reference1)
统一定义。成员集合由选定来源版本 `weapon.json` 的顶层 key 决定，不扫描详情目录推断；本层不解析材料字符串、
不换算百分比、不解释成长公式或天赋计算效果。
