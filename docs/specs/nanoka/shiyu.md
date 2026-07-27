# Nanoka Shiyu 数据规范

## 状态

- 状态：已完成全量上游调研与结构建模，尚未实现
- 实体：Shiyu
- 上游名称：`shiyu`
- 语言：简体中文（`zh`）和英文（`en`）
- 验证范围：`3.0`、`3.1.5+17516165`、`3.1.12+17625891`
- 领域契约：[Nanoka End Game 领域数据规范](end-game.md)
- 共享契约：[Nanoka 共享来源规范](source.md)

本文只定义 Shiyu 特有的时间字段、zone 发现、parent/child 关系、room 结构和实体内部一致性。Monster 外键、跨实体 validator、快照和发布边界由 End Game 领域及共享来源规范定义。

## 1. 目标

Shiyu 实现必须：

1. 从 `shiyu.json` 动态发现全部顶层 Shiyu ID；
2. 获取每个 ID 的完整 `zh/en` 详情；
3. 支持摘要中多种合法时间字段组合；
4. 只从详情 `zone` 对象 key 发现 zone；
5. 验证详情内部的 child zone 引用闭合；
6. 正确接受重复 `stage_num`；
7. 正确接受没有 room、但拥有 child 的父 zone；
8. 验证 encounter 最低结构和同版本 Monster 外键；
9. 支持定向网络更新并参与完整版本级发布。

## 2. 非目标

当前 Shiyu 模型不包含：

- 将 zone 作为独立远端资产或快照实体；
- 从顶层详情 ID、数字前缀或 `stage_num` 推导 zone ID；
- 要求 `stage_num` 在单个详情内唯一；
- 要求每个 zone 直接包含 encounter room；
- 将 `live_begin/live_end` 等同于详情 `begin_time/end_time`；
- 解释排名目标、buff 或时间字段的玩法语义；
- 与 Boss 建立通用 zone 或 stage 模型。

## 3. 上游端点与资源发现

```text
GET https://static.nanoka.cc/zzz/{version}/shiyu.json
GET https://static.nanoka.cc/zzz/{version}/{language}/shiyu/{shiyuId}.json
```

当前支持 `zh/en`。顶层详情 ID 必须只从摘要对象 key 发现，并按数值升序稳定排序。每个摘要 ID 恰好对应一份中文详情和一份英文详情。

内部 zone 不是独立详情资源。代表性请求 `/zh/shiyu/6205401.json` 返回 HTTP 404，实现不得为 zone ID 发起网络请求。

已验证版本的顶层记录数为：

| 版本              | 记录数 |
| ----------------- | -----: |
| `3.0`             |     56 |
| `3.1.5+17516165`  |     59 |
| `3.1.12+17625891` |     59 |

两个 `3.1` 版本新增了 `620541`、`620551`、`620561` 等更长 ID，实体 ID 长度不得硬编码。

## 4. 摘要时间字段

摘要记录可能包含：

```text
begin
end
live_begin
live_end
```

已观察到四种合法组合：

1. 两组都不存在；
2. 只有 `live_begin/live_end`；
3. 两组同时存在；
4. 只有 `begin/end`。

最低契约为：

- `begin` 与 `end` 必须同时存在或同时缺失；
- `live_begin` 与 `live_end` 必须同时存在或同时缺失；
- 两组时间相互独立；
- 缺少任一组或两组都缺少均可合法；
- 时间字段存在时必须是字符串；
- 不根据当前 ID 或记录生命周期硬编码字段组合。

当摘要存在 `begin/end` 时，详情必须存在 `begin_time/end_time`，并分别完全相等。摘要只有 live 时间时，不要求详情复制为普通时间。

## 5. 详情最低结构

每份 Shiyu 详情至少包含：

```ts
{
  id: integer
  zone: Record<string, ShiyuZone>
  begin_time?: string
  end_time?: string
}
```

其中：

- `id` 的十进制字符串必须等于摘要 key 和路径 ID；
- `zone` 必须是非空普通对象；
- `begin_time/end_time` 必须同时存在或同时缺失；
- 详情时间存在时必须是字符串；
- 其他未识别字段完整保留。

每个 zone 至少需要按真实 fixture 校验以下已观察字段及准确类型：

```text
name
stage_num
monster_level
layer_buff
child
layer_room
goal_type
排名目标相关字段
```

首次实现必须用最小 fixture 固化这些字段的真实容器和标量类型，但不得把 Shiyu 特有字段提升为所有 End Game 子域的共享结构。

## 6. Zone 身份与发现

`detail.zone` 的对象 key 是 canonical zone ID。

实现必须：

- 通过 `Object.entries(detail.zone)` 发现全部 zone；
- 使用对象 key 作为 zone 身份和 child 引用目标；
- 在错误中同时报告 Shiyu 顶层 ID 和 zone ID；
- 按数值升序稳定处理 zone key，但不改变原始响应。

不得：

- 拼接顶层详情 ID 和 `stage_num` 构造 zone ID；
- 要求 zone ID 以完整顶层详情 ID 开头；
- 用 `stage_num` 或数组位置代替 zone key；
- 根据 ID 位数推导父子关系。

真实反例中，Shiyu `620541` 的 zone 使用 `6205401` 等 key，不以完整详情 ID `620541` 开头。

## 7. Parent/child 关系

每个 zone 的 `child` 保存当前详情内的 zone 引用。具体容器类型由首次 fixture 按上游结构校验；其每个非空引用必须解析到同一详情的 `zone` key 集合。

必须拒绝：

- child 指向不存在的 zone；
- child 只能在另一份 Shiyu 详情中解析；
- 将 `stage_num` 当作 child ID；
- 非法或错误类型的 child 引用。

`stage_num` 不要求唯一。已观察到一个 stage 5 父 zone 及其三个 child zone 都使用 `stage_num: 5`，因此任何以 `stage_num` 为 key 的实现都会丢失记录。

## 8. Room 与合法空结构

zone 的 `layer_room` 必须按真实 fixture 验证为普通对象，并允许为空。

合法结构包括：

- 父 zone 的 `child` 非空；
- 同一父 zone 的 `layer_room` 为空；
- child zone 保存实际 encounter room。

实现不得要求每个 zone 直接包含 Monster。只对实际存在的 room 验证 encounter 最低结构和 Monster 引用。

字段允许为空不表示字段可以缺失、为 `null` 或改成错误容器类型。

## 9. 摘要、详情与跨语言一致性

每个 Shiyu 实体必须满足：

- 摘要 ID、中文详情 `id` 和英文详情 `id` 相同；
- 摘要普通时间与详情普通时间在适用时相等；
- 中英文详情具有相同 zone ID 集合；
- 对应 zone 的 child 引用、`stage_num`、`monster_level`、`goal_type`、room key 和机器数值一致；
- 对应 encounter 的 `monsterListEntryKey` 集合和嵌套 Monster ID 一致；
- 对象 key、容器类型、数组长度和标量 JSON 类型递归一致；
- 本地化名称、目标描述、buff 文本和 encounter 展示文本允许不同。

数组若具有上游顺序，比较时保留原顺序，不得排序后掩盖结构漂移。

## 10. Monster 引用

所有实际 room 中的 `monster_list.*.id` 必须由：

```text
shiyu-monster-reference/v1
```

解析到同版本 Monster 摘要 ID 集合。

外层 key 只能使用中性名称 `monsterListEntryKey`，不得命名为 Monster ID。重复引用同一 Monster 合法。

## 11. 漂移与拒绝条件

以下情况必须拒绝发布：

- 摘要为空、ID 非法或 `zh/en` 详情覆盖不闭合；
- 详情 `id` 与摘要或路径不一致；
- 时间字段只出现成对字段之一；
- 摘要普通时间与详情普通时间不一致；
- `zone` 缺失、为空或不是普通对象；
- child 引用未在当前详情闭合；
- mandatory container 缺失、为 `null` 或类型错误；
- `zh/en` 的 zone、child、room 或非本地化结构不一致；
- Monster 外键或组合快照中的其他适用 validator 失败。

摘要数量、具体 ID、zone 数量、`stage_num` 分布和文本变化不作为硬编码拒绝阈值；发生变化时应报告并重新评审最低结构。

## 12. 测试矩阵

自动化测试至少覆盖：

- 从摘要 key 数值排序发现 ID，接受不同长度 ID；
- 拒绝空摘要、非法 ID、缺失或多余详情；
- 四种已观察时间字段组合；
- 成对时间字段缺失和摘要—详情时间不一致；
- 只从 `zone` key 发现 zone；
- `620541` 一类非完整前缀 zone；
- 重复 `stage_num` 不覆盖记录；
- child 在当前详情闭合及缺失目标失败；
- 父 zone 空 `layer_room` 与 child room 合法；
- `zh/en` zone、child、room 和机器字段一致；
- 本地化文本差异合法；
- Monster validator 成功和失败；
- 定向重跑、历史 epoch 升级、carried-forward 和原子失败保护。

## 13. 上游验证证据

2026-07-27 完整检查三个版本的 174 条摘要记录和 348 份 `zh/en` 详情：

- 每个摘要 ID 都具有完整中英文详情；
- 同 ID 中英文详情的递归 JSON 结构一致；
- `3.0` 包含 410 个 zone，两个 `3.1` 版本各包含 434 个 zone；
- child 引用数分别为 48、57、57，全部在同一详情内闭合；
- `3.1` 中只有 410/434 个 zone ID 以完整详情 ID 开头，其余 24 个来自 `620541`、`620551`、`620561`，证明前缀不是身份契约；
- 已确认重复 `stage_num` 和父 zone 空 room、child zone 有 room 的结构；
- 三版本分别检查 2,731、2,855、2,855 个 Monster 引用，全部解析到同版本 Monster 摘要；
- 所有 `monsterListEntryKey` 都不等于对应嵌套 Monster ID。

这些计数用于说明契约依据，不是实现中的固定阈值。

## 14. 已知不确定性

尚未证明：

- zone ID 各数字位的业务编码；
- 重复 `stage_num` 的准确玩法语义；
- 排名目标字段之间的计算关系；
- 无时间记录的生命周期类型；
- 未来是否可能出现经过上游定义的跨详情 child 引用。

当前实现应拒绝跨详情 child 漂移，而不是自动猜测其新语义。

## 15. 实现验收

Shiyu 只有同时满足以下条件才算完成：

1. 正式 adapter、URL allowlist、注册表和历史 epoch 已实现；
2. 自动化测试覆盖时间变体、zone key、重复 `stage_num`、child 闭合和合法空 room；
3. `shiyu-monster-reference/v1` 可在线及离线执行；
4. `zh/en` 全量覆盖与实体内部一致性通过；
5. 定向抓取仍发布当前完整版本级组合快照；
6. 实际在线抓取、缓存复用、离线 verify 和失败保护通过；
7. raw cache、公共 API 和包边界保持不变；
8. 规范索引和本文状态更新为实际验证结果。
