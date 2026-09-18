# Nanoka Simul 数据说明

## 状态

- 上游实体：`simul`
- 状态：已完成代表性结构调研，可由共享抓取器缓存；整合类别 `simul` 已按规则
  `nanoka-simul-reference/1` 接入生产快照
- 抓取器仍不执行 Simul 字段级语义验证；整合器按该规则独立校验已登记结构，字段归属、严格公共时间字段与
  图结构边界见[来源数据整合规范](../data/integration.md#simul-单实体实现规则-nanoka-simul-reference1)

## 资源

```text
GET https://static.nanoka.cc/zzz/{version}/simul.json
GET https://static.nanoka.cc/zzz/{version}/{language}/simul/{simulId}.json
```

`simulId` 从索引顶层 key 动态发现。当前详情语言为 `zh`、`en`。

## 已观察结构

- 索引是以 Simul ID 为 key 的普通对象；本地 3.1 有 3 条记录（101、102、201）。
- 索引记录只包含轮换结束时间 `end`（可为空字符串）。它与详情的 `end_time` 是两个独立来源，
  同名值不要求相等，也不互相回退。整合器登记这组已知顶层字段并对其余字段生成维护诊断，
  不校验类型或必需性。
- 详情顶层包含 `id`、`end_time`、`boss_adjust`、`record` 与 `node`；没有顶层 name，公开读取以来源 ID
  为身份，`end_time` 为空字符串是合法原值（本地 3.1 成员 101 两语言均为空串）。
- `node` 是剧情节点字典，条目含 `id`、`name`、`icon`、`type`、`prev_node`、`story_event` 与 `battle`；
  节点名称在记录间大量重复（本地 3.1 成员 101 与 102 的节点名称逐条相同）。
- `story_event` 是事件 key → 页面字典的两层结构；页面含 `choice` 选项数组与 `next_page`、
  `next_node_unlock`、`next_record_unlock` 三个解锁列表，三者指向不同目标集合。
- `battle` 条目含 `layer`（关卡对象）、`layer_room`（房间字典）、`selectable_buff` 与三个
  `*_rank_score_layer_buff` 增益字典；`layer.layer_room` 本地 3.1 观察为空字典，encounter 位于
  battle 级 `layer_room`。
- `record` 是结局记录字典，条目含 `id`、`name`、`desc`、`text` 与 `icon`；空字典合法（成员 101）。
- Monster 身份来自 `monster_list.*.id`，不是外层 entry key；encounter 的名称、图片、弱点与关卡数值
  全部保留，不能替换成纯外键。

调研时 `3.0`、`3.1.12+17625891` 与当前 3.1 均为 3 条顶层记录。当前抓取器不验证图闭合、解锁目标、
Monster 引用或与 Boss 的共享配置；整合器同样不强制这些关系，Monster 引用只在真实验收中与同版本 Monster
索引核对并报告（本地 3.1 的 82 个引用 ID 全部闭合）。

## 与 End Game 的关系

Shiyu 与 Simul、Boss 同属 End Game 领域，共享观察见 [End Game 数据说明](end-game.md)。Boss 与 Simul
观察到同版本共享配置：本地 3.1 中 Simul 的 `boss_adjust` 158 个条目与 Boss 完全相交且逐条相等（zh/en
两种语言均一致）。该结论只进入验收报告：两个类别分别保留各自副本，不跨类别去重、覆盖或建立加载依赖；
配置差异不得通过选边、补齐或覆盖原值消除。公开读取 API 也不会因 zone 中的 Monster 引用自动加载 Monster。

## 本地缓存

```text
packages/data/raw/nanoka/{version}/
├── simul.json
├── zh/simul/{simulId}.json
└── en/simul/{simulId}.json
```

缓存目录中可能保留旧详情；资源集合必须以当前 `simul.json` 为发现边界。缓存只用于本机后续观察或处理，
不是完整、不可变或可分发的版本快照。

## 整合

整合类别登记名为 `simul`，`data.json` 与 `details.{locale}.json` 的字段归属、图结构边界与校验边界由
[Simul 单实体实现规则](../data/integration.md#simul-单实体实现规则-nanoka-simul-reference1)统一定义。
成员集合由选定来源版本 `simul.json` 的顶层 key 决定，不扫描详情目录推断；本层不解释评级目标语义、
不换算时间、不建立图连通性、解锁目标闭合或 Monster 引用闭合校验。`record` 与 `node` 完整留在各语言
details，不拆分为跨语言公共结构，也不提前抽取与 Boss 的共享配置制品。
