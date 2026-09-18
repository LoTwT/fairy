# Nanoka Monsters 数据说明

## 状态

- 上游实体：`monster`
- 状态：已完成代表性结构调研，可由共享抓取器缓存；整合类别 `monsters` 已按规则
  `nanoka-monster-reference/1` 接入生产快照
- 抓取器仍不执行 Monsters 字段级语义验证；整合器按该规则独立校验已登记结构，字段归属、共享提取与
  身份层次见[来源数据整合规范](../data/integration.md#monster-单实体实现规则-nanoka-monster-reference1)

## 资源

```text
GET https://static.nanoka.cc/zzz/{version}/monster.json
GET https://static.nanoka.cc/zzz/{version}/{language}/monster/{monsterId}.json
```

顶层 `monsterId` 从索引 key 动态发现。当前详情语言为 `zh`、`en`。

## 已观察结构

- 索引是以顶层 Monster ID 为 key 的普通对象。
- 索引记录包含图标路径、机器标签（本地 3.1 全为 null）、稀有度、分组编码与 `zh`/`en`/`ja`/`ko` 名称及英文简介；
  这些字段与详情是两个独立来源，同名值不要求相等，也不互相回退。整合器登记这组已知顶层字段并对其余字段
  生成维护诊断，不校验类型或必需性。
- 一个详情可以通过 `monster_info` 包含多个内部战斗单位。
- `monster_info` 的 key 与内部记录 `id` 是战斗单位身份，不应与详情路径 ID 混为一谈。
- 部分合法详情的 `monster_info` 为空。
- 内部单位包含名称代号、图标、标签、类型、元素弱点抗性、属性与成长曲线等嵌套数据。
- 详情英文名称类内大量重名（本地 3.1 的占位名 `OfficialName_` 出现 37 次）；名称不作为公开身份，
  公开读取以来源 ID 为身份。

调研时 `3.0` 索引包含 288 条记录，`3.1.12+17625891` 包含 293 条。当前抓取器不验证内部 key/id、数值曲线、空值组合或 `zh/en` 一致性。

## 与 End Game 的关系

Shiyu、Simul 和 Boss 的已观察结构都包含 Monster 引用。引用身份来自 `monster_list` 嵌套记录的 `id`，不是 `monster_list` 的外层 key。该关系记录在 [End Game 数据说明](end-game.md)，当前不由抓取器执行闭合检查；公开读取 API 也不会因 End Game 类别中的引用自动加载 Monster。

## 本地缓存

```text
packages/data/raw/nanoka/{version}/
├── monster.json
├── zh/monster/{monsterId}.json
└── en/monster/{monsterId}.json
```

缓存目录中可能保留旧详情；资源集合必须以当前 `monster.json` 为发现边界。缓存只用于本机后续观察或处理，
不是完整、不可变或可分发的版本快照。

## 整合

整合类别登记名为 `monsters`，`data.json` 与 `details.{locale}.json` 的字段归属、共享提取与校验边界由
[Monster 单实体实现规则](../data/integration.md#monster-单实体实现规则-nanoka-monster-reference1)统一定义。
成员集合由选定来源版本 `monster.json` 的顶层 key 决定，不扫描详情目录推断；本层不解释数值曲线、
不换算属性编码、不建立单位与关卡引用的闭合校验。顶层详情 ID、`monsterId` 分组编号与 `monsterInfo`
内部单位 ID 分属三个身份层次，只在各自登记的位置核对，不互相推导。
