# Nanoka Boss 数据规范

## 状态

- 状态：已完成全量上游调研与版本分支建模，尚未实现
- 实体：Boss
- 上游名称：`boss`
- 语言：简体中文（`zh`）和英文（`en`）
- 验证范围：`3.0`、`3.1.5+17516165`、`3.1.12+17625891`
- 领域契约：[Nanoka End Game 领域数据规范](end-game.md)
- 共享契约：[Nanoka 共享来源规范](source.md)

本文只定义 Boss 特有的摘要时间、legacy `zone`、current `modes`、mode ID、`zone_type` 和实体内部一致性。Monster 外键及 Boss/Simul 共享配置由 End Game 领域规范定义。

## 1. 目标

Boss 实现必须：

1. 从 `boss.json` 动态发现全部顶层 Boss ID；
2. 获取每个 ID 的完整 `zh/en` 详情；
3. 支持 legacy `zone` 和 current `modes` 两种真实详情分支；
4. 以结构分支而不是固定版本或 ID 白名单选择 validator；
5. 明确区分 Boss 顶层实体 ID、mode ID 和 zone ID；
6. 支持一个详情中的一个或多个 mode；
7. 按实际层级分别保存和验证顶层及 mode `zone_type`；
8. 支持摘要和详情的合法时间字段变体；
9. 验证同版本 Monster 外键；
10. 与 Simul 共同验证共享配置。

## 2. 非目标

当前 Boss 模型不包含：

- 将 mode 或 zone 作为独立远端资产或快照实体；
- 假设所有版本只使用顶层 `zone`；
- 假设所有版本只使用 `modes`；
- 假设一个详情只能有一个 mode；
- 假设 mode ID 必须等于顶层 Boss ID；
- 假设顶层 `zone_type` 与所有嵌套 mode `zone_type` 相等；
- 根据 zone ID 前缀发现 zone；
- 解释 `zone_type` 的业务枚举；
- 将 Boss 作为 Simul 共享配置的权威来源；
- 直接复用历史只支持 `detail.zone` 的旧实现。

## 3. 上游端点与资源发现

```text
GET https://static.nanoka.cc/zzz/{version}/boss.json
GET https://static.nanoka.cc/zzz/{version}/{language}/boss/{bossId}.json
```

当前支持 `zh/en`。Boss 顶层 ID 只从摘要 key 发现，并按数值升序稳定排序。

已验证版本的顶层记录数为：

| 版本              | 记录数 |
| ----------------- | -----: |
| `3.0`             |     41 |
| `3.1.5+17516165`  |     44 |
| `3.1.12+17625891` |     44 |

两个 `3.1` 版本新增 `690421`、`690431`、`690441`。其内部 alternate mode ID `690422`、`690432`、`690442` 不在摘要中，且代表性 `/zh/boss/690422.json` 返回 HTTP 404。mode ID 不得进入详情请求队列。

## 4. 摘要最低结构与时间字段

摘要记录包含用于发现和一致性检查的本地化名称、时间及类型信息；首次实现必须以真实 fixture 固化准确最低字段和类型。已观察字段包括：

```text
begin
end
live_begin
live_end
zone_type
```

契约为：

- `zone_type` 是跨语言一致的机器值；
- `begin/end` 必须同时存在或同时缺失；
- `live_begin/live_end` 必须同时存在或同时缺失；
- 普通时间和 live 时间是相互独立的字段组；
- 缺少普通时间或全部时间字段可以合法；
- 不根据 Boss ID 或 `zone_type` 硬编码时间字段组合；
- 不由摘要 `zone_type` 推导 mode 数量或所有嵌套 mode 的类型。

## 5. 详情公共最低结构

每份详情至少包含：

```ts
{
  id: integer
  zone_type: integer
  boss_adjust: Record<string, unknown>
  begin_time?: string
  end_time?: string
  // 恰好一个结构分支：zone 或 modes
}
```

最低约束：

- `id` 等于摘要 key 和路径 ID；
- `zone_type` 是机器值，并在 `zh/en` 间相等；
- `boss_adjust` 是普通对象；
- `begin_time/end_time` 同时存在或同时缺失；
- `zone` 与 `modes` 必须恰好存在一个；
- 同时存在、同时缺失或出现未经规范确认的第三分支均拒绝。

当摘要存在 `begin/end` 时，详情必须存在对应普通时间并完全相等。live 时间不替代普通时间。

## 6. Legacy `zone` 分支

`3.0` 的全部 41 个详情使用：

```text
detail.zone
```

每个详情的 zone 从对象 key 发现。三版本通用实现不得依赖当前观察到的固定 zone 数量、`stage_num` 集合或 ID 前缀发现资源。

legacy 分支必须验证：

- `zone` 是非空普通对象；
- zone key 是 canonical zone ID；
- `stage_num` 和其他机器字段满足真实 fixture 类型；
- encounter room 结构和 Monster 引用完整；
- `zh/en` zone key 集合和非本地化结构一致。

`3.0` 当前每详情三个 zone、`stage_num` 为 1/2/3、zone ID 以 Boss ID 开头，这些只作为历史 fixture 的漂移证据，不提升为所有版本的发现规则。

## 7. Current `modes` 分支

两个 `3.1` 版本的全部 44 个详情都使用：

```text
detail.modes
```

原有 41 个详情也从 legacy `zone` 变为 one-mode `modes`，因此不能把该分支视为只属于新增记录。

每个 mode 至少包含：

```ts
{
  id: integer
  zone_type: integer
  zone: Record<string, unknown>
}
```

契约为：

- `modes` 是非空数组；
- mode ID 在同一详情内唯一；
- mode ID 是内部 ID，不要求等于顶层 Boss ID；
- 每个 mode 的 `zone_type` 独立保存和验证；
- 每个 mode 的 zone 只从其 `zone` 对象 key 发现；
- mode 数组顺序是跨语言结构的一部分；
- 不为 mode ID 构造详情请求；
- 不将多个 mode 的 zone 合并为丢失 mode 边界的单一 map。

当前三版本证据支持每个 `modes` 详情至少存在一个 mode 的 `id` 等于顶层详情 ID。首次实现可以验证该关系并将其作为漂移检测；若未来真实数据打破，应先修正规范，而不是派生或补造 mode。

## 8. 多 Mode 记录与 `zone_type`

两个 `3.1` 版本均观察到：

| 顶层 Boss ID | Alternate mode ID | Alternate `zone_type` | Same-ID mode `zone_type` |
| ------------ | ----------------: | --------------------: | -----------------------: |
| `690421`     |          `690422` |                `1002` |                   `1001` |
| `690431`     |          `690432` |                `1002` |                   `1001` |
| `690441`     |          `690442` |                `1002` |                   `1001` |

这些详情的顶层 `zone_type` 为 `1002`，但 same-ID mode 的 `zone_type` 为 `1001`。因此：

- 顶层和 mode `zone_type` 是不同层级字段；
- 不要求顶层值等于 same-ID mode 或全部 mode；
- 不得用顶层值覆盖嵌套值；
- 不根据 `zone_type` 推导 mode ID、mode 数量或 zone 数量；
- `1001/1002` 是已观察值，不是永久允许值枚举。

不同 mode 可以拥有不同 zone 数量。alternate mode 是当前详情内的业务对象，不是第二个 Boss 实体。

## 9. Zone 身份与 encounter

无论 legacy 还是 modes 分支：

- zone 对象 key 是 canonical zone ID；
- `stage_num` 不是身份；
- zone 必须保留所属 mode 边界；
- 不从顶层 ID、mode ID、数字前缀或 `stage_num` 拼接生成 zone ID；
- 如果上游没有成员 `id`，实现不得将派生 ID 写成原始字段。

所有适用 zone/room 中的 `monster_list.*.id` 由：

```text
boss-monster-reference/v1
```

解析到同版本 Monster 摘要。同一详情的不同 mode 可以引用同一 Monster，encounter 数值无需相等。

## 10. Boss 内部及 Boss/Simul 配置

Boss 详情中的 `boss_adjust`、`layer_buff` 和 `selectable_buff` 必须完整保留。

实现先验证同版本同语言 Boss 详情内部的 `boss_adjust` 副本一致，再参与：

```text
boss-simul-boss-adjust-consistency/v1
boss-simul-buff-consistency/v1
```

不得在抓取或 staging 中只保留第一个副本、删除重复字段、用 Simul 覆盖 Boss，或因为值重复而改变原始 JSON。

## 11. 摘要、详情与跨语言一致性

每个 Boss 实体必须满足：

- 摘要 ID、中文详情 `id` 和英文详情 `id` 相同；
- 摘要普通时间与详情普通时间在适用时相等；
- 中英文详情使用相同的 `zone` 或 `modes` 分支；
- modes 分支的数组长度、顺序、mode ID、mode `zone_type` 和 zone key 集合一致；
- legacy 分支的 zone key 集合一致；
- `stage_num`、room key、Monster ID、配置 ID、时间和机器数值一致；
- 对象 key、容器类型、数组长度和标量 JSON 类型递归一致；
- 名称、描述、buff 文本、属性标签和 encounter 展示文本允许不同。

一个语言使用 `zone`、另一个使用 `modes` 必须明确失败。

## 12. 漂移与拒绝条件

以下情况必须拒绝发布：

- 摘要、详情覆盖或顶层 ID 不闭合；
- 时间字段只出现成对字段之一，或摘要—详情普通时间不一致；
- `zone` 与 `modes` 同时存在或同时缺失；
- legacy `zone` 结构不成立；
- `modes` 为空、mode ID 重复或 mode 最低结构不成立；
- mode ID 被错误当作独立详情资源；
- 顶层和 mode `zone_type` 被折叠或跨语言不一致；
- zone 不是从对象 key 发现；
- `zh/en` 结构分支、mode、zone 或机器字段不一致；
- Monster 或 Boss/Simul 共享配置 validator 失败。

具体 mode 数量、zone 数量、ID、`zone_type` 值和文本变化不作为硬编码阈值；变化时应报告并重新评审结构契约。

## 13. 测试矩阵

自动化测试至少覆盖：

- `3.0` legacy `zone` 和 `3.1` current `modes`；
- `zone`/`modes` 排他分支成功与失败；
- one-mode 和 two-mode 详情；
- alternate mode ID 不在摘要且不产生网络请求；
- mode ID 唯一、可不同于顶层 ID；
- 顶层 `zone_type` 与 same-ID mode 不同仍合法；
- 顶层值不得覆盖 mode 值；
- 不同 mode 可拥有不同 zone 数量；
- zone 只从对象 key 发现；
- 时间字段变体和摘要—详情一致性；
- `zh/en` 分支、mode 顺序、zone 和机器字段一致；
- Monster、Boss 内部配置及 Boss/Simul validator；
- 定向重跑、历史 epoch 升级、carried-forward 和原子失败保护。

## 14. 上游验证证据

2026-07-27 完整检查三个版本的 129 条摘要记录和 258 份 `zh/en` 详情：

| 版本              | 顶层详情 | `zone` 详情 | `modes` 详情 | mode 总数 |
| ----------------- | -------: | ----------: | -----------: | --------: |
| `3.0`             |       41 |          41 |            0 |       N/A |
| `3.1.5+17516165`  |       44 |           0 |           44 |        47 |
| `3.1.12+17625891` |       44 |           0 |           44 |        47 |

两个 `3.1` 版本中：

- 41 个详情有一个 mode；
- 3 个详情有两个 mode；
- 44 个 mode ID 等于顶层 Boss ID；
- 3 个 alternate mode ID 为 `690422`、`690432`、`690442`；
- alternate mode 详情请求返回 404；
- 三版本分别检查 123、135、135 个 Monster 引用，全部解析到同版本 Monster 摘要；
- 中英文详情的结构分支、mode 和递归 JSON 结构一致。

历史 Git 中只假设 `detail.zone` 的实现只能作为旧版本证据，不能作为当前 adapter 基础。

这些计数用于说明契约依据，不是实现中的固定阈值。

## 15. 已知不确定性

尚未证明：

- `zone_type` 的准确业务枚举；
- 顶层 `zone_type` 与各 mode 类型的业务关系；
- modes 数组顺序的玩法语义；
- 未来是否可能没有 same-ID mode 或出现三个以上 mode；
- zone ID 前缀是否由上游保证；
- 时间缺失对应的生命周期；
- Boss 是否是共享配置的上游来源。

实现必须支持已证明结构，不得围绕未知语义生成派生 API。

## 16. 实现验收

Boss 只有同时满足以下条件才算完成：

1. 正式 adapter、URL allowlist、注册表和历史 epoch 已实现；
2. 自动化测试覆盖 legacy/current 分支、two-mode、alternate mode 和 `zone_type` 层级；
3. `boss-monster-reference/v1` 可在线及离线执行；
4. Boss 内部和 Boss/Simul 共享配置 validator 已启用；
5. `zh/en` 全量覆盖与实体内部一致性通过；
6. 定向抓取仍发布当前完整版本级组合快照；
7. 实际在线抓取、缓存复用、离线 verify 和失败保护通过；
8. 历史 `detail.zone`-only 代码没有被直接复制；
9. raw cache、公共 API 和包边界保持不变；
10. 规范索引和本文状态更新为实际验证结果。
