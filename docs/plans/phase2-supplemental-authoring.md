# Phase 2 P2-4a：补充记录作者层

状态：P2-4a 主体已合并（#299，7d54366c），`optionId` / `supportedRanks` 必填 follow-up 已合并（#300，9a53591b）。补充记录作者层已实现并通过定向等价验收：为 static effects 作者层提供 `supplementalRecords` 的强类型表达、运行时校验、按 `supplementId` 的原位替换与针对性测试。P2-4a 本身不迁移正式补充记录；后续 [P2-4b-lite](phase2-miyabi-supplement-migration.md) 已迁移 `nanoka:agents:miyabi:frostburn-break-damage` 一条，三份正式 effects 制品、`snapshotId`、公开 exports 与 core/shared 运行时仍逐字节未变。

## 范围

- 作者记录新增可选的 `supplementalRecords`，声明该记录所属选项的补充来源覆盖。
- 作者层补充记录沿用正式 `static-coverage.json` 中非 `boundary` 记录的字段形状：`supplementId`、`source`、`kind`、`optionId`（必填）、`effectIds?`、`supportedRanks`（必填）、`computationTarget`、`status`。
- `kind` 与 `status` 是封闭联合：`option` / `option-variant` / `entity` / `unsupported-option`，`integrated` / `out-of-scope`。
- 编译只按 `supplementId` 原位替换基线条目，不新增、不删除、不重排；替换计数进入编译摘要。
- P2-4a 本身不迁移数据：`MIGRATED_AUTHORING_RECORDS` 保持 19 条且当时没有任何一条声明补充记录，`authoring:verify` 的补充替换计数为 0；后续 [P2-4b-lite](phase2-miyabi-supplement-migration.md) 才在 `miyabi-frostburn-main` 上迁移 1 条真实记录。

## 类型与校验

[`types.ts`](../../../packages/data/scripts/static-effects/authoring/types.ts) 新增 `AuthoringSupplementalRecord`，`AuthoringRecordBase` 增加可选 `supplementalRecords`。补充记录挂在声明它的作者记录上，因此归属关系与 `optionId` 一致性都由该记录决定；作者层不表达 `boundary`，其形状要求 `optionId` 与 `supportedRanks` 必填。`compile.ts` 的本地读取类型仍允许这两个字段缺省，因为正式 coverage 可能包含没有它们的 `boundary` 记录。

[`validation.ts`](../../../packages/data/scripts/static-effects/authoring/validation.ts) 增加：

- 必填字段的逐项类型校验：`supplementId`、`source`、`optionId`、`supportedRanks`、`computationTarget` 必须是非空字符串；`kind`、`status` 必须在封闭词表内。
- `supplementId` 在整批作者输入中全局唯一；重复项报告到 `[记录下标]/supplementalRecords[下标]/supplementId`。
- `optionId` 无条件必填，并且必须等于所属记录的 `ids.optionId`，否则报告到 `/supplementalRecords[下标]/optionId`；缺少该字段时报告同一路径的 `expected a string`。
- `effectIds` 可选；声明时逐项要求非空字符串。是否存在于编译结果或基线属于编译期检查，因为结构校验没有基线上下文。
- 缺失字段由既有字段路径校验负责，例如缺少 `computationTarget` 报 `[记录下标]/supplementalRecords[0]/computationTarget: expected a string`。

[`static-effects-authoring.typecheck.ts`](../../../packages/data/test/static-effects-authoring.typecheck.ts) 增加未知 `kind`、未知 `status`、缺少 `computationTarget` 与缺少 `optionId` 的类型反例，并断言作者形状可赋值给正式补充记录类型。

## 编译

[`compile.ts`](../../../packages/data/scripts/static-effects/authoring/compile.ts) 新增导出的 `replaceSupplementalRecords(baseline, compiled)`：

1. 按 `supplementId` 建立作者索引；重复 ID 直接抛错。
2. 遍历基线数组，命中时原位替换；保留数组顺序，并用基线条目的键序写出替换对象，保证字节比较仍是有效门禁。
3. 未声明的基线条目原样保留；未知 ID 抛错，不新增条目。
4. 基线条目含作者层无法表达的字段（当前为 `reason`）时明确拒绝，而不是静默丢弃。

`compileAuthoringArtifacts` 在分组编译前收集补充记录：重复 ID 与 `optionId` 归属不一致都会抛错。规则编译完成后检查补充记录的 `effectIds` 必须存在于本次编译生成的规则或基线规则中。替换后再通过既有数量门禁，补充记录数保持 101。

`AuthoringCompilation.supplementalRecordIds` 暴露替换的 ID；`summarizeCompilation` 输出 `supplemental records: N` 计数。P2-4a 当时显示 0；[P2-4b-lite](phase2-miyabi-supplement-migration.md) 迁移 1 条后为 1。

## 测试

新增 [`static-effects-authoring-supplemental.test.ts`](../../../packages/data/test/static-effects-authoring-supplemental.test.ts)，12 个用例（[P2-4b-lite](phase2-miyabi-supplement-migration.md) 新增真实记录用例后为 13 个）：

| 用例                         | 断言                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 真实 Miyabi 补充记录原位替换 | 作者常量与基线真实形状一致；替换后仍在原下标、数量 101、其余条目不变、键序沿用基线                           |
| 候选值来自作者而非基线       | 把基线条目改成哨兵值后编译，候选逐字段等于作者值；语义比较在对应字段报告差异                                 |
| 未声明时不变                 | 从克隆记录移除声明后编译：`supplementalRecordIds` 为空，`supplementalRecords` 与基线逐语义相同，摘要计数为 0 |
| 未知 `supplementId`          | 编译抛出“不在基线中”                                                                                         |
| 重复 `supplementId`          | 编译抛出重复 ID；运行时校验报告 `supplementId` 路径                                                          |
| `optionId` 与所属记录不一致  | 运行时校验报告 `optionId` 路径；编译同样拒绝                                                                 |
| 未知 `kind` / `status`       | 运行时校验分别报告 `kind` / `status` 路径                                                                    |
| `effectId` 不存在            | 编译抛出未知 effect ID                                                                                       |
| 缺字段                       | 运行时校验报告准确的 `computationTarget` 路径                                                                |
| 缺 `optionId`                | 运行时校验报告 `/supplementalRecords[0]/optionId` 与 `expected a string`                                     |
| 基线含 `reason`              | 编译拒绝作者层无法表达的字段                                                                                 |

## 消融实验

| 尝试删减                                        | 结果与处理                                                                                                                                                       |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 把补充记录做成顶层独立数组                      | 需要扩大 `compileAuthoringRecords`、生成器与验收入口的签名，并另建“所属记录”关联；补充记录天然属于某个选项，挂在记录上可复用现有输入与归属校验。保留记录内声明。 |
| 直接复用 `data-product/static-coverage.ts` 类型 | 作者层只依赖自身封闭联合，避免把运行时解析器引入脚本层；正式形状在字段层面保持一致，并由测试对比真实 Miyabi 记录。保留作者层独立类型。                           |
| 允许作者层表达并替换 `reason`                   | 本 PR 的范围没有覆盖越界说明的作者化；静默接受会让基线说明丢失。先明确拒绝，后续扩展时再补字段与测试。                                                           |
| 替换时合并基线可选字段                          | “原位替换”以作者声明为准，合并会让作者无法删除可选字段，也会模糊候选来源。保留完整替换，可选字段是否声明由作者决定。                                             |
| 在 `replaceCoverage` 内顺带重建补充记录         | 两者身份不同（`pointer                                                                                                                                           | entity`与`supplementId`），顺序与键序规则相同但失败语义不同；独立函数便于直接测试未知/重复 ID。保留独立 `replaceSupplementalRecords`。 |

## 限制

- P2-4a 只提供能力，不迁移数据：P2-4a 当时正式 `supplementalRecords` 由 converter 生成，101 条全部保持原样，作者记录没有声明任何补充记录。[P2-4b-lite](phase2-miyabi-supplement-migration.md) 已迁移其中 1 条；其余 100 条仍由 converter 生成。
- 作者层不能表达 `reason`；含该字段的基线条目当前不能被替换。未知字段、未知 ID 与重复 ID 都会失败，不会新增或删除条目。
- 补充记录的 `effectIds` 只校验存在性，不校验其是否属于同一选项或是否与规则状态一致；这些约束继续由正式转换器与后续迁移 PR 负责。
- 作者层 `optionId` 必填，并且必须等于所属记录的 `ids.optionId`；`supportedRanks` 同样必填。
- 作者层不表达 `boundary`；`compile.ts` 的正式 coverage 读取类型允许 `boundary` 记录缺省 `optionId`/`supportedRanks`，不因此放宽作者记录。
- 未修改 `definitions`、`integrated`、`dist`、`snapshotId`、公开 exports、core/shared 运行时或生成链行为。

## 验证

| 命令                                                                                              | 实际结果                                                                                                                          |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @randomplay/data authoring:verify`                                                 | 19 条记录；19 rules、17 options、15 coverage positions、2 skill targets、补充替换 0；语义 PASS（0 differences）；三制品字节一致。 |
| `pnpm --filter @randomplay/data exec vitest run static-effects-authoring*.test.ts --project unit` | 43 个测试通过（18 试点 + 13 迁移 + 12 补充记录）。                                                                                |
| `pnpm --filter @randomplay/data typecheck`                                                        | 通过。                                                                                                                            |
| `pnpm check:quality`                                                                              | 通过；oxlint 0 errors（既有 127 warnings），格式与 spec 类型检查通过。                                                            |
| `pnpm --filter @randomplay/data check:source`                                                     | 通过；108 个测试文件、4,709 个测试通过。                                                                                          |
| `pnpm --filter @randomplay/core check:source`                                                     | 通过；98 个测试文件通过、3 个跳过；5,684 个测试通过、24 个跳过。                                                                  |
| `pnpm --filter @randomplay/data verify:pack`                                                      | 通过；2 个打包测试通过。                                                                                                          |

上表为 P2-4a 当时的结果；P2-4b-lite 迁移 1 条后的最新计数与命令结果见[迁移计划](phase2-miyabi-supplement-migration.md#验证结果)。

数据管理：worktree 没有 `packages/data/.integrated.fairy-state`，属于静态工作区；本 follow-up 不涉及快照、来源版本或整合规则修改，正式制品不变，因此不写管理记录。主工作区 `/Users/caoyujie/codes/fairy` 保持 `phase: idle`，`state.json.current.indexSha256` 与实际 `integrated/index.json` 一致（`d68ad1d8…`），`verify:nanoka:current integrated` 返回 `verified: true`；未改写管理记录。

## 后续

P2-4b-lite 已按本条路径迁移 `nanoka:agents:miyabi:frostburn-break-damage`，见[迁移计划](phase2-miyabi-supplement-migration.md)；P2-4c 已把另外 23 条已有作者选项的 integrated 记录迁入作者层，见[批量迁移记录](phase2-supplement-authoring-batch.md)；P2-4d 又把 16 条音擎选项纳入作者层，见[音擎批次记录](phase2-w-engine-supplement-authoring.md)；P2-4e 又纳入 10 条单变体代理人/驱动盘选项，见[代理人批次记录](phase2-agent-supplement-authoring.md)。当前已作者化 50/68 条，剩余 18 条 integrated 需要先补作者选项；表达 `reason` / `boundary` 与 33 条 out-of-scope 记录仍留待后续批次。
