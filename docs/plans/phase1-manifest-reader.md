# Phase 1 P1-1：内部数据产品 manifest 读取器与覆盖查询

状态：已实现并合并（PR #291），且已通过独立验收。本记录同时包含 follow-up 修订：覆盖计数使用显式 `unit` / `count`，静态效果读取器校验 catalog 与 coverage 的 source 一致。范围仅 P1-1；P1-2 CLI、P1-3 生成/构建期校验与 P1-4 依赖图未开始。

## 范围与位置

新增内部只读模块 [`packages/data/scripts/data-product/`](../../packages/data/scripts/data-product/)：

- [`manifests.ts`](../../packages/data/scripts/data-product/manifests.ts)：读取并归一化属性 manifest、技能 manifest 与三个静态效果制品。
- [`static-coverage.ts`](../../packages/data/scripts/data-product/static-coverage.ts)：解析 `static-catalog.json` / `static-coverage.json`，提供纯函数覆盖查询与结构化差异关联。
- [`json.ts`](../../packages/data/scripts/data-product/json.ts)：文件读取、字段校验与错误信息的小型内部工具。

模块不从 `packages/data/src/index.ts` 导出，不修改 `package.json` exports，不进入运行时依赖，也没有新增依赖。当前 manifest、`integrated`、`definitions`、`dist`、生成器、shared、core 与 `snapshotId` 均未修改。

## 统一视图

`loadDataProductManifests()` 返回 `panelAttributes`、`agentActions`、`staticEffects` 三个 `DataProductManifest`；也可用 `loadPanelAttributesManifest()`、`loadAgentActionsManifest()` 与 `loadStaticEffectsProduct()` 单独读取。统一字段为：

| 字段            | 含义                                                                     |
| --------------- | ------------------------------------------------------------------------ |
| `product`       | `panel-attributes` / `agent-actions` / `static-effects`                  |
| `schemaVersion` | 制品声明的结构版本                                                       |
| `rulesVersion`  | `label`；静态效果另带 `ruleSetId` 与 `revision`                          |
| `source`        | 来源版本；静态效果为 ZZZ-HP 仓库与提交                                   |
| `artifacts`     | 制品路径、sha256 与字节数；`sha256Origin` 区分 manifest 声明与读取器计算 |
| `limitations`   | 产品限制；`origin` 区分 manifest 内容与读取器派生限制                    |
| `discrepancies` | 具名差异；领域字段保留在 `details`                                       |
| `coverage`      | 计量单位 `unit`、计数 `count`、状态计数、补充计数与补充状态计数          |
| `extensions`    | 产品特有字段，不因统一而删除语义                                         |

`coverage.unit` 明确 `coverage.count` 与 `coverage.statusCounts` 的计量单位：`panel-attributes` 为 `members`，取 62 名角色 + 103 个音擎 = 165 个成员；`agent-actions` 为 `actions`，取 1,348 条动作；`static-effects` 为 `coverage-records`，取 1,360 条 `records`。静态补充记录由 `coverage.supplementalCount` 表示，共 101 条，`supplementalStatusCounts` 为 `integrated` 68 条、`out-of-scope` 33 条。属性与技能的 `artifacts` 复用 manifest 已声明的 sha256，字节数按 definitions 文件读取；静态效果没有现行 manifest，三个制品的 sha256 与字节数由实际文件计算。

静态效果读取器在 `StaticCatalog` 中保留 `source`（`repository`、`commit`、`files`），并要求它与 `StaticCoverage.source` 的 repository、commit、files（路径、sha256 与顺序）完全一致；任何一项不同都会抛出错误。`manifest.source` 与 `extensions.sourceFiles` 均使用校验后的 source。

## 覆盖查询

`queryStaticCoverage({ catalog, coverage }, filter)` 支持按 `catalogEntityId`、`pointer`、`status` 与 `differenceId` 过滤 `records` 与 `supplementalRecords`。条件之间按 AND 组合；未知实体、未知指针、未知状态与未知差异均返回空结果。函数不读取文件、不修改输入，返回的新对象保留 `group`、`optionId`、`effectIds`、`status`、`reason`、`explanation` 与 `pointer`（补充记录没有结构化 `pointer` 时为缺省）。

`differenceId` 只使用结构化关系：`catalog.options[].variants[].differences[]` → `optionId` / `effectIds` → coverage 记录，不使用 `explanation`、`reason`、note 或其他文本推断。仅出现在 `catalog.differences` 顶层、未被任何变体引用的差异会：

- 在静态效果 manifest 的 `limitations` 中以 `origin: "reader"` 记录完整 ID 列表；
- 在按该 `differenceId` 查询时返回空结果，并说明“只有 catalog 说明、没有结构化引用”。

补充记录不带结构化 `pointer`，因此 `pointer` 过滤只匹配 `records`；补充记录仍可由 `optionId` 关联目录，并按解析出的 `catalogEntityId` 与 `status` 查询。`records` 使用 `converted` / `corrected` / `unsupported`，`supplementalRecords` 使用 `integrated` / `out-of-scope`，两套状态词表均受支持。

## 读取与错误处理

读取器对以下情况抛出带文件路径和字段路径的明确错误，不静默跳过：

- 文件缺失或 JSON 无效；
- 必需字段缺失、类型不符或状态值未知；
- 顶层或已建模对象出现未知字段；
- manifest 声明的制品文件缺失；
- 三个静态制品之间的 `schemaVersion`、`ruleSetId` 或 `revision` 不一致；
- `static-catalog.json.source` 与 `static-coverage.json.source` 的 `repository`、`commit` 或 `files` 不一致；
- 变体引用未登记的 `differenceId`，以及重复的 `differenceId` / `optionId`。

变体的其余领域字段（例如条件、引用与配置）不由本模块解释，保留给正式类型与生成器维护；coverage 查询只消费 `effectIds` 与 `differences`。

## 消融实验

| 尝试删减                                             | 结果与处理                                                                                                                                                       |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 删除目录入口 barrel（`index.ts`）                    | 测试与读取均通过；消费方可直接导入两个明确模块，因此保留删除，减少无消费者的转接层。                                                                             |
| 删除 `queryStaticCoverage` 的结果包装，仅返回数组    | 会丢失按 `differenceId` 查询时的文本关联与 pointer 限制说明，无法满足“明确记录为 limitation”，保留 `{ matches, limitations }`。                                  |
| 删除 `StaticEffectsProduct` 包装                     | manifest 与查询所需的 catalog/coverage 将分散返回，调用方需重复约定三者来自同一次读取；保留该包装。                                                              |
| 删除 `sha256Origin`                                  | 会把 manifest 声明摘要与实际文件计算摘要混为同一语义，保留。                                                                                                     |
| 删除按产品读取函数，只保留聚合读取                   | 无法对单个产品做聚焦读取与错误分支测试，且每次都要读取全部产物；保留三个读取入口。                                                                               |
| 删除 `json.ts`，把校验工具分别内联                   | 两个模块会复制字段路径与错误约定，增加漂移风险；保留共享工具。                                                                                                   |
| 用 `coverage.unit` / `coverage.count` 替换 `records` | 一个 `unit` 字符串加一个计数即可消除三义；若继续使用 `records`，`data explain` 等消费方必须结合 `product` 才能解释单位。不增加按产品分叉的包装层，保留当前形状。 |
| 只比较 repository/commit，不比较 source files        | files 及 sha256 是来源证据的一部分；只比较前两者时，catalog 与 coverage 仍可能引用不同的上游文件集合。保留完整比较。                                             |

## 验证

| 命令                                                                                      | 实际结果                                                                                                                                 |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check:quality`                                                                      | 通过；oxlint 0 errors（仓库既有 127 warnings），格式与 spec 类型检查通过。                                                               |
| `pnpm --filter @randomplay/data check:source`                                             | 通过；102 个测试文件、4,610 个测试通过。                                                                                                 |
| `pnpm --filter @randomplay/data exec vitest run test/data-product.test.ts --project unit` | 24 个测试全部通过。                                                                                                                      |
| `pnpm --filter @randomplay/core check:source`                                             | PR #291 合并前通过；98 个测试文件通过、3 个跳过；5,684 个测试通过、24 个跳过。本次 follow-up 未修改 core，未重复执行。                   |
| `git diff --stat` / `git status --short`                                                  | 仅修改 `scripts/data-product/` 两个模块、`test/data-product.test.ts`、本实施记录与文档索引；`integrated`、`definitions`、`dist` 无变化。 |

新增测试覆盖真实 manifest 的产品、版本与关键计数，四类查询过滤，未知过滤返回空，文本关联差异的 limitation，输入不变性，catalog/coverage 的 source repository、commit、files 集合与摘要不一致负例，以及真实数据未覆盖的 `effectIds` 关联与补充记录缺少 `effectIds` 分支（小型合成 fixture）。本 PR 不涉及数据快照、来源版本或整合规则修改，因此没有需要同步的本机数据管理状态；静态 worktree 不创建管理记录。
