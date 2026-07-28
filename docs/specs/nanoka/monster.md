# Nanoka Monsters 数据说明

## 状态

- 上游实体：`monster`
- 状态：已完成代表性结构调研，可由共享抓取器缓存
- 当前实现不建立 Monsters 运行时 schema，也不执行字段级或跨实体验证

## 资源

```text
GET https://static.nanoka.cc/zzz/{version}/monster.json
GET https://static.nanoka.cc/zzz/{version}/{language}/monster/{monsterId}.json
```

顶层 `monsterId` 从索引 key 动态发现。当前详情语言为 `zh`、`en`。

## 已观察结构

- 索引是以顶层 Monster ID 为 key 的普通对象。
- 一个详情可以通过 `monster_info` 包含多个内部战斗单位。
- `monster_info` 的 key 与内部记录 `id` 是战斗单位身份，不应与详情路径 ID 混为一谈。
- 部分合法详情的 `monster_info` 为空。
- 内部单位包含名称、图标、等级曲线、属性、弱点和抗性等嵌套数据。

调研时 `3.0` 索引包含 288 条记录，`3.1.12+17625891` 包含 293 条。当前抓取器不验证内部 key/id、数值曲线、空值组合或 `zh/en` 一致性。

## 与 End Game 的关系

Shiyu、Simul 和 Boss 的已观察结构都包含 Monster 引用。引用身份来自 `monster_list` 嵌套记录的 `id`，不是 `monster_list` 的外层 key。该关系记录在 [End Game 数据说明](end-game.md)，当前不由抓取器执行闭合检查。

## 本地缓存

```text
packages/data/raw/nanoka/{version}/
├── monster.json
├── zh/monster/{monsterId}.json
└── en/monster/{monsterId}.json
```
