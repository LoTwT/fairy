# Nanoka Monsters 数据规范

## 状态

- 状态：已实现并验证
- 实体：Monsters
- 上游名称：`monster`
- 语言：简体中文（`zh`）和英文（`en`）
- 验证范围：`3.0`、`3.1.5+17516165`、`3.1.12+17625891`
- 共享契约：[Nanoka 共享来源规范](source.md)

本文只定义 Monsters 特有的端点、资源发现、最低结构、多层 ID、实体内部一致性、测试和验收要求。版本选择、HTTP、缓存、快照清单、原子发布、版本锁、CLI、包边界和合规要求统一遵循共享来源规范。

## 1. 目标

Monsters 实现必须：

1. 获取指定版本的 Monster 摘要数据；
2. 从摘要动态发现全部 Monster 实体 ID；
3. 获取每个 Monster 的中文和英文详情；
4. 保留摘要与详情的远端原始字节和所有未识别字段；
5. 明确区分 Monster 实体 ID、主战斗单位 ID 和详情内部战斗单位 ID；
6. 验证摘要与详情覆盖、详情内部战斗单位关系以及中英文非本地化结构；
7. 正确接受已确认的空文本、空图标、空标签内容、空属性对象和空 `monster_info`；
8. 为 End Game → Monster 跨实体引用验证提供稳定的 Monster 实体 ID 集合，跨实体规则由 End Game 领域规范维护。

## 2. 非目标

当前 Monsters 实现不包含：

- Shiyu、Boss、Simul 或 End Game 整体一致性验证；
- 日文或韩文详情；
- 下载 Monster 图片或其他静态资源；
- 解释 `element_abnormal` 数字 key、`group_id`、战斗单位 `type` 或 `tag` 的业务枚举；
- 将内部战斗单位拆分为独立远端资产或独立快照实体；
- 把 End Game `monster_list` 的外层 key 当成 Monster 实体 ID 或已经证明的战斗单位 ID；
- 冻结当前战斗单位 ID 集合、曲线长度或属性字段全集；
- 将原始记录转换为 `@randomplay/core` 的计算输入。

## 3. 上游端点

### 3.1 Monster 摘要

```text
GET https://static.nanoka.cc/zzz/{version}/monster.json
```

预期顶层为以规范十进制 Monster 实体 ID 为 key 的非空对象。摘要记录至少包含：

```ts
{
  zh: string
  en: string
  group: integer
  rarity: integer
  icon: string
  desc: string
}
```

已观察到的 `ja`、`ko`、`tag` 和 `tag2` 等其他字段继续按原始字节保留，但当前 `zh/en` 实现不依赖它们。`tag` 和 `tag2` 在已验证版本中为 `null`，不得因其为空而拒绝摘要。

### 3.2 Monster 详情

```text
GET https://static.nanoka.cc/zzz/{version}/{language}/monster/{monsterId}.json
```

当前支持语言：

```text
zh
en
```

Monster 实体 ID 必须从 `monster.json` 的顶层 key 动态发现，不维护硬编码 ID 列表。

详情至少包含：

```ts
{
  id: integer
  monster_id: integer
  name: string
  desc: string
  rarity: integer
  group_id: integer
  group_desc: string
  image_path: string
  card_obtain: string
  card_quote: string
  card_skill_desc: string
  element_abnormal: Record<string, integer>
  monster_info: Record<string, MonsterBattleUnit>
}
```

## 4. 资源发现与排序

一次完整 Monsters 实体抓取包括：

1. 一份 `monster.json` 摘要；
2. 摘要中每个 Monster 实体 ID 对应的一份中文详情；
3. 摘要中每个 Monster 实体 ID 对应的一份英文详情。

资源发现和排序必须满足：

- 摘要顶层是非空普通对象；
- 每个摘要 key 匹配 `/^(0|[1-9]\d*)$/`；
- 每个摘要 value 是普通对象并满足最低字段结构；
- ID 按数值升序稳定排序，不依赖上游对象插入顺序，也不要求连续；
- 每个摘要 ID 恰好对应一份 `zh` 详情和一份 `en` 详情；
- 详情目录和清单中不得出现摘要不存在的 ID；
- 任意必需资源缺失时不得发布快照。

无 `--entity` 的共享抓取命令处理全部当前支持实体；`--entity monster` 只重新获取 Monsters，但最终仍发布包含当前全部支持实体的完整版本级组合快照。

## 5. 三层 ID 模型

Monsters 必须明确区分以下三种 ID。

### 5.1 Monster 实体 ID

```text
monster.json 外层 key
= 详情 URL 和本地路径中的 monsterId
= 详情顶层 id 的十进制字符串
```

这是共享快照中的 `entityId`，也是 End Game Monster 外键的目标 ID。

### 5.2 主战斗单位 ID

详情顶层 `monster_id` 是主战斗单位 ID 或合法哨兵值 `0`，不是 Monster 实体 ID。实现不得要求 `monster_id === id`。

已验证数据满足：

- `monster_info` 为空对象时，`monster_id` 为 `0`；
- `monster_info` 非空时，`monster_id` 通常选择其中一个战斗单位，但存在真实特殊记录引用同一编号空间中的其他主单位，因此不得要求它在当前详情的 `monster_info` key 中闭合。

### 5.3 内部战斗单位 ID

`monster_info` 是以战斗单位 ID 为 key 的普通对象，不是数组：

```text
monster_info 外层 key
= 对应成员 id 的十进制字符串
```

一个 Monster 实体可以包含零个、一个或多个战斗单位。内部战斗单位不创建独立远端资产，不进入版本级 `entities`，也不使用共享清单中的 `entityId`。

## 6. 详情最低结构

### 6.1 顶层标量和文本

每份详情必须满足：

- `id` 是安全整数，其十进制字符串等于摘要 key、URL ID 和本地路径 ID；
- `monster_id`、`rarity` 和 `group_id` 是整数；
- `monster_id` 非负；
- `name`、`desc`、`group_desc`、`image_path`、`card_obtain`、`card_quote` 和 `card_skill_desc` 是字符串；
- 文本字段允许为空字符串；
- `element_abnormal` 和 `monster_info` 是普通对象。

`element_abnormal` 的每个 key 必须是规范正十进制字符串，每个值必须是整数。当前观察到的具体 key 集合不作为永久业务契约。

### 6.2 战斗单位

每个非空 `monster_info` 成员至少包含：

```ts
{
  id: integer
  code_name: string
  type: string
  icon: string
  tag: string[]
  element: {
    physical: integer
    fire: integer
    ice: integer
    electric: integer
    ether: integer
    wind: integer
  }
  curves: {
    hp: BattleUnitCurve
    attack: BattleUnitCurve
    defence: BattleUnitCurve
    stun: BattleUnitCurve
  }
  stats: Record<string, unknown>
}

type BattleUnitCurve = {
  ratio: integer
  curve: integer[]
}
```

约束如下：

- 外层 key 是规范正十进制战斗单位 ID；
- 成员 `id` 是安全正整数，并与外层 key 相等；
- `code_name`、`type` 和 `icon` 是字符串，`icon` 允许为空；
- `tag` 是字符串数组，数组成员允许为空字符串；
- `element` 必须包含六种已观察元素的整数字段；
- `curves` 必须包含 `hp`、`attack`、`defence`、`stun` 四项；
- 每项曲线的 `ratio` 是整数，`curve` 是非空整数数组；
- `stats` 是普通对象并允许为空；
- 当前普通 `stats` 的完整字段集合和曲线长度只用于漂移观察，不作为最低结构硬编码。

### 6.3 合法空值

以下形态已经在完整资源覆盖中确认，必须被接受：

- `monster_info: {}`；
- `stats: {}`；
- `card_quote: ""`；
- `desc: ""`；
- `card_skill_desc: ""`；
- 战斗单位 `icon: ""`；
- `tag` 数组中的空字符串。

这些规则只表示字段值允许为空，不表示字段可以缺失、为 `null`、改为数组或使用其他错误类型。

## 7. 摘要、详情与跨语言一致性

每个 Monster 必须满足：

- 摘要 ID、中文详情 `id` 和英文详情 `id` 相同；
- `summary.zh === zhDetail.name`；
- `summary.en === enDetail.name`；
- `summary.group === zhDetail.group_id === enDetail.group_id`；
- `summary.rarity === zhDetail.rarity === enDetail.rarity`；
- 中英文详情具有相同的对象字段集合、容器类型、数组长度和标量 JSON 类型；
- 中英文详情的实体 ID、主战斗单位 ID、稀有度、分组 ID、`element_abnormal`、战斗单位 ID 集合、元素数值、曲线数值和 stats 数值结构一致。

本地化字段不要求跨语言逐值相同，包括顶层名称、描述、分组描述和卡片文案，以及战斗单位中尚未证明为非本地化语义的字符串字段。实现不得通过比较完整原始对象来错误拒绝合法翻译差异。

## 8. End Game 引用边界

三版本全量样本确认 Shiyu、Boss 和 Simul 的 `monster_list` 嵌套记录都包含可解析到同版本 Monster 摘要的 `id`。End Game 领域规范将该嵌套 `id` 定义为 Monster 实体外键，并登记对应的跨实体 validator。

`monster_list` 的外层 key：

- 在已检查记录中从不等于嵌套 Monster `id`；
- 不能命名为 Monster 实体 ID；
- 当前也没有足够证据将其正式命名为战斗单位 ID；
- 在 End Game 正式规范中应继续使用中性名称，例如 `monsterListEntryKey`。

跨实体 validator 的稳定 ID、适用 epoch 和检查规则由 [End Game 领域数据规范](end-game.md) 统一定义。

## 9. 本地文件与清单

Monsters 资源保存为：

```text
packages/data/raw/nanoka/{version}/
├── monster.json
├── zh/
│   └── monster/
│       └── {monsterId}.json
└── en/
    └── monster/
        └── {monsterId}.json
```

共享版本目录还包含上游 `manifest.json`、版本级 `fetch-manifest.json` 和其他已支持实体。远端 JSON 按共享来源规范保存原始响应字节。

Monsters 使用 `nanoka-fetch-manifest/v2` 的通用实体资产：

| 资源 | kind            | 稳定 asset ID                                  | localPath                             |
| ---- | --------------- | ---------------------------------------------- | ------------------------------------- |
| 摘要 | `entity-index`  | `entity-index:monster`                         | `monster.json`                        |
| 详情 | `entity-detail` | `entity-detail:monster:{language}:{monsterId}` | `{language}/monster/{monsterId}.json` |

实体级摘要使用 `summary.entities.monster`。内部战斗单位数量不加入共享 summary。

Monsters 加入注册表时，以下曾实际发布的完整 v2 实体集合继续作为显式冻结的历史 epoch 严格可读：

```text
character, equipment
character, equipment, weapon
character, equipment, weapon, bangboo
```

Monster 引入阶段的新发布快照必须包含当时的完整集合：

```text
character, equipment, weapon, bangboo, monster
```

在该阶段，`--entity monster` 可以从合法四实体历史 epoch 构建五实体完整 staging。较早 epoch 必须同时请求全部缺失实体；任意未登记子集仍必须拒绝。当前注册表和定向重跑规则由共享来源规范维护。

## 10. 漂移与拒绝条件

同版本内容变化按共享来源规范记录逐资源 SHA-256、字节数和 ETag 漂移。Monsters 额外关注摘要数量、Monster 实体 ID 集合、每详情战斗单位 ID 集合和曲线结构变化。

以下情况必须拒绝发布：

- 摘要为空或最低字段结构不成立；
- Monster 实体 ID、详情覆盖或路径不闭合；
- 详情最低结构或字段类型不成立；
- `monster_info` key 与成员 `id` 不一致；
- 空 `monster_info` 使用了非零 `monster_id`；
- 摘要与详情关系或跨语言非本地化关系不成立；
- 组合快照中的任一其他实体或适用 validator 验证失败。

非空摘要数量变化、内部战斗单位增删、文本变化、空文本位置变化、完整 stats 字段集合变化和曲线长度变化应明确报告或由最低结构重新评审；只要当前最低结构和一致性仍成立，不因历史具体 ID、计数或长度不同而自动拒绝。

## 11. 模块职责

`packages/data/scripts/nanoka/monster.ts` 负责：

- 校验 `monster.json` 的最低结构；
- 动态发现并稳定排序 Monster 实体 ID；
- 为 `zh/en` 构造详情资源；
- 校验详情顶层字段、合法空值、战斗单位结构和三层 ID 关系；
- 校验摘要与详情以及跨语言非本地化结构关系。

`monster` adapter 由共享实体注册表在 `character`、`equipment`、`weapon`、`bangboo` 之后登记。共享注册表显式冻结所有合法历史 v2 epoch；共享 `policy.ts` 只接受注册实体的索引和详情路径；共享 `snapshot.ts` 负责版本级组合 staging、清单、分层离线验证和发布。Monster 字段规则不得移入共享层。

## 12. 测试矩阵

### 12.1 资源发现与最低结构

- 从摘要 key 生成按数值升序排序的 Monster 实体 ID；
- 拒绝空摘要、非法 ID 和非对象摘要记录；
- 为每个 ID 生成 `zh/en` 两项详情资源；
- 拒绝详情 ID 与摘要、URL 或路径不一致；
- 拒绝缺失或多余详情；
- 校验摘要、详情、`element_abnormal`、`monster_info`、元素、曲线和 stats 的最低类型；
- 接受空文本、空战斗单位图标、空 stats 和空 `monster_info`；
- 拒绝把合法空值位置替换为缺失、`null`、数组或错误类型；
- 不硬编码当前实体 ID、战斗单位 ID、stats 字段全集或曲线长度。

### 12.2 ID 与跨语言一致性

- 校验 Monster 实体 ID 与详情 `id`；
- 校验 `monster_info` 外层 key 与成员 `id`；
- 校验空 `monster_info` 使用 `monster_id=0`；
- 接受非空 `monster_info` 中未在当前 key 集合闭合的合法主战斗单位 ID；
- 校验中英文摘要名称以及分组和稀有度；
- 校验中英文非本地化数值结构；
- 允许本地化文本不同；
- 任一关系失败时阻止 staging 发布并保留旧快照。

### 12.3 多实体快照

- Monster 引入阶段的全量抓取生成五实体稳定注册顺序；
- 合法两实体、三实体和四实体历史 v2 epoch 继续通过只读验证；
- 任意其他实体子集仍被拒绝；
- `--entity monster` 从合法四实体 epoch 升级为当时的五实体完整快照；
- 更早 epoch 只有同时请求全部缺失实体时才能升级；
- 升级时未选实体不发 HTTP 请求，只复制重新验证通过的资产；
- Monster 定向重跑整体重建其索引和详情；
- summary、validation、资产实体集合和 manifest epoch 严格闭合；
- `not-modified` 与 `carried-forward` 的语义保持分离。

### 12.4 包边界

- Monsters raw cache 不进入 Git 或 npm tarball；
- `monster.ts` 和维护脚本不进入 npm tarball；
- `@randomplay/data` 不增加对 `@randomplay/core` 的依赖；
- `packages/data/src/index.ts` 保持空公开导出。

自动化测试使用 mock fetch、临时目录和最小 fixture，不依赖真实 Nanoka 站点。

## 13. 上游验证证据

2026-07-27 对以下版本执行了低频、只读的完整 `zh/en` 资源覆盖与最低结构检查：

| 版本              | 摘要记录 | zh 详情 | en 详情 | 实体原始 JSON 总字节 |
| ----------------- | -------: | ------: | ------: | -------------------: |
| `3.0`             |      288 |     288 |     288 |           12,824,587 |
| `3.1.5+17516165`  |      293 |     293 |     293 |           13,296,037 |
| `3.1.12+17625891` |      293 |     293 |     293 |           13,207,623 |

共检查 3 份摘要和 1,748 份 Monster 详情：

- 全部必需响应为 HTTP 200 且可解析为 JSON；
- 全部详情 ID 覆盖与摘要一致，无缺失或额外 ID；
- 三版本所有同 ID zh/en 详情的递归 JSON 结构一致；
- `monster_info` 每详情包含 0 至 26 个战斗单位，证明详情到战斗单位是一对多关系；
- 所有 `monster_info` 外层 key 都与对应成员 `id` 一致；
- 已确认 `monster_id=0` 和空 `monster_info` 的合法哨兵形态；
- 已确认非空 `monster_info` 中存在主战斗单位 ID 不在当前 key 集合内的真实特殊记录，因此未建立错误的无条件闭合约束；
- 已确认空文本、空图标、空标签内容和空 stats；
- 单份详情最大约 247 KiB，现有共享响应大小限制足够；
- 全部响应都观察到 ETag、Last-Modified、`Content-Type: application/json` 和 `Cache-Control: max-age=120`。

为确认引用边界，还只读检查了三版本全部中文 End Game 详情：

- Shiyu 的 8,441 个 `monster_list` 嵌套记录；
- Boss 的 393 个嵌套记录；
- Simul 的 363 个嵌套记录。

全部嵌套 `id` 都可解析到同版本 Monster 摘要，所有外层 key 都不等于嵌套 `id`。这些结果构成 End Game 领域 Monster 外键契约的证据。

这些计数和观测用于说明契约依据，不是实现中的硬编码阈值。

随后使用本地 `3.0` 四实体历史 v2 快照完成了 `--entity monster` 到五实体 v2 快照的原子迁移，并验证了：

- 最终快照包含 57 条 Character、28 条 Equipment、93 条 Weapon、40 条 Bangboo 和 288 条 Monster；
- Monster 的 288 份中文详情和 288 份英文详情完整；
- 首次定向迁移发布 1,018 个资源，其中 440 个未选实体资源为 `carried-forward`，上游 manifest 返回 HTTP 304，无内容漂移；
- 重复 Monster 定向抓取产生 578 个 HTTP `not-modified` 和 440 个 `carried-forward`，无内容漂移；
- 五实体全量重抓产生 1,018 个 HTTP `not-modified`，没有 `carried-forward` 或内容漂移；
- 最终快照共 25,305,908 字节，每轮发布后的严格离线 verify 均通过；
- 合法两实体、三实体和四实体历史 v2 epoch，以及历史 v1 Agents 快照，继续通过只读离线验证；
- 自动化 typecheck、57 项单元测试和仓库级检查通过。

## 14. 验收标准

Monsters 实现只有同时满足以下条件才算完成：

1. 正式规范与已验证上游结构、多层 ID 和合法空值一致；
2. Monster adapter、路径政策、四实体历史 v2 epoch 和当前注册表顺序已实现；
3. 自动化测试覆盖最低结构、三层 ID、一对多战斗单位、合法空值、跨语言一致性、历史 epoch 升级和失败保护；
4. 合法两实体、三实体和四实体历史 v2 快照仍可只读验证，任意子集仍被拒绝；
5. 对 Monster 引入阶段的实际四实体快照执行 `--entity monster` 后发布五实体完整组合快照；
6. 定向迁移中未选实体没有发起 HTTP 请求，且其资产按共享规则 carried-forward；
7. 重复抓取验证条件请求、304 复用、漂移报告和原子失败保护；
8. 离线 verify 对最终快照通过，并能在测试副本中检测篡改和内部关系错误；
9. package check 和仓库检查通过；
10. raw cache、公共 API 和 core 依赖边界保持不变；
11. 规范索引、包 README 和本文状态更新为实际验证结果。

以上条件均已完成，Monsters 状态更新为“已实现并验证”。
