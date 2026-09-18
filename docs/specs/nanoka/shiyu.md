# Nanoka Shiyu 数据说明

## 状态

- 上游实体：`shiyu`
- 状态：已完成代表性结构调研，可由共享抓取器缓存；整合类别 `shiyu` 已按规则
  `nanoka-shiyu-reference/1` 接入生产快照
- 抓取器仍不执行 Shiyu 字段级语义验证；整合器按该规则独立校验已登记结构，字段归属、条件公共时间字段与
  zone 结构见[来源数据整合规范](../data/integration.md#shiyu-单实体实现规则-nanoka-shiyu-reference1)

## 资源

```text
GET https://static.nanoka.cc/zzz/{version}/shiyu.json
GET https://static.nanoka.cc/zzz/{version}/{language}/shiyu/{shiyuId}.json
```

`shiyuId` 从索引顶层 key 动态发现。当前详情语言为 `zh`、`en`。

## 已观察结构

- 索引是以 Shiyu ID 为 key 的普通对象。
- 索引记录包含排序权重（`sort`）与 `zh`/`en`/`ja`/`ko` 名称；轮换记录另有 `begin`/`end` 与
  `live_begin`/`live_end` 时间字符串（本地 3.1 为 57 条轮换与 2 条常驻）。这些字段与详情是两个独立来源，
  同名值不要求相等，也不互相回退。整合器登记这组已知顶层字段并对其余字段生成维护诊断，不校验类型或必需性。
- 详情包含名称、排序权重、可选开放时间与完整 `zone` 关卡结构；常驻记录没有时间字段是合法情况。
- 详情中英文名称在类内大量重名（本地 3.1 的剧变节点类各 56 条同名）；名称不作为公开身份，
  公开读取以来源 ID 为身份。
- `zone` 的阶段从顶层 `zone` 对象 key 发现，不能由详情 ID 或 `stage_num` 推导。
- `stage_num` 不保证全局唯一（本地 3.1 有 8 个序号被多条记录重复使用）。
- zone 可以包含 parent/child、room、buff 和 Monster encounter 等嵌套结构。
- Monster 身份来自 `monster_list.*.id`，不是外层 entry key；encounter 的名称、图片、弱点与关卡数值
  全部保留，不能替换成纯外键。

调研时 `3.0` 索引包含 56 条记录，`3.1.12+17625891` 包含 59 条。当前抓取器不验证时间字段配对、child 闭合、
room 结构或 Monster 引用；整合器同样不强制这些关系，Monster 引用只在真实验收中与同版本 Monster 索引核对
并报告（本地 3.1 的 141 个引用 ID 全部闭合）。

## 与 End Game 的关系

Shiyu 与 Simul、Boss 同属 End Game 领域，共享观察见 [End Game 数据说明](end-game.md)。当前样本未证明
三个子域共享顶层实体 ID 或存在顶层直接引用；公开读取 API 也不会因 zone 中的 Monster 引用自动加载 Monster。

## 本地缓存

```text
packages/data/raw/nanoka/{version}/
├── shiyu.json
├── zh/shiyu/{shiyuId}.json
└── en/shiyu/{shiyuId}.json
```

缓存目录中可能保留旧详情；资源集合必须以当前 `shiyu.json` 为发现边界。缓存只用于本机后续观察或处理，
不是完整、不可变或可分发的版本快照。

## 整合

整合类别登记名为 `shiyu`，`data.json` 与 `details.{locale}.json` 的字段归属、条件公共时间字段与校验边界由
[Shiyu 单实体实现规则](../data/integration.md#shiyu-单实体实现规则-nanoka-shiyu-reference1)统一定义。
成员集合由选定来源版本 `shiyu.json` 的顶层 key 决定，不扫描详情目录推断；本层不解释评级目标语义、
不换算时间、不建立 parent/child 闭合或 Monster 引用闭合校验。`zone` 完整留在各语言 details，
不拆分为跨语言公共关卡图。
