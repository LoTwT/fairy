# ZZZ Calculator 对照验收

2026-10-15。结论：**两者不完全一致**。同输入的常用伤害公式大体相同，但存在抗性下限、精通上限、锐暴分支语义、时间归一化和数据差异，不能直接互换完整计算结果。

## 固定版本与工作区

| 项目                    | 本次检查的版本                                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Fairy 对照基点          | `7584a2ff99bfb80fefde7325d884a3d3192ec89a`                                                                                                 |
| ZZZ Calculator 固定提交 | [`d58e276973c3df944bc36fc81a783f3d17018708`](https://github.com/ZztIsolation/zzz_calculator/tree/d58e276973c3df944bc36fc81a783f3d17018708) |
| Fairy 属性资料          | Nanoka `3.2`，`panel-attributes/1`                                                                                                         |
| 执行环境                | Node `24.21.0`、pnpm `11.13.1`、Vitest `4.1.10`                                                                                            |

初轮主工作区检查使用 LoTwT 的进程级凭据读取远端；当时 fetch 后确认本地 `main` 已是最新，`merge --ff-only` 无新增提交。
主工作区当时干净。`verify:nanoka:current integrated` 持锁验证与 `prepare:consumer` 均通过，管理状态与当时快照一致，未发生快照切换。
PR 1 在同一 Fairy 基点的隔离 worktree 接管；以上是复用的初轮记录，不表示重新查询了当前远端或重新维护了主工作区。

本次新增离线对照测试和本报告。公式实现、正式数据、来源版本与管理记录不因对照结果而改写；差异需按各自来源和规范判断，不能把另一计算器直接当作游戏真值。

## 重要差异

### 维琳娜技能倍率有 100 倍差异

上游 [`data/agent_skills.json`](https://github.com/ZztIsolation/zzz_calculator/blob/d58e276973c3df944bc36fc81a783f3d17018708/data/agent_skills.json) 的维琳娜 16 个匹配伤害行，在 1—16 级的 256 个值上均为 Fairy 百分数的 `1/100`。
这不是仅有存储单位不同：上游 [`resolveSkillMultiplier` 路径](https://github.com/ZztIsolation/zzz_calculator/blob/d58e276973c3df944bc36fc81a783f3d17018708/core/calculator-core.js#L2900) 仍统一除以 100。

已实际调用双方入口验证「普通攻击：扇舞」一段、最终 12 级：

| 项目               | ZZZ Calculator | Fairy   |
| ------------------ | -------------- | ------- |
| 原始技能百分数     | `1.034`        | `103.4` |
| 实际使用的伤害倍率 | `0.01034`      | `1.034` |

上游调用 `calculateInCombatPanel`，返回 `damage.multipliers.skill = 0.01034`；Fairy 调用 `resolveAgentAction`，返回 `sourceDamageMultiplier = 1.034`，伤害段也使用 `1.034`。
上游该次无暴击伤害为 `7.030395054379`。保持所有其他输入相同，仅纠正这一倍率会使该段伤害变成 100 倍。
其现有 `velina-damage.test.js` 通过，说明测试通过尚不能覆盖这一数据问题。

### 公式边界及输出语义不同

| 项目与复现输入                | ZZZ Calculator                                           | Fairy                                                          | 证据范围                                        |
| ----------------------------- | -------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------- |
| 有效抗性 150%                 | 抗性乘区下限 `0.01`，期望伤害 `13.638836511276473`       | 抗性乘区下限 `0`，伤害 `0`                                     | 上游 `damage-whitebox.test.js` 的原始用例已迁入 |
| 异常精通 1200                 | `AP / 100 = 12`                                          | 精通乘区上限 `10`                                              | 另加公开入口边界探针；不是原测试中的失败案例    |
| 150% 暴击率、150% 锐暴伤害    | `sharpCrit = 2.5`，`lacerationCrit = 6.25`，期望 `4.375` | `isSharpCritical: true` 保证第一层、第二层取期望，结果 `4.375` | 期望值一致；确定暴击分支不能直接按字段名对应    |
| 灼烧总时长 10 秒、已过 3.2 秒 | 先将已过时间吸附到 3.0 秒，倍率 `11.5`                   | 直接传剩余 6.8 秒，按整 tick 结算得 `11`                       | 输入契约不同；先对齐剩余时间时可一致            |
| 耀变                          | 独立的队伍比较评分                                       | 具体耀变伤害公式                                               | 不属于同一输出量，未强行做伤害相等断言          |

来源分别为上游的 [抗性计算与原始断言](https://github.com/ZztIsolation/zzz_calculator/blob/d58e276973c3df944bc36fc81a783f3d17018708/tests/damage-whitebox.test.js#L1235)、[异常计算](https://github.com/ZztIsolation/zzz_calculator/blob/d58e276973c3df944bc36fc81a783f3d17018708/core/calculator-core.js#L6096)、[锐暴公式](https://github.com/ZztIsolation/zzz_calculator/blob/d58e276973c3df944bc36fc81a783f3d17018708/core/sharpDamage.js#L148)、[时间归一化](https://github.com/ZztIsolation/zzz_calculator/blob/d58e276973c3df944bc36fc81a783f3d17018708/core/damageEventMultipliers.js#L62) 和 [建模边界](https://github.com/ZztIsolation/zzz_calculator/blob/d58e276973c3df944bc36fc81a783f3d17018708/docs/modeling.md#damage-and-score-domains)。Fairy 的对应规范从 [Core 入口](../specs/core/index.md) 查阅。

### 基础属性、音擎和技能表存在差异

实体优先按上游 Enka ID 映射；其映射缺少的 28 个音擎按唯一的中文全名匹配。
技能仅匹配规范化全角字符及空白后，招式名和行名均唯一对应的记录；没有根据相近名称强行对应。

| 对照项目                            | 实际结果                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------- |
| 代理人主目录                        | Fairy 60 名；上游 15 名，其中安比隐藏，另有 29 组队友增益配置                                     |
| 15 名共同代理人的 151 个属性值      | 101 个相同；45 个生命/攻击/防御差异均为上游整数与 Fairy 精确小数的区别；另有 5 个非精度差异       |
| 14 名代理人的核心节点累计属性       | 162 项相同；上游安比没有核心节点资料，未计入                                                      |
| 100 个共同音擎                      | 100 个基础值均为上游取整、Fairy 保留小数；高级属性 99 个相同、1 个不同                            |
| S 级满强化驱动盘主词条及单档副词条  | Fairy 已列出的 34 项均匹配；上游另有 5 号盘风伤主词条，Fairy 当前目录未列出；双方套装目录各 30 套 |
| 上游 13 份技能目录中的 267 个伤害行 | 唯一匹配 216 行：180 行全等级相同，36 行存在差异；其余 51 行未作等价判断                          |
| 已匹配技能的 3,456 个等级值         | 3,165 个相同、291 个不同；其中 256 个是前述维琳娜的 100 倍差异                                    |

非精度属性差异如下，排列为「上游 / Fairy」：

- 安比异常精通 `94 / 93`、异常掌控 `93 / 94`。
- 仪玄能量自动回复 `1.2 / 0`，克拉蕾 `1 / 0`，佩洛伊斯 `1.2 / 1`。前两者还涉及资源类型差异，不能简单照抄另一方的字段。
- 音擎「月相」-朔高级暴击率 `15.9% / 16%`。

其他值得单独核实的技能百分数：

| 招式和等级                              | 上游      | Fairy              |
| --------------------------------------- | --------- | ------------------ |
| 克拉蕾「连携技：血华誓·血契共鸣」，5 级 | `1422.8%` | `1442.8%`          |
| 叶瞬光「冲刺攻击：如影疾行」，16 级     | `249.8%`  | `249%`             |
| 11 号「支援突击：重燃」，12 级          | `767.8%`  | `767.6%`           |
| 叶瞬光「流云剑意」每道剑气，12 级       | `33.4%`   | `33.485714285714%` |

剩余技能差异多为 `0.1` 个百分点，但本次没有逐条重新向游戏客户端或官方表裁定真值。上游资料混有不同来源版本；例如艾莲技能标注 Nanoka `3.3.4+19304006`，不能将整库视作统一版本。

## 上游原有测试的实际执行

初轮选取与数据、面板、伤害和角色机制有关的 34 个脚本，**34 个通过、0 个失败**。本轮核对原执行记录，未重跑这 34 个脚本。没有执行其部署、浏览器布局、库存、Scanner、完整优化器/API 套件。

```text
atk-basis                       percent-sanity
skill-targets                   drive-disc-set-effects
field-buffs                     boss-catalog
effect-rule-targets              calculation-skill-groups
default-calculation-config      formula
in-combat-formula               damage-whitebox
shared-combat                   w-engine-modification
attack-w-engines                anomaly-w-engines
anomaly-damage                  anomaly-crit-modes
turbulence-damage               sharp-damage
remielle-teammate-buffs          roxy-teammate-buffs
luminescence-formula            luminescence-integration
jane-damage                     alice-damage
aria-damage                     vivian-damage
velina-damage                   velina-c6-damage
soldier-11-damage               pyrois-damage
sigrid-damage                   ellen-integration
```

文件名为 `tests/<名称>.test.js`，独立 Node 进程执行。仓库外副本仅在伤害函数入口/返回处追加记录包装，原函数和原测试断言保留。
初轮 6 个脚本因副本缺少图标资源失败；补齐同一提交的资源后，这 6 个全部重跑通过。

## Fairy 数值对照与保留的测试

从上述脚本记录的调用中，提取普通、贯穿、锐化、普通异常及紊乱事件；去除重复输入和结果后：

| 公式           | 不同输入/结果组数 | 一致  | 不一致 |
| -------------- | ----------------- | ----- | ------ |
| 普通伤害       | 585               | 584   | 1      |
| 贯穿伤害       | 44                | 44    | 0      |
| 锐化伤害       | 105               | 105   | 0      |
| 异常与紊乱伤害 | 427               | 427   | 0      |
| 合计           | 1,161             | 1,160 | 1      |

这些组来自 4,384 次可迁移调用，包含不同事件和同一配装的变体，**不是 1,161 个独立配装**。
实际检查 3,002 个分支数值：2,999 个一致，3 个差异均来自同一抗性下限用例。
对齐容差为 `1e-8 × max(1, |上游值|)`；没有通过放宽容差掩盖已知差异。

对照层级是**冻结上游已解析的事件、面板和已匹配增益，再调用 Fairy 公开公式重算**。
防御/抗性使用原始参数重新求值；条件失衡增益适配为 Fairy 的显式输入。
对上游独立浸染倍率和次数保留显式外乘；异常的已解析倍率、暴击转换和增益选择属于冻结输入。
因此结果不能证明 Fairy 自己的配装、角色转换、自动效果选择、完整队伍快照与上游相同。

按结算类型统计，异放（`release`）、乱流（`turbulence`）和耀变（`luminescence`）分别有 11,976、669、223 条记录未纳入这一公式对照，其中含嵌套调用和重复记录；不作为通过项。
这些数字不是跨来源场景或完整结算的覆盖数。本次未验证完整配装、跨来源异放、乱流完整结算或耀变评分等价，也未穷举公式的全部输入边界。
锐化只比较共同的非暴击与期望输出，确定锐暴模式差异另行断言。异常不具备暴击时，只比较上游实际返回的有效分支。

为控制日常维护成本，从上述去重记录中保留来源于三个核心脚本的 230 组样本，并追加锐暴、紊乱和边界用例：

- [离线测试](../../packages/core/test/zzz-calculator-comparison.test.ts)：253 项，已运行并全部通过。
- [冻结参考](../../packages/core/test/fixtures/zzz-calculator-reference.json)：上游提交、源文件 SHA-256、脚本、记录序号、事件、适配后的已解析输入及上游返回的伤害分支数值。
- 原始样本 229 组一致、1 组明确断言抗性差异；这 1 组是已知差异回归，不能计作「双方一致」。
- 另外 23 项是 7 项锐暴期望、13 项归一化紊乱倍率及 3 项边界／输出语义差异断言；253 项通过不表示 253 组等价。
- 参考值来自上游实际返回，普通测试不依赖上游仓库、网络或 raw。未把上游实现复制进 Fairy。

`call` 是对应脚本采集日志中从 1 开始的记录行号，包含嵌套调用，不是独立配装编号。
夹具不保存完整上游请求或完整返回对象；用于本次提取的调用记录保留在本机一次性证据中。

运行：

```sh
pnpm --filter @randomplay/core exec vitest run test/zzz-calculator-comparison.test.ts
```

本机完整机器可读证据在 Git 忽略的 `.lody/zzz-calculator-comparison/`：
`data-comparison.json`、`formula-comparison.json`、`upstream-test-results.json`、运行日志及一次性提取脚本。
原始仓库副本和调用记录的位置见 `.lody/zzz-calculator-comparison-path.txt`。这些材料只供本次检查，不进入构建、发布包或 CI。

## 验证记录

PR 1 隔离 worktree 与初轮记录采用相同 Fairy 基点。本轮保留数值适配逻辑和全部冻结参考值，
只补充来源与样本完整性断言，修复期望对象为空时没有比较却显示通过的问题，并明确报告范围与授权。

- 本轮对照测试 `pnpm --filter @randomplay/core exec vitest run test/zzz-calculator-comparison.test.ts`：253/253 通过。
- `pnpm --filter @randomplay/core typecheck` 首次因新 worktree 缺少规范示例导入的 `core/dist` 而失败；执行 `pnpm --filter @randomplay/core build` 后重跑通过，未修改源码。
- 变更测试文件的 `oxlint`、四个交付文件的 `oxfmt --check`、`git diff --check` 及新增文件空白检查通过。
- 只读上游副本的 HEAD 为固定目标提交，工作区干净；夹具所列 6 个源文件 SHA-256 全部吻合。
- 230 组夹具输入及期望与原始机器对照记录一致，全部期望分支数值与对应原始调用返回吻合；夹具字节未改。
- 空期望对象的反例已复现旧测试静默通过；修复后，空期望、未知期望分支、移除抗性差异标记的三个扰动均被拒绝。恢复后夹具 SHA-256 与交接原件一致，253 项全部通过。

复用接管前主工作区在上述固定基点的记录，以下不是本轮重跑结果：

- Core TypeScript 检查通过；完整 Core 测试 92 个文件、5,060/5,060 项通过，包含原有 253 项对照。
- `pnpm check:quality` 通过，包含包边界、lint、全仓格式和规范示例类型检查；`git diff --check` 通过。
- 数据持锁验证与消费准备通过。本 PR 未修改生产源码、正式数据、`integrated` 或管理契约，这些基点记录仍适用于本次改动；不代替后续数据变更的维护验收。

隔离 worktree 没有控制目录，本次不创建管理记录，亦未修改主工作区。本轮不重跑完整 Core、
数据包完整测试及打包／浏览器验收；数值实现和发布契约未变，新增断言由本轮定向检查覆盖。

后续优先核实维琳娜倍率、克拉蕾 5 级连携和安比精通/掌控数据，再决定是否需要修改任一仓库。公式边界和输出语义应先明确约定，不能为了数值一致而直接改变 Fairy 的既有规范。

## 后续 PR 拆分

用户已批准本系列 5 个 PR 由独立 Astra session 实施与验证，协调者独立 review、安排必要修复后，
执行提交、推送、开 PR、合并并按依赖继续。本报告只交付 PR 1 的本地结果，PR 2—5 保留下列范围与依赖，
不据此声称它们已实施或完成。比较对象继续采用本文固定的 ZZZ Calculator 提交；既有 ZZZ-HP 验收
只作为 Fairy 用例组织方式的参考，不混入目标库的通过统计。

| PR  | 建议标题                                   | 交付与依赖                                               | 规模与主要风险                                |
| --- | ------------------------------------------ | -------------------------------------------------------- | --------------------------------------------- |
| 1   | 保留 ZZZ Calculator 公式对照与差异记录     | 当前 253 项测试、参考夹具、本报告及索引；可独立合并      | 小；通过数必须区分一致性与已知差异断言        |
| 2   | 增加 ZZZ Calculator 完整配装与队伍增益对照 | 双方独立组装输入后的公开计算结果；接在 PR 1 后           | 中；源数据精度和增益身份容易混淆              |
| 3   | 补齐 S 级 5 号驱动盘风伤主词条             | 词条来源、生成制品、配装与消费验收；功能不依赖 PR 2      | 中；涉及生成制品及计算快照，预计超过 8 个文件 |
| 4   | 增加异放来源与历史快照对照                 | 薇薇安、爱芮的既有异放能力；复用 PR 2 的输入及参考格式   | 中；必须分清强度提供者和触发者                |
| 5   | 增加乱流完整结算对照                       | 六种标准倍率、来源归属和时长；复用 PR 2 的输入及参考格式 | 中；完整持续时间不能混作紊乱剩余时间          |

推荐执行顺序为 PR 1 → PR 2 → PR 3 → PR 4 → PR 5。合并依赖是 PR 1 → PR 2 → PR 4 / PR 5；
PR 3 独立，PR 4 和 PR 5 互不依赖。每个 PR 合并后均应保留完整、可运行的测试及现有消费能力。

### PR 1：交付当前公式对照

提交范围就是当前四个文件：本报告、`docs/index.md`、
`packages/core/test/zzz-calculator-comparison.test.ts` 及其参考 JSON。
保留目标库原始返回、来源摘要、适配边界和已知差异，不修改生产公式或正式数据。
验收按上节区分本轮定向检查与复用的 5,060 项 Core 测试、质量及持锁验证记录；代码或夹具变化时重跑受影响检查。

### PR 2：双方从同一份配装独立计算

复用 `packages/data/test/static-e2e.test.ts` 的公开入口组织方式，新增
`packages/data/test/zzz-calculator-static.test.ts`、
`packages/data/test/fixtures/zzz-calculator-static-cases.ts` 和
`packages/data/test/fixtures/zzz-calculator-static-reference.json`。

首批覆盖 11 号普通伤害、仪玄贯穿伤害、克拉蕾锐化伤害，以及目标库
`remielle-teammate-buffs.test.js`、`roxy-teammate-buffs.test.js` 中双方已支持的队友增益场景。
每类保留增益关闭与开启两个状态；配装包含六槽主副词条、音擎及精炼、核心、影画和明确技能等级。
先使用双方共同支持的词条，风伤主词条由 PR 3 补充。

共同输入只描述配装、培养、目标和明确有效的状态。Fairy 走
`loadStaticCalculationData → resolveAgentAction → calculateStaticActionDamage`，目标库走自身公开入口。
逐项记录局外面板、转化后读数、技能倍率、命中增益、乘区及非暴击／暴击／期望伤害。
需要互斥或前置条件的增益必须在输入中明确，不能靠默认全开凑出一致结果。
锐化沿用 PR 1 的语义对应，只对比共同输出；确定暴击分支按各自契约单独断言。

保留各库原生结果；取整、不同来源数据和输出语义的差异单独标注。
只有能证明等价的输入换算才可形成第二份对齐结果，不允许把上游已算好的面板或倍率作为 Fairy 的
完整链路输入，也不为消除差异提前取整或扩大容差。维琳娜倍率问题保留为已有数据差异，不能用它判断
风伤公式是否正确。未解释的差异必须继续定位或标为未通过，不能仅替换期望值。验收包含增益开关影响的
具体读数、错配来源／非法配装的明确拒绝，以及已有同配置
`equipment` / `out-of-combat` 路径的去重语义。

### PR 3：补齐风伤主词条

修改 `packages/data/scripts/panel-attributes/drive-discs.ts`，补充 S 级满强化 5 号盘风伤选项。
先核对来源：目标库记录为 30%，但当前属性证据固定于旧 ZZZ-HP 文件；新增值必须有独立核实的来源，
并在 `evidence.json` 与属性规范中明确登记，不能把新增项伪装为旧文件已有记录或为此整体升级来源版本。
若无法核实来源，保留该 PR 为待实施，不先发布推定数值。

通过现有生成器更新 `definitions/attributes/drive-disc-affixes.json`、属性 manifest 和派生计算快照，
同步 `panel-attributes.test.ts`、`panel-attributes-publication.test.ts`、`static-calculation.test.ts`
及确实受快照变化影响的夹具。已有 `wind` 元素类型可复用，不新增风伤公式或额外配置开关。

验收包含：5 号盘可选、其他槽位拒绝、只增加风伤通道、换成无增伤主词条后的伤害差值、Node 安装包与
浏览器公开入口消费。使用已确认倍率的风属性场景检验加成，并把目标库的倍率差异单独记录。
按[数据管理状态同步流程](../specs/data/integration.md#数据管理状态的同步维护)核查受影响工作区，
完成持锁验证和消费准备；不手改 manifest 摘要或遗留过期快照。该 PR 涉及多份生成及验收文件，审查时
将人工逻辑、生成制品和仅摘要更新分组说明。

### PR 4：对照已有异放与历史快照能力

新增 `packages/data/test/zzz-calculator-abloom.test.ts`，输入和冻结参考分别保存在同目录
`fixtures/zzz-calculator-abloom-cases.ts`、`fixtures/zzz-calculator-abloom-reference.json`。
目标样本来自 `vivian-damage.test.js` 和 `aria-damage.test.js`，使用 Fairy 现有
`calculateStaticDamageFromCatalog` 的 `anomaly-settlement` 通道及显式来源／快照接口。

覆盖同一角色提供异常强度并触发异放、不同角色提供强度与触发、保存快照后当前面板改变、原异常来源
改变、普通异常增益与异放专属增益分别开关。逐项比较攻击／精通／穿透／等级读取身份、触发者专属倍率、
暴击语义及伤害；缺少必需来源或快照读数应明确失败。只迁移双方已支持的明确事件，不模拟自动异放触发。

### PR 5：对照已有乱流完整结算

新增 `packages/data/test/zzz-calculator-vortex.test.ts`，输入和冻结参考分别保存在同目录
`fixtures/zzz-calculator-vortex-cases.ts`、`fixtures/zzz-calculator-vortex-reference.json`。
参考 `turbulence-damage.test.js`，调用现有 `calculateStandardVortexDamageMultiplier` 和
`calculateStaticDamageFromCatalog` 的 `vortex` 通道。

覆盖侵蚀、感电、灼烧、强击、霜寒、烈霜六个分支，标准时长与延长时长、风化提供者和非风异常强度
提供者不同、乱流专属增益开关。核对完整持续时间、快照攻击／精通／穿透、伤害归属、抗性属性及最终结果。
强击和碎冰的即时异常伤害分别计算，不能合并后冒充乱流伤害；非法分支、负时长及缺失来源应拒绝。
核心倍率函数的零时长与小数时长按 Fairy 既有契约回归，目标库不支持的输入不计入共同通过项。

### 各 PR 的验收与边界

最小方案是保留明确场景的测试和冻结参考，不新增通用比较平台、运行时依赖、服务、环境变量或 CI 联网步骤。
提取脚本默认作为临时验收工具；普通测试只读取仓库夹具，夹具保存固定提交、原文件摘要及对应层级的输入和上游返回。
PR 1 保存已解析公式输入与伤害分支数值；PR 2、4、5 的参考还应保留用于独立组装的原始场景输入，避免混淆对照层级。
实现依赖已可读取的目标库副本及现有 Node／pnpm／Vitest 环境，不需要新的服务账号或 API key。

PR 2、4、5 的目标文件按以下命令验证，其中测试文件替换为对应 PR 的明确文件名：

```sh
pnpm --filter @randomplay/data prepare:consumer
pnpm --filter @randomplay/data exec vitest run --project unit test/zzz-calculator-static.test.ts
pnpm --filter @randomplay/data typecheck:prepared
pnpm check:quality
```

新测试只读取已准备的制品、不启动外部进程，沿用现有 `static-e2e.test.ts` 所在的 unit 项目，
由当前 `test/**/*.test.ts` 自动纳入，不调整 Vitest 项目分层。
PR 3 运行 `pnpm check`、`pnpm --filter @randomplay/data verify:browser` 与消费准备；
对已有受管理目标另执行 `pnpm --filter @randomplay/data verify:nanoka:current integrated`。
无控制目录的静态 worktree 沿用静态快照验证与发布准备，不为测试强建管理记录；同步回主工作区后按管理流程复验。
以上是后续验收要求，不是已经执行的结果；每个 PR 按实际变更补充受影响的既有测试，复用仍适用的验收证据。

本拆分不安排抗性下限、精通上限或角色异常数值的推定修复，也不新增耀变评分、战斗轮转和自动触发系统。
这些事项由后续维护者依据游戏规则及项目第一信任来源单独裁定；确认 Fairy 缺陷时，修复和证明缺陷的
回归用例形成单独小 PR，先于依赖它的一致性验收合并。

本方案假定上述场景能用双方已有静态接口表达；不能表达的具体场景应登记为覆盖缺口，不在测试适配器内
偷偷实现生产逻辑。PR 1、2、4、5 可撤回各自测试和文档；PR 3 回退时需成组恢复生成规则、制品、快照及
受影响夹具，再依管理流程复验。实施 session 保留未暂存、未提交的变更供协调者 review；
协调者在用户已有授权内完成 Git 交付与依赖推进。npm 发布另行安排。
