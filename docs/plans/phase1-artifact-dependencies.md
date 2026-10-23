# Phase 1 P1-4：制品依赖图检查

状态：已实现。范围仅 P1-4，承接 [P1-1 读取器](phase1-manifest-reader.md)、
[P1-2 explain CLI](phase1-explain-cli.md) 与 [P1-3 校验边界](phase1-validation-boundary.md)。
本记录不改变 `integrated`、`definitions`、`dist`、`snapshotId`、公开 exports、shared/core
运行时或生成器流程。

## 入口与范围

新增只读审计入口：

```sh
pnpm --filter @randomplay/data verify:artifact-dependencies [--json]
```

- [`packages/data/scripts/verify-artifact-dependencies.ts`](../../packages/data/scripts/verify-artifact-dependencies.ts)：
  读取 P1-1 已校验的 manifest/静态制品、计算实际文件摘要、运行 CLI 与错误处理。
- [`packages/data/scripts/data-product/dependencies.ts`](../../packages/data/scripts/data-product/dependencies.ts)：
  纯函数依赖检查、稳定排序、违规列表与人类可读摘要。
- [`packages/data/test/artifact-dependencies.test.ts`](../../packages/data/test/artifact-dependencies.test.ts)：
  合成 fixture、正式数据、CLI smoke 与只读性测试。

`--json` 输出 `schemaVersion: 1`、`ok`、`summary`、`nodes`、`edges` 与 `violations`。
默认输出只打印一行结果与全部违规，不展开节点与边。存在违规时退出码为 1；P1-1 读取失败时
写入带 `LOAD_FAILED` 的结构化错误，不把 schema 校验失败伪装成依赖违规。

## 检查链接

| 链接                                                             | 期望                                            | 实际来源                         | 失败代码                                                                                                |
| ---------------------------------------------------------------- | ----------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 属性/技能 manifest → `integrated/index.json`                     | `sourceVersion` 等于 `source.version`           | P1-1 manifest + `index.json`     | `source-version-mismatch`                                                                               |
| 属性/技能 manifest → `integrated/**`                             | `inputs[]` 路径存在且 SHA-256 相等              | 声明值 + 实际文件                | `input-missing` / `input-sha256-mismatch`                                                               |
| 属性/技能 manifest → `definitions/**`                            | `artifacts` 路径存在且 SHA-256 相等             | 声明值 + 实际文件                | `artifact-missing` / `artifact-sha256-mismatch`                                                         |
| 技能 manifest → `definitions/effects/static-catalog.json`        | `staticCatalogSha256` 等于实际摘要              | 声明值 + P1-1 计算的制品摘要     | `static-catalog-sha256-mismatch`                                                                        |
| 技能 manifest → `scripts/skills/registry.json`                   | `registrySha256` 等于实际摘要                   | 声明值 + 实际文件                | `skills-registry-missing` / `skills-registry-sha256-mismatch`                                           |
| catalog/coverage → `scripts/static-effects/source-manifest.json` | `source.files` 的路径集合与摘要一致             | P1-1 校验后的共同来源 + 来源清单 | `source-manifest-missing` / `source-file-missing` / `source-file-extra` / `source-file-sha256-mismatch` |
| catalog ↔ coverage                                               | `source.repository`、`commit`、`files` 完全一致 | P1-1 `loadStaticEffectsProduct`  | 读取器错误（`LOAD_FAILED`）                                                                             |
| 三个静态制品                                                     | `ruleSetId`、`revision` 一致                    | P1-1 `loadStaticEffectsProduct`  | 读取器错误（`LOAD_FAILED`）                                                                             |

来源清单只登记 `path → sha256`；`repository` 与 `commit` 没有第二份清单可比，它们由
`static-effects/source.ts` 的固定常量维护，catalog 与 coverage 之间的一致性由 P1-1 读取器负责。
依赖检查不复制这两个常量，也不新增 schema。

## 依赖图

节点使用相对 `packages/data` 的路径，节点类型为 `integrated-index`、`manifest`、
`integrated-input`、`definition-artifact`、`static-catalog`、`static-coverage`、
`skills-registry`、`source-manifest`。当前正式数据的图规模：

| 指标 | 数量 |
| ---- | ---- |
| 节点 | 730  |
| 边   | 915  |
| 违规 | 0    |

边类型覆盖：

- `source-version`：两个 manifest → `integrated/index.json`；
- `input`：两个 manifest → 各自声明的 495 / 186 个 `integrated/` 输入（共享节点去重）；
- `artifact`：两个 manifest → 166 / 62 个 `definitions/` 制品；
- `static-catalog`：技能 manifest → 静态目录；
- `skills-registry`：技能 manifest → 技能注册表；
- `source-files`：静态目录与覆盖报告 → 来源清单。

节点按 `id`、边按 `from/to/kind`、违规按 `code/node/path/expected/actual` 排序；同一路径被两个
manifest 重复声明时只保留一个节点，相同违规按完整元组去重。相同输入重复运行输出逐字节一致。

## 复用与边界

- 属性/技能 manifest 与三个静态制品继续由 P1-1 读取器解析；本 PR 只把读取器已读取的
  `inputs[]` 从“数量”扩展为 `{ path, sha256 }` 数组，避免依赖检查复制字段与摘要格式校验。
- 制品存在性、静态三制品身份一致性与 catalog/coverage 来源一致性仍由 P1-1 负责；依赖检查只补
  实际摘要比对。读取器失败即审计失败，不降级为依赖违规。
- 生成器、`prepare-calculation-data` 与候选安装流程未修改；本入口不进入生成链。
- 不新增运行时依赖、不从 `packages/data/src/index.ts` 导出、不修改 `package.json` exports。

## 消融实验

| 尝试删减                                                           | 结果与处理                                                                                                                       |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| 删除 `summary.nodeKinds` / `summary.edgeKinds`，人工输出只保留总数 | 删除后 18 个测试与 CLI 仍通过，人类输出仍是一行摘要，测试改用边过滤核对数量；节点/边数组已包含全部信息。保留删除，减少派生字段。 |
| 为静态三制品增加 `rule-set` 节点与边                               | P1-1 已把 `ruleSetId`/`revision` 一致性作为加载前提，重复构图只增加不可达分支。删除该节点/边，读取器错误直接作为审计失败。       |
| 由依赖检查自行读取 `manifest.inputs`                               | 会复制字段名、摘要格式与错误路径，形成第二套 schema。改为在 P1-1 读取器暴露已解析输入。                                          |
| 删除 `DependencyFileDigest`，改用两个 `Record<string, string>`     | 无法区分“未声明”和“文件不可读”，且 loader 与纯函数之间需要额外约定 key。保留显式文件摘要记录。                                   |
| 删除 `formatArtifactDependencyReport()`，在 CLI 内联输出           | 违规定位格式需要独立测试，CLI 还会混入展示逻辑。保留纯格式化函数。                                                               |
| 删除 `artifactDependencyPaths` 常量，内联路径字符串                | 纯函数、CLI 与测试会重复硬编码同一组节点身份，容易漂移。保留单一常量。                                                           |
| 把 P1-1 读取器错误包装为依赖违规                                   | 会把 schema/身份校验失败与“声明与文件不一致”混为一类，违背 P1-3 的边界。保留 `LOAD_FAILED` 分类。                                |
| 在人类输出中列出全部节点/边                                        | 正式数据有 730 个节点、915 条边；只输出总数与违规，详细图保留在 `--json`。                                                       |

## 验证

| 命令                                                                                                                         | 实际结果                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `pnpm --filter @randomplay/data exec vitest run test/artifact-dependencies.test.ts test/data-product.test.ts --project unit` | 43 个测试通过。                                                                                      |
| `pnpm --filter @randomplay/data verify:artifact-dependencies`                                                                | 通过；730 个节点、915 条边、0 个违规。                                                               |
| `pnpm --filter @randomplay/data verify:artifact-dependencies --json`                                                         | 连续两次输出逐字节一致；解析后 `ok=true`、0 个违规。                                                 |
| `pnpm --filter @randomplay/data check:source`                                                                                | 通过；105 个测试文件、4,663 个测试通过。                                                             |
| `pnpm check:quality`                                                                                                         | 通过；oxlint 0 errors、127 条仓库既有 warnings，oxfmt 与 spec 类型检查通过。                         |
| `git diff --stat` / `git status --short`                                                                                     | 仅 `docs/`、`scripts/`、测试与 `package.json` 脚本入口；`integrated`、`definitions`、`dist` 无变化。 |

合成 fixture 覆盖 input 摘要不匹配、artifact 摘要不匹配、`staticCatalogSha256` 不匹配、
`registrySha256` 不匹配、`sourceVersion` 不匹配、来源清单文件集合/摘要不匹配、缺失输入、
缺失注册表、缺失来源清单、静态 revision 不一致、制品缺失与只读性；纯函数另有“只消费传入
摘要”的测试，正式数据另有稳定排序与 CLI `--json` smoke 测试。

## 边界与后续

- 只读：不写回任何 manifest、输入、制品或注册表。
- 制品缺失由 P1-1 在加载期拒绝，本检查不再重复同一存在性 schema；缺失输入、注册表、来源清单
  属于依赖层，可以形成违规。
- 当前正式数据全部通过，无需修改数据；本 worktree 没有控制目录，属于静态工作区，不创建本机
  管理记录。本变更不触及数据快照或管理契约，主工作区既有管理状态无需重写。
- 本 PR 是 Phase 1 的最后一个检查项，不开始 Phase 2。
