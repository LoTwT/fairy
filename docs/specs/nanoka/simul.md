# Nanoka Simul 数据规范

## 状态

- 状态：已实现并完成三版本在线及离线验收
- 实体：Simul
- 上游名称：`simul`
- 语言：简体中文（`zh`）和英文（`en`）
- 验证范围：`3.0`、`3.1.5+17516165`、`3.1.12+17625891`
- 领域契约：[Nanoka End Game 领域数据规范](end-game.md)
- 共享契约：[Nanoka 共享来源规范](source.md)

本文只定义 Simul 特有的 node、story event、battle、layer、room、record、合法空值和详情内部图引用。Monster 外键及 Boss/Simul 共享配置由 End Game 领域规范定义。

## 1. 目标

Simul 实现必须：

1. 从 `simul.json` 动态发现全部顶层 Simul ID；
2. 获取每个 ID 的完整 `zh/en` 详情；
3. 保留并验证 node、story event、battle、layer、room 和 record 的嵌套图结构；
4. 区分不同 JSON 层级的同名 `layer_room`；
5. 接受已确认合法的空文本、空对象和空数组；
6. 对已证明命名空间的图引用执行详情内闭合；
7. 对未证明命名空间的引用采用保守验证，不伪造闭合关系；
8. 验证同版本 Monster 外键；
9. 在 Boss 可用时参与共享配置一致性验证。

## 2. 非目标

当前 Simul 模型不包含：

- 将 node、battle、record、layer 或 room 作为独立远端资产；
- 将所有含 `node` 或 `record` 字样的字段归入单一命名空间；
- 强制非零 `prev_node` 在当前详情内闭合；
- 将 `next_record_unlock` 限定为只引用 record；
- 合并 layer 内部和 battle 级别的两个 `layer_room`；
- 将空 `record`、`story_event`、`battle`、buff 或数组视为错误；
- 推导图的玩法流程或解锁算法；
- 从 Boss 网络资源派生 Simul 详情。

## 3. 上游端点与资源发现

```text
GET https://static.nanoka.cc/zzz/{version}/simul.json
GET https://static.nanoka.cc/zzz/{version}/{language}/simul/{simulId}.json
```

当前支持 `zh/en`。顶层详情 ID 只从摘要 key 发现，每个 ID 恰好对应一份中文详情和一份英文详情。

三个已验证版本都包含 `101`、`102`、`201`，但实现不得硬编码该集合。内部 node ID 不是详情资源，代表性 `/zh/simul/10101.json` 请求返回 HTTP 404。

## 4. 摘要与详情最低结构

摘要记录至少包含：

```ts
{
  end: string
}
```

空 `end` 是合法值，不得自动转换为 `null`、缺失字段或派生无限时间。

详情至少包含：

```ts
{
  id: integer
  end_time: string
  boss_adjust: Record<string, unknown>
  record: Record<string, unknown>
  node: Record<string, unknown>
}
```

最低约束：

- `id` 等于摘要 key 和路径 ID；
- `end_time` 是字符串并允许为空；
- 摘要 `end === detail.end_time`；
- `record` 是普通对象并允许为空；
- `node` 是普通对象；
- `boss_adjust` 是普通对象；
- mandatory 字段允许为空时仍不得缺失、为 `null` 或使用错误类型。

## 5. Node 模型

`detail.node` 是以 node ID 为 key 的对象。每个 node 的真实最低字段和类型由实现 fixture 固化，已观察字段包括：

```text
id
name
icon
type
prev_node
story_event
battle
```

契约为：

- node 对象 key 是 canonical node ID；
- 成员 `id` 必须与 key 表示同一 ID；
- `story_event` 和 `battle` 必须是普通对象并允许为空；
- `type` 和 `prev_node` 是跨语言一致的机器字段；
- `name`、`icon` 和其他展示文本可本地化；
- 不根据 node ID 前缀推导所属顶层详情或相邻节点。

## 6. Story event、`next_page` 与 `next_node_unlock`

`story_event` 是 node 内部的分组对象，其外层 group key 属于独立命名空间。每个 group 的成员拥有 story-event member ID。

`next_page` 的真实结构是数组，三版本观察值为空数组或 story-event member ID。它不是未知标量。实现必须保留数组容器，要求其中每个 ID 在当前详情全部 story-event member ID 集合中闭合，并在 `zh/en` 间保持相同数组长度、顺序和值。

三版本样本中，全部非空 `next_node_unlock` 都解析到同一详情中的 story-event group key，而不是顶层 node key。

实现必须：

- 收集当前详情所有 story-event group key 和 story-event member ID；
- 接受空 `next_page` 和空 unlock 集合；
- 要求每个 `next_page` ID 在 story-event member ID 集合中闭合；
- 将每个非空 `next_node_unlock` 验证为合法 ID；
- 要求其在 story-event group key 集合中闭合；
- 不将 `next_page`、`next_node_unlock` 与 node ID 集合比较；
- 在未来出现新合法目标命名空间时先修正规范和 fixture，而不是静默放宽。

## 7. Battle 模型

`battle` 是 node 内部以 battle ID 为 key 的对象。每个 battle 的已观察字段包括：

```text
id
name
tag
tag_type
排名分数相关 buff
layer
selectable_buff
layer_room
```

契约为：

- battle 对象 key 是 canonical battle ID；
- 成员 `id` 必须与 key 表示同一 ID；
- `tag_type`、配置 ID、数值和容器结构跨语言一致；
- 名称、tag 展示内容和 buff 文本可本地化；
- `layer` 与 battle 级 `layer_room` 是不同字段；
- `selectable_buff` 作为 Simul 内嵌配置完整保留；
- 排名相关字段的准确 key 和类型由首次 fixture 固化，不与 Shiyu 字段混用。

## 8. Layer 与两个 `layer_room`

已观察 battle 同时存在：

```text
battle.layer.layer_room
battle.layer_room
```

它们位于不同 JSON 路径：

- `battle.layer.layer_room` 在调研样本中为空对象；
- `battle.layer_room` 保存实际 encounter room。

实现必须：

- 分别解析、保存和验证两个字段；
- 接受 layer 级 `layer_room: {}`；
- 不因 layer 级 room 为空而跳过 battle 级 room；
- 不将两个字段合并或相互覆盖；
- 保留原始路径，以便未来上游启用 layer 级 room 时检测漂移。

## 9. Record 与 `next_record_unlock`

`record` 必须是普通对象并允许为空。record 内成员的 `id` 构成 record ID 集合；除非实际字段证明，不根据 record 外层 key 推导成员 ID。

三版本样本中 11 个 `next_record_unlock` 值：

- 10 个解析到 record 成员 `id`；
- `1010801` 解析到 battle ID；
- 因此目标至少是 `record ID ∪ battle ID`。

实现必须：

- 接受空 unlock 集合；
- 分别收集当前详情的 record ID 和 battle ID；
- 要求每个非空 `next_record_unlock` 在二者并集中闭合；
- 不只检查 record ID；
- 错误明确列出检查过的两个目标命名空间。

未来若证明第三种目标，必须先更新规范再扩展 validator。

## 10. `prev_node` 保守契约

已观察 `prev_node: 0`，以及 `10001001` 至 `10001004` 等无法在当前详情的 node、battle 或 record ID 中闭合的非零值。

当前契约为：

- `0` 是合法 sentinel；
- 非零值必须是安全正整数或等价规范十进制 ID；
- 非零值作为 opaque reference 原样保留；
- 不要求其在当前详情内闭合；
- 不得丢弃、重编号或转换为 `null`；
- 实体验证应统计非零 opaque reference，便于检测结构变化；
- 在目标命名空间得到实际证据前，不建立严格 `prev_node` 外键。

## 11. 合法空值

以下结构已在完整覆盖中确认并必须接受：

```text
end: ""
end_time: ""
record: {}
story_event: {}
battle: {}
battle.layer.layer_room: {}
buff map: {}
unlock or choice array: []
```

字段允许为空不表示字段可以缺失、为 `null` 或改成其他 JSON 类型。

## 12. 摘要、详情与跨语言一致性

每个 Simul 实体必须满足：

- 摘要 ID、中文详情 `id` 和英文详情 `id` 相同；
- 摘要 `end` 与对应详情 `end_time` 相等；
- 中英文详情具有相同 node、story-event group、story-event member、battle 和 record 结构；
- node/battle key 与成员 ID 关系一致；
- `prev_node`、`next_page`、unlock 引用、两个 `layer_room` 路径、Monster ID、配置 ID 和机器数值一致；
- 对象 key、数组长度、容器类型和标量 JSON 类型递归一致；
- node、battle、tag、故事、buff 和 encounter 展示文本允许不同。

## 13. Monster 与 Boss 共享配置

所有实际 encounter room 的 `monster_list.*.id` 由：

```text
simul-monster-reference/v1
```

解析到同版本 Monster 摘要。

Simul 中的 `boss_adjust`、`layer_buff` 和 `selectable_buff` 完整保留，并在 Boss 存在时参与：

```text
boss-simul-boss-adjust-consistency/v1
boss-simul-buff-consistency/v1
```

Simul 可以拥有 Boss 中没有的 buff ID。只刷新 Simul 时，可以 carried-forward 合法 Boss 资产，但发布前仍须运行共享配置 validator。

## 14. 漂移与拒绝条件

以下情况必须拒绝发布：

- 摘要、详情覆盖或顶层 ID 不闭合；
- 摘要 `end` 与详情 `end_time` 不一致；
- node 或 battle key 与成员 `id` 不一致；
- mandatory container 缺失、为 `null` 或类型错误；
- `next_page` 不是数组、包含未在 story-event member ID 集合闭合的 ID，或跨语言值不一致；
- `next_node_unlock` 未在 story-event group key 闭合；
- `next_record_unlock` 未在 record/battle ID 并集闭合；
- 两个 `layer_room` 被错误合并或结构不成立；
- `zh/en` 图结构或机器字段不一致；
- Monster 或 Boss/Simul 共享配置 validator 失败。

非零 `prev_node` 无法内部闭合本身不构成失败，只要符合 opaque positive ID 契约。

## 15. 测试矩阵

自动化测试至少覆盖：

- 摘要发现，不硬编码当前三个 ID；
- 空 `end/end_time`、空 `record`、空 `story_event`、空 `battle`、空 buff 和空数组；
- story event `next_page` 数组类型、空数组、member ID 闭合及跨语言一致性；
- node/battle key 与成员 ID 一致及失败；
- `next_node_unlock` 对 story-event group key 闭合；
- `next_record_unlock` 对 record ID 和 battle ID 两种成功路径；
- `1010801` 一类 battle 目标；
- `prev_node=0` 和不闭合的合法非零 opaque ID；
- 明确区分两个 `layer_room`；
- `zh/en` 图结构、引用、配置和机器字段一致；
- Monster 与 Boss/Simul validator；
- Simul 独有 buff ID 合法；
- 定向重跑、历史 epoch 升级、carried-forward 和原子失败保护。

## 16. 上游验证证据

2026-07-27 完整检查三个版本的 9 条摘要记录和 18 份 `zh/en` 详情。每个版本均包含：

- 3 个顶层详情；
- 20 个 node；
- 59 个 battle；
- 59 个 layer；
- 59 个 populated battle-level room map；
- 5 个 populated record；
- 121 个 Monster 引用。

三版本共确认：

- 363 个 Monster 引用全部解析到同版本 Monster 摘要；
- 6 个 `next_node_unlock` 全部解析到 story-event group key；
- `next_page` 在全部样本中均为数组，取值为空或 story-event member ID，所有非空引用都在当前详情中闭合；
- 11 个 `next_record_unlock` 中 10 个解析到 record ID，1 个 `1010801` 解析到 battle ID；
- 非零 `prev_node` `10001001` 至 `10001004` 未在已知内部 ID 集合中闭合；
- `101` 的空结束时间和空 `record` 合法；
- 两个同名 `layer_room` 位于不同层级且承担不同观察结构。

这些计数用于说明契约依据，不是实现中的固定阈值。

## 17. 已知不确定性

尚未证明：

- 非零 `prev_node` 的目标命名空间；
- `next_record_unlock` 字段名与联合目标的业务语义；
- record 外层 key 的身份语义；
- layer 级 `layer_room` 未来是否会被填充；
- story-event group 是否永远是 `next_node_unlock` 的唯一目标；
- Boss/Simul 公共配置是否来自未公开的共享资源。

实现不得通过猜测形成更严格或更宽松的永久关系。

## 18. 实现验收

Simul 已满足以下验收条件：

1. 正式 adapter、URL allowlist、注册表和六实体历史 epoch 已实现，当前正常发布使用七实体 epoch；
2. 自动化测试覆盖图结构、合法空值、两个 `layer_room`、story event `next_page` 数组和三类既有引用契约；
3. `simul-monster-reference/v1` 可在线及离线执行；
4. Boss/Simul 两个共享配置 validator 按领域实施顺序保留到 Boss 可用时，在计划第 8 项统一启用；
5. `zh/en` 全量覆盖与实体内部一致性通过；
6. 定向抓取发布当前完整版本级七实体组合快照；
7. 实际在线抓取、缓存复用、离线 verify 和失败保护通过；
8. raw cache、公共 API 和包边界保持不变；
9. 规范索引和本文状态已更新为实际验证结果。

2026-07-28 验收证据：

- `pnpm check` 通过，共 70 项测试，并通过包验证；
- 从合法六实体快照分别使用 `--entity simul` 升级 `3.0`、`3.1.5+17516165` 和 `3.1.12+17625891`，均成功发布七实体快照；
- 三版本资源总数依次为 1138、1168、1168，carried-forward 资源数依次为 1130、1160、1160；
- 三次首次定向升级均为上游 manifest 收到 1 个 HTTP 304，并新获取 7 个 Simul 资产；重复执行 `3.0` 定向升级时，8 个网络资源均收到 HTTP 304，1130 个未选实体资源继续 carried-forward；
- 三版本离线 verify 均通过；
- `shiyu-monster-reference/v1` 检查计数依次为 5462、5710、5710，`simul-monster-reference/v1` 均为 242，所有版本未解析引用数均为 0；
- 在 disposable 副本中篡改 `en/simul/101` 的嵌套 Monster ID 后，离线验证同时报告字节数与 SHA-256、跨语言机器字段、Simul 实体验证与 summary、跨实体引用验证错误，正式快照保持不变；
- ignored raw cache、公共 API 与 npm 包边界未改变。
