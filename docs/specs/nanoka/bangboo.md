# Nanoka Bangboos 数据规范

## 状态

- 状态：已实现并验证
- 实体：Bangboos
- 上游名称：`bangboo`
- 语言：简体中文（`zh`）和英文（`en`）
- 验证范围：`3.0`、`3.1.5+17516165`、`3.1.12+17625891`
- 共享契约：[Nanoka 共享来源规范](source.md)

本文只定义 Bangboos 特有的端点、资源发现、最低结构、合法空值、内部引用、一致性、测试和验收要求。版本选择、HTTP、缓存、快照清单、原子发布、版本锁、CLI、包边界和合规要求统一遵循共享来源规范。

## 1. 目标

Bangboos 实现必须：

1. 获取指定版本的 Bangboo 摘要数据；
2. 从摘要动态发现全部 Bangboo ID；
3. 获取每个 Bangboo 的中文和英文详情；
4. 保留摘要与详情的远端原始字节和所有未识别字段；
5. 验证摘要、详情、成长数据、技能结构和抓取清单之间的一致性；
6. 正确接受已确认的空图标、空成长阶段、空技能等级和空技能属性结构；
7. 验证明确识别的文件内部技能引用，不错误建立尚未支持的 Item/Material 跨实体关系。

## 2. 非目标

当前 Bangboos 实现不包含：

- Monsters（`monster`）或 End Game 子域；
- 日文或韩文详情；
- 下载 Bangboo 图标或其他图片资源；
- 将材料 ID 解释为已支持实体，或校验其跨实体引用闭合；
- 完整解析技能 `param` 表达式语言；
- 根据空字段推断 Bangboo 是否可升级、是否有技能或是否属于特殊类型；
- 对占位文本、名称、描述或其他本地化内容做清洗和质量修复；
- 将原始记录转换为 `@randomplay/core` 的计算输入。

成长材料属于当前未登记的 Item/Material 数据域。上游 manifest 的新增 item 信息不是完整资源索引，在建立经过验证的正式实体前不得注册材料跨实体 validator。

## 3. 上游端点

### 3.1 Bangboo 摘要

```text
GET https://static.nanoka.cc/zzz/{version}/bangboo.json
```

预期顶层为以规范十进制 Bangboo ID 为 key 的非空对象。摘要记录至少包含：

```ts
{
  icon: string
  rank: integer
  codename: string
  en: string
  desc: string
  ko: string
  zh: string
  ja: string
}
```

`icon` 可以是空字符串。`codename` 不保证与详情 `code_name` 相等，也不保证始终是英文。`ja`、`ko` 可以包含上游占位文本。首期不完整建模摘要记录，上游新增字段必须按原始字节保留。

### 3.2 Bangboo 详情

```text
GET https://static.nanoka.cc/zzz/{version}/{language}/bangboo/{id}.json
```

当前支持语言：

```text
zh
en
```

Bangboo ID 必须从 `bangboo.json` 的顶层 key 动态发现，不维护硬编码 ID 列表。

详情至少包含：

```ts
{
  id: integer
  code_name: string
  name: string
  desc: string
  rarity: integer
  icon: string
  stats: BangbooStats
  level: Record<string, BangbooLevelStage>
  skill: {
    a: {
      level: Record<string, BangbooSkillLevel>
    }
    b: {
      level: Record<string, BangbooSkillLevel>
    }
    c: {
      level: Record<string, BangbooSkillLevel>
    }
  }
  skill_prop: Record<string, BangbooSkillProperty>
}
```

## 4. 资源发现与排序

一次完整 Bangboos 实体抓取包括：

1. 一份 `bangboo.json` 摘要；
2. 摘要中每个 ID 对应的一份中文详情；
3. 摘要中每个 ID 对应的一份英文详情。

资源发现和排序必须满足：

- 摘要顶层是非空普通对象；
- 每个摘要 key 匹配 `/^(0|[1-9]\d*)$/`；
- 每个摘要 value 是普通对象并满足最低字段结构；
- ID 按数值升序稳定排序，不要求连续；
- 每个摘要 ID 恰好对应一份 `zh` 详情和一份 `en` 详情；
- 详情目录和清单中不得出现摘要不存在的 ID；
- 任意必需资源缺失时不得发布快照。

无 `--entity` 的共享抓取命令处理全部当前支持实体；`--entity bangboo` 只重新获取 Bangboos，但最终仍发布包含当前全部支持实体的完整版本级组合快照。

## 5. 详情最低结构

### 5.1 标识与标量字段

每份详情必须满足：

- `id` 是安全整数，其十进制字符串等于摘要 key、URL ID 和本地路径 ID；
- `code_name`、`name`、`desc`、`icon` 是字符串；
- `rarity` 是整数；
- `icon` 可以是空字符串，不要求以图片扩展名结尾；
- `stats`、`level`、`skill`、`skill_prop` 是普通对象。

### 5.2 属性数据

`stats` 至少包含以下整数字段：

```ts
{
  endurance: integer
  hp_max: integer
  hpupgrade: integer
  attack: integer
  attack_upgrade: integer
  break_stun: integer
  element_abnormal_power: integer
  defence: integer
  def_upgrade: integer
  crit: integer
  pen_ratio: integer
  crit_dmg: integer
}
```

当前观察到的具体数值和范围不属于长期契约。

### 5.3 成长阶段

`level` 必须是普通对象，并允许整体为空对象。

存在的每个成长阶段：

- key 必须是规范正十进制整数；
- value 必须是普通对象；
- `hp_max`、`attack`、`defence`、`level_max`、`level_min` 是整数；
- `materials` 和 `extra` 是普通对象。

`materials`：

- 允许为空对象；
- 每个 key 是规范正十进制整数；
- 每个数量是正整数；
- 只校验序列化结构，不解释材料业务身份。

`extra`：

- 允许为空对象；
- 每个 key 是规范正十进制整数；
- 每个记录的 `prop` 和 `value` 是整数；
- `name` 和 `format` 是字符串；
- 外层 key 必须等于嵌套 `prop` 的十进制字符串。

当前非空记录使用阶段 key `1` 至 `6`，但实现不得把具体阶段集合提升为所有未来版本的固定契约。

### 5.4 技能等级

`skill` 必须恰好包含 `a`、`b`、`c` 三个槽位。每个槽位：

- 是普通对象；
- 必须包含普通对象 `level`；
- `level` 可以合法为空对象。

存在的每个技能等级：

- key 是规范正十进制整数；
- value 是普通对象；
- `name`、`desc`、`param` 是字符串；
- `property` 是字符串数组。

合法空技能结构特指槽位的 `level` 为空对象，不表示已观察到的技能等级记录可以缺失 `param`、使用 `null` 或使用错误类型。

### 5.5 技能属性与内部引用

`skill_prop` 必须是普通对象，并允许整体为空对象。

存在的每个技能属性记录：

- 外层 key 是规范正十进制整数；
- value 是普通对象；
- 必须包含普通对象 `1001` 和 `1002`；
- `1001/1002.main`、`growth` 是整数，`format` 是字符串；
- `element_accumulation_value` 是整数。

实现只识别技能 `param` 中明确出现的 `Skill:{id}, Prop:{id}` 引用。每个被识别的 `Skill` ID 必须存在于同一详情的 `skill_prop` 中，对应 `Prop` 必须存在于该技能属性记录中。其他表达式保持原始内容，不声明已完整理解其语法。

## 6. 合法空值

以下空值形态已经在完整资源覆盖中确认，必须被接受：

- 摘要和详情 `icon` 可以是空字符串；
- `level` 可以是空对象；
- `skill.a.level`、`skill.b.level`、`skill.c.level` 可以是空对象；
- `skill_prop` 可以是空对象；
- 成长阶段的 `materials` 和 `extra` 可以是空对象。

不允许将以上规则泛化为字段可缺失、可为 `null`、可为数组或可使用错误类型。实现不得硬编码当前出现空结构的具体 ID。

## 7. 摘要与详情一致性

每个 Bangboo 必须满足：

- 摘要 ID、中文详情 `id` 和英文详情 `id` 相同；
- `summary.zh === zhDetail.name`；
- `summary.en === enDetail.name`；
- `summary.desc === enDetail.desc`；
- `summary.rank === zhDetail.rarity === enDetail.rarity`；
- `summary.icon === zhDetail.icon === enDetail.icon`，包括合法空字符串；
- 中英文详情的 ID、稀有度、图标、属性数值、成长数值结构、材料结构、技能属性数值结构和空结构位置一致。

本地化字段不要求跨语言相同，包括名称、描述、成长额外属性名称、技能名称、技能描述、`property` 文本以及含本地化单位的 `param`。

摘要 `codename` 与详情 `code_name` 存在真实不一致，不得直接比较，也不得通过去空格、去引号或语言转换后强行匹配。

## 8. 本地文件与清单

Bangboos 资源保存为：

```text
packages/data/raw/nanoka/{version}/
├── bangboo.json
├── zh/
│   └── bangboo/
│       └── {id}.json
└── en/
    └── bangboo/
        └── {id}.json
```

共享版本目录还包含上游 `manifest.json`、版本级 `fetch-manifest.json` 和其他已支持实体。远端 JSON 按共享来源规范保存原始响应字节。

Bangboos 使用 `nanoka-fetch-manifest/v2` 的通用实体资产：

| 资源 | kind            | 稳定 asset ID                                 | localPath                            |
| ---- | --------------- | --------------------------------------------- | ------------------------------------ |
| 摘要 | `entity-index`  | `entity-index:bangboo`                        | `bangboo.json`                       |
| 详情 | `entity-detail` | `entity-detail:bangboo:{language}:{entityId}` | `{language}/bangboo/{entityId}.json` |

实体级摘要使用 `summary.entities.bangboo`。

Bangboos 加入注册表时，以下曾实际发布的完整 v2 实体集合继续作为显式冻结的历史 epoch 严格可读：

```text
character, equipment
character, equipment, weapon
```

Bangboo 引入阶段的新发布快照必须包含当时的完整集合：

```text
character, equipment, weapon, bangboo
```

在该阶段，`--entity bangboo` 可以从合法三实体历史 epoch 构建四实体完整 staging。两实体历史 epoch 缺少未选的 Weapon，只有同时请求 `weapon` 和 `bangboo` 才能升级；任意未登记子集仍必须拒绝。当前注册表和定向重跑规则由共享来源规范维护。

## 9. 漂移与拒绝条件

同版本内容变化按共享来源规范记录逐资源 SHA-256、字节数和 ETag 漂移。Bangboos 额外记录摘要数量与 ID 集合变化。

以下情况必须拒绝发布：

- 摘要为空或最低字段结构不成立；
- ID、详情覆盖或路径不闭合；
- 详情最低结构或字段类型不成立；
- 已确认的摘要与详情关系或跨语言非本地化关系不成立；
- 已识别的文件内部技能引用不能闭合；
- 合法空值被替换为缺失、`null` 或错误类型；
- 组合快照中的任一其他实体或适用 validator 验证失败。

非空摘要数量变化、合法空值位置变化、文本变化和占位文本只作为漂移或质量观察信号，不单独阻止发布，只要最低结构与一致性仍通过。

已观察到：

- `3.0` 到 `3.1.5+17516165` 新增两个 ID，并首次出现合法空图标和空成长/技能结构；
- `3.1.5+17516165` 到 `3.1.12+17625891` ID 集合不变，但一个记录的代号、描述和本地化文本发生变化。

实现不得依赖这些具体版本、ID 或当前计数。

## 10. 模块职责

`packages/data/scripts/nanoka/bangboo.ts` 负责：

- 校验 `bangboo.json` 的最低结构；
- 动态发现并稳定排序 Bangboo ID；
- 为 `zh/en` 构造详情资源；
- 校验详情属性、成长、技能、合法空值和文件内部引用；
- 校验摘要与详情以及跨语言非本地化结构关系。

`bangboo` adapter 由共享实体注册表在 `character`、`equipment`、`weapon` 之后登记。共享注册表显式冻结所有合法历史 v2 epoch；共享 `policy.ts` 只接受注册实体的索引和详情路径；共享 `snapshot.ts` 负责版本级组合 staging、清单、分层离线验证和发布。Bangboos 字段规则不得移入共享层。

## 11. 测试矩阵

### 11.1 资源发现与最低结构

- 从摘要 key 生成按数值升序排序的 Bangboo ID；
- 拒绝空摘要、非法 ID 和非对象摘要记录；
- 为每个 ID 生成 `zh/en` 两项详情资源；
- 拒绝详情 ID 与摘要、URL 或路径不一致；
- 拒绝缺失或多余详情；
- 校验摘要、详情、stats、成长阶段、材料、extra、技能等级和技能属性字段类型；
- 接受空字符串 icon、空 level、空技能 level、空 skill_prop、空 materials 和空 extra；
- 拒绝将合法空对象位置替换为缺失、`null`、数组或错误类型；
- 不要求阶段或技能 ID 连续，也不硬编码当前 ID 集合。

### 11.2 一致性与内部引用

- 校验中英文名称与摘要语言名称；
- 校验英文描述、稀有度和允许为空的图标；
- 校验中英文非本地化数值结构和空结构位置一致；
- 不比较摘要 `codename` 与详情 `code_name`；
- 校验成长 extra 外层 key 与 `prop`；
- 校验明确识别的 `Skill/Prop` 引用在同一详情闭合；
- 任一关系失败时阻止 staging 发布并保留旧快照。

### 11.3 多实体快照

- Bangboo 引入阶段的全量抓取生成四实体稳定注册顺序；
- 合法两实体和三实体历史 v2 epoch 继续通过只读验证；
- 任意其他实体子集仍被拒绝；
- `--entity bangboo` 从合法三实体 epoch 升级为当时的四实体完整快照；
- 两实体 epoch 仅请求 Bangboo 时拒绝，联合请求 Weapon 与 Bangboo 时允许升级；
- 升级时未选实体不发 HTTP 请求，只复制重新验证通过的资产；
- Bangboo 定向重跑整体重建其索引和详情；
- summary、validation、资产实体集合和 manifest epoch 严格闭合；
- `not-modified` 与 `carried-forward` 的语义保持分离。

### 11.4 包边界

- Bangboos raw cache 不进入 Git 或 npm tarball；
- `bangboo.ts` 和维护脚本不进入 npm tarball；
- `@randomplay/data` 不增加对 `@randomplay/core` 的依赖；
- `packages/data/src/index.ts` 保持空公开导出。

自动化测试使用 mock fetch、临时目录和最小 fixture，不依赖真实 Nanoka 站点。

## 12. 上游验证证据

2026-07-27 对以下版本执行了低频、串行、只读的完整 `zh/en` 资源覆盖与最低结构检查：

| 版本              | 摘要记录 | zh 详情 | en 详情 | 实体总字节 |
| ----------------- | -------: | ------: | ------: | ---------: |
| `3.0`             |       40 |      40 |      40 |  1,257,191 |
| `3.1.5+17516165`  |       42 |      42 |      42 |  1,299,050 |
| `3.1.12+17625891` |       42 |      42 |      42 |  1,298,190 |

共检查 3 份摘要和 248 份详情：

- 全部必需响应为 HTTP 200 且可解析为 JSON；
- 全部详情 ID 覆盖与摘要一致，无缺失或额外 ID；
- 全部记录满足本文定义的最低字段类型和摘要与详情关系；
- 已确认合法空值的精确 JSON 形态均为空字符串或空对象，没有观察到对应字段缺失、`null` 或空数组；
- 在最新版本中文详情中检查了 1,500 次明确的 `Skill/Prop` 内部引用，全部在同一详情闭合；
- 全部响应都观察到 ETag、Last-Modified 和 `Cache-Control: max-age=120`；
- 最大单份详情约 23.5 KiB，现有共享响应大小限制足够；
- 未发现已支持实体的结构化跨实体引用，材料 ID 不能在当前实体注册表中闭合。

这些计数和观测用于说明契约依据，不是实现中的硬编码阈值。

随后使用本地 `3.0` Character + Equipment + Weapon 历史 v2 快照完成了 `--entity bangboo` 到四实体 v2 快照的原子迁移，并验证了：

- 最终快照包含 57 条 Character、28 条 Equipment、93 条 Weapon 和 40 条 Bangboo；
- Bangboo 的 40 份中文详情和 40 份英文详情完整；
- 首次定向迁移发布 441 个资源，其中 359 个未选实体资源为 `carried-forward`，上游 manifest 返回 HTTP 304，无内容漂移；
- 重复 Bangboo 定向抓取产生 82 个 HTTP `not-modified` 和 359 个 `carried-forward`，无内容漂移；
- 四实体全量重抓产生 441 个 HTTP `not-modified`，没有 `carried-forward` 或内容漂移；
- 最终快照共 12,481,321 字节，每轮发布后的严格离线 verify 均通过；
- 合法两实体和三实体历史 v2 epoch，以及两个历史 v1 Agents 快照，继续通过只读离线验证；
- 自动化 typecheck、53 项单元测试、package verify 和仓库级检查通过。

## 13. 验收标准

Bangboos 实现只有同时满足以下条件才算完成：

1. 正式规范与已验证上游结构及合法空值一致；
2. Bangboo adapter、路径政策、多个历史 v2 epoch 和当前注册表顺序已实现；
3. 自动化测试覆盖最低结构、空值、内部引用、历史 epoch 升级和失败保护；
4. 合法两实体和三实体历史 v2 快照仍可只读验证，任意子集仍被拒绝；
5. 对 Bangboo 引入阶段的实际三实体快照执行 `--entity bangboo` 后发布四实体完整组合快照；
6. 定向迁移中未选实体没有发起 HTTP 请求，且其资产按共享规则 carried-forward；
7. 重复抓取验证条件请求、304 复用、漂移报告和原子失败保护；
8. 离线 verify 对最终快照通过，并能在测试副本中检测篡改和关系错误；
9. package check 和仓库检查通过；
10. raw cache、公共 API 和 core 依赖边界保持不变；
11. 规范索引、包 README 和本文状态更新为实际验证结果。

以上条件均已完成，Bangboos 状态更新为“已实现并验证”。
