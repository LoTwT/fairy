# Phase 2 P2-1：作者层试点

状态：已实现并通过语义等价试点。P2-1 只验证“一条作者记录编译成 rule / option / variant / coverage 三份投影”，不迁移任何正式记录，不修改 core 运行时，也不进入 P2-2。结论为 **go for P2-2 planning**，不是立即迁移授权。

## 范围与位置

新增内部脚本目录 [`packages/data/scripts/static-effects/authoring/`](../../packages/data/scripts/static-effects/authoring/)：

| 文件                                                                                        | 职责                                                                                             |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [`types.ts`](../../packages/data/scripts/static-effects/authoring/types.ts)                 | `EffectAuthoringRecord`、封闭 `operation` / `condition` / `mechanism` 联合、coverage/option 类型 |
| [`ids.ts`](../../packages/data/scripts/static-effects/authoring/ids.ts)                     | 复用正式 ID 语法的固定来源 / 稳定 ID 构造                                                        |
| [`validation.ts`](../../packages/data/scripts/static-effects/authoring/validation.ts)       | 不抛裸异常的运行时结构校验，返回带字段路径的问题                                                 |
| [`compile.ts`](../../packages/data/scripts/static-effects/authoring/compile.ts)             | 以正式三制品为基线，只替换被选中条目的编译器                                                     |
| [`canonical.ts`](../../packages/data/scripts/static-effects/authoring/canonical.ts)         | 稳定 canonicalization、集合索引与差异路径                                                        |
| [`pilot-options.ts`](../../packages/data/scripts/static-effects/authoring/pilot-options.ts) | 一次性转录的选中选项展示/证据元数据                                                              |
| [`pilot-records.ts`](../../packages/data/scripts/static-effects/authoring/pilot-records.ts) | 12 条作者记录（规则语义、状态归属、coverage 位置）                                               |
| [`run-pilot.ts`](../../packages/data/scripts/static-effects/authoring/run-pilot.ts)         | 编译到临时目录并与正式三制品比较的试点入口                                                       |

入口命令：

```bash
pnpm --filter @randomplay/data authoring:pilot
# 或指定基线/候选目录
node --disable-warning=ExperimentalWarning \
  packages/data/scripts/static-effects/authoring/run-pilot.ts \
  packages/data/definitions/effects /tmp/fairy-authoring-candidate
```

新增脚本不进入 `packages/data/src/index.ts`、不修改公开 `exports`、不进入 data 运行时；没有新增依赖。

## 作者记录

`EffectAuthoringRecord` 是一个封闭的 TypeScript 判别联合：

- `EffectAuthoringRuleRecord`：一条可执行规则，包含 `key`、`entity`（`sourceId` / `catalogEntityId` / 来源身份）、`section`、`references`、`config`、`activation`、`beneficiary`、`scope`、`when`、`operation`、`parameters`、`coverage`、`option`、`mechanism`。
- `EffectAuthoringUnsupportedRecord`：迁移占位，不生成规则，只生成 unsupported 选项与 coverage 位置。

封闭边界：

- `operation` 只开放试点用到的 `factor-contribution`、`stat-adjustment`、`hit-adjustment`；`factor-contribution` 的 channel 仅限 `damage-bonus`、`anomaly-damage-bonus`、`attacker-resistance-ignore`、`sheer-damage-bonus`。
- `condition` 只开放 `constant`、`all`、`any`、`compare-number`、`one-of`，并递归回自身；不存在字符串路径、脚本或任意对象读取。
- `activation` 只开放 `supplied`。
- `mechanism` 只开放 `single-rule`、`complete-state`、`independent-settlement`、`unsupported`。
- 数值表达式复用 shared 的 `NumericExpression` 封闭联合；参数复用 `AnyParameter`。

`coverage` 支持 `converted` / `corrected` / `unsupported`、`differenceIds`、`reason`、`explanation` 与来源位置。来源位置记录 pointer、rank、rankKind、stat、raw/normalized 值与规范化变更；完整状态派生规则和补充来源选项可以没有位置，此时编译器不替换 coverage 条目，只把状态与差异投影到目录变体。

新增机制必须同时补 `types.ts`、`validation.ts`、`compile.ts` 与测试。运行时校验与 TypeScript 类型共同拒绝未知的 `operation` / `condition` / `mechanism`；类型反例见 [`static-effects-authoring.typecheck.ts`](../../packages/data/test/static-effects-authoring.typecheck.ts)。

## 试点记录

12 条真实记录覆盖要求的全部类别：

| #   | 作者 key                           | 实体                                   | 机制                                  | 覆盖        | 位置 | 代表点                                        |
| --- | ---------------------------------- | -------------------------------------- | ------------------------------------- | ----------- | ---- | --------------------------------------------- |
| 1   | `anby-m2-damage-bonus`             | `agents:anby`（1011）                  | single-rule / damage-bonus            | converted   | 1    | 简单常量、影画 2 门槛、技能标签条件           |
| 2   | `qingming-crit-rate`               | `w-engines:Qingming_Birdcage`（14137） | single-rule / criticalRate            | converted   | 5    | 音擎精炼 1—5 一表、五个 variant、五个来源位置 |
| 3   | `miyabi-terminal-damage`           | `agents:miyabi`（1091）                | single-rule / damage-bonus            | corrected   | 1    | corrected 元素范围（ice/frost）               |
| 4   | `miyabi-basic-resistance-ignore`   | `agents:miyabi`（1091）                | single-rule / resistance-ignore       | corrected   | 1    | corrected 条件树、抗性无视                    |
| 5   | `remiel-m1-team-anomaly-damage`    | `agents:remiel`（1581）                | complete-state / anomaly-damage-bonus | corrected   | 0    | 完整状态 team +10%                            |
| 6   | `remiel-m1-holder-anomaly-damage`  | `agents:remiel`（1581）                | complete-state / anomaly-damage-bonus | corrected   | 0    | 完整状态 holder −10%                          |
| 7   | `remiel-m1-team-record-migrated`   | `agents:remiel`（1581）                | unsupported                           | unsupported | 1    | semantic-conflict 迁移入口                    |
| 8   | `remiel-m1-holder-record-migrated` | `agents:remiel`（1581）                | unsupported                           | unsupported | 1    | semantic-conflict 迁移入口                    |
| 9   | `lighter-elation-record-migrated`  | `agents:lighter`（1161）               | unsupported                           | unsupported | 1    | 完整状态取代旧部分记录                        |
| 10  | `nekomata-claw-mark`               | `agents:nekomata`（1021）              | independent-settlement                | converted   | 1    | 独立目标、伤害项要求、潜能门槛                |
| 11  | `miyabi-frostburn-main`            | `agents:miyabi`（1091）                | independent-settlement                | converted   | 0    | 独立结算、核心 1—7 倍率表                     |
| 12  | `miyabi-frostburn-m4`              | `agents:miyabi`（1091）                | independent-settlement                | converted   | 0    | 同一选项的第二条 M4 增伤规则                  |

`pilot-options.ts` 保存的是选中选项的显示名、条件说明与来源证据；这些元数据从当前正式目录一次性转录。编译器不会读取正式制品的选中条目来填充规则语义、状态归属或 coverage 位置；正式三制品只作为未选中条目的合并基线和语义比较对象。

## 编译范围

编译器按 `optionId` 分组作者记录，生成：

- 每条可执行记录一条 `contribution` 规则；
- 每个选项一个目录条目，variant 的 `effectIds` 由作者 key 映射为稳定 `effectId`；
- 每个来源位置一条 coverage 记录（unsupported 为空 `effectIds`）；
- `independent-settlement` 机制额外生成/替换技能目标与 `damageItemRequirements` / `exclusiveDamageItem`；
- `complete-state` 要求同一选项至少两条规则、一条 variant；
- `unsupported` 不生成规则，variant 为 `unsupported`，保留 reason/explanation。

合并规则：

- 规则、选项、技能目标、coverage 位置必须已存在于正式三制品中；编译器只做原位替换，不新增或删除条目。
- 未选中条目逐语义保留；`entities`、`differences`、`mechanisms`、`source`、`revision`、`summary`、`supplementalRecords` 不改写。
- 编译前后规则、选项、coverage 与补充记录数量必须一致。按当前基线，选中的 12 条记录替换 9 条规则、10 个选项与 12 个 coverage 位置；其余 922 条规则、976 个选项、1,348 条 coverage 记录与全部 101 条补充记录保持现状。
- 输出目录不能等于或位于 `packages/data/definitions`、`integrated`、`dist`；写入前先校验，失败不创建目录。
- 输出文件为 `static.json`、`static-catalog.json`、`static-coverage.json`，只写调用方指定的临时目录。

ID 构造复用 [`convert.ts`](../../packages/data/scripts/static-effects/convert.ts) 的 `idPart`。为复用该唯一实现，只把既有的内部常量改为导出；没有行为变化，也没有修改转换器逻辑。这是本 PR 对 `convert.ts` 的唯一改动。

## 语义等价 harness

[`canonical.ts`](../../packages/data/scripts/static-effects/authoring/canonical.ts) 不比较字节：

- 对象键始终排序；
- 数组默认按稳定序列化排序；
- `source.files` 与规则 `modifications` 保留原顺序，因为顺序有语义；
- 空 `all` / `any` 归一为 `constant true` / `false`（本试点只出现空 `all`）；
- `effects`、`options`、`entities`、`skillTargets`、`differences`、`mechanisms`、coverage `records` / `supplementalRecords` / `packs` 转为以稳定身份为键的对象，差异路径直接指向实体与字段；
- 差异输出包含路径、基线值、候选值，默认最多 100 条。

只有全部三制品等价才返回 `equivalent: true`。不等价时 `run-pilot.ts` 打印差异并返回非零退出码。

## 实际结果

```text
$ pnpm --filter @randomplay/data authoring:pilot
Authoring pilot: 12 records (3 unsupported)
Compiled: rules: 9, options: 10, coverage positions: 12, skill targets: 2
Baseline: packages/data/definitions/effects
Output:   /var/folders/.../T/fairy-authoring-pilot-7TSB5R
Semantic comparison: PASS (0 differences)
```

编译范围与预期一致：12 条记录中 3 条 unsupported 不生成规则，其余 9 条生成 9 条规则；10 个选项（含完整状态、两个独立结算选项与三个迁移选项）；12 个固定来源 coverage 位置（7 converted、2 corrected、3 unsupported）；2 个独立目标（猫又爪印、星见雅霜灼·破）。

负例：

- 把 Anby 的 `amount` 从 `0.3` 改为 `0.3001`，harness 报告差异路径
  `/definitions/effects/agent:1011:.../parameters/amount/value`，并返回不等价；测试断言该路径存在。
- 未知 `operation` / `condition` / `mechanism` 分别被运行时校验拒绝，问题路径为
  `/operation/kind`、`/when/kind`、`/mechanism/kind`；TypeScript 类型反例见 typecheck 文件。
- 输出到 `packages/data/definitions/effects/authoring-pilot-should-not-write` 被拒绝，目录未创建。
- 编译前后正式三制品 SHA-256 不变。

确定性：连续两次编译到不同临时目录，三个输出文件的 SHA-256 完全一致。

## Review follow-up

独立内容审查发现并已修复以下问题：

| 问题                                                                    | 处理                                                                                                         |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 少写一条 `coverage.positions` 时，基线行会原样保留，harness 仍报告 PASS | 编译器按选中 `optionId` 校验基线 coverage 行集合与编译行集合完全一致；新增“清溟少写一个精炼位置”负例。       |
| 输出路径可能通过大小写或 symlink 绕过 `definitions` 保护                | 用最近已存在祖先的 `realpath` 加平台大小写归一比较；新增 symlink 与 darwin 大小写变体负例。                  |
| 基线条目含作者层未建模字段时会被 `as` 静默丢弃                          | 替换前检查选中 option/variant/rule 的字段集合；未建模字段明确拒绝。新增 `layerCountInputName` 负例。         |
| `entity` scope 可搭配 `hit-adjustment` 或 `hit.*` 事实，写出无效规则集  | 类型层关联 scope/operation；运行时增加 scope/operation 与 hit 事实校验；新增类型与运行时负例。               |
| fixed / refinement ID 语法不完整                                        | `fixed` 固定构造 `fixed:<rank>`；单档 `refinement:<rank>` 明确拒绝，只支持正式合并形态；新增表驱动 ID 测试。 |
| `maximumDifferences: 0` 会把有差异的制品误判为等价                      | 差异上限至少为 1；新增边界测试。                                                                             |
| 重复身份被语义视图折叠                                                  | 读取三制品时断言 effects/options/skillTargets/differences/entities/coverage 身份唯一。                       |
| `itemIds` 元素未校验、locale 排序不稳定                                 | 逐项校验 `itemIds` 字符串；canonical 排序改为与 locale/ICU 无关的字节序比较。                                |

## 消融实验

| 尝试删减                                                       | 结果与处理                                                                                                                                                                                                  |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 删除每条记录的 `option` 描述，改为从正式目录按 `optionId` 读取 | 编译器会用正式制品的选中条目填充名称、说明、证据和 variant 结构，作者层不再是独立输入，也无法在基线变化时发现语义漂移。保留 `option`，并让同一选项的多条记录共享同一描述常量。                              |
| 删除 `mechanism` 联合，仅按 `operation.kind` 推断投影          | `complete-state`（多规则一选项）、`independent-settlement`（目标/伤害项/独占）与 `unsupported`（无规则）无法由 operation 单独区分；删除后编译器只能靠分组数量或字段猜测，容易静默误编译。保留封闭机制联合。 |
| 删除 `coverage.positions`，从 `references` 推导 coverage       | pointer 不含 rank、stat、raw/normalized 值，无法重建正式 coverage 条目；而且补充来源位置与固定来源位置需要不同处理。保留位置输入。                                                                          |
| 用字节比较替代 canonicalization                                | 清溟暴击率规则的正式 `when` 是 `all: []`，作者语义写成 `constant: true`；字节比较会把语义等价判为失败。第一次 harness 实测报告了 3 条此类差异，因此保留空 `all` / `any` 归一化。                            |
| 删除集合索引，只比较排序后的数组                               | 差异会退化为 `/effects[123]/...` 这类不稳定下标路径，无法直接定位实体和字段。保留按稳定身份索引的语义视图。                                                                                                 |
| 删除 `pilot-options.ts`，把选项元数据内联到每条记录            | 完整状态与多 variant 选项会重复长文本、引用和配置，增加漂移面，也让记录难以审阅。保留共享常量。                                                                                                             |
| 删除 `ids.ts`，手写全部稳定 ID                                 | 手写会复制百分号编码与三段/四段 ID 语法；导出既有 `idPart` 的一行改动小于第二套实现。保留 ID helper。                                                                                                       |
| 增加 `authoring/index.ts` barrel 或单独 projection 类          | 试点只有五个直接消费者（run-pilot 与测试），没有外部入口；barrel 和 projection 包装不会减少重复。未新增。                                                                                                   |

## 限制

- **coverage 范围**：P2-1 只编译固定来源 `records`。补充来源 `supplementalRecords` 保持基线原样；星见雅霜灼·破等 supplement 规则已经验证 rule/option 投影，但其补充记录本身没有在本次编译中重建。P2-2 若迁移 supplement 密集的记录，必须先补 `supplementalRecords` 的编译与等价覆盖。后续 [P2-4a](phase2-supplemental-authoring.md) 已补齐作者形状、校验与按 `supplementId` 原位替换能力；[P2-4b-lite](phase2-miyabi-supplement-migration.md) 已迁移星见雅霜灼·破 1 条真实补充记录，其余 100 条仍保持基线原样。
- **activation / rule 类型**：只支持 `supplied` contribution；不支持 `triggered`、`continuous`、`instant`、`modification`、状态定义、层数桥接、holder 等级桥接、元素增益输入、声明受益者、全队唯一等机制。选中基线条目若出现这些未建模字段，编译器会明确拒绝而不是静默丢弃。
- **variant 状态**：试点选中选项的所有 variant 共享同一 coverage 状态；没有覆盖同一选项内 converted/corrected 混合的多 variant 情况。
- **条件与 operation 子集**：只开放试点实际使用的 5 种条件与 4 个 factor channel；新增机制必须按同一流程补类型、校验、编译器和测试。
- **选项元数据来源**：`pilot-options.ts` 是当前基线的一次性转录，不是运行时读取。后续基线修订若改变显示名/引用，需要作者记录同步更新，再由 harness 报告差异。
- **比较口径**：canonicalization 把数组视为无序集合（`source.files` 与 `modifications` 除外），并归一空 `all` / `any`；这是语义比较口径，不是字节一致承诺。
- **未迁移**：没有写正式 `definitions/`，没有改 `integrated`、`dist`、`snapshotId`、公开 exports、core/shared 运行时；没有做 P2-2，也没有做 Phase 1 后续。

## go / no-go

**Go for P2-2 planning。** 试点证明：

1. 12 条代表记录可以在不读取选中基线条目的情况下编译出 rule / option / variant / coverage；
2. 编译产物与当前正式三制品语义等价，差异为 0；
3. 改坏作者值、未知 operation/condition/mechanism、写入正式目录都能被明确拒绝；
4. 重复编译确定，正式制品未被触碰。

**No-go for immediate migration。** P2-2 仍需先决定迁移范围（尤其 corrected 记录），补齐补充来源 coverage 与迁移集合所需的机制，再以同样的等价 harness 作为合并门槛。P2-1 本身不迁移任何正式记录。

## 验证

| 命令                                                                                                  | 实际结果                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @randomplay/data typecheck`                                                            | 通过；`prepare:consumer` 后 `tsc --noEmit` 无错误。                                                                                         |
| `pnpm --filter @randomplay/data exec vitest run test/static-effects-authoring.test.ts --project unit` | 18 个测试通过；覆盖类型/运行时校验、编译等价、coverage 完整性、未建模字段拒绝、路径保护、负例与确定性。                                     |
| `pnpm --filter @randomplay/data authoring:pilot`                                                      | 12 条记录；9 规则、10 选项、12 coverage 位置、2 技能目标；语义比较 PASS（0 differences）。                                                  |
| `pnpm check:quality`                                                                                  | 通过；oxlint 0 errors（仓库既有 127 warnings），oxfmt 与 spec 类型检查通过，core 构建通过。                                                 |
| `pnpm --filter @randomplay/data check:source`                                                         | 通过；106 个测试文件、4,684 个测试通过。                                                                                                    |
| `git status --short` / `git diff --stat`                                                              | 仅 `packages/data/package.json`、`convert.ts` 的 `idPart` 导出，以及新增 authoring 脚本与测试；`integrated`、`definitions`、`dist` 无变化。 |

本次 worktree 没有 integrated 控制目录，属于静态工作区；没有创建本机管理记录，也没有修改主工作区的数据管理状态。本 PR 不涉及数据快照、来源版本或整合规则修改，因此无需按[来源数据整合规范](../specs/data/integration.md#数据管理状态的同步维护)重写管理状态。
