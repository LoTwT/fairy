# Nanoka Boss 数据说明

## 状态

- 上游实体：`boss`
- 状态：已完成代表性结构调研，可由共享抓取器缓存；整合类别 `boss` 已按规则
  `nanoka-boss-reference/1` 接入生产快照
- 抓取器仍不执行 Boss 字段级语义验证；整合器按该规则独立校验已登记结构，字段归属、结构变体与
  严格公共时间字段见[来源数据整合规范](../data/integration.md#boss-单实体实现规则-nanoka-boss-reference1)

## 资源

```text
GET https://static.nanoka.cc/zzz/{version}/boss.json
GET https://static.nanoka.cc/zzz/{version}/{language}/boss/{bossId}.json
```

`bossId` 从索引顶层 key 动态发现。当前详情语言为 `zh`、`en`。

## 已观察结构

- 索引是以 Boss ID 为 key 的普通对象。
- 索引记录包含排序权重（`sort`）与 `zh`/`en`/`ja`/`ko` 名称，以及轮换时间 `begin`/`end` 与
  `live_begin`/`live_end`（本地 3.1 的 44 条全部为轮换记录）。这些字段与详情是两个独立来源，
  同名值不要求相等，也不互相回退。整合器登记这组已知顶层字段并对其余字段生成维护诊断，
  不校验类型或必需性。
- 详情顶层包含名称、`priority`、`boss_adjust`、`zone_type`、`begin_time`/`end_time` 与 `modes`；
  历史 3.0 缓存使用顶层 `zone` 字典代替 `modes`，两者互斥，按实际字段识别。
- 详情中英文名称在类内完全同名（本地 3.1 全部 44 条的名称各自相同）；名称不作为公开身份，
  公开读取以来源 ID 为身份。
- `modes` 是 mode 条目数组，顺序保持来源原样；mode 内的关卡结构与 Shiyu 的 `zone` 阶段同源、
  字段集相同（含 `selectable_buff`，无 `child` 与 `ss_rank_goal`），但按类别各自独立登记。
- 顶层 `zone_type` 与 mode 的 `zone_type` 是两个独立字段（本地 3.1 有 3 条记录两者不同），不要求相等。
- `boss_adjust` 是以数值 key 的字典，条目为 `{hp, atk, points}`；`atk` 可为负值，数值原样保留。
- Monster 身份来自 `monster_list.*.id`，不是外层 entry key；encounter 的名称、图片、弱点与关卡数值
  全部保留，不能替换成纯外键。

调研时 `3.0` 缓存使用顶层 `zone` 的旧结构，`3.1.12+17625891` 使用 `modes`（41 条单 mode、3 条双 mode）。
当前抓取器不验证 mode 唯一性、时间配对或 Monster 引用；整合器同样不强制这些关系，Monster 引用只在
真实验收中与同版本 Monster 索引核对并报告。

## 与 End Game 的关系

Shiyu 与 Simul、Boss 同属 End Game 领域，共享观察见 [End Game 数据说明](end-game.md)。Boss 与 Simul
观察到同版本共享配置（`boss_adjust` 等）；当前样本未证明两个子域共享顶层实体 ID 或存在顶层直接引用。
公开读取 API 也不会因 zone 中的 Monster 引用自动加载 Monster。

## 本地缓存

```text
packages/data/raw/nanoka/{version}/
├── boss.json
├── zh/boss/{bossId}.json
└── en/boss/{bossId}.json
```

缓存目录中可能保留旧详情；资源集合必须以当前 `boss.json` 为发现边界。缓存只用于本机后续观察或处理，
不是完整、不可变或可分发的版本快照。

## 整合

整合类别登记名为 `boss`，`data.json` 与 `details.{locale}.json` 的字段归属、结构变体与校验边界由
[Boss 单实体实现规则](../data/integration.md#boss-单实体实现规则-nanoka-boss-reference1)统一定义。
成员集合由选定来源版本 `boss.json` 的顶层 key 决定，不扫描详情目录推断；本层不解释评级目标语义、
不换算时间、不建立 mode 唯一性或 Monster 引用闭合校验。`modes`（或旧结构 `zone`）完整留在各语言
details，不拆分为跨语言公共关卡图，也不提前抽取与 Simul 的共享配置制品。
