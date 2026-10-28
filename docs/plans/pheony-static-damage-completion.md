# 菲欧妮静态伤害链补全（5 PR）

- 状态：PR-B1、PR-B2 已 squash 合并；PR-B3 已实施并本地提交，等待独立
  审查；未推送、未建 PR、未合并。
- 基线：`origin/main @ b17a1f8aa083c9fa51995623480906f60f516f24`
  （PR-B3 起点；B2 审查修复起点为 `abd395d8dc1c1d2cb6026888eb04450243bd1b01`，
  B1 基线为 `0d2957790dcbf817d5b15078c03d30fc4e6c1dd1`）。
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

## 4. PR-B2：M4 六元素独立异放

### 4.1 原文与归一

Nanoka `3.3.12+19634983` 的 `agents/1641/details.zh.json` 与
`details.en.json` `/talent/4/desc` 同文：

> [烬火追魂]以及[普通攻击：焚罪]终结一击命中处于异常状态的敌人时，额外触发
> 一次[异放]效果，固定结算600%倍率的对应属性的属性异常伤害。

ZZZ-HP 的 `anomalyBaseExpected` **不含**原异常系数，因此六元素最终倍率是
原异常系数 × 6，而不是再乘一次原异常系数：

| 元素 | 原异常系数 | 最终倍率 |
| ---- | ---------: | -------: |
| 物理 |       7.13 |    42.78 |
| 火   |       0.50 |        3 |
| 冰   |       5.00 |       30 |
| 电   |       1.25 |      7.5 |
| 以太 |      0.625 |     3.75 |
| 风   |      12.50 |       75 |

后续基础 CAL 不在本 PR 处理；CAL 本身不乘原异常系数，也不复用本 PR 的
M4 倍率或 40% 规则。

40% 额外暴伤不在 `/talent/4/desc`：该处只写固定 600% 异放。40% 的来源是
同一 1641 详情文件的 `/skill/basic/description/1/desc` 与
`/skill/chain/description/2/desc` 中英文同文（“该次[异放]效果触发暴击时，
其暴击伤害额外提升40%”）。固定 ZZZ-HP rank0 `eff-9` 的
`anomalyReleaseCritDmg: 40` 与该条款语义一致；主倍率与 40% 规则分别绑定各自
的 references，不复用 `/talent/4/desc` 作为 40% 证据。

### 4.2 当前机制契约

六条选项沿用 D4 的稳定身份，但改用当前
`variant.mechanism.kind = "independent-settlement"` 契约，不恢复旧 D4
overlay、`nanoka-raw` 专用包或旧平铺 `damageItemRequirements` 字段：

- `optionId`：`nanoka:agents:1641:m4-anomaly-settlement-<element>`；
- 主 `effectId`：`agent:1641:nanoka:m4-anomaly-settlement-<element>:mindscape:4`；
- 附加 40% `effectId`：同主身份加 `-crit-damage`；
- 共享独立目标：`zzz-hp:skill:pheony-m4-anomaly-settlement`
  （`upstreamId` 为 null、`agentEntityId` 为 1641、`uncategorized`）；
  目标由独立的共享登记写入，不依赖任一元素选项；
- 共享独立项：`pheony:m4-anomaly-settlement`，`attack` / `base` /
  `direct` / `anomaly-source`，`requiredDirectMultiplier: 0`，
  `requiredSkillCategory: "uncategorized"`；变体声明
  `isolateDamageItems: true`，混合非 M4 项按 `CONTEXT_MISMATCH` 拒绝；
- 每个选项一条最终倍率规则（`hit-adjustment damageMultiplier/add`，
  `itemIds` 只含上述独立项）和一条同目标、同元素的
  `anomaly-settlement-critical-damage` 附加规则，值固定 0.4；两条规则
  分别绑定主倍率与 40% 的 references；
- 变体 `configuration.minimumMindscape: 4`、`maximumLayers: 1`；
  M0/M3 拒绝，M4—M6 可用；未选或 0 层关闭，不自动启用。

固定源 `/agents/52/mindscapeBuffs/4` 当前是真实空 pack。补充登记
`clauseContextGuard`（rank 4、`expectsEmptyPack: true`、直接/异放倍率
stat 家族）：该位置出现任何新编码即拒绝生成并要求重新核对。

固定源 `/agents/52/mindscapeBuffs/0/effectBlocks/0/effects/17`
（`eff-9`，原始 `anomalyReleaseCritDmg: 40`）继续保持
`unsupported` / `semantic-conflict` 迁移入口，不生成常驻贡献；40% 只由
M4 选项的附加规则进入专用通道。

### 4.3 第 1 轮独立审查修复

- **混合结算泄漏**：M4 变体声明 `isolateDamageItems: true`。同一
  anomaly-settlement 请求若同时携带非 M4 项与零倍率 M4 项，按
  `CONTEXT_MISMATCH` 拒绝，40% 不再作用于整次 hit；单一项请求保持
  火 3000 基础值与 40% 暴伤。
- **快照链就地改写**：不再改写 B1 的 revision 57 链尾。以 B1 快照夹具为
  输入，恢复第 17 条 `currentSnapshotId: 0554bf…`，并追加第 18 条 B2 条目
  （`previous: 0554bf…`、`current: 32f3756b…`、前序制品 rev57
  `c1b964b4…` / `70361800…`）。三份夹具都是 18 条；B1 的 17 条历史链
  另有 SHA-256 冻结断言，任何就地改写都会失败。
- **40% 来源引用**：主 600% 规则只引用 `/talent/4/desc`；40% 规则引用
  `/skill/basic/description/1/desc`、`/skill/chain/description/2/desc`
  中英文及固定源 `eff-9` Pointer。`eff-9` 继续是
  `unsupported` / `semantic-conflict` 迁移入口。
- **共享目标依赖首项**：共享目标改为独立登记
  `SUPPLEMENT_SHARED_SKILL_TARGETS`，不再挂在 physical 补充上。移除任一
  元素补充后，目标仍只登记一次，其余五条选项均通过实际目录结算。

### 4.4 覆盖与制品

- effects revision：`58`。
- 规则 `935 → 947`；选项 `1,002 → 1,008`；catalog 变体
  `1,483 → 1,489`；skill targets `131 → 132`。
- coverage：`1,149 converted / 138 corrected / 88 unsupported`
  （`1,375` 条）不变；catalog 变体 `1,223 converted / 144 corrected /
122 unsupported`。
- 补充记录：`102 → 108`（`68 → 74` integrated、34 out-of-scope），
  补充规则 `72 → 84`、补充选项 `63 → 69`；catalog `differences` 保持 51。
- 三份 effects 制品由固定来源连续生成两次，逐字节一致后安装；技能清单
  `staticCatalogSha256` 由 `generate:agent-actions` 同步，60 个动作文件
  与 registry 字节不变。计算快照为 `32f3756b…`。

## 5. PR-B2 验证记录

- 红测：未修代码上恢复并启用 core
  `packages/core/test/effects/pr-d4b-pheony-m4.test.ts`，`19 failed /
0 passed`（六选项、独立目标与 40% 规则均不存在）；新增 data
  `pr-b2-pheony-m4-conversion.test.ts` 为 `9 failed / 1 passed`（唯一通过
  的是固定 `eff-9` 仍为 semantic-conflict）。实施后 core `20 passed`，
  data 转换 `11 passed`、发布制品消费 `2 passed`。
- 第 1 轮审查红测：新增四条回归在未修代码上得到 core `1 failed /
19 passed`、data `4 failed / 12 passed`，分别覆盖混合项 40% 泄漏、
  revision 57 链尾被改写、40% 规则误引 `/talent/4/desc`、移除元素后共享
  目标消失。修复后对应 core `20 passed`、data `12 passed`。
- 消融：逐元素移除一条补充后该元素选项消失、其余五个仍在且都能实际
  结算；移除 `-crit-damage` 附加规则后同配置 `anomalyCritical` 由 1.4
  降为 1.0；移除元素主规则后该选项不能再结算；混合非 M4 项与 M4 项同
  hit 请求按 `CONTEXT_MISMATCH` 拒绝；未选 M4 时独立项倍率为 0 且没有
  40%，其他独立结算目标也不获得 M4 倍率或 40%。固定 `eff-9` 没有生成
  可执行规则，证明常驻 40% 不能被错误复用。
- 制品与快照链：固定源 `991bb0e` 重复生成的 `static.json` /
  `static-catalog.json` / `static-coverage.json` 两两 `cmp` 一致，且与
  安装后的正式制品逐字节一致。摘要：static `f7bada47…`、
  catalog `00c03345…`、coverage `c0a9d5e3…`。三份 calculator 夹具均为
  18 条；B1 的 17 条历史链摘要保持原样，新增 SHA-256 冻结断言防止就地改写。
- 定向回归：core `20 passed`；data 转换 `12 passed`、发布制品消费
  `2 passed`、快照链 `4 passed`、static-e2e `45 passed`，
  static-team-differential 与三份 zzz-calculator 合计 `400 passed`；
  evidence 集成用例 `3 passed`，覆盖六条 Nanoka 证据、陈旧摘要与缺失
  Pointer。data unit 全量 `114 files / 4,844 passed`。
- 生成期门禁：`authoring:verify` 99 条记录、89 个 option group、24 个
  coverage 位置、19 个技能目标、68 条补充记录；语义差异 0，三制品字节比较
  通过。`verify:artifact-dependencies` 730 个节点、915 条边、0 个违规。
  `audit:data-identity` 为 `matched`，91 条既有问题，`newProblems=[]`、
  `resolvedProblems=[]`。
- `pnpm check`：退出码 0。core `101 passed / 2 skipped` 文件、
  `5,724 passed / 11 skipped` 用例；data `114 files / 4,844 passed`；
  core 打包消费 `1 passed`、data 打包消费 `2 passed`。`pnpm lint` 0 error
  （137 条既有 warning）。
- `pnpm format:check`：2,936 个文件格式通过，退出 0。
- 边界：未修改 core/shared 生产代码、`packages/data/integrated`、动作目录、
  来源版本、版本号、CI、既有规范页或 `docs/HISTORY.md`；未扩张 authoring
  覆盖，未创建或重写数据管理记录。触发招式、异常状态与命中时点由调用方
  声明；本 PR 不模拟异常积蓄、持续时间或动作时间线。

## 6. PR-B3：M2 施加者灼烧持续时间

### 6.1 原文与语义

Nanoka `3.3.12+19634983` 的 `agents/1641/details.zh.json` 与
`details.en.json` `/talent/2/desc` 同文：

> 菲欧妮对敌人施加[灼烧]效果时，该效果的持续时间提升2秒。
> （When Phoenix applies Burn to an enemy, its duration is increased by 2s.）

限定施加者是菲欧妮本人；不是任意队友施加的火异常，也不是乱流专属效果。

### 6.2 修正契约

固定 ZZZ-HP `/agents/52/mindscapeBuffs/2/effectBlocks/0/effects/1`：

- 原始记录：`anomalyDuration: 2`、`elementFilter: ["火"]`、
  `applyTarget: "team"`、`conditions.damageTypes: ["turbulence"]`。
- 原编码把“菲欧妮施加”放成全队任意火异常，并错误限定为乱流；Fairy 继续
  拒绝直接照抄。
- 记录改为具名 corrected，保留原 Pointer、数值、公开 optionId / effectId；
  具名差异 `pheony-m2-holder-burn-duration` 说明修正理由。
- 目录变体使用 `independent-settlement`，伤害项要求：
  `itemId: "pheony:m2-burn-duration"`、`stat: attack`、`role: base`、
  `allowedModes: ["standard-disorder", "standard-vortex"]`、
  `source: "holder-anomaly-source"`。
- `holder-anomaly-source` 要求 `binding.holderId` =
  `damage.anomalySource.entityId` = `damageItem.statSource.entityId`，且
  `statSource.snapshotId` = `anomalySource.snapshotId`（都省略表示当前属性）。
- 元素限制沿用目录 `applicability.beneficiaryElements: ["fire"]` 与规则的
  `hit.element: fire`：火属性原异常紊乱（`originalAnomalyAttribute: fire`）
  或燃烧 profile 的标准乱流（`standard-vortex profile: burn`）读取 +2 秒；
  非火原异常规则条件不成立，零贡献。
- 持续秒数进入既有 `anomaly-duration-addition` 准备通道，不新增机制 arm，
  不模拟异常积蓄、持续时间刷新或动作时间线。
- 变体 `minimumMindscape: 2`、`maximumLayers: 1`：M0/M1 拒绝，M2—M6 可用，
  层数上限 1，+2 只计算一次；经过时间超过原时长时沿用现有 `max(0,…)` 钳制。
- option target 仍为 `team`，只表示队伍中任何角色结算菲欧妮施加的灼烧时都能
  读取该持续时间；`holder-anomaly-source` 阻止其他施加者或跨快照冒充。

### 6.3 覆盖与制品

- effects revision：`59`。
- 规则 `947 → 948`；选项 `1,008` 不变；catalog 变体 `1,489` 总数不变，
  状态为 `1,223 converted / 145 corrected / 121 unsupported`。
- coverage：`1,149 converted / 139 corrected / 87 unsupported`（`1,375` 条）。
- catalog `differences`：`51 → 52`。
- 补充记录 `108`（74 integrated / 34 out-of-scope）、补充规则 `84`、补充选项
  `69` 不变。
- 三份 effects 制品由固定来源连续生成两次，逐字节一致后安装。摘要：
  static `68d3dc3a…`、catalog `862c5151…`、coverage `8711250a…`。
- 技能清单 `staticCatalogSha256` 由 `generate:agent-actions` 同步为
  `862c5151…`；60 个动作文件与 registry 字节不变。
- 计算快照：`24018cd0…`；三份 calculator 夹具追加第 19 条 B3 刷新记录，
  B1 的 17 条与 B2 的第 18 条历史链保持原样。

### 6.4 消融实验

| 场景                           | 现有契约结果 | 替代方案结果                         | 结论                    |
| ------------------------------ | ------------ | ------------------------------------ | ----------------------- |
| 菲欧妮施加火灼烧，队友触发紊乱 | +2 生效      | 仅元素/职业条件无法区分施加者        | 仍需 holder 来源约束    |
| 简（异常职业）施加火异常       | 拒绝         | 仅按火元素或 `anomaly-source` 会误计 | 元素/职业不能替代       |
| 同一实体、不同异常来源快照     | 拒绝         | 仅比较实体会误计                     | 必须同时核对快照        |
| 非火原异常                     | 零贡献       | 保留 turbulence 会变成乱流专属       | 元素条件必须保留        |
| 燃烧 profile 的标准乱流        | +2 生效      | 删除 turbulence 后放行全队仍错误     | 需要 holder 来源 + 元素 |

因此 `holder-anomaly-source` 是表达“只有绑定持有者亲自施加的原异常”的最小
契约；`anomaly-source`、元素筛选和职业条件都不能替代。详细命令与结果见第
7 节。

## 7. PR-B3 验证记录

- 红测：未修代码上新增 core 回归 `8 failed / 0 passed`，失败原因为目录以
  `INVALID_INPUT / Unknown damage item source restriction` 拒绝
  `holder-anomaly-source`；新增 data 转换回归 `5 failed / 6 passed`，失败项为
  M2 仍为 `unsupported`、缺规则、缺具名差异、缺 Nanoka 证据，以及块 note
  漂移未被拒绝；新增发布制品消费回归 `9 failed / 0 passed`，均命中固定
  M2 `semantic-conflict`。实施后 core `8 passed`、data 转换 `26 passed`、
  发布制品消费 `9 passed`。
- 持续数值：10 秒灼烧、已过 3 秒时剩余 `7 → 9`。现有 core 火紊乱公式为
  `4.5 + floor(剩余秒数 / 0.5) × 0.5`，因此倍率实测 `11.5 → 13.5`；任务
  描述中的 `8 → 9` 与现有公式不一致，本 PR 未修改该公式。已过 11 秒时
  剩余 `0 → 1`，已过 12 秒时仍为 `0`；`durationAdjustment` 恒为 `2`，
  证明 +2 只计算一次。燃烧 profile 乱流由 `19 → 21`。
- 来源约束：队友施加的火异常、`statSource` 与 `anomalySource` 实体不一致、
  快照不一致均返回 `CONTEXT_MISMATCH`；实体与快照都等于绑定持有者时正常
  +2。队友触发紊乱但 `anomalySource` 仍为菲欧妮时正常 +2，证明 team
  target 只影响消费范围。
- 消融：把要求从 `holder-anomaly-source` 换回 `anomaly-source` 后，简
  （同为[异常]职业）施加的火紊乱获得 +2，证明元素/职业条件不能替代持有者
  来源约束；恢复 `holder-anomaly-source` 后同一输入被拒绝。非火原异常在
  合法持有者来源下零贡献；`burn` 乱流可读取 +2，`shock` 乱流零贡献。
- 生成期门禁：固定源生成两次，`static.json` / `static-catalog.json` /
  `static-coverage.json` 两两 `cmp` 一致，且与安装后的正式制品逐字节一致。
  新增生成期守卫覆盖来源 raw/normalized 编码、块 note、固定 Pointer、
  Nanoka 证据 Pointer、元素、机制要求、规则通道/数值/条件与具名差异；
  任一漂移即拒绝生成。证据入口 `static-effects-evidence.test.ts` 为
  `3 passed`，包含 M2 语义键。
- `authoring:verify`：99 条记录、89 个 option group、24 个 coverage 位置、
  19 个技能目标、68 条补充记录；语义差异 0，三制品字节比较通过。
- `verify:artifact-dependencies`：730 个节点、915 条边、0 个违规。
  `audit:data-identity`：`matched`，91 条既有问题，`newProblems=[]`、
  `resolvedProblems=[]`。
- 定向回归：core `7 files / 1,979 passed`；data `10 files / 220 passed`。
  data unit 全量 `101 files / 4,453 passed`；随后 `pnpm check` 全量通过。
- `pnpm check`：退出码 0。core `102 passed / 2 skipped` 文件、
  `5,732 passed / 11 skipped` 用例；data `116 files / 4,879 passed`；
  core 打包消费 `1 passed`、data 打包消费 `2 passed`；`pnpm lint` 0 error
  （136 条既有 warning）；`pnpm format:check` 2,941 个文件通过。
- 边界：未修改动作目录、`packages/data/integrated`、来源版本、包版本、CI、
  既有规范页或 `docs/HISTORY.md`；未扩张 authoring 覆盖，未创建或重写数据
  管理记录。M2 的 option target 保持 team 只为队友消费菲欧妮施加的灼烧；
  `holder-anomaly-source` 才决定施加者归属。
