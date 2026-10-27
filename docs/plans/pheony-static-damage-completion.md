# 菲欧妮静态伤害链补全（5 PR）

- 状态：PR-B1 已实施并本地提交，等待独立审查；未推送、未建 PR、未合并。
- 基线：`origin/main @ 075822e2a2fb5f861df84074f0ca31b8d100fdf2`。
- 固定来源：Nanoka `3.3.12+19634983`；ZZZ-HP
  `991bb0ef2a00387f8a1fa18293bbda17256d7270`（只读 Git 对象）。
- 规范入口：[静态增益数据接入](../specs/data/zzz-hp-static-effects.md)、
  [静态快照规范](../specs/effects/static-snapshot.md)、
  [执行契约](../specs/effects/execution.md)、
  [转换器与作者层边界决定](converter-authoring-boundary-decision.md)。

## 1. 总体设计

用户已批准用 5 个独立 PR 完成菲欧妮（1641）的静态伤害链。各 PR 共享以下边界：

- converter 继续是 effects 三制品的唯一语义事实来源；authoring 只作为已冻结的
  独立断言层，本组 PR 不扩张 authoring 覆盖率。
- 不修改 core 伤害公式、动作目录、`packages/data/integrated`、来源版本、版本号、
  CI 或 `docs/HISTORY.md`。
- 每条来源记录保留稳定 effectId / optionId、原始来源 Pointer 与数值；修正以具名
  corrected 变体、差异说明和独立证据引用记录，不伪装成未修改的上游原值。
- 每次修订升 effects revision，三份制品由生成器重新产生并逐字节复核；技能清单
  摘要按既有 `generate:agent-actions` 链同步。
- 涉及数据管理状态的改动按[来源数据整合规范](../specs/data/integration.md#数据管理状态的同步维护)
  检查；本 PR 不改 integrated，不创建或重写本机管理记录。

PR-B1 由本页固定。其余 4 个 PR 的编号、顺序与范围沿用协调者批准的完整计划；
后续 PR 在本页追加各自定案与验证，不改写本文已确认的 B1 结论。

## 2. PR-B1：额外能力同队资格与异放专用通道

### 2.1 原文与语义

Nanoka `/passive/level/1641501—1641507/desc/1` 为最终原文依据：

> 队伍中存在其他[异常]角色或同阵营角色时触发：
> [灼蚀]状态下的敌人受到属性异常伤害的暴击伤害提升15%。

英文使用 “another character in your squad”，明确排除菲欧妮本人。因此：

- 敌人处于[灼蚀]是前提；本 PR 沿用既有完整状态契约，由调用方选中声明该状态的
  选项（核心/M1/M2 完整状态，或本 PR 的额外能力选项）表示已声明。
- 同队另一名[异常]角色与另一名 camp 12 角色取 OR；holder 本人、异队成员均不满足。
- 该 OR 再与受益职业、受益元素、队内人数、声明受益者等既有适用条件取 AND。
- 不把 `otherTeammateProfessions` 扩成 camp 12 的职业并集近似阵营：这会误收
  非 camp 12 的击破/命破/防护/异常角色。

### 2.2 适用性契约

`StaticCatalogApplicability` 新增：

```ts
readonly otherTeammateAgentEntityIds?: readonly string[]
```

- 非空、不重复的非空来源代理人实体 ID 列表。
- 与 `otherTeammateProfessions` 取 OR；两者均要求当前同队、已在 `actorSources`
  登记身份且不是绑定 holder。
- 不改变 `beneficiaryProfession`、`excludedBeneficiaryProfession`、
  `beneficiaryElements`、`teamProfession` 与声明受益者的原语义。
- 不新增机制 arm，也不复用露西具名阵营机制。

camp 12 成员集合为 `1341 / 1471 / 1481 / 1541 / 1641`。生成期从固定
`integrated/index.json` 的
`/entities/agents/members/<id>/sourceRecord/camp` Pointer 派生完整 camp 12 集合并
精确比较；成员增减、camp 值变化、Pointer 缺失或索引摘要变化都拒绝生成。

### 2.3 四条 15% 记录

固定 ZZZ-HP `/agents/52/mindscapeBuffs/0/effectBlocks/0/effects/13—16` 的四条
记录是无条件 `team` 记录且 `enabledDefault=true`，不能照抄。四条记录由
`declared-unsupported` 改为具名 `corrected`：

| 记录   | 原始 stat               | 通道                                     | 值  |
| ------ | ----------------------- | ---------------------------------------- | --- |
| eff-4  | `anomalyCritDmg`        | `anomaly-critical-damage`                | 15% |
| eff-10 | `anomalyReleaseCritDmg` | **`anomaly-settlement-critical-damage`** | 15% |
| eff-11 | `turbulenceCritDmg`     | `turbulence-critical-damage`             | 15% |
| eff-12 | `radianceCritDmg`       | `luminize-critical-damage`               | 15% |

- 每条记录保留原固定源 Pointer、数值、公开 optionId 与 effectId 结构。
- 防漂移：raw 与 normalized 的 `id`、`stat`、`value`、`applyTarget`、
  `applyProfession`、`teamProfession`、`teamProfessionValues`、
  `elementFilter`、`kind`、`enabledDefault`、`note`、`groupId` 逐字段核对；
  块 note 必须包含上述额外能力分句；记录一旦新增 `conditions` 即拒绝生成，
  必须重新核对而不是复制或合并。
- 证据引用 Nanoka 1641 的七档 `desc/1` 中英文（14 条）与五个 camp Pointer；
  原始固定源引用继续指向当前打点 `/agents/52/.../effects/13—16`。
- 具名差异 `pheony-additional-ability-team-condition` 说明条件缺失、OR/AND 语义、
  camp 来源与异放改道理由。

### 2.4 异放通道组合

`eff-10` 从通用 `anomaly-critical-damage` 改入专用
`anomaly-settlement-critical-damage`。在显式提供
`anomalySettlementCriticalDamage` 的结算中：

- 核心 25%（eff-6）+ M1 25%（eff-19）+ 额外能力 15%（eff-10）= 65%；
- 每条贡献恰好一次，不因 M0/M1/M2 档位选择重复；
- 后续事件专用暴伤（例如 M4 的 40%）只允许继续进入同一专用通道，不得回退到
  通用异常暴伤。

### 2.5 覆盖与制品

- effects revision：`57`。
- 规则 `931 → 935`；选项保持 `1,002`。
- coverage：`1,149 converted / 138 corrected / 88 unsupported`（`1,375` 条）。
- catalog 变体：`1,217 converted / 144 corrected / 122 unsupported`（`1,483` 个）。
- catalog `differences`：`50 → 51`。
- 三份 effects 制品由固定来源生成两次，逐字节一致后安装。
- `definitions/skills/manifest.json` 的 `staticCatalogSha256` 由
  `generate:agent-actions` 同步为新的 catalog 摘要。

### 2.6 消融实验

用 B1 的真实场景对比“只扩展 `otherTeammateProfessions`”的替代方案：

| 场景                              | 现有契约结果 | 替代方案结果                    | 结论             |
| --------------------------------- | ------------ | ------------------------------- | ---------------- |
| 同队 Dialyn 1481（击破，camp 12） | 15% 生效     | 若职业集仅 `异常` 则漏计        | 职业无法表达阵营 |
| 同队 Trigger 1361（击破，camp 5） | 15% 不生效   | 若把 camp 12 职业并集加入则误计 | 职业并集必然越界 |
| 只有菲欧妮本人                    | 不生效       | 职业并集无法排除 holder         | 仍需 holder 排除 |
| 异队 Jane 1261                    | 不生效       | 仅按职业会误计                  | 仍需同队约束     |

因此新增 `otherTeammateAgentEntityIds` 是表达“具名阵营成员”的最小契约；
`teamProfession` 只能表达队内某职业人数，露西机制只服务其具名继承路径，均不能
替代。详细命令与结果见第 3 节。

## 3. 验证记录

（本节由 PR-B1 在最终验证后填写；后续 PR 不覆盖本节，只追加各自记录。）

- 红测：未修代码上新增 core/data 回归，core `14 failed / 2 passed`，data
  `10 failed / 0 passed`，失败原因分别是四条变体仍为 `semantic-conflict`、
  缺 `otherTeammateAgentEntityIds` 校验/求值与同队条件。实施后 core 定向
  `17 passed`、data 定向 `14 passed`。
- 消融：`cannot be expressed by a profession-only substitute` 用例通过。
  真实输入下 Trigger 1361（camp 5）不生效；只把 camp 12 的职业并集放进
  `otherTeammateProfessions` 时误计 15%，只保留 `异常` 时漏掉 Dialyn 1481。
- 三制品：固定源 `991bb0e` 生成两次，`static.json` / `static-catalog.json` /
  `static-coverage.json` 两两 `cmp` 一致，且与安装后的正式制品逐字节一致。
  摘要：static `c1b964b4…`、catalog `70361800…`、coverage `386a894c…`。
- 计数：196 实体、1,118 pack、1,375 原始记录、935 规则、1,002 选项；
  coverage `1,149 / 138 / 88`；catalog 变体 `1,217 / 144 / 122`；
  catalog differences 51；补充记录仍为 102（68 integrated / 34 out-of-scope）。
- `pnpm --filter @randomplay/data authoring:verify`：99 条记录、89 个 option
  group、24 个 coverage 位置、19 个技能目标、68 条补充记录；语义差异 0，
  三制品字节比较通过。
- `pnpm --filter @randomplay/data verify:artifact-dependencies`：730 个节点、
  915 条边、0 个违规，退出 0。
- `pnpm --filter @randomplay/data audit:data-identity`：`matched`，91 条既有
  问题、`newProblems=[]`、`resolvedProblems=[]`。
- `pnpm check`：首轮在 core/data 并行负载下两个既有 integration 用例触发 5 秒
  超时；同两文件单独重跑通过，随后再次执行完整 `pnpm check` 退出 0。core
  `100 files / 5,704 passed / 24 skipped`，core 打包消费 `1 passed`；data
  `112 files / 4,818 passed`，data 打包消费 `2 passed`。
- `pnpm format:check`：2932 个文件格式通过，退出 0。
- `pnpm --filter @randomplay/core typecheck` 与
  `pnpm --filter @randomplay/data typecheck:prepared`：退出 0。
- 通道覆盖：anomaly / anomaly-settlement / vortex 三个可在目录入口独立结算的
  通道由 core 运行用例验证；luminize 通道由 data 用例锁定为
  `luminize-critical-damage` 且值 0.15。既有目录入口要求恰好一条耀变精通换算
  映射，Pheony 不提供该映射，本 PR 不新增映射机制，因此未用合成目录绕过该
  真实限制。
- 边界：未修改 `packages/data/integrated`、动作目录、来源版本、版本号、CI、
  既有规范页或 `docs/HISTORY.md`；未创建或重写数据管理记录。core/M1/额外能力
  组合与四通道计数由本 PR 回归固定，后续事件专用暴伤由后续 PR 在同一专用通道
  追加。
