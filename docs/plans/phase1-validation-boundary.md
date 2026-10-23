# Phase 1 P1-3：生成期与构建期校验边界

状态：已实现。范围仅 P1-3；P1-4 制品依赖检查已由 [P1-4 实施记录](phase1-artifact-dependencies.md) 接续实现。本记录不改变 `integrated`、`definitions`、`dist`、
`snapshotId`、公开 exports、shared/core 运行时或生成数据内容。

## 范围与结果

| 边界                | 输入                                      | 权威校验                                                                   | 失败行为                                     |
| ------------------- | ----------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------- |
| 构建期静态规则      | `definitions/effects/static.json`         | core `parseEffectRuleSet`                                                  | 抛出含文件、Issue code、Pointer 与原因的错误 |
| 构建期静态目录      | `definitions/effects/static-catalog.json` | core `validateStaticCatalog`，使用同一已解析 `RuleSet`                     | 同上                                         |
| 构建期属性 manifest | `definitions/attributes/manifest.json`    | P1-1 `loadPanelAttributesManifest`                                         | 不写 `calculation-data.ts`                   |
| 构建期技能 manifest | `definitions/skills/manifest.json`        | P1-1 `loadAgentActionsManifest`                                            | 不写 `calculation-data.ts`                   |
| 生成期属性候选      | 候选目录                                  | P1-1 `loadPanelAttributesCandidateManifest` + 既有 `verifyPanelAttributes` | 不占用、不替换正式输出目录                   |
| 生成期技能候选      | 候选目录                                  | P1-1 `loadAgentActionsCandidateManifest` + 既有 `verifyAgentActions`       | 同上                                         |
| 生成期静态候选      | 内存中的规则与目录                        | 既有 `parseEffectRuleSet` / `validateStaticCatalog`，位于写候选与安装之前  | 不创建候选、不替换正式目录                   |

`prepare-calculation-data.ts` 的两个 `as RuleSet` / `as StaticEffectCatalog` 已删除；JSON 读取值先进入
`unknown`，由 Result 解包取得正式类型。错误只展示前 5 条 Issue，并注明省略数量：

```text
definitions/effects/static.json: INVALID_DEFINITION at /schemaVersion: schemaVersion must be 1
definitions/effects/static-catalog.json: CONTEXT_MISMATCH at /catalog: Catalog schema, ruleSetId and revision must match the definitions
definitions/attributes/manifest.json: missing required field "rulesVersion"
definitions/skills/manifest.json: unknown field(s) "unexpected"
```

静态规则/目录仍以 core 校验器为唯一结构权威；属性/技能 manifest 仍以 P1-1 读取器为唯一结构权威。
候选读取器复用同一解析函数，只把“产品目录就是候选目录”这一布局差异显式传入，没有复制 schema 或校验器。

`snapshotId` 的计算与输出内容未修改；`data-structure-baseline` 继续确认
`sha256:02398d0fc76b4eed4bd7aaccd1370f8c161b5331266a0442c1f54ee67668f03c`。

## 生成器顺序

- `generate-static-effects.ts` 原有顺序已满足要求：候选规则集与目录通过 core 校验后才创建候选目录，
  写入并格式化后才安装。本次未修改该文件。
- `generate-panel-attributes.ts` 与 `generate-agent-actions.ts` 在既有 `verify*` 前先运行 P1-1 候选读取器，
  两者都包在 `installCandidateAfterValidation()` 的校验回调内；校验抛错时不会调用安装函数。
- 既有 `verifyPanelAttributes` / `verifyAgentActions` 继续负责来源成员、输入摘要、registry、目录成员与
  制品摘要等生成器契约；它们不替代 P1-1 的结构校验。

## 消融实验

| 尝试删减                                                                   | 结果与处理                                                                                                                            |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 删除 `verifyDefinitionManifests()`，只依赖 `prepareDefinitions` 的既有校验 | 临时移除后，非法 attributes / skills manifest 的 2 个测试从拒绝变为成功写入；同时既有校验是生成器契约对照，不是 P1-1 结构读取。保留。 |
| 用 `JSON.stringify(issues)` 代替逐条错误格式                               | 会丢失文件、Pointer 与原因的可读定位，无法满足构建期错误要求。保留 `validationError()`。                                              |
| 删除 `installCandidateAfterValidation()`，在两个生成器中内联校验与安装     | 行为不变，但“校验失败不触碰正式目录”只剩代码阅读保证，无法用现有测试直接固定。保留这一层可测试的顺序封装。                            |
| 删除候选专用读取器，改用临时 `definitions/attributes` 外壳                 | 需要复制或符号链接整个候选目录，增加路径与清理面；专用入口直接复用同一 parser。保留。                                                 |
| 只保留 core 静态校验，删除属性/技能 manifest 校验                          | 任务要求的“写 `calculation-data.ts` 前复验同一快照 manifest”会缺失；删除后对应负例测试失败。保留。                                    |
| 在 data 运行时新增一份 schema 或复制 P1-1 解析器                           | 会产生第二套结构知识；候选读取器直接复用 `parsePanelAttributesManifest` / `parseAgentActionsManifest`。不采用。                       |
| 修改 `convert.ts` 内的构造中间对象断言                                     | 不属于外部 JSON 读取边界，超出 P1-3 范围。保持不动。                                                                                  |

## 验证

| 命令                                                                                             | 实际结果                                                                                  |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `pnpm --filter @randomplay/data exec vitest run test/validation-boundary.test.ts --project unit` | 12 个测试通过。                                                                           |
| `pnpm --filter @randomplay/data check:source`                                                    | 通过；104 个测试文件、4,644 个测试通过。                                                  |
| `pnpm --filter @randomplay/core build` + `pnpm --filter @randomplay/core check:source`           | 通过；98 个测试文件通过、3 个跳过；5,684 个测试通过、24 个跳过。                          |
| `pnpm check:quality`                                                                             | 通过；oxlint 0 errors、127 条仓库既有 warnings，oxfmt 与 spec 类型检查通过。              |
| `pnpm --filter @randomplay/data generate:panel-attributes <pinned 0df40c5> <temp>`               | 成功；62 名代理人、103 个音擎；输出与 `definitions/attributes` 逐文件一致。               |
| `pnpm --filter @randomplay/data generate:agent-actions <pinned 0df40c5> <temp>`                  | 成功；62 名代理人、1,348 条动作；输出与 `definitions/skills` 逐文件一致。                 |
| `pnpm --filter @randomplay/data generate:static-effects <pinned 2628b32> <temp>`                 | 成功；`static.json`、`static-catalog.json`、`static-coverage.json` 与正式制品逐字节一致。 |
| `git diff --stat` / `git status --short`                                                         | 仅 `scripts/`、新增测试与文档；`integrated`、`definitions`、`dist` 无 diff。              |

新增测试覆盖：合法当前 definitions 通过并写出 calculation-data；非法 static 规则/目录、属性 manifest、
技能 manifest 在写盘前被拒绝且错误含文件与字段；源码边界不再有 `as RuleSet` / `as StaticEffectCatalog`；
候选 manifest 非法时正式目录保持原内容；候选合法时按原安装步骤复制。生成期完整运行使用本机固定的
ZZZ-HP `0df40c5` 与 `2628b32` 提交，产物与当前正式 definitions 一致。

## 边界与后续

- 不修改 `integrated`、`definitions`、`dist`、`snapshotId`、公开 exports 或 shared/core 运行时。
- 不追改 `convert.ts` 内为构造中间对象使用的 `as unknown as`。
- 当前正式数据通过新校验，无需修改数据；本 worktree 没有控制目录，属于静态工作区，不创建本机管理记录。
  本次变更不触及数据快照或管理契约，主工作区既有管理状态无需重写。
- P1-4 制品依赖检查已由 [P1-4 实施记录](phase1-artifact-dependencies.md) 接续实现。
