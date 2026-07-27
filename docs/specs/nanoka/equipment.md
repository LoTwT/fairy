# Nanoka Drive Discs 数据规范

## 状态

- 状态：已实现并验证
- 实体：Drive Discs
- 上游名称：`equipment`
- 语言：简体中文（`zh`）和英文（`en`）
- 验证范围：`3.0`、`3.1.5+17516165`、`3.1.12+17625891`
- 共享契约：[Nanoka 共享来源规范](source.md)

本文只定义 Drive Discs 特有的端点、资源发现、最低结构、一致性、漂移和验收要求。版本选择、HTTP、缓存、组合快照、清单、原子发布、版本锁、CLI、包边界和合规要求统一遵循共享来源规范。

## 1. 目标

Drive Discs 实现必须：

1. 获取指定版本的 Drive Disc 摘要数据；
2. 从摘要动态发现全部 Equipment ID；
3. 获取每个 ID 的中文和英文详情；
4. 保留摘要与详情的远端原始字节和所有未识别字段；
5. 验证摘要、详情和版本级抓取清单之间的一致性；
6. 与 Agents 一起组成可离线验证和原子发布的多实体快照。

## 2. 非目标

本实体实现不包含：

- 日文或韩文详情抓取；
- Drive Disc 图片下载或图片路径可达性检查；
- 对套装名称、效果、故事或图片路径进行清洗、映射、裁剪或内容成熟度判定；
- 将文本中的术语推断为跨实体引用；
- 将原始记录直接转换为 `@randomplay/core` 的计算输入。

## 3. 上游端点

### 3.1 Drive Disc 摘要

```text
GET https://static.nanoka.cc/zzz/{version}/equipment.json
```

摘要顶层是以十进制 Equipment ID 为 key 的对象。ID 必须从该对象动态发现，不维护硬编码 ID 清单。上游版本 manifest 的 `zzz.new.equipment` 只表示版本新增记录，不能作为完整资源索引。

### 3.2 Drive Disc 详情

```text
GET https://static.nanoka.cc/zzz/{version}/{language}/equipment/{id}.json
```

当前支持语言：

```text
zh
en
```

## 4. 摘要最低结构

`equipment.json` 必须满足：

- 顶层是非空普通对象；
- 每个 key 是规范十进制 ID，只含数字且无前导零（`0` 本身除外），匹配 `/^(0|[1-9]\d*)$/`；
- 每个 value 是普通对象；
- `icon` 是字符串；
- `zh` 和 `en` 是普通对象；
- `zh/en.name`、`zh/en.desc2`、`zh/en.desc4` 都是字符串；
- Equipment ID 按数值升序稳定排序，不依赖上游 JSON 属性顺序。

`ja`、`ko` 及其他未识别字段不参与当前最低结构，但必须按原始字节保留。

## 5. 详情最低结构

每份 `zh/en` 详情必须是普通对象，并包含：

- `id`：安全整数，十进制字符串必须等于摘要 ID、URL ID 和本地路径 ID；
- `name`：字符串；
- `desc2`：字符串；
- `desc4`：字符串；
- `story`：字符串；
- `icon`：字符串；
- `icon2`：字符串。

已验证版本中的这些字段均存在且类型稳定。实现不要求不同语言详情具有完全相同的额外字段集合，也不将当前观察到的 `icon === icon2` 提升为长期契约。

`...`、未解析本地化 key 或其他非空占位字符串属于上游原始内容，不是结构错误，不得仅因内容尚未成熟而拒绝发布。

## 6. 资源覆盖与实体内部一致性

指定版本的完整 Drive Discs 实体包括：

1. 一份 `equipment.json` 摘要；
2. 每个摘要 ID 对应的一份 `zh` 详情；
3. 每个摘要 ID 对应的一份 `en` 详情。

必须满足：

- 每个摘要 ID 恰好对应每种支持语言的一份详情；
- 清单和详情目录不得包含摘要中不存在的 ID；
- 详情 `id` 与摘要和路径 ID 一致；
- 对每个支持语言，摘要中的 `name`、`desc2`、`desc4` 分别等于对应详情字段；
- 摘要 `icon` 等于对应详情 `icon`；
- `story` 和 `icon2` 是详情特有字段，不要求出现在摘要中；
- 任意最低结构、覆盖或一致性错误都阻止组合快照发布。

当前没有需要登记的 Equipment 跨实体引用。文本中的角色、装备或其他术语不是结构化外键。如果上游未来增加引用字段，应先更新本规范，再登记对应 validator。

## 7. 本地文件布局与清单

Equipment 资源保存为：

```text
packages/data/raw/nanoka/{version}/
├── manifest.json
├── character.json
├── equipment.json
├── fetch-manifest.json
├── zh/
│   ├── character/
│   └── equipment/
│       └── {id}.json
└── en/
    ├── character/
    └── equipment/
        └── {id}.json
```

Drive Discs 使用共享 `nanoka-fetch-manifest/v2`：

- 实体：`equipment`；
- 摘要 kind：`entity-index`；
- 摘要 asset ID：`entity-index:equipment`；
- 详情 kind：`entity-detail`；
- 详情 asset ID：`entity-detail:equipment:{language}:{equipmentId}`；
- 实体资源 ID 字段：`entityId`；
- 摘要路径：`equipment.json`；
- 详情路径：`{language}/equipment/{equipmentId}.json`；
- 实体计数：`summary.entities.equipment`。

Equipment 实体级 validation 必须为 `passed`。当前适用的跨实体 validator 数量为零。

## 8. 漂移规则

已验证版本观察到：

| 版本              | 摘要记录数 | zh 详情数 | en 详情数 |
| ----------------- | ---------: | --------: | --------: |
| `3.0`             |         28 |        28 |        28 |
| `3.1.5+17516165`  |         30 |        30 |        30 |
| `3.1.12+17625891` |         30 |        30 |        30 |

这些数量是验收证据，不是代码常量或永久阈值。

漂移处理要求：

- 空摘要无条件拒绝；
- 非空记录数、ID 集合或内容哈希变化必须报告；
- 新增、删除和已有记录内容变化应可区分；
- 记录数不变不代表内容未变化，原始字节和 SHA-256 仍须比较；
- 非空数量变化或内容变化本身不自动阻止发布；
- 每个版本内部的摘要—详情覆盖和字段一致性仍必须通过；
- 占位内容可以作为数据质量提示，但不属于结构失败。

## 9. 模块职责

`equipment` adapter 负责：

- 校验 `equipment.json` 的最低结构；
- 动态发现 ID 并按数值升序排列；
- 生成 zh/en 详情资源；
- 校验详情最低结构和详情 ID；
- 校验摘要与详情的字段一致性；
- 计算并验证 Equipment 实体级 summary。

共享实体注册表负责稳定登记 `character`、`equipment`。共享 `policy.ts` 负责注册实体 URL 和路径安全；共享 `snapshot.ts` 负责 v1/v2 清单、组合 staging、carried-forward、分层验证、原子发布和恢复。Equipment 字段规则不得移入共享层。

## 10. 自动化测试矩阵

至少覆盖：

- 非空普通对象摘要和数值升序 ID；
- 空摘要、非法 ID、非对象记录；
- 摘要 `icon`、`zh/en.name`、`desc2`、`desc4` 缺失或类型错误；
- 为每个 ID 生成 zh/en 详情资源；
- 详情七个最低字段缺失或类型错误；
- 详情 ID 与摘要或路径不一致；
- 缺失 zh/en 详情和摘要外多余详情；
- 摘要与详情的 `name`、`desc2`、`desc4`、`icon` 不一致；
- 合法占位字符串不被结构校验拒绝；
- v2 asset ID、entity、entityId、URL 和路径一致；
- Equipment summary 能从最终资产和索引重算；
- v1 Character 快照定向增加 Equipment 后安全迁移为 v2；
- 定向重跑 Equipment 时 Character 被验证并 carried-forward，且不发 Character HTTP 请求；
- Equipment 失败不替换已有组合快照；
- 文件缺失、篡改、未登记文件及 summary/validation 错误可由离线 verify 检出；
- raw cache 和维护脚本不进入 npm 包，公共 API 和 core 依赖边界不变。

测试使用 mock fetch、临时目录和最小 fixture，不访问真实 Nanoka 站点。

## 11. 在线验收标准

Drive Discs 只有同时满足以下条件才算完成：

1. 自动化 typecheck、测试、package verify 和仓库检查通过；
2. 现有历史 `v1` Agents 快照仍能被严格离线验证；
3. 至少一个现有 v1 Character 快照通过 `--entity equipment` 成功迁移为 v2 组合快照；
4. 发布后的快照完整包含 `character` 和 `equipment`；
5. Equipment ID 全部从摘要动态发现；
6. 真实版本的全部 zh/en 详情覆盖、最低结构和摘要—详情一致性通过；
7. 重复抓取能区分 HTTP `not-modified` 和实体 `carried-forward`；
8. 定向重跑 Character 或 Equipment 后，未选实体保持完整且不发网络请求；
9. 网络、结构、验证或 staging 失败不会损坏或替换已有完整快照；
10. 离线 verify 能检测 Equipment 文件、覆盖、内容一致性、哈希、summary 和登记闭合错误；
11. 真实抓取输出、组合清单和目录布局经过检查；
12. 正式规范索引和实施计划更新为已实现并验证状态。

## 12. 上游验证记录

2026-07-27 对 `3.0`、`3.1.5+17516165`、`3.1.12+17625891` 执行了低频、串行、只读的全量验证：

- 共检查 3 份摘要和 176 份 zh/en 详情；
- 所有摘要和必需详情均返回可解析 JSON；
- 三个版本均为一对一的摘要—语言详情模型；
- 全部详情 ID、最低字段和摘要—详情字段关系通过；
- 未发现结构化跨实体引用；
- 未下载或检查图片资源；
- 最新版本存在合法的非空占位文案，未将其判为结构错误。

在线验证证明当前上游结构足以实施。随后使用本地 `3.0` 历史 v1 Character 快照完成了 `--entity equipment` 到 v2 组合快照的原子迁移，并验证了：

- 最终快照包含 57 条 Character 和 28 条 Equipment；
- Equipment 的 28 份中文详情和 28 份英文详情完整；
- Equipment 定向重跑产生 58 个 HTTP `not-modified` 和 115 个 Character `carried-forward` 资源；
- Character 定向重跑产生 116 个 HTTP `not-modified` 和 57 个 Equipment `carried-forward` 资源；
- 全量重抓产生 173 个 HTTP `not-modified`，没有 carried-forward 或内容漂移；
- 每轮发布后的严格离线 verify 均通过；
- 自动化 typecheck、45 项测试、package verify 和仓库级检查通过。

至此，第 11 节验收条件已经完成，Drive Discs 状态更新为“已实现并验证”。
