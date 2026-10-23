# Phase 2 P2-3：authoring 覆盖扩展

状态：已实现并通过语义等价与字节一致验收。正式 static effects authoring 记录从 P2-2 的 8 条扩展到 19 条；三份正式 effects 制品逐字节不变，`snapshotId`、publication/manifests、公开 exports、core/shared 运行时、`integrated` 与 `definitions` 均未修改。没有开始 Phase 3/4。

## 范围

本 PR 新增 11 条正式记录，覆盖 `complete-state`、`independent-settlement` 与新增的 corrected single-rule：

| #   | 作者 key                            | 实体              | 机制                   | 覆盖      | 位置 | 代表点                            |
| --- | ----------------------------------- | ----------------- | ---------------------- | --------- | ---- | --------------------------------- |
| 1   | `remiel-m1-team-anomaly-damage`     | `agents:remiel`   | complete-state         | corrected | 0    | 完整状态 team +0.1                |
| 2   | `remiel-m1-holder-anomaly-damage`   | `agents:remiel`   | complete-state         | corrected | 0    | 同一完整状态 holder −0.1          |
| 3   | `nekomata-claw-mark`                | `agents:nekomata` | independent-settlement | converted | 1    | 爪印独立目标、潜能 1 起、直伤物理 |
| 4   | `miyabi-frostburn-main`             | `agents:miyabi`   | independent-settlement | converted | 0    | 霜灼·破核心 1—7 倍率              |
| 5   | `miyabi-frostburn-m4`               | `agents:miyabi`   | independent-settlement | converted | 0    | 同一选项的影画 4 +0.3 增伤        |
| 6   | `miyabi-terminal-damage`            | `agents:miyabi`   | single-rule            | corrected | 1    | 终结技自身冰/烈霜 +0.3            |
| 7   | `miyabi-basic-resistance-ignore`    | `agents:miyabi`   | single-rule            | corrected | 1    | 霜月抗性无视 +0.3                 |
| 8   | `caesar-m2-team-attack`             | `agents:caesar`   | single-rule            | corrected | 1    | 影画 2 攻击 40—1000 × 0.5，team   |
| 9   | `lycaon-core-team-damage-bonus`     | `agents:lycaon`   | single-rule            | corrected | 1    | 潜力 1 起其他元素增伤 +0.3，team  |
| 10  | `ellen-potential-critical-damage`   | `agents:ellen`    | single-rule            | corrected | 1    | 潜力 2—6 每层暴伤，最多 10 层     |
| 11  | `ellen-potential-resistance-ignore` | `agents:ellen`    | single-rule            | corrected | 1    | 潜力 2—6 冰抗无视 3.3%—10%        |

第 3—5 条是当前 coverage 为 `converted` 的独立结算记录，未改写为 `corrected`。第 8—11 条从当前来源与目录元数据一次性转录；实现路径不读取选中基线条目来填充这些字段：

- `caesar-m2-team-attack`：pointer `/agents/7/mindscapeBuffs/2/effectBlocks/0/effects/0`，coverage raw/normalized 500；`amount` 为核心 1—7 的 40/135/240/400/650/900/1000，`incrementCoefficient` 为常数 0.5；具名差异 `core-skill-level-parameters` 与 `core-enhancement-independent-increment`。
- `lycaon-core-team-damage-bonus`：pointer `/agents/50/mindscapeBuffs/0/effectBlocks/0/effects/1`，coverage raw/normalized 30；影画 ≥0 且潜力 ≥1；`applicability.beneficiaryElements` 为 wind/fire/electric/physical/ether；具名差异 `potential-branch-gate`。
- `ellen-potential-critical-damage`：pointer `/agents/48/mindscapeBuffs/0/effectBlocks/2/effects/0`，coverage raw/normalized 0；潜力 2—6 为 0.016/0.024/0.032/0.04/0.048，最多 10 层；具名差异 `potential-level-expression`。
- `ellen-potential-resistance-ignore`：pointer `/agents/48/mindscapeBuffs/0/effectBlocks/2/effects/1`，coverage raw/normalized 10；潜力 2—6 为 0.033/0.05/0.067/0.083/0.1；`when` 仅命中 `ice`；具名差异 `potential-level-expression`。

## 实现

[`records.ts`](../../../packages/data/scripts/static-effects/authoring/records.ts) 现在导出 `MIGRATED_AUTHORING_RECORDS`（不再保留 `CORRECTED_AUTHORING_RECORDS` 别名）。19 条记录的选项描述、规则语义、来源引用、状态归属与 coverage 位置都是正式转录；多规则选项共享同一选项常量。生成路径不 import `pilot-records.ts` / `pilot-options.ts`，P2-1 试点文件继续只服务试点测试。

[`compile.ts`](../../../packages/data/scripts/static-effects/authoring/compile.ts) 只做一处最小扩展：替换规则、选项变体与 coverage 行时，按基底条目的键序写出对象。键序是序列化细节，不承载作者语义；作者值仍来自记录，语义比较仍按内容执行。这样候选与正式制品在字段次序不一致的历史条目（本批的 Remiel 完整状态与霜灼·破独立结算选项）上也能保持字节一致，而不需要改动正式制品或把字段次序复制进每条作者记录。

[`generate-static-effects.ts`](../../../packages/data/scripts/generate-static-effects.ts)、[`run-migration.ts`](../../../packages/data/scripts/static-effects/authoring/run-migration.ts) 与测试已切换到新导出名。默认 authoring、显式 `converter-fallback`、失败不自动回退、候选写入前语义门禁均保持 P2-2 行为。

没有新增 authoring schema、operation、condition 或 mechanism；没有新增依赖。

## 验收结果

2026-10-23，worktree 基线 `origin/main@f4add5e3`：

```text
$ pnpm --filter @randomplay/data authoring:verify
Migrated authoring records: 19 records
Compiled: rules: 19, options: 17, coverage positions: 15, skill targets: 2
Baseline: packages/data/definitions/effects
Semantic comparison: PASS (0 differences)
static.json:              ... 3a30bd0e5e5bc8fc2087163da1fc5e857cbca71ccc1bf2bf8c3b2777193ce823
static-catalog.json:      ... c8455d57b00a0329da50841e4d1a0bcc7e35bc28fd2b4319520dba01ab1c670c
static-coverage.json:     ... 6cb0457f6a3456a23b82439d064f092825949a8fa71be0500aea025cd6ce2c5b
Byte comparison: PASS
```

计划预期写的是 14 个 coverage 位置，实际为 15：8 条 P2-2 各 1 个位置，7 条新增记录中猫又、星见雅终结技与霜月共 3 个位置，4 条新 corrected 共 4 个位置；Remiel 完整状态（2 条记录）与霜灼·破（2 条记录）没有固定来源位置。19 条记录共享 17 个选项，因此 19 rules / 17 options / 15 coverage positions / 2 skill targets 是完整且可复核的投影。

实际生成命令（固定 ZZZ-HP 提交 `2628b32`，`integrated` 使用同一快照的隔离受管副本）：

```text
{"entities":196,"packs":1118,"emptyPacks":397,"rawEffects":1360,"rules":931,"options":986,"converted":1167,"corrected":116,"unsupported":77,"supplements":{"records":101,"rules":72,"options":63,"entities":0,"integrated":68,"outOfScope":33}}
```

authoring 模式与显式 `converter-fallback` 生成的三个候选制品均与正式 `definitions/effects` 逐字节相同：

| 文件                   | SHA-256                                                            |
| ---------------------- | ------------------------------------------------------------------ |
| `static.json`          | `3a30bd0e5e5bc8fc2087163da1fc5e857cbca71ccc1bf2bf8c3b2777193ce823` |
| `static-catalog.json`  | `c8455d57b00a0329da50841e4d1a0bcc7e35bc28fd2b4319520dba01ab1c670c` |
| `static-coverage.json` | `6cb0457f6a3456a23b82439d064f092825949a8fa71be0500aea025cd6ce2c5b` |

因为三制品字节未变，`snapshotId`（`sha256:02398d0fc76b4eed4bd7aaccd1370f8c161b5331266a0442c1f54ee67668f03c`）、`definitions-publication`、技能目录摘要与 publication/manifests 均不需要更新。

## 消融实验

| 尝试删减                                                | 结果与处理                                                                                                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 让正式记录直接 import `PILOT_AUTHORING_RECORDS`         | 试点包含 3 条 unsupported 占位与未迁移的 Anby/清溟记录；正式生成路径不应依赖试点文件。保留独立转录，并新增源码与对象身份测试。                    |
| 把 3 条 independent-settlement 记录也标为 corrected     | 这 3 个来源位置在正式 coverage 中仍是 `converted`；改写状态会改变制品语义，也会把“已作者化”误报成“已纠错”。保留 converted。                       |
| 按计划预期强行凑成 14 个 coverage 位置                  | 两个多规则选项没有固定来源位置，15 是 8 + 3 + 4 的实际投影；删除任何一条位置都会破坏 coverage 完整性门禁。保留 15 并记录计划口径差异。            |
| 调整正式 `static-catalog.json` 的字段次序以匹配作者输出 | 会修改已发布制品并改变字节摘要。改为在替换时沿用基线条目的键序，正式制品保持不变。                                                                |
| 为 Remiel/霜灼·破写入与基底一致的字段次序到作者记录     | 选项描述无法控制编译器对象字面量的字段次序，也会把序列化细节混入作者语义。保留编译器统一键序对齐。                                                |
| 新建正式 schema、projection 包装或 barrel               | 11 条记录全部落在既有封闭联合内；新增包装不增加表达能力。保留既有类型与单文件记录模块。                                                           |
| 重建霜灼·破的 `supplementalRecords`                     | 本批目标是把该选项的规则/目录/coverage 位置作者化；补充记录仍由基线原样保留，语义比较已验证不变。保留为后续限制。                                 |
| 保留 `CORRECTED_AUTHORING_RECORDS` 别名                 | 名称已不再准确，且会掩盖“迁移集合已扩展到 converted/complete-state/independent-settlement”的事实。改为 `MIGRATED_AUTHORING_RECORDS`，不保留别名。 |

## 数据管理

- worktree 没有 `.integrated.fairy-state`，属于静态工作区；按[来源数据整合规范](../specs/data/integration.md#数据管理状态的同步维护)不在 worktree 创建管理记录。
- 使用主工作区同一 `integrated` 快照的隔离受管副本执行 `verify:nanoka:current`，结果为 `verified: true`；worktree 的静态 `verify:nanoka:snapshot integrated` 同样通过。
- `prepare:consumer` 通过；生成的 `calculationDataVersion.snapshotId` 仍为 `sha256:02398d0f…`，与主工作区现有 `.generated` 一致。
- 主工作区 `/Users/caoyujie/codes/fairy` 未被修改；其 `.integrated.fairy-state` 为 `phase: idle`，`indexSha256` 与 worktree 的 `integrated/index.json`（`d68ad1d8…`）一致。

## 验证

| 命令                                                                       | 实际结果                                                                                                              |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @randomplay/data authoring:verify`                          | 19 条记录；19 rules、17 options、15 coverage positions、2 skill targets；语义 PASS（0 differences）；三制品字节一致。 |
| 实际 `generateStaticEffects`（隔离受管 integrated 副本）                   | 成功；authoring 与显式 fallback 的三候选制品均与正式目录逐字节相同。                                                  |
| `vitest run static-effects-authoring-migration / static-effects-authoring` | 31 个测试通过（13 迁移 + 18 试点）。                                                                                  |
| `pnpm --filter @randomplay/data typecheck`                                 | 通过。                                                                                                                |
| `pnpm check:quality`                                                       | 通过；oxlint 0 errors（仓库既有 127 warnings），oxfmt 与 spec 类型检查通过。                                          |
| `pnpm --filter @randomplay/data check:source`                              | 通过；107 个测试文件、4,697 个测试通过。                                                                              |
| `pnpm --filter @randomplay/core check:source`                              | 通过；98 个测试文件通过、3 个跳过；5,684 个测试通过、24 个跳过（D4 既有跳过）。                                       |
| `pnpm --filter @randomplay/data verify:pack`                               | 通过；2 个打包测试通过。                                                                                              |
| `pnpm --filter @randomplay/core verify:pack`                               | 通过；1 个打包测试通过。                                                                                              |
| `pnpm --filter @randomplay/data verify:nanoka:current <隔离副本>`          | `verified: true`。                                                                                                    |
| `pnpm --filter @randomplay/data verify:nanoka:snapshot integrated`         | `verified: true`。                                                                                                    |
| `pnpm --filter @randomplay/data prepare:consumer`                          | 通过；`snapshotId` 未变。                                                                                             |

## 限制与剩余项

- 只迁移 19 条记录。剩余 102 条 corrected、1,166 条 converted 与 77 条 unsupported coverage 记录仍走 converter；本 PR 不声称 correction 已全部作者化。
- 独立结算的霜灼·破选项仍由基线提供 `supplementalRecords`；本批不重建补充记录，只验证其原样保留。后续 [P2-4a](phase2-supplemental-authoring.md) 已补齐作者形状、校验与按 `supplementId` 原位替换能力，但本批与 P2-4a 都不迁移补充记录，基线 101 条仍保持原样。
- 语义等价门槛保护的是“selected 记录编译结果与 converter baseline 一致”；未选中条目由编译器原位保留，测试另行逐条比较。
- 没有新增 `triggered` / `continuous` / `instant` / `modification`、层数桥接、holder 等级桥接、声明受益者、全队唯一或元素增益输入。
- 本 PR 不开始 Phase 3/4，不修改 core 运行时、公开 exports 或 `integrated`。
