# Phase 2 P2-2：小批量 corrected 正式迁移

状态：已实现并通过语义等价与字节一致验收。本 PR 只把 8 条 corrected 记录接入正式 static effects 生成链，未修改 `definitions` 制品、`integrated`、公开 exports、core/shared 运行时或 `snapshotId`；没有开始 Phase 3。

## 范围与选择

从当前 116 条 corrected coverage 记录中选取 8 条。选择标准：

- 固定来源 `coverage.positions` 完整，选项中只有这一条来源位置；
- 每个选项只有一个 variant、一个可执行规则，可由 P2-1 的封闭 `operation` / `condition` / `mechanism` 联合直接表达；
- `activation` 为 `supplied`，没有 `inputs`、`exclusiveGroup`、`damageItemRequirements`、`claim`/声明受益者、全队唯一、层数桥接或 holder 等级桥接；
- 不依赖 `supplementalRecords`；
- 规则只使用 `stat-adjustment`、`factor-contribution:damage-bonus` 或 `factor-contribution:attacker-resistance-ignore`，不新增 `base-multiplier-addition`、`anomaly-critical-damage` 等通道。

| #   | 作者 key                               | 实体              | 操作                                                         | coverage 位置                                          | 具名差异                         |
| --- | -------------------------------------- | ----------------- | ------------------------------------------------------------ | ------------------------------------------------------ | -------------------------------- |
| 1   | `claret-core-critical-rate`            | `agents:claret`   | `stat-adjustment:criticalRate@direct`（核心 1—7 查表）       | `/agents/6/mindscapeBuffs/0/effectBlocks/0/effects/0`  | `core-skill-level-parameters`    |
| 2   | `grace-potential-damage-bonus`         | `agents:grace`    | `factor-contribution:damage-bonus`（潜能 2—6 查表）          | `/agents/29/mindscapeBuffs/0/effectBlocks/2/effects/0` | `potential-level-expression`     |
| 3   | `harumasa-potential-attack-percent`    | `agents:harumasa` | `stat-adjustment:attack@final-percentage`（潜能 2—6）        | `/agents/35/mindscapeBuffs/0/effectBlocks/2/effects/0` | `potential-level-expression`     |
| 4   | `harumasa-potential-resistance-ignore` | `agents:harumasa` | `factor-contribution:attacker-resistance-ignore`（潜能 2—6） | `/agents/35/mindscapeBuffs/0/effectBlocks/2/effects/1` | `potential-level-expression`     |
| 5   | `nekomata-potential-critical-damage`   | `agents:nekomata` | `stat-adjustment:criticalDamage@direct`（潜能 2—6）          | `/agents/40/mindscapeBuffs/0/effectBlocks/2/effects/0` | `potential-level-expression`     |
| 6   | `caesar-core-team-attack`              | `agents:caesar`   | `stat-adjustment:attack@final-fixed`（核心 1—7，team）       | `/agents/7/mindscapeBuffs/0/effectBlocks/0/effects/0`  | `core-skill-level-parameters`    |
| 7   | `lucy-special-team-attack`             | `agents:lucy`     | `stat-adjustment:attack@final-fixed`（特殊技 1—16，team）    | `/agents/60/mindscapeBuffs/0/effectBlocks/0/effects/0` | `special-skill-level-expression` |
| 8   | `s0anby-additional-team-damage-bonus`  | `agents:s0anby`   | `factor-contribution:damage-bonus`（潜能 0—6，team）         | `/agents/59/mindscapeBuffs/0/effectBlocks/1/effects/1` | `potential-level-expression`     |

未选择但同属 corrected 的复杂记录（如柏妮思 `minimum/convert` 表达式、露西带 `inputs` 的影画项、简的 `anomaly-critical-damage` 通道、音擎逐档 `refinement:N` ID）保持原转换器路径；本 PR 没有扩展 schema。

## 实现

新增 [`authoring/records.ts`](../../packages/data/scripts/static-effects/authoring/records.ts)：8 条正式作者记录。规则语义、来源引用、状态归属、option 元数据和 coverage 位置都是一次性转录，生成路径不读取 `definitions/effects` 的选中条目来填充这些字段。

[`generate-static-effects.ts`](../../packages/data/scripts/generate-static-effects.ts) 在 converter 输出之后、`parseEffectRuleSet` / `validateStaticCatalog` 与候选写入之前调用 `applyStaticEffectsAuthoring`：

1. 默认 `authoring` 模式校验并编译正式记录；
2. 用 [`canonical.ts`](../../packages/data/scripts/static-effects/authoring/canonical.ts) 比较 converter baseline 与 authoring-applied 三制品，任何语义差异都抛错；
3. 通过后才进入 core 校验与候选目录写入；失败不创建候选，也不替换正式目录。

`authoring: converter-fallback` 是显式回滚路径，只跳过 authoring 覆盖，仍走原有 converter 输出与全部校验。CLI 提供 `--fallback-converter`，也接受 `FAIRY_STATIC_EFFECTS_AUTHORING=converter-fallback`；authoring 失败不会自动退回 fallback。

新增 [`run-migration.ts`](../../packages/data/scripts/static-effects/authoring/run-migration.ts) 与 `authoring:verify`：编译到临时目录，按正式生成相同的 oxfmt 格式化后比较三制品语义与 SHA-256。默认输出到系统临时目录；写入仍受 `writeStaticArtifacts` 的受管 `definitions`/`integrated`/`dist` 保护。

## 验收结果

2026-10-23，worktree 基线 `origin/main@2f816880`：

```text
$ pnpm --filter @randomplay/data authoring:verify
Corrected authoring migration: 8 records
Compiled: rules: 8, options: 8, coverage positions: 8, skill targets: 0
Semantic comparison: PASS (0 differences)
static.json:              ... 3a30bd0e5e5bc8fc2087163da1fc5e857cbca71ccc1bf2bf8c3b2777193ce823
static-catalog.json:      ... c8455d57b00a0329da50841e4d1a0bcc7e35bc28fd2b4319520dba01ab1c670c
static-coverage.json:     ... 6cb0457f6a3456a23b82439d064f092825949a8fa71be0500aea025cd6ce2c5b
Byte comparison: PASS
```

实际生成命令（source root 为固定 ZZZ-HP 提交 `2628b32`，integrated 使用同一快照的隔离受管副本）返回：

```text
{"entities":196,"packs":1118,"emptyPacks":397,"rawEffects":1360,"rules":931,"options":986,"converted":1167,"corrected":116,"unsupported":77,...}
```

三个候选制品与正式 `definitions/effects` 逐字节相同。显式 `converter-fallback` 生成同样逐字节相同。负例：把克拉蕾 `amount` 的档位 1 改为 `0.1501` 后，authoring 模式在语义门禁拒绝且不创建候选目录；同一组记录在显式 fallback 下按设计忽略 authoring。

因为三制品字节未变，`snapshotId`（`sha256:02398d0fc76b4eed4bd7aaccd1370f8c161b5331266a0442c1f54ee67668f03c`）、`definitions-publication`、技能目录摘要与 publication/manifests 均不需要更新。

## 消融实验

| 尝试删减                                          | 结果与处理                                                                                                                                                                          |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 复用 `PILOT_AUTHORING_RECORDS` 作为正式输入       | P2-1 是试点转录，包含 12 条未迁移记录与 3 条 unsupported 占位；正式迁移只需要 8 条 corrected 记录，且生成路径不应依赖试点文件。保留独立 `records.ts`，不让运行时读取 pilot。        |
| 新建正式 authoring schema / projection 包装       | 8 条记录全部落在既有 `EffectAuthoringRecord` 封闭联合内；新 schema 不会增加表达能力，只会制造第二套校验。保留既有类型，新增记录用 `readonly EffectAuthoringRecord[]` 类型注解约束。 |
| 用环境变量或隐式 catch 自动回退 converter         | 自动回退会掩盖 authoring 编译/等价错误。保留显式 `converter-fallback` 选项/CLI flag，默认 authoring 失败即拒绝生成。                                                                |
| 在生成器内再复制一份语义比较逻辑                  | 直接复用 P2-1 的 `compareStaticArtifacts`；差异路径和空 `all`/`any` 归一化已经由试点验证。保留单一语义比较实现。                                                                    |
| 把 authoring 编译放到 core 校验之后               | 这样坏 authoring 可能先写入候选或只在校验阶段暴露，无法保证“失败不替换正式目录”。保留在 converter 输出之后、core 校验与候选写入之前。                                               |
| 删除 `authoringRecords` 测试注入点，只测正式 8 条 | 无法在不改正式记录的前提下验证非法 authoring 与 fallback 不掩盖错误。保留内部选项，只用于测试注入，不进入公开 exports。                                                             |

## 数据管理

- worktree 没有 `.integrated.fairy-state`，属于静态工作区；按[来源数据整合规范](../specs/data/integration.md#数据管理状态的同步维护)不在 worktree 创建管理记录。
- 使用同一 `integrated` 快照的隔离受管副本执行 `verify:nanoka:current`，结果为 `verified: true`；worktree 的静态 `verify:nanoka:snapshot integrated` 同样通过。
- `prepare:consumer` 通过；生成的 `calculationDataVersion.snapshotId` 仍为 `sha256:02398d0f…`，与主工作区现有 `.generated` 一致。
- 主工作区 `/Users/caoyujie/codes/fairy` 未被修改；其 `.integrated.fairy-state` 为 `phase: idle`，`indexSha256` 与 worktree 的 `integrated/index.json`（`d68ad1d8…`）一致。

## 验证

| 命令                                                                                                            | 实际结果                                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @randomplay/data exec vitest run test/static-effects-authoring-migration.test.ts --project unit` | 9 个测试通过：选择范围、coverage/规则/选项投影、未选中条目不变、authoring 值不取自选中基线、语义与字节一致、非法 authoring 不写候选、fallback 与模式解析。 |
| `pnpm --filter @randomplay/data exec vitest run test/static-effects-authoring.test.ts --project unit`           | 18 个 P2-1 测试通过，编译器重构未改变试点行为。                                                                                                            |
| `pnpm --filter @randomplay/data authoring:verify`                                                               | 8 条记录；0 semantic differences；三制品字节一致。                                                                                                         |
| 实际 `generateStaticEffects`（隔离受管 integrated 副本）                                                        | 成功；三候选制品与正式目录逐字节相同；fallback 同样一致。                                                                                                  |
| `pnpm --filter @randomplay/data typecheck`                                                                      | 通过。                                                                                                                                                     |
| `pnpm --filter @randomplay/data verify:nanoka:current <隔离副本>` / `verify:nanoka:snapshot integrated`         | 均 `verified: true`。                                                                                                                                      |
| `pnpm --filter @randomplay/data prepare:consumer`                                                               | 通过；`snapshotId` 未变。                                                                                                                                  |

## 限制

- 只迁移 8 条 corrected 记录；其余 108 条 corrected 记录继续走 converter，未声明为已完成迁移。
- 没有新增 `supplementalRecords` 编译、`triggered` / `continuous` / `instant` / `modification`、层数桥接、holder 等级桥接、声明受益者、全队唯一或元素增益输入。
- 语义等价门槛保护的是“selected 记录编译结果与 converter baseline 一致”；未选中条目由编译器原位保留，测试另行逐条比较。
- 本 PR 不开始 Phase 3，不修改 core 运行时、公开 exports 或 `integrated`。

后续状态：P2-3 已将正式 authoring 记录扩展到 19 条，并接入 complete-state、independent-settlement 与新增 corrected，见 [Phase 2 P2-3：authoring 覆盖扩展](phase2-authoring-coverage.md)。本页的验收数据保持 P2-2 当时状态，不回写历史结果。
