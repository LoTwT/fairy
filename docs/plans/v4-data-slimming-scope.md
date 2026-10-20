# v4 数据瘦身范围说明与实施记录

- 状态：已实施并通过主会话 review；0.4.0 已于 2026-10-20 发布（tag `v0.4.0`，main `ec408758`）
- 日期：2026-10-20
- 分支：`feat/v4-publication-index`（基线 `main @ 335741a8`）；发布分支 `release/0.4.0`
- 范围：公开 npm 发布索引的体积与来源记录边界
- 非范围：计算规则、实体字段语义、详情文本去重、0.4.0 发版本身

## 1. 结论摘要

建议采用**归档保留、发布剥离**的方案：

- 归档 `packages/data/integrated/` 继续保留完整 `sourceRecord`，仍是数据管理、更新报告和来源证据的权威副本。
- npm `dist/integrated/index.json` 生成新的发布索引 `fairy-nanoka-integrated/v4`，成员不再包含 `sourceRecord`。
- 归档外壳、`snapshotId`、数据管理状态和静态效果证据读取链路尽量保持不变。
- v4 只改变 npm 发布索引的形状，不改变 Git 归档、实体文件、计算结果或来源事实。
- 该变更已并入 0.4.0；0.4.0 作为一次集中破坏性发布，不另发 0.5.0。

如果目标只是减小 npm 包体，这个方案收益明确；如果目标是同时减小 Git 仓库或归档体积，则需要另行讨论，见第 4.3 节。

### 已拍板的实施边界

- 公开类型改为 `PublishedIntegratedSnapshotIndex` / `PublishedIntegratedSnapshotEntity` / `PublishedIntegratedSnapshotMember`；归档类型保留为内部契约。
- 发布索引 `format` 与 `snapshotInfo.format` 均为 `fairy-nanoka-integrated/v4`。
- `calculationDataVersion.contractVersion` 保持 2；它不是 `loadIndex` 的形状版本。
- `publication.json` 升级为 v2，使用 `indexDerivation: { archiveFormat, publicationFormat }`；不在根级重复 `publicationIndexSha256`。
- 归档验证器不再接收 `publicationDigests`；发布派生验证由独立的发布验证器承担。
- 收益门槛：实际 tarball 缩小至少 5% 或至少 120 KB，任一满足即继续；否则暂停并复核。
- 不重新生成归档、实体文件、definitions、`snapshotId` 钉值或露西证据。

### 实施记录（2026-10-20）

已按 A1 完成发布层瘦身，未改动 Git 归档、实体文件、definitions、固定 `snapshotId` 或露西证据：

- 新增 `packages/data/scripts/nanoka-integration/published-index.ts`：
  `derivePublishedIndex` / `derivePublishedIndexBytes` 只接受归档 v3，原位替换 `format`，按原键序复制，
  成员从 `{ files, sourceRecord }` 收缩为 `{ files }`；拒绝 BOM、非法 UTF-8、v4 输入、成员缺
  `sourceRecord` 或多出字段。
- 归档 `packages/data/integrated/index.json` 保持 v3 与完整 `sourceRecord`，字节不变；npm
  `dist/integrated/index.json` 为 v4，成员只含 `files`。
- 公开类型为 `PublishedIntegratedSnapshotIndex` / `PublishedIntegratedSnapshotEntity` /
  `PublishedIntegratedSnapshotMember`；`loadIndex` 与生成的 catalog、`snapshotInfo.format` 均为 v4；
  归档 `IntegratedSnapshotIndex` 保留为内部维护契约。
- `dist/publication.json` 为 `fairy-publication-manifest/v2`，精确形状：
  `format`、`source`、`archiveIndexSha256`、`indexDerivation: { archiveFormat, publicationFormat }`、
  `files`；根级不再记录 `publicationIndexSha256`。
- 归档验证器 `verifyIntegratedSnapshot` 只接受 v3 与含 `sourceRecord` 的成员，不再接收
  `publicationDigests`；新增 `verifyPublishedIntegratedSnapshot`，要求 v4、成员只含 `files`、
  索引值等于 `derivePublishedIndex(expectedArchiveIndex)`，并按发布清单核对实际字节摘要。
- `writeMinifiedPublication` 写入 v4 索引与 v2 清单，并核对发布索引字节等于
  `JSON.stringify(derivePublishedIndex(归档索引))`；`verifyMinifiedPublication` 递归扫描发布索引，
  禁止任何 `sourceRecord` 键。
- `snapshotId` 仍由归档 `integrated/index.json`、definitions manifests、静态效果与面板规则计算，
  未变化；`calculationDataVersion.contractVersion` 保持 2。

实际体积（同一台机器实测）：

| 项目                               | 基线 `335741a8` |       本分支 |                 变化 |
| ---------------------------------- | --------------: | -----------: | -------------------: |
| npm tarball                        |     2,744,034 B |  2,575,851 B | −168,183 B（−6.13%） |
| 解包字节                           |    23,739,820 B | 23,237,218 B |           −502,602 B |
| `dist/integrated/index.json`       |       927,669 B |    422,048 B |           −505,621 B |
| 发布索引 gzip（Node zlib level 9） |       307,355 B |    138,873 B |           −168,482 B |

收益门槛（tarball 缩小 ≥ 5% 或 ≥ 120 KB）已满足。基线 tarball 由 `335741a8` 工作区打包测得；
0.4.0 发布候选已重新打包复核，最终 tarball 为 `2,575,851 B`，`verify:pack` 的冷检出结果一致。

验证结果：`pnpm check`、`verify:pack`、`verify:browser`、`verify:nanoka:snapshot`、
`verify:nanoka:current integrated` 与 `git diff --check` 均通过；`verify:nanoka:current` 的受管理状态为
`idle`，归档 `indexSha256` 保持 `7f875c8f…`；`packages/data/integrated` 与 `packages/data/definitions`
相对基线无 diff。

### 0.4.0 发布说明（已发布）

- GitHub Release：<https://github.com/LoTwT/fairy/releases/tag/v0.4.0>
- npm：`@randomplay/core@0.4.0` 与 `@randomplay/data@0.4.0` 均为 `latest`。
- `@randomplay/data` 的 `loadIndex` 现在返回发布 v4 索引，成员不再包含 `sourceRecord`；需要来源记录的
  消费者应使用 Git 归档或后续独立 provenance 来源。
- npm `dist/integrated/index.json` 为 `fairy-nanoka-integrated/v4`；Git 归档仍为 v3。
- `dist/publication.json` 升级为 `fairy-publication-manifest/v2`，记录 v3 → v4 派生关系。
- `calculationDataVersion.contractVersion` 保持 2，`snapshotId` 不变；计算输入语义未变。
- 公开类型改为 `PublishedIntegratedSnapshotIndex` / `PublishedIntegratedSnapshotEntity` /
  `PublishedIntegratedSnapshotMember`。

## 2. 当前事实

### 2.1 体积

以当前 3.2 数据为例，只读重算结果如下：

| 项目                                    |                                        体积 |
| --------------------------------------- | ------------------------------------------: |
| 归档 `integrated/index.json`            |                                 1,282,490 B |
| 归档索引 gzip                           |                                   316,010 B |
| `sourceRecord` 原始 JSON 字节           |                                   495,221 B |
| `sourceRecord` 占成员 JSON              |                                       65.4% |
| `sourceRecord` 占完整索引               |                                    约 38.6% |
| monsters 的 `sourceRecord`              | 285,066 B，约占全部 `sourceRecord` 的 57.6% |
| 当前发布索引 minified                   |                                   927,669 B |
| 当前发布索引 gzip                       |                                   307,355 B |
| 去掉 `sourceRecord` 后的发布索引        |                                   422,048 B |
| 去掉 `sourceRecord` 后的 gzip           |                                   138,873 B |
| 归档索引 gzip 差值（316,010 → 138,873） |                                   约 177 KB |
| 发布索引 gzip 差值（307,355 → 138,873） |                                   约 168 KB |

最近一次 npm tarball 实测约 2.74 MB。实施中已实测基线 `2,744,034 B` → 分支 `2,575,845 B`（−6.13%），见上文实施记录；后续 release 步骤仍需按最终候选重新打包复核。

详情字段去重的收益明显更小：驱动盘约 20 KB，音擎约 5 KB，邦布约 1.7 KB，角色约 2 KB。它不是本项的主要目标。

### 2.2 当前契约

- 归档与发布副本目前表达同一份 JSON，只允许排版不同；`dist/publication.json` 记录归档字节 → 发布字节的摘要。
- `loadIndex` 公开返回完整索引，包含每个成员的 `sourceRecord`。
- 数据管理和更新报告使用归档索引的 `sourceRecord` 做来源比较、未知字段诊断和差异归因。
- 露西同阵营证据直接钉住归档 `index.json` 的 `sourceRecord.camp` 指针。
- `snapshotId` 由归档输入计算，不随发布排版变化。

### 2.3 关键约束

- 不能从 Git 归档直接删除 `sourceRecord`，否则会失去来源保真、来源差异和未知字段诊断。
- 不能把 `preparePublication` 改成默认输出剥离后的索引；静态效果生成器、露西证据和内部构建都依赖归档副本中的 `sourceRecord`。
- 不能让发布索引和归档索引在无清单、无验证器的情况下静默不同。
- 公开发布索引一旦去掉 `sourceRecord`，依赖 `loadIndex().entities.*.members.*.sourceRecord` 的消费者会破坏。

## 3. 目标与非目标

### 目标

1. 减小 npm 包中 `dist/integrated/index.json` 的体积，重点移除 monsters 等类别的 `sourceRecord`。
2. 保持归档、数据管理、更新报告和静态效果证据的现有能力。
3. 为“归档索引”和“发布索引”定义可验证的派生关系，而不是手工裁剪。
4. 保持 `snapshotId` 的语义：同一批归档数据与定义输入对应同一快照身份。
5. 用真实 tarball、解包内容和浏览器消费验收确认收益与边界。

### 非目标

- 不修改 `sourceRecord` 的内容、生成方式或归档保存策略。
- 不改变实体 `data.json` / `details.{locale}.json` 的字节。
- 不合并或删除详情中的名称、描述等字段。
- 不改变计算规则、静态效果结果或发布清单之外的运行行为。
- 首版不提供等价的公开 provenance 替代接口；是否另设独立包或子路径留待后续决定。

## 4. 方案比较

### 4.1 方案 A1：归档 v3 + 发布 v4（推荐）

- 归档继续使用 `fairy-nanoka-integrated/v3`，保留 `sourceRecord`，字节不变。
- `dist/integrated/index.json` 生成 `fairy-nanoka-integrated/v4`，删除每个成员的 `sourceRecord`，其余字段、成员、文件摘要和来源信息保留。
- `dist/publication.json` 升级为 v2，明确记录归档格式、发布格式、归档索引摘要、发布索引摘要和逐文件摘要映射。
- `snapshotId` 继续由归档输入计算，保持不变；发布格式变化不改变快照身份。
- `loadIndex` 返回 v4 索引，类型不再包含 `sourceRecord`。
- 静态效果证据继续读取归档副本，不需要迁移露西 `sourceRecord.camp` 指针。
- 数据管理状态、更新报告和归档复验不变。

优点：

- 不需要重新生成归档，不需要改写管理状态。
- 来源保真、更新报告和证据链完全保留。
- 改动集中在发布层、公开索引类型、发布清单和验收。
- 收益直接体现在 npm 包，不影响 Git 归档。

缺点：

- 归档是 v3、发布是 v4，两个格式并存，文档必须讲清楚。
- 需要新的发布清单和验证逻辑，不能再依赖“只差排版”的旧假设。
- `loadIndex` 是破坏性变更。

### 4.2 方案 A2：归档 v4 + 发布 v4

- 归档索引也升级为 v4，但仍保留 `sourceRecord`；发布 v4 再剥离。
- 需要重新生成归档、更新 `snapshotId`、维护管理状态和快照链。
- 归档和发布共享 `format: v4`，但 JSON 值仍不同，仍需要发布清单和派生验证。

优点：格式版本更统一。

缺点：多一次归档再生和管理状态变更，没有额外体积收益；与 A1 相比只是版本标签更整齐。

### 4.3 方案 B：归档也删除，另存 provenance

- 归档索引也去掉 `sourceRecord`，另建一份不发布的 provenance 归档保存原始索引记录。
- 数据和证据都改从 provenance 读取。

优点：Git 归档也变小。

缺点：新增一套归档结构和读取/恢复/更新路径；更新报告、来源诊断、恢复和证据链都要改；复杂度显著高于 A1。除非明确要求减小 Git 仓库体积，不建议。

### 4.4 方案 C：保持现状

- 继续使用 v3，不剥离 `sourceRecord`。
- 没有公开 API 破坏，但 npm 包继续携带约 177 KB 的索引 gzip 成本。

适合没有明确包体目标、或消费者确实需要 `loadIndex` 来源记录的情况。

## 5. 推荐方案 A1 的细节

### 5.1 归档与发布

```text
packages/data/integrated/index.json          v3，pretty，保留 sourceRecord
packages/data/dist/integrated/index.json     v4，minified，移除 sourceRecord
packages/data/dist/publication.json          v2，归档 → 发布映射
```

归档中的其他文件和发布副本继续只差排版空白；只有 `index.json` 是结构性派生。

### 5.2 发布清单 v2

实际外壳为 `fairy-publication-manifest/v2`，根级字段精确为：

- `format`
- `source`：来源身份与版本
- `archiveIndexSha256`
- `indexDerivation`：`{ archiveFormat: "fairy-nanoka-integrated/v3", publicationFormat: "fairy-nanoka-integrated/v4" }`
- `files`：`index.json` 与全部成员文件的 `archiveSha256`、`publicationSha256`、`archiveBytes`、`publicationBytes`

发布索引摘要只记录在 `files["index.json"]`，根级不重复 `publicationIndexSha256`。

验证器必须能证明：

1. 发布索引由归档索引按固定规则派生；
2. 除 `sourceRecord` 外，字段、成员、文件摘要和值完全一致；
3. 发布索引中不存在 `sourceRecord`；
4. 归档索引的摘要仍然与索引登记和管理记录一致。

### 5.3 公开 API

`loadIndex` 返回发布 v4 索引；公开类型为 `PublishedIntegratedSnapshotIndex`、
`PublishedIntegratedSnapshotEntity`、`PublishedIntegratedSnapshotMember`，成员只含 `files`。
归档 `IntegratedSnapshotIndex`、`HistoricalIntegratedSnapshotIndex` 保留为内部维护与历史复验契约，
不通过包根入口导出。已同步：

- `packages/data/src/integration/snapshot-types.ts`
- `packages/data/src/index.ts` 的公开类型与 `loadIndex`
- `prepare-publication.ts` 生成的 catalog 与 `snapshotInfo`
- `docs/specs/data/consumption.md`
- `packages/data/README.md`
- 类型正反例、消费者测试和 `verify-package` / `verify-browser` 断言

公开 API 的破坏性变更需要在 CHANGELOG/发布说明中明确写出；首版不提供 `loadProvenance` 替代。需要来源记录的消费者应使用 Git 归档或后续独立 provenance 包。

### 5.4 静态效果与露西证据

静态效果生成器和 `lucy-guard-boar.ts` 继续读取归档副本中的 `sourceRecord.camp`，因此：

- 不修改 `LUCY_GUARD_BOAR_FACTION` 的指针语义；
- 不把证据迁移到发布索引；
- 只在归档索引摘要变化时更新对应的硬编码摘要。

如果未来把静态效果生成器改为读取发布副本，则必须先迁移证据；本项不这样做。

### 5.5 snapshotId 与 contractVersion

- `snapshotId` 继续由归档索引、definitions manifests 和静态效果输入计算，A1 下不变。
- 发布索引的 `format` 变为 v4，但 `snapshotId` 不因发布形状变化而变。
- 已拍板 `contractVersion` 保持 2：它只描述计算输入单位与语义，不描述 `loadIndex` 的发布外壳。

## 6. 已拍板事项

1. **目标只是 npm 包体：** 采用 A1；Git 归档不缩小。
2. **`loadIndex` 不再返回 `sourceRecord`：** 接受为 0.4.0 的破坏性变更。
3. **归档格式保持 v3：** 不重新生成归档，不做 A2。
4. **不提供 provenance 替代接口：** 需要来源记录的消费者使用 Git 归档或后续独立来源。
5. **`contractVersion` 保持 2：** 它描述计算输入语义，不是 `loadIndex` 的发布外壳版本。
6. **版本安排：** 并入 0.4.0；本轮不修改 package.json 版本，发布由后续 release 步骤处理。
7. **详情去重不做：** 收益小且与本项边界不同。

## 7. 验收标准与实测结果

- `dist/integrated/index.json` 的 format 为 v4，且不存在任何 `members.*.sourceRecord`。
- 发布索引与归档索引除 `format` 和 `sourceRecord` 外，字段、成员、文件摘要与值完全一致。
- `dist/publication.json` v2 能独立验证归档 → 发布的索引派生和逐文件摘要。
- `loadIndex` 类型与运行时结果一致，不再暴露 `sourceRecord`。
- `snapshotId` 保持归档语义；数据管理记录与归档 `indexSha256` 继续一致。
- 静态效果生成、露西同阵营证据和更新报告继续使用归档 `sourceRecord` 并通过。
- `pnpm check`、`verify:pack`、`verify:browser`、`verify:nanoka:current integrated`、`git diff --check` 通过。
- 实际 npm tarball 前后体积、解包索引字节与 gzip 字节有记录；收益不足时重新评估是否值得破坏公开 API。
- npm 包内不存在 `sourceRecord`；归档仍完整保留。

## 8. 实施顺序与状态

1. 已完成：评审并拍板第 6 节。
2. 已完成：记录 `335741a8` 的 tarball、解包字节、dist 索引与 gzip 基线。
3. 已完成：定义 Published 类型、v4 发布索引与 publication manifest v2。
4. 已完成：实现发布派生和归档/发布两侧验证，未改归档。
5. 已完成：更新公开类型、catalog、消费文档、测试与打包/浏览器断言。
6. 已完成：打包测量满足收益门槛（tarball −6.13%）。
7. 已完成：0.4.0 于 2026-10-20 发布；PR [#264](https://github.com/LoTwT/fairy/pull/264) 与 release PR [#265](https://github.com/LoTwT/fairy/pull/265) 已合并，tag `v0.4.0` 指向 `ec408758`。

## 9. 风险与未决

- 公开 `loadIndex` 破坏性变更已按 0.4.0 发布；迁移说明见 0.4.0 发布说明。
- 发布索引和归档索引不再“只差排版”；v2 清单、派生字节核对与递归 `sourceRecord` 扫描共同防止手工裁剪
  或错误字段丢失。
- `snapshotId` 继续由归档输入计算，发布 `format` 只描述公开外壳；两者语义已在消费契约中分开说明。
- 实际 tarball 收益已测量为 −6.13%，满足门槛。
- 若未来需要 provenance 公共接口，独立包/子路径会重新引入体积，需另行设计。
