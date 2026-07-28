# Nanoka Agents 数据说明

## 状态

- 上游实体：`character`
- 状态：已完成代表性结构调研，可由共享抓取器缓存
- 当前实现不建立 Agents 运行时 schema，也不执行字段级语义验证

## 资源

```text
GET https://static.nanoka.cc/zzz/{version}/character.json
GET https://static.nanoka.cc/zzz/{version}/{language}/character/{characterId}.json
```

当前抓取语言为 `zh`、`en`。`characterId` 从索引顶层 key 动态发现，按规范十进制整数处理。

## 已观察结构

- 索引顶层是以 Character ID 为 key 的对象。
- 索引记录包含展示名称、图标、阵营、属性、稀有度等摘要信息；不同语言内容可能内嵌在同一记录中。
- 详情是单个普通对象，包含角色描述、基础属性、成长、技能、材料和展示资源等数据。
- 部分详情包含数值 `id`，已观察样本中与路径 ID 一致；该关系当前不由抓取器强制检查。

这些字段是上游调研结果，不是稳定 API 承诺。新增、缺失或类型变化不会由当前通用抓取器识别为字段漂移。

## 本地缓存

```text
packages/data/raw/nanoka/{version}/
├── character.json
├── zh/character/{characterId}.json
└── en/character/{characterId}.json
```

缓存语义、失败行为和非目标以 [共享来源规范](source.md) 为准。消费者必须使用 `character.json` 的 key 发现详情，不能通过扫描目录推断完整集合。

## 调研样本

调研覆盖正式服 `3.0`，并使用 `3.1.5+17516165`、`3.1.12+17625891` 检查版本差异。该覆盖只证明调研时端点和代表性结构可用，不构成持续兼容保证。
