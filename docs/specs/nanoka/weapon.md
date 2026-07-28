# Nanoka W-Engines 数据规范

## 状态

- 状态：已实现并验证
- 实体：W-Engines
- 上游名称：`weapon`
- 语言：简体中文（`zh`）和英文（`en`）
- 验证范围：`3.0`、`3.1.5+17516165`、`3.1.12+17625891`
- 共享契约：[Nanoka 共享来源规范](source.md)

本文只定义 W-Engines 特有的端点、资源发现、最低结构、一致性、测试和验收要求。版本选择、HTTP、缓存、快照清单、原子发布、版本锁、CLI、包边界和合规要求统一遵循共享来源规范。

## 1. 目标

W-Engines 实现必须：

1. 获取指定版本的 W-Engine 摘要数据。
2. 从摘要动态发现全部 W-Engine ID。
3. 获取每个 W-Engine 的中文和英文详情。
4. 保留摘要与详情的远端原始字节及所有未识别字段。
5. 验证摘要、详情、成长数据和抓取清单之间的一致性。
6. 在不错误建模尚未支持的 Item/Material 实体前提下，验证材料字符串的已确认语法。

## 2. 非目标

当前 W-Engines 实现不包含：

- Bangboos（`bangboo`）、Monsters（`monster`）或 End Game 子域；
- 日文或韩文详情；
- 将材料 ID 解释为已支持实体，或校验其跨实体引用闭合；
- 将等级、突破、材料或天赋字段转换为 `@randomplay/core` 的计算输入；
- 对富文本、占位文本、名称、描述或其他内容做清洗和质量修复；
- 下载图标或其他图片资源。

材料 ID 属于当前未登记的 Item/Material 数据域。上游 manifest 的新增 item 信息不是完整资源索引，在建立经过验证的正式实体前不得注册材料跨实体 validator。

## 3. 上游端点

### 3.1 W-Engine 摘要

```text
GET https://static.nanoka.cc/zzz/{version}/weapon.json
```

预期顶层为以规范十进制 W-Engine ID 为 key 的非空对象。摘要记录至少包含：

```ts
{
  icon: string
  rank: integer
  type: integer
  en: string
  atk: integer
  desc: string
  sub: string
  ko: string
  zh: string
  ja: string
}
```

首期只依赖以上最低字段，不完整建模摘要记录。上游可以增加其他字段，原始响应必须完整保留。

### 3.2 W-Engine 详情

```text
GET https://static.nanoka.cc/zzz/{version}/{language}/weapon/{id}.json
```

当前支持语言：

```text
zh
en
```

W-Engine ID 必须从 `weapon.json` 的顶层 key 动态发现，不维护硬编码 ID 列表。

详情至少包含：

```ts
{
  id: integer
  code_name: string
  name: string
  desc: string
  desc2: string
  desc3: string
  rarity: integer
  icon: string
  weapon_type: {
    [typeId: string]: string
  }
  base_property: {
    name: string
    name2: string
    format: string
    value: integer
  }
  rand_property: {
    name: string
    name2: string
    format: string
    value: integer
  }
  level: {
    [level: string]: {
      exp: integer
      rate: integer
      rate2: integer
    }
  }
  stars: {
    [stage: string]: {
      star_rate: integer
      rand_rate: integer
    }
  }
  materials: string
  talents: {
    [rank: string]: {
      name: string
      desc: string
    }
  }
}
```

字段值可以包含上游富文本标记或非空 `...` 占位文本；这些是保留的来源内容，不因文本样式单独拒绝快照。

## 4. 资源发现与排序

一次完整 W-Engines 实体抓取包括：

1. 一份 `weapon.json` 摘要；
2. 摘要中每个 ID 对应的一份中文详情；
3. 摘要中每个 ID 对应的一份英文详情。

资源发现和排序必须满足：

- 摘要顶层是非空普通对象；
- 每个摘要 key 匹配 `/^(0|[1-9]\d*)$/`；
- 每个摘要 value 是普通对象并满足最低字段结构；
- ID 按数值升序稳定排序；
- 每个摘要 ID 恰好对应一份 `zh` 详情和一份 `en` 详情；
- 详情目录和清单中不得出现摘要不存在的 ID；
- 任意必需资源缺失时不得发布快照。

无 `--entity` 的共享抓取命令处理全部当前支持实体；`--entity weapon` 只重新获取 W-Engines，但最终仍发布包含当前全部支持实体的完整版本级组合快照。

## 5. 详情最低结构

### 5.1 标识与标量字段

每份详情必须满足：

- `id` 是安全整数，其十进制字符串等于摘要 key、URL ID 和本地路径 ID；
- `code_name`、`name`、`desc`、`desc2`、`desc3`、`icon` 是字符串；
- `rarity` 是整数；
- `weapon_type` 是恰好包含一个 key 的普通对象；
- `weapon_type` 的唯一 key 是规范十进制整数，值是字符串；
- `base_property` 和 `rand_property` 是普通对象；
- 两个 property 对象的 `name`、`name2`、`format` 是字符串，`value` 是整数。

### 5.2 等级数据

`level` 必须：

- 是普通对象；
- 恰好包含规范十进制 key `0` 至 `60`；
- 每个等级记录的 `exp`、`rate`、`rate2` 都是整数；
- `0` 至 `59` 级的 `exp` 为正整数；
- `60` 级的 `exp` 为 `0`；
- 按等级递增时 `rate` 不得下降。

这些断言只表达三个已验证版本的完整共同结构，不推导未观察到的数值公式。

### 5.3 星级数据

`stars` 必须：

- 是普通对象；
- 恰好包含规范十进制 key `0` 至 `5`；
- 每个记录的 `star_rate` 和 `rand_rate` 都是整数。

### 5.4 天赋数据

`talents` 必须：

- 是普通对象；
- 恰好包含规范十进制 key `1` 至 `5`；
- 每个记录的 `name` 和 `desc` 都是字符串。

### 5.5 材料字符串

`materials` 必须符合已经全量观察到的语法：

```text
itemId:amount,itemId:amount
|itemId:amount,itemId:amount
|itemId:amount,itemId:amount
|itemId:amount,itemId:amount
|itemId:amount,itemId:amount
```

即：

- 恰好五组，以 `|` 分隔；
- 每组恰好两个材料项，以 `,` 分隔；
- 每项恰好为 `itemId:amount`；
- `itemId` 和 `amount` 都是无前导零的正十进制整数；
- 同一 W-Engine 的中文和英文详情必须使用相同的材料字符串。

本规则只校验序列化语法和跨语言一致性，不声明材料 ID 的业务名称、分类或引用闭合。

## 6. 摘要与详情一致性

每个 W-Engine 必须满足：

- 摘要 ID、中文详情 `id` 和英文详情 `id` 相同；
- `summary.zh === zhDetail.name`；
- `summary.en === enDetail.name`；
- 中文和英文详情的 `code_name` 均等于 `summary.icon`；
- 中文和英文详情的 `icon` 均以 `/${summary.icon}.png` 结尾；
- 中文和英文详情的 `rarity` 均等于 `summary.rank`；
- 中文和英文详情 `weapon_type` 的唯一 key 均等于 `String(summary.type)`；
- 英文详情 `desc3 === summary.desc`；
- 英文详情 `rand_property.name === summary.sub`；
- 中文和英文详情的 `materials` 相同；
- 中文和英文详情用于攻击力计算的基础值和倍率必须分别导出相同结果；
- 摘要攻击力满足：

```text
summary.atk = floor(
  base_property.value
  * (10000 + level["60"].rate + stars["5"].star_rate)
  / 10000
)
```

除上述已确认关系外，不要求中文和英文详情具有完全相同的字段集合或全部文本相同。

## 7. 本地文件与清单

W-Engines 资源保存为：

```text
packages/data/raw/nanoka/{version}/
├── weapon.json
├── zh/
│   └── weapon/
│       └── {id}.json
└── en/
    └── weapon/
        └── {id}.json
```

共享版本目录还包含上游 `manifest.json`、版本级 `fetch-manifest.json` 和其他已支持实体。远端 JSON 按共享来源规范保存原始响应字节。

W-Engines 使用 `nanoka-fetch-manifest/v2` 的通用实体资产：

| 资源 | kind            | 稳定 asset ID                                | localPath                           |
| ---- | --------------- | -------------------------------------------- | ----------------------------------- |
| 摘要 | `entity-index`  | `entity-index:weapon`                        | `weapon.json`                       |
| 详情 | `entity-detail` | `entity-detail:weapon:{language}:{entityId}` | `{language}/weapon/{entityId}.json` |

实体级摘要使用：

- `summary.entities.weapon.recordCount`；
- `summary.entities.weapon.detailCountByLanguage`；
- `summary.entities.weapon.assetCount`；
- `summary.entities.weapon.totalBytes`。

W-Engines 加入注册表时，已有 Character + Equipment 的合法历史 v2 快照按共享规范中显式冻结的历史实体集合 epoch 继续严格可读。新发布快照必须包含当前注册表中的完整实体集合；`--entity weapon` 可以从合法历史 epoch 构建完整 staging，成功后升级为当前集合，失败时旧快照保持不变。

## 8. 漂移与拒绝条件

同版本内容变化按共享来源规范记录逐资源 SHA-256、字节数和 ETag 漂移。W-Engines 额外记录摘要数量变化。

以下情况必须拒绝发布：

- 摘要为空或最低字段结构不成立；
- ID、详情覆盖或路径不闭合；
- 详情最低结构、固定 key 集合或材料语法不成立；
- 摘要与详情的已确认关系不成立；
- 攻击力公式不成立；
- 中文和英文材料字符串不一致；
- 组合快照中的任一其他实体或适用 validator 验证失败。

非空摘要数量变化、合法富文本变化和非空 `...` 占位文本只作为漂移或质量观察信号，不单独阻止发布。

已观察到的版本差异包括：

- `3.0` 到 `3.1.5+17516165` 新增 ID `14158` 和 `14159`；
- `3.1.5+17516165` 到 `3.1.12+17625891` 的 ID 集合及最低结构不变，但名称、天赋文本和颜色标记存在内容变化。

实现不得依赖这些具体版本、ID 或当前计数。

## 9. 模块职责

`packages/data/scripts/nanoka/weapon.ts` 负责：

- 校验 `weapon.json` 的最低结构；
- 动态发现并稳定排序 W-Engine ID；
- 为 `zh/en` 构造详情资源；
- 校验详情最低结构、材料语法、成长 key 集合和数值约束；
- 校验摘要与详情、跨语言材料和攻击力计算关系。

`weapon` adapter 由共享实体注册表在 `character`、`equipment` 之后登记。共享 `policy.ts` 只接受注册实体的索引和详情路径；共享 `snapshot.ts` 负责版本级组合 staging、严格历史 epoch、清单、分层离线验证和发布。W-Engines 的字段与公式规则不得移入共享层。

## 10. 测试矩阵

### 10.1 资源发现与最低结构

- 从摘要 key 生成按数值升序排序的 W-Engine ID；
- 拒绝空摘要、非法 ID 和非对象摘要记录；
- 为每个 ID 生成 `zh/en` 两项详情资源；
- 接受合法富文本和非空 `...` 文本；
- 拒绝详情 ID 与摘要、URL 或路径不一致；
- 拒绝缺失或多余详情；
- 拒绝必需标量字段类型错误；
- 拒绝 `weapon_type` 多 key、非法 key 或错误值类型；
- 拒绝 `level`、`stars` 或 `talents` 缺失、额外或非法 key；
- 拒绝等级字段类型、终级经验或 `rate` 单调性错误；
- 拒绝非法材料组数、项数、分隔符、零值或前导零。

### 10.2 一致性

- 校验中英文名称与摘要语言名称；
- 校验 `icon`、`code_name` 和摘要图标标识；
- 校验稀有度与类型；
- 校验英文描述和副属性名称；
- 校验中英文材料字符串一致；
- 校验中英文详情都满足摘要攻击力公式；
- 任一关系失败时阻止 staging 发布并保留旧快照。

### 10.3 多实体快照

- 当前全量抓取生成 `character`、`equipment`、`weapon` 的稳定注册顺序；
- 合法 Character + Equipment 历史 v2 epoch 继续通过只读验证；
- 任意其他实体子集仍被拒绝；
- `--entity weapon` 从合法历史 epoch 升级为当前完整快照；
- 升级时 Character 和 Equipment 不发 HTTP 请求，只复制重新验证通过的资产并登记为 `carried-forward`；
- 缺失、篡改、未登记文件或未知实体阻止升级；
- Weapon 定向重跑整体重建其索引和详情，不保留已从新索引删除的旧详情；
- summary、validation、资产实体集合和 manifest epoch 严格闭合；
- `not-modified` 与 `carried-forward` 的元数据和统计语义保持分离。

### 10.4 包边界

- W-Engines raw cache 不进入 Git 或 npm tarball；
- `weapon.ts` 和维护脚本不进入 npm tarball；
- `@randomplay/data` 不增加对 `@randomplay/core` 的依赖；
- `packages/data/src/index.ts` 保持空公开导出。

自动化测试使用 mock fetch、临时目录和最小 fixture，不依赖真实 Nanoka 站点。

## 11. 上游验证证据

2026-07-27 对以下版本执行了低频、只读的完整 `zh/en` 资源覆盖与最低结构检查：

| 版本              | 摘要记录 | zh 详情 | en 详情 |
| ----------------- | -------: | ------: | ------: |
| `3.0`             |       93 |      93 |      93 |
| `3.1.5+17516165`  |       95 |      95 |      95 |
| `3.1.12+17625891` |       95 |      95 |      95 |

共检查 3 份摘要和 566 份详情：

- 全部响应可解析为 JSON；
- 全部详情 ID 覆盖与摘要一致，无缺失或额外 ID；
- 全部记录满足本文定义的最低字段类型、固定 key 集合、材料语法和摘要—详情关系；
- 全部响应都观察到 ETag 和 Last-Modified；
- 每个版本的 W-Engines 摘要与中英文详情合计约 1.53–1.57 MiB；
- 最大单份详情约 10.7 KiB，现有共享响应大小限制足够；
- 未发现 Character 或 Equipment 引用；材料 ID 不能在当前已支持实体中闭合。

这些计数和观测用于说明契约依据，不是实现中的硬编码阈值。

随后使用本地 `3.0` Character + Equipment 历史 v2 快照完成了 `--entity weapon` 到当前三实体 v2 快照的原子迁移，并验证了：

- 最终快照包含 57 条 Character、28 条 Equipment 和 93 条 Weapon；
- Weapon 的 93 份中文详情和 93 份英文详情完整；
- 首次定向迁移发布 360 个资源，其中 172 个 Character/Equipment 资源为 `carried-forward`，上游 manifest 返回 HTTP 304，无内容漂移；
- 重复 Weapon 定向抓取产生 188 个 HTTP `not-modified` 和 172 个 `carried-forward`，无内容漂移；
- 三实体全量重抓产生 360 个 HTTP `not-modified`，没有 `carried-forward` 或内容漂移；
- 最终快照共 11,224,130 字节，每轮发布后的严格离线 verify 均通过；
- 合法的 Character + Equipment 历史 v2 epoch 以及两个历史 v1 Agents 快照继续通过只读离线验证；
- 自动化 typecheck、49 项单元测试、package verify 和仓库级检查通过。

## 12. 验收标准

W-Engines 实现只有同时满足以下条件才算完成：

1. 正式规范与已验证上游结构一致；
2. Weapon adapter、路径政策、历史 v2 epoch 和当前注册表顺序已实现；
3. 自动化测试覆盖最低结构、关系验证、历史 epoch 升级和失败保护；
4. 合法两实体历史 v2 快照仍可只读验证，任意子集仍被拒绝；
5. 对实际快照执行 `--entity weapon` 后发布当前完整多实体组合快照；
6. 定向迁移中未选实体没有发起 HTTP 请求，且其资产按共享规则 carried-forward；
7. 重复抓取验证条件请求、304 复用、漂移报告和原子失败保护；
8. 离线 verify 对最终快照通过，并能在测试副本中检测篡改和关系错误；
9. package check 和仓库检查通过；
10. raw cache、公共 API 和 core 依赖边界保持不变；
11. 规范索引、包 README 和本文状态更新为实际验证结果。

以上条件均已完成，W-Engines 状态更新为“已实现并验证”。
