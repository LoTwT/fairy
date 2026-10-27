# revision 53—56 伤害种类范围回归

日期：2026-10-27

状态：已实施，待独立审查。

## 范围

本批为静态 effects revision `54`—`56` 的伤害种类范围修正补充走公开链路的
端到端回归。revision `53` 是来源升级，本批不改动其裁定；修正内容见
[维琳娜异常增伤范围修正](velina-anomaly-scope-correction.md)、
[宽口径异常增伤审计](anomaly-broad-scope-audit.md) 与
[怒目金刚精炼 2 贯穿伤害修正](wrathful-vajra-r2-sheer-correction.md)。

只新增测试、夹具、参考生成器与文档；不修改生产代码、正式数据
（`definitions`、`integrated`）、数据管理状态、effects revision、版本号、
CI 结构或 `docs/HISTORY.md`。

#324／#325／#326 已在
`packages/core/test/effects/static-catalog-data.test.ts` 用低层目录夹具断言
贡献是否存在。本批不重复这些断言，改用 `loadStaticCalculationData` 加载同版
数据，再经目录事件或低层公开入口得到最终乘区与伤害，并逐条对照固定上游投影。

## 覆盖矩阵

| 修正 | 实体 / 记录        | 正例                                                                                      | 反例                                                                                                                                                |
| ---- | ------------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 54   | 维琳娜 M0 额外能力 | `velina-m0-anomaly`（风化 10%）                                                           | `velina-m0-vortex-broad-only`、`velina-m0-anomaly-settlement`、`velina-m0-luminize`；`velina-m0-vortex-both`（只计乱流 10%）                        |
| 54   | 维琳娜 M2          | `velina-m2-anomaly`（15%）                                                                | `velina-m2-vortex-both`（只计乱流 15%，非 30%）                                                                                                     |
| 54   | 维琳娜 M6          | `velina-m6-anomaly`（4 层 10%）                                                           | `velina-m6-vortex`（0%）                                                                                                                            |
| 55   | 格莉丝 M0（2 层）  | `grace-anomaly`（36%）                                                                    | `grace-anomaly-settlement`、`grace-vortex`、`grace-luminize`（均 0%）                                                                               |
| 55   | 薇薇安 M0          | `vivian-m0-anomaly`（12%）                                                                | `vivian-m0-anomaly-settlement`、`vivian-m0-vortex`、`vivian-m0-luminize`（均 0%）                                                                   |
| 55   | 爱丽丝 M2          | `alice-m2-anomaly`（15%）                                                                 | `alice-m2-anomaly-settlement`、`alice-m2-vortex`、`alice-m2-luminize`（均 0%）                                                                      |
| 55   | 简核心被动三条     | `jane-core-anomaly`（暴击率 56%、暴伤 50%）                                               | `jane-core-anomaly-settlement`、`jane-core-vortex`（均 0%）                                                                                         |
| 55   | 简潜能档位         | `jane-potential-anomaly`（档位 2，暴伤 +10%）、`jane-potential-v-anomaly`（档位 5，+25%） | `jane-potential-vortex`（0%）                                                                                                                       |
| 55   | 简 M2              | `jane-m2-anomaly`（额外 +50% 暴伤）                                                       | `jane-m2-vortex`（0%）                                                                                                                              |
| 55   | 琳琅鎏心 R1—R5     | `joyau-r1-anomaly` … `joyau-r5-anomaly`（7/8/9/10/11%）                                   | `joyau-r1-anomaly-settlement` … `joyau-r5-anomaly-settlement`；`joyau-r1-vortex-both` … `joyau-r5-vortex-both`（只计乱流一层）；`joyau-r1-luminize` |
| 56   | 怒目金刚 R2        | `wrathful-r2-fire-sheer`（10.35%）                                                        | `wrathful-r2-ice-sheer`、`wrathful-r2-fire-vortex`（均 0%）                                                                                         |

简的档位 5 案例只有独立期望：991bb0e 的原始记录只保存 +10% 基值与零值叠层
记录，没有可用于同条件重放的档位缩放；档位 2 同时有独立期望与上游投影。

## 参考分层

参考生成器：
`packages/data/test/fixtures/generate-revision-53-56-scope-reference.mjs`；
冻结参考：
`packages/data/test/fixtures/revision-53-56-scope-reference.json`；实时输入：
`packages/data/test/fixtures/revision-53-56-scope-cases.ts`。

1. **游戏原文**：Nanoka 中英文与三份修正文档引用的原文给出修正后的数值与范围。
   夹具逐条声明 `perLayer`、收窄后的伤害种类与命中元素；独立期望只使用这些
   声明值，不用 Fairy 输出回填。
2. **固定上游投影**：从只读 Git 对象读取 ZZZ-HP
   `991bb0ef2a00387f8a1fa18293bbda17256d7270` 的
   `zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json` 与
   `zzz-hp/src/utils/damageCalc.ts`，核对 SHA-256
   （`f1df0144…7095`、`763c7447…629d`），逐字段核对原始记录，并要求
   `damageCalc.ts` 包含本批使用的异常、异放、乱流、耀变、贯穿与异常暴击乘区
   表达式原文。上游值是该版本原始记录与固定乘区表达式的重放，不执行上游
   应用，也不是整应用差分或游戏实测。
3. **独立算式**：使用精确十进制有理数（+ − × ÷ 精确，除法与输出按 40 位有效
   数字 ROUND_HALF_EVEN）。中立面板为攻击 1,000、等级 1、防御 0、抗性 0、
   异常精通 100、暴击率 0、暴伤 0；除列出的效果外全部乘区为 1。普通异常与
   上游一致时，断言 Fairy 最终值与上游投影相等；已登记差异断言
   `Fairy − 上游` 的具体差值。

普通测试与 CI 不访问上游仓库、raw、网络或本机临时路径；只有显式重生成参考时
才读取固定 Git 对象。生成器在写入后调用仓库格式化器，以保证重复生成与
`format:check` 同时成立；它不加入 build/test/check/CI。

## 已知差异

表中上游值与修正后值都是同一中立事件、同一组显式选择下的合计期望；差值定义
为 `修正后 − 上游`。来源指针均指固定来源 991bb0e 的原始记录。

| 案例                           |   上游 | 修正后 |   差值 | 来源指针                                                                                                       |
| ------------------------------ | -----: | -----: | -----: | -------------------------------------------------------------------------------------------------------------- |
| `velina-m0-vortex-broad-only`  |   1100 |   1000 |   -100 | `/agents/45/mindscapeBuffs/0/effectBlocks/1/effects/0`                                                         |
| `velina-m0-vortex-both`        |   1200 |   1100 |   -100 | `/agents/45/mindscapeBuffs/0/effectBlocks/1/effects/0`；`/agents/45/mindscapeBuffs/0/effectBlocks/1/effects/1` |
| `velina-m0-anomaly-settlement` |   1100 |   1000 |   -100 | `/agents/45/mindscapeBuffs/0/effectBlocks/1/effects/0`                                                         |
| `velina-m0-luminize`           |   1100 |   1000 |   -100 | `/agents/45/mindscapeBuffs/0/effectBlocks/1/effects/0`                                                         |
| `velina-m2-vortex-both`        |   1300 |   1150 |   -150 | `/agents/45/mindscapeBuffs/2/effectBlocks/0/effects/0`；`/agents/45/mindscapeBuffs/2/effectBlocks/0/effects/1` |
| `velina-m6-vortex`             |   1100 |   1000 |   -100 | `/agents/45/mindscapeBuffs/6/effectBlocks/0/effects/0`                                                         |
| `grace-anomaly-settlement`     |   1360 |   1000 |   -360 | `/agents/29/mindscapeBuffs/0/effectBlocks/1/effects/0`                                                         |
| `grace-vortex`                 |   1360 |   1000 |   -360 | 同上                                                                                                           |
| `grace-luminize`               |   1360 |   1000 |   -360 | 同上                                                                                                           |
| `vivian-m0-anomaly-settlement` |   1120 |   1000 |   -120 | `/agents/54/mindscapeBuffs/0/effectBlocks/0/effects/0`                                                         |
| `vivian-m0-vortex`             |   1120 |   1000 |   -120 | 同上                                                                                                           |
| `vivian-m0-luminize`           |   1120 |   1000 |   -120 | 同上                                                                                                           |
| `alice-m2-anomaly-settlement`  |   1150 |   1000 |   -150 | `/agents/38/mindscapeBuffs/2/effectBlocks/0/effects/0`                                                         |
| `alice-m2-vortex`              |   1150 |   1000 |   -150 | 同上                                                                                                           |
| `alice-m2-luminize`            |   1150 |   1000 |   -150 | 同上                                                                                                           |
| `joyau-r1-anomaly-settlement`  |   1070 |   1000 |    -70 | `/wengines/74/refinementBuffs/0/effectBlocks/0/effects/1`                                                      |
| `joyau-r2-anomaly-settlement`  |   1080 |   1000 |    -80 | `/wengines/74/refinementBuffs/1/effectBlocks/0/effects/1`                                                      |
| `joyau-r3-anomaly-settlement`  |   1090 |   1000 |    -90 | `/wengines/74/refinementBuffs/2/effectBlocks/0/effects/1`                                                      |
| `joyau-r4-anomaly-settlement`  |   1100 |   1000 |   -100 | `/wengines/74/refinementBuffs/3/effectBlocks/0/effects/1`                                                      |
| `joyau-r5-anomaly-settlement`  |   1110 |   1000 |   -110 | `/wengines/74/refinementBuffs/4/effectBlocks/0/effects/1`                                                      |
| `joyau-r1-vortex-both`         |   1140 |   1070 |    -70 | `/wengines/74/refinementBuffs/0/effectBlocks/0/effects/1`；`…/effects/2`                                       |
| `joyau-r2-vortex-both`         |   1160 |   1080 |    -80 | `/wengines/74/refinementBuffs/1/effectBlocks/0/effects/1`；`…/effects/2`                                       |
| `joyau-r3-vortex-both`         |   1180 |   1090 |    -90 | `/wengines/74/refinementBuffs/2/effectBlocks/0/effects/1`；`…/effects/2`                                       |
| `joyau-r4-vortex-both`         |   1200 |   1100 |   -100 | `/wengines/74/refinementBuffs/3/effectBlocks/0/effects/1`；`…/effects/2`                                       |
| `joyau-r5-vortex-both`         |   1220 |   1110 |   -110 | `/wengines/74/refinementBuffs/4/effectBlocks/0/effects/1`；`…/effects/2`                                       |
| `joyau-r1-luminize`            |   1070 |   1000 |    -70 | `/wengines/74/refinementBuffs/0/effectBlocks/0/effects/1`                                                      |
| `wrathful-r2-fire-sheer`       |   1000 | 1103.5 | +103.5 | `/wengines/42/refinementBuffs/1/effectBlocks/0/effects/1`                                                      |
| `wrathful-r2-fire-vortex`      | 1103.5 |   1000 | -103.5 | 同上                                                                                                           |

其余带上游投影的案例差值均为 `0`，由测试逐条断言而不是按本表推断：

- 维琳娜 M0／M2／M6 普通风化异常；格莉丝、薇薇安、爱丽丝的普通异常；
  琳琅鎏心 R1—R5 普通异常；怒目金刚冰属性贯穿。
- 简的核心被动、M2、潜能档位 2 与它们对应的异放／乱流反例：991bb0e 的
  `anomalyCritRate`／`anomalyCritDmg` 本来就只进入普通异常暴击区，修正后
  Fairy 与上游一致。新增的子类暴击记录仍为 `semantic-conflict`，本批未选择。

## 精度

- 参考与差值断言使用 `max(1e-9, abs(reference) × 1e-12)`，只吸收浮点运算顺序。
- 上游整数投影严格相等的约定在本批不适用：上游证据是固定原始记录与乘区表达式
  的重放，没有执行上游整应用，也不补造整数。若未来加入上游整应用返回，必须为
  该投影另加严格相等断言，不能放宽到本批容差。

## 验证记录

- `pnpm --filter @randomplay/data exec vitest run --project unit test/revision-53-56-scope-regressions.test.ts`：
  1 个文件、49 项通过。
- `pnpm --filter @randomplay/data typecheck:prepared`：通过。
- 本批文件定向 `oxlint`：0 警告、0 错误；全仓 `oxfmt --check`：通过。
- 参考生成器连续执行两次，输出逐字节一致。冻结参考 SHA-256
  `afe0bcb033adb94334c8afcea96c345085b87ac7539030ed9e065accddc7de77`；
  输入夹具 `137f2ff0…96af`、回归 `5c790d96…9261`、生成器 `c8c80ece…b476`。
- 有界扰动（只改 `.generated` 未跟踪副本，随后用 `prepare:consumer` 恢复）：
  - 把维琳娜 M0 宽口径加回 `vortex`：2 项乱流案例失败。
  - 把简核心暴击与 M2 加回 `vortex`：3 项反例失败。
  - 把怒目金刚 R2 恢复为 `turbulenceDmgBonus` + `vortex`：火贯穿与火乱流失败，
    冰贯穿保持通过。
  - 把格莉丝 M0 加回 `anomaly-settlement`／`vortex`／`luminize`：3 项反例失败，
    普通异常正例保持通过。
- 另一次整跑在 unit `test/publication-minify.test.ts` 的两项上分别命中 5 秒超时与
  `ENOTEMPTY` 清理错误；该文件与本批定向回归合计 65 项隔离重跑通过，随后最终
  整跑 Exit 0。失败发生在未改动的发布契约测试，不是断言不一致。
- `pnpm format:check` 与根 `pnpm check`：见下方“整仓门禁”。

## 整仓门禁

根 `pnpm check` 通过（Exit 0）：包边界、lint、格式检查、spec 类型检查、
core 与 data 的类型与测试、data 打包验收全部通过。其中 core 为 98 个测试文件
5,679 项通过、24 项跳过，另有打包 1 项通过；data 为 111 个测试文件 4,804 项
通过，另有打包 2 项通过。`oxlint` 全仓报告 131 条既有 warning、0 错误；本批
新增文件定向检查为 0 warning、0 错误。

## 边界

- 面板是声明的中立合成值，不声称可达配装；每个案例只计算一次，不构造时间线、
  触发顺序、层数获取过程或队伍 DPS。
- 维琳娜与琳琅鎏心的耀变反例同时受各自的 `wind` 命中元素条件限制；它们证明
  最终行为，但不单独区分“伤害种类是否回退”。格莉丝、薇薇安、爱丽丝的耀变
  反例不带命中元素条件，能区分伤害种类回退。
- 目录的耀变分支要求恰好一个蕾米埃尔异常精通映射，非蕾米埃尔行动者的耀变事件
  无法通过目录组装。因此耀变反例改用同一公开低层入口
  `calculateStaticDamage`，仍使用 `loadStaticCalculationData` 加载的规则、
  绑定和受益者求值，并额外断言目录选项状态、来源指针与差异 ID；普通异常、
  异放与乱流继续走目录事件链路。
- 简的潜能档位 5 没有同条件的上游原始投影，只断言独立期望与反例；档位 2 同时
  有独立期望与上游差值。
- 本批不覆盖影画／精炼触发顺序、层数获取、时间线、整应用输出、游戏实测，也不
  外推到其他角色或未来来源版本；不重新审计元素维度，只验证修正文档列出的
  伤害种类范围。
- 本批不改 Nanoka 整合规则、来源版本或 `packages/data/integrated`。独立
  worktree 没有数据管理控制目录；合并回主工作区后的数据管理状态由协调者按
  [来源数据整合规范](../specs/data/integration.md#数据管理状态的同步维护)复核。

## 疑似缺陷

本轮未发现需要上报的疑似 Fairy 缺陷。目录耀变分支的蕾米埃尔映射限制是既有
公开契约的边界，不是本批修正引入的问题，已记入上方边界。
