# Phase 1 P1-2：`data explain` 只读 CLI

状态：已实现。范围仅 P1-2；P1-3 生成/构建期校验与 P1-4 依赖图未开始。本记录不改变
`integrated`、`definitions`、`dist`、生成器、shared、core 或 `snapshotId`。

## 范围与入口

新增：

- [`packages/data/scripts/explain-data.ts`](../../packages/data/scripts/explain-data.ts)：CLI 参数解析、加载与退出码。
- [`packages/data/scripts/data-product/explain.ts`](../../packages/data/scripts/data-product/explain.ts)：输入识别、纯查询、结构化结果、中文格式化。
- [`packages/data/scripts/data-product/agent-actions.ts`](../../packages/data/scripts/data-product/agent-actions.ts)：只读加载 `definitions/skills/agents/*.json` 并定位 `actionId`。
- [`packages/data/test/explain-data.test.ts`](../../packages/data/test/explain-data.test.ts)：纯函数、真实制品与 CLI smoke 测试。

[`package.json`](../../packages/data/package.json) 只新增脚本入口：

```sh
pnpm --filter @randomplay/data explain <effectId|optionId|actionId|pointer> [--json] [--type effect|option|action|pointer]
```

模块仍位于 `scripts/` 内部，不从 `packages/data/src/index.ts` 导出，不增加
`package.json` exports 或运行时依赖，也没有新增 npm 依赖。

## 输入识别

按文档化前缀识别，不按内容猜测：

| 类型       | 前缀                                               |
| ---------- | -------------------------------------------------- |
| `effectId` | `agent:`、`w-engine:`、`disc:`                     |
| `optionId` | `agents:`、`w-engines:`、`drive-discs:`、`nanoka:` |
| `actionId` | `action:agent:`                                    |
| `pointer`  | `/`                                                |

无法识别或出现多重匹配时返回明确错误和非零退出码，并列出支持的形式。`--type` 只用于
显式指定类型；输入与该类型的形状不匹配时仍拒绝，不把任意字符串当作 ID 查询。

## 四类查询

### effectId

- 从 `static.json.effects` 定位规则；
- 列出所有变体 `effectIds` 命中该 ID 的 catalog option，并保留变体序号，重复引用全部列出；
- 通过 `queryStaticCoverage({ effectId })` 同时查询 `records` 与结构化 `supplementalRecords.effectIds`；
- 列出 `target.effectId` 等于该 ID 的 modification 规则；
- 输出规则来源引用、变体状态/configuration、具名差异、覆盖状态与原因。

### optionId

- 定位 catalog option 与全部变体；
- 汇总去重后的 `effectIds`、变体状态、configuration、来源引用、输入、最大层数与具名差异；
- 通过 `queryStaticCoverage({ optionId })` 查询 records 与 supplementalRecords；
- 附带关联规则摘要；unsupported 且 `effectIds: []` 的选项正常返回，不伪造规则。

### actionId

- 只读扫描 `definitions/skills/agents/*.json`，按 `actionId` 精确定位；重复 ID 视为数据错误；
- 输出 action 名称、`branchId`、`levelGroup`、`skillCategory`、来源 path/pointer、描述、
  参数、伤害/失衡系数、calculation 结构、潜能等级与技能等级加成；
- 解析 `skillTargetIds` 与 `conditionalIdentity.skillTargetIds` 到 `static-catalog.json`
  的 `skillTargets`；无结构化关联时明确输出 `none` 和说明，部分无法解析时输出 `partial` 和缺失 ID。

### pointer

- 从 coverage `records` 按 `pointer` 精确定位；
- 输出原始值、归一化值、状态、reason/explanation、optionId、effectIds 与 normalizationChanges；
- 关联对应 catalog option 与 `static.json` 规则；
- 保留 P1-1 的限制说明：`supplementalRecords` 没有结构化 pointer，pointer 查询只覆盖 records。

## 输出与稳定性

- 默认输出中文人类可读文本；`--json` 输出 `schemaVersion: 1` 的判别联合对象。
- 数组按显式排序：catalog 引用按 optionId + 变体序号，coverage records 按 pointer + optionId + stat，
  supplementalRecords 按 supplementId，规则与差异按 ID。相同输入重复运行输出逐字节一致。
- 未知输入、形状不匹配与查找失败均返回退出码 1；`--json` 模式下错误写入 stderr 的结构化对象，
  并包含支持的形式。
- 测试或文档没有结构化映射，结果固定输出“未自动关联测试/文档”，不根据文件名或命名猜测锚点。

## 复用与最小扩展

复用 P1-1 的 `loadStaticEffectsProduct()`、`loadDataProductManifests()` 相关类型与
`queryStaticCoverage()`。只做以下内部扩展：

- `StaticEffectsProduct` 增加解析后的 `rules`（contribution 的 operation/scope/activation/beneficiary/
  参数名，以及 modification 的 phase/target/modifications）；modification target 显式区分
  `effect` 与 shared 契约允许的 `state`，后者不会让整个产品加载失败；
- catalog option/variant 暴露 explain 所需的名称、条件、目标、状态、configuration、references、
  inputs、maximumLayers、reason/explanation；未建模的领域字段仍由生成器维护；
- catalog 解析 `skillTargets`，供 actionId 关联；
- `queryStaticCoverage` 增加 `optionId` 与 `effectId` 过滤，条件之间仍按 AND 组合；
- action 定义使用只读最小读取模型：只校验输出需要的字段，忽略生成器新增但 explain 不消费的
  字段，避免整个 CLI 因 schema 扩展而失效。

没有复制静态制品解析逻辑，也没有把 explain 逻辑放进 `src/` 或 core。

## 消融实验

| 尝试删减                                                 | 结果与处理                                                                                                               |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 删除 `ExplainRelatedTestsAndDocs` 包装对象，只保留字符串 | 该状态当前恒定，包装只增加一层；已改为单个字符串字段“未自动关联测试/文档”。                                              |
| 删除归一化 coverage 中的 `group` 字段                    | records/supplementalRecords 已由两个数组区分，字段冗余；已删除。                                                         |
| 删除 `agent-actions.ts`，把 action 查找内联到 CLI        | 纯查询需要可测试的 action 索引与定位函数，且 CLI 不应承担字段解析；保留独立只读加载器。                                  |
| 用 actionId 中的数字段直接推导文件路径                   | 真实数据存在 `action:agent:1031:basic-enhanced-1` 这类非纯数字后缀；改为扫描 `skills/agents/*.json` 精确匹配，避免猜测。 |
| 删除 `--type` 覆盖                                       | 四类前缀当前无歧义，但保留显式覆盖可在未来前缀重叠时消歧；只接受与形状匹配的输入，不扩大猜测面。                         |
| 删除 `conditionalIdentity` 关联                          | 零号·安比等动作的追加攻击目标只在条件身份中登记；删除会漏掉真实结构化关联，保留并单独标注“条件关联”。                    |
| 把无条件与条件 skill target 合并为一个 association       | 仅条件关联的动作会显示 `structured` 但无条件列表为空；已拆成两个字段，避免误读。                                         |
| 拒绝 action 定义中的未知字段                             | explain 是只读消费方，不承担生成/消费 schema 验证；未知字段被忽略，避免生成器新增字段时整个 CLI 失效。                   |
| 只接受部分 shared 规则形状                               | shared 契约还允许 `state` modification target 与 `instant` 规则；已显式区分/保留，避免未来合法制品导致整个产品加载失败。 |
| 把“没有 modification target”写成限制                     | 这是大多数 contribution 的正常状态；保留空数组与人类文本“无”，不再污染限制列表。                                         |
| 入口守卫直接比较 `process.argv[1]` 与 `import.meta.url`  | 通过符号链接调用时两者不同会静默退出；改用 `realpath` 比较并加测试。                                                     |
| 在 JSON 中输出完整规则 AST                               | 解释目的只需要稳定身份、来源与可用字段摘要；完整 AST 会放大输出并复制正式类型。保留摘要，modification 保留 changes。     |
| 为 explain 新建 barrel `index.ts`                        | 只有 CLI 与测试两个消费者，直接导入明确模块即可；不增加转接层。                                                          |

## 验证

| 命令                                                                                                                | 实际结果                                                                                           |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `pnpm --filter @randomplay/data exec vitest run test/data-product.test.ts test/explain-data.test.ts --project unit` | 2 个文件、46 个测试通过。                                                                          |
| `pnpm exec tsc -p packages/data/tsconfig.json --noEmit`                                                             | 通过。                                                                                             |
| `pnpm exec oxlint <changed files>`                                                                                  | 0 errors、0 warnings。                                                                             |
| `pnpm --filter @randomplay/data explain <effectId> --json`                                                          | 实际运行并解析关键字段；同一输入两次输出逐字节一致。                                               |
| `pnpm --filter @randomplay/data explain <optionId>` / `<actionId>` / `<pointer>`                                    | 四类输入均已实际运行；action 无 target 时输出明确 `none`。                                         |
| `pnpm check:quality`                                                                                                | 通过；oxlint 0 errors、127 条仓库既有 warnings，oxfmt 与 spec 类型检查通过。                       |
| `pnpm --filter @randomplay/data check:source`                                                                       | 通过；103 个测试文件、4,632 个测试通过。                                                           |
| `pnpm --filter @randomplay/data test:fast`                                                                          | 通过；88 个测试文件、4,207 个测试通过。                                                            |
| `git diff --stat`                                                                                                   | 仅 scripts、test、package.json 脚本入口与本文档/索引；`integrated`、`definitions`、`dist` 无变化。 |

测试覆盖四类输入各至少一例、未知输入、无 catalog/coverage 引用但被 modification 指向的 effectId
（合成 fixture，含 shared 契约允许的 state target 与 instant 规则）、同一 effectId 被多个
option/variant 引用、仅在 supplementalRecords 中出现的 effectId/optionId、unsupported option 无
effectIds、pointer 记录、action 无条件/条件/partial target 关联、action 未知字段忽略与必需字段
报错、`--json` 稳定输出、符号链接入口、CLI 未知输入退出码与 `--type` 冲突。测试只读，不修改输入
或制品。

## 边界

- 不执行 P1-3 的生成/构建期校验，不执行 P1-4 依赖图。
- 不自动关联测试或文档锚点；没有结构化映射时固定输出“未自动关联测试/文档”。
- 不从名称、数组位置、`optionId` 段序或说明文本推断实体归属、差异或技能目标。
- 本 PR 不修改数据快照、来源版本或整合规则，不涉及需要同步的本机数据管理状态。
