# ZZZ-HP 991bb0e 公式测试迁移

状态：2026-10-27 完成上游全量脚本核查、公式数值对照与 5 条回归迁移；改动只涉及 core 测试与文档。

本记录沿用[上游测试用例迁移复核](upstream-test-backport.md)与[静态计算端到端对照验收](static-e2e-acceptance.md#上游既有测试追加核查)的方法：
上游脚本只验证其自身契约，Fairy 只迁移能用公开公式与乘区重新表达的公式场景；不把 ZZZ-HP 的实现结果当成游戏真值，
也不为消除差异修改生产代码、正式数据或断言。

## 固定版本与执行环境

| 项目                 | 本次固定值                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| Fairy 基线           | `a2015864af0f699b3f84d4040f07491ac8434690`（`origin/main`）                                       |
| Fairy 任务分支       | `test/zzz-hp-991bb0e-formula-backport`                                                            |
| ZZZ-HP               | `991bb0ef2a00387f8a1fa18293bbda17256d7270`                                                        |
| 本机 ZZZ-HP checkout | `/Users/caoyujie/codes/ZZZ-HP`，HEAD `bfa99ba`；只读，未切换、未修改、未新建 worktree             |
| 上游导出             | `git archive 991bb0e \| tar -x -C /tmp/fairy-zzzhp-991bb0e-UtWRAK`                                |
| 上游依赖             | 临时目录以只读符号链接复用当前 checkout 的 `zzz-hp/node_modules` 与 `zzz-hp-backend/node_modules` |
| 运行环境             | Node `v26.12.1`、pnpm `11.13.1`、Vitest `4.1.10`                                                  |
| 上游运行命令         | `cd <export>/zzz-hp && ./node_modules/.bin/vite-node scripts/<文件名>`                            |

本机 checkout 全程保持干净（运行前后 `git status --short` 均为空），没有 checkout 到 `991bb0e`，也没有在 ZZZ-HP 内创建 worktree。

## 判定口径

- 期望伤害：以 `Math.round(Fairy 精确值) === 上游整数` 判定；不用容差吸收取整差异。
- 乘区与倍率：只允许浮点运算顺序误差，阈值为 `max(1e-9, abs(ref) × 1e-12)`。
- 上游脚本自身的 `nearly`、相对误差和四舍五入断言只用于证明上游脚本通过，不改变 Fairy 的判定口径。

## 全量脚本分类与实际执行

`991bb0e` 的 `zzz-hp/scripts/` 共 78 个 `test-*.mjs`。逐脚本在独立进程中执行，共 **75 个退出码为 0，3 个中止**；
中止项都是缺少仓库外方案库文件，不是计算失败或产品缺陷。其中 `test-damage-zone-routing` 在中止前通过 31 项，
`test-legacy-effect-contracts` 在中止前通过 33 项。

分类口径：A 公式/乘区 5 个、B UI·缓存·数据契约 44 个、C 外部方案文件 3 个、D Fairy 未建模能力 26 个。

- **A 公式/乘区**：输入可由公开公式或乘区重新构造，需做数值对照。
- **B UI·缓存·数据契约**：测试 ZZZ-HP 的展示、缓存、方案状态、效果适配或数据兼容契约；不直接证明 Fairy 公式。
- **C 外部方案文件**：脚本必须先读取仓库外方案库 JSON 才能运行。
- **D Fairy 未建模能力**：ZZZ-HP 应用层能力（优化器、方案包、路由、后端并发、危局模式、记忆化 UI 等），Fairy 没有对应公开契约。

| 脚本                                       | 分类 | 上游实际执行                             | 说明                                                                                     |
| ------------------------------------------ | ---- | ---------------------------------------- | ---------------------------------------------------------------------------------------- |
| `test-affix-batch-entry-cap-row.mjs`       | B    | 34 项通过                                | 词条上限批量入口的两侧源码守卫。                                                         |
| `test-affix-benefit.mjs`                   | B    | 118 项通过                               | 词条收益表、面板增量与伤害变化；ZZZ-HP 分配器链路。                                      |
| `test-affix-cache-key.mjs`                 | B    | 9 项通过                                 | 词条缓存键必须覆盖全部字段。                                                             |
| `test-affix-effect-template.mjs`           | B    | 15 项通过                                | 词条预设效果模板与适配器同构。                                                           |
| `test-affix-eval-adapter.mjs`              | B    | 31 项通过                                | 词条评估输入分桶。                                                                       |
| `test-affix-external-panel-base.mjs`       | B    | 21 项通过                                | 外部面板作为词条评估基准。                                                               |
| `test-affix-gain-target.mjs`               | B    | 42 项通过                                | `gain:` 目标契约与转模等价性。                                                           |
| `test-affix-optimizer.mjs`                 | D    | 166 项通过                               | ZZZ-HP 最优词条求解器；Fairy 无同能力。                                                  |
| `test-affix-preagg.mjs`                    | B    | 8 项通过                                 | 固定底 + 词条增量与整表重算一致。                                                        |
| `test-affix-preset-source.mjs`             | B    | 59 项通过                                | 官方预设词条库来源与脏数据防护。                                                         |
| `test-affix-sweep-caps.mjs`                | D    | 8 项通过                                 | 扫掠柱图上限与复用分支；优化器 UI。                                                      |
| `test-agent-buff-effect-adapt.mjs`         | B    | 34 项通过                                | 角色影画 EffectSpec 往返。                                                               |
| `test-agent-save-stale.mjs`                | D    | 23 项通过                                | 后端乐观锁与前端 409 识别；Fairy 无后端。                                                |
| `test-boss-resistance-level.mjs`           | B    | 22 项通过                                | Boss 抗性 20% / 40% 的解析与展示；Fairy 输入为显式抗性数值。                             |
| `test-buff-build-parity.mjs`               | C    | 0 项后中止：缺少 `scheme-dan.json`       | 需要仓库外方案库。                                                                       |
| `test-buff-catalog-cache.mjs`              | B    | 通过（`ok`）                             | 增益目录缓存。                                                                           |
| `test-buff-conversions.mjs`                | B    | 129 项通过                               | 转化曲线；Sunna、Cissia、血髓秘匣等已在 #268 迁移，青衣 / 卢西娅曲线由既有数据用例覆盖。 |
| `test-buff-damage-types.mjs`               | B    | 35 项通过                                | 8 类伤害词表、旧 scope 迁移与条件命中。                                                  |
| `test-buff-effect-rows.mjs`                | B    | 43 项通过                                | 管理侧行聚合与联动重建。                                                                 |
| `test-buff-effect-selection.mjs`           | B    | 18 项通过                                | 增益编辑器左列选中态。                                                                   |
| `test-buff-group-equivalence.mjs`          | B    | 11 项通过                                | 同组 vs 拆分行的等价性；Fairy 无 `groupId` 概念。                                        |
| `test-buff-row-e2e.mjs`                    | D    | 18 项通过                                | 流程行级增益禁用；Fairy 无行级 override。                                                |
| `test-buff-row-override.mjs`               | D    | 51 项通过                                | 行级例外展开、指纹与归一。                                                               |
| `test-buff-stat-keys.mjs`                  | B    | 55 项通过                                | 增益字段表、零表对齐与 NaN 守卫。                                                        |
| `test-buff-stat-zones.mjs`                 | B    | 26 项通过                                | 61 项乘区目录与类型约束。                                                                |
| `test-crisis-hp-score-convert.mjs`         | D    | 通过                                     | 危局血量↔分数分段插值。                                                                  |
| `test-crisis-score-hp-table.mjs`           | D    | 25 项通过                                | 危局分数血量对应表。                                                                     |
| `test-damage-calc-draft.mjs`               | D    | 38 项通过                                | 伤害页草稿三态落盘。                                                                     |
| `test-damage-calc-history-stats.mjs`       | D    | 通过                                     | 方案库角色数与事件数统计。                                                               |
| `test-damage-zone-routing.mjs`             | C    | 31 项通过后中止：第 6 节缺少蕾米方案文件 | 1—5 节为 ZZZ-HP 三面板路由；Fairy 无该 UI 路由层。                                       |
| `test-defense-monster-detail.mjs`          | B    | 75 项通过                                | 防卫战怪物详情行组装与图表类别。                                                         |
| `test-defense-zone-clamp.mjs`              | A    | 21 项通过                                | 对照 29 项通过；迁移 1 条饱和边界用例。                                                  |
| `test-disorder-radiance-crit.mjs`          | A    | 61 项通过                                | 对照 5 项通过；暴击区与子类隔离已由 `static-damage.test.ts` 覆盖。                       |
| `test-effect-model.mjs`                    | B    | 22 项通过                                | EffectSpec、适配器与编译器。                                                             |
| `test-enemy-params-custom.mjs`             | B    | 9 项通过                                 | 敌方参数来源标记。                                                                       |
| `test-env-buff-cache-key.mjs`              | B    | 通过                                     | 环境 Buff 变化后的缓存签名。                                                             |
| `test-external-panel-draft.mjs`            | B    | 20 项通过                                | 面板导入草稿“空就是空”。                                                                 |
| `test-extra-gain-effect-adapt.mjs`         | B    | 24 项通过                                | 额外增益走统一适配器。                                                                   |
| `test-flow-buff-table-columns.mjs`         | B    | 33 项通过                                | 流程增益表列构建与搜索。                                                                 |
| `test-flow-calculation-detail.mjs`         | B    | 56 项通过                                | 数字、来源与展示公式同源；不依赖外部方案或服务。                                         |
| `test-formula-align-compare.mjs`           | A    | 25 项通过                                | 对照 16 项通过；迁移等级 59、完整结算与亚秒时长边界。                                    |
| `test-formula-number-format.mjs`           | B    | 24 项通过                                | 计算过程数字格式。                                                                       |
| `test-game-affix-rules.mjs`                | D    | 74 项通过                                | 游戏专用词条分配与 Beam 求解。                                                           |
| `test-hit-eval-cache.mjs`                  | B    | 35 项通过                                | 招式结算记忆表键逐字段验证。                                                             |
| `test-legacy-effect-contracts.mjs`         | C    | 33 项通过后中止：缺少叶琉千方案文件      | 需要仓库外方案库；前段为旧效果行为锁定。                                                 |
| `test-mask-close.mjs`                      | D    | 12 项通过                                | 弹窗遮罩关闭交互。                                                                       |
| `test-mode-panel-routes.mjs`               | D    | 通过                                     | 模式面板路由。                                                                           |
| `test-monster-compare.mjs`                 | B    | 25 项通过                                | 怪物数据库联表与选择器接线。                                                             |
| `test-monster-detail.mjs`                  | B    | 60 项通过                                | 怪物详情弹窗与弱点/抗性展示口径。                                                        |
| `test-monster-resistance-table.mjs`        | B    | 91 项通过                                | 抗性表、异常积蓄与类别映射。                                                             |
| `test-mult-factor-percent.mjs`             | B    | 通过（`ok`）                             | 倍率百分点归一与合成。                                                                   |
| `test-mult-factor-zone.mjs`                | A    | 25 项通过                                | 对照 3 项通过；修正乘全区已由 `static-catalog.test.ts` 覆盖，其余边界见下节。            |
| `test-nanoka-buff-draft.mjs`               | D    | 通过                                     | Nanoka 采集编辑草稿。                                                                    |
| `test-nanoka-collection-review.mjs`        | D    | 通过                                     | Nanoka 采集审核。                                                                        |
| `test-nav-scroll.mjs`                      | D    | 19 项通过                                | 侧栏导航滚动决策。                                                                       |
| `test-number-stepper.mjs`                  | D    | 36 项通过                                | 数值步进器归一。                                                                         |
| `test-pack-buff-effect-adapt.mjs`          | B    | 12 项通过                                | 音擎 / 驱动盘 / 邦布 / 场地 EffectSpec 往返。                                            |
| `test-panel-dual-source.mjs`               | B    | 52 项通过                                | 双面板来源契约。                                                                         |
| `test-panel-image-export.mjs`              | D    | 62 项通过                                | 面板图片导出；成像依赖浏览器 canvas。                                                    |
| `test-panel-pipeline-dual-run.mjs`         | B    | 18 项通过                                | 新旧面板管线双跑。                                                                       |
| `test-panel-required-for-damage.mjs`       | B    | 14 项通过                                | 无面板不出伤的必要条件。                                                                 |
| `test-panel-url-state.mjs`                 | D    | 33 项通过                                | 模式面板 URL 状态。                                                                      |
| `test-preset-buff-scope.mjs`               | B    | 16 项通过                                | 导入预设界面的增益范围。                                                                 |
| `test-preset-picker-auto-filter.mjs`       | D    | 19 项通过                                | 导入预设筛选 UI。                                                                        |
| `test-preset-picker-draft-reset.mjs`       | D    | 10 项通过                                | 导入草稿重置判定。                                                                       |
| `test-release-mult.mjs`                    | B    | 4 项通过                                 | 异放倍率按产生角色属性筛选；ZZZ-HP 面板/行级解析。                                       |
| `test-remap-imported-panel-main-combo.mjs` | B    | 通过（`ok`）                             | 导入面板换主属性。                                                                       |
| `test-row-override-extra-gain.mjs`         | D    | 10 项通过                                | 额外 Buff 的行级例外。                                                                   |
| `test-scheme-pack-merge.mjs`               | D    | 通过                                     | 方案包导出、覆盖与合并。                                                                 |
| `test-shared-scheme-pack.mjs`              | D    | 9 项通过                                 | 共用方案打包。                                                                           |
| `test-sharpen-crit.mjs`                    | A    | 44 项通过                                | 对照 8 项通过；锐暴区与锐化链已由现有测试覆盖，未重复迁移。                              |
| `test-skill-flow-damage-analysis.mjs`      | D    | 15 项通过                                | 流程伤害构成分析 UI。                                                                    |
| `test-skill-flow-damage-drilldown.mjs`     | D    | 13 项通过                                | 交叉分析与图表筛选 UI。                                                                  |
| `test-skill-flow-damage-records.mjs`       | D    | 51 项通过                                | 伤害记录兼容、快照与结构对比。                                                           |
| `test-skill-flow-hit-context.mjs`          | B    | 32 项通过                                | 招式流程命中上下文指纹。                                                                 |
| `test-skill-library-migration.mjs`         | B    | 通过                                     | 旧全局事件模式库迁移。                                                                   |
| `test-skill-match-coords.mjs`              | B    | 通过                                     | 招式类型多坐标匹配。                                                                     |
| `test-skill-talent-levels.mjs`             | B    | 40 项通过                                | 首次因临时导出缺 `zzz-hp-backend/node_modules` 中止；只读复用后重跑通过。                |

## 公式数值对照

在仓库外脚本 `/tmp/fairy-991-compare.mjs` 中，使用上游原始输入直接调用 Fairy 公开的
`regularDamageFormula`、`anomalyDamageFormula`、`sharpCriticalFactor`、`sharpenDamageFormula`、
`calculateStandardDisorderDamageMultiplier`、`anomalyCriticalFactor`、`calculateTargetEffectiveDefense`
与 `defenseFactor`。脚本只绕开 `package-version.ts` 的构建期常量，不改变被调用公式。

| 上游脚本                          | 上游断言数 | Fairy 对照项 | 结果        | 覆盖内容                                                             |
| --------------------------------- | ---------: | -----------: | ----------- | -------------------------------------------------------------------- |
| `test-formula-align-compare.mjs`  |         25 |           16 | 16 通过     | 等级 59/60、亚秒有效时长、直伤/异常完整链、路径易伤。                |
| `test-defense-zone-clamp.mjs`     |         21 |           29 | 29 通过     | 9 个固定穿透档位的有效防御与防御区、饱和边界、百分比穿透与无视防御。 |
| `test-sharpen-crit.mjs`           |         44 |            8 | 8 通过      | 锐暴区 2.5 / 3.8125 / 6.25、锐化完整链、锐化增伤只生效一次。         |
| `test-mult-factor-zone.mjs`       |         25 |            3 | 3 通过      | 冰紊乱倍率区 5.175、修正作用于全区 7.7625、不作用于基础分量。        |
| `test-disorder-radiance-crit.mjs` |         61 |            5 | 5 通过      | 异常暴击区 1 / 1.5、期望组合、暴伤上限。                             |
| 合计                              |        176 |           61 | **61 通过** | 不计入缓存、UI、优化器、方案包与外部方案断言。                       |

其中冰 9.8 秒的紊乱倍率 5.175 是上游直接断言的倍率（`test-formula-align-compare.mjs:242`）；
火 9.8 秒的 14、以太 10 秒的 17、物理 10.2 秒的 5.25 是按 Fairy 补偿模型推导的对照值，
上游对应位置只断言有效时长 19 / 20 / 10（`:44-47`、`:259-261`）。

## 迁移清单

本轮新增 5 条测试，包含 15 条数值断言；全部注明上游文件与行号，版本均为
`991bb0ef2a00387f8a1fa18293bbda17256d7270`。

| Fairy 测试                                                                                                                                             | 上游依据                                                                   | 性质 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ---- |
| [`zzz-hp-991bb0e-formula-backport.test.ts`](../../packages/core/test/zzz-hp-991bb0e-formula-backport.test.ts)：失衡期直伤/异常完整结算                 | `zzz-hp/scripts/test-formula-align-compare.mjs:90-206`                     | 迁移 |
| 同上：固定穿透 953（`:39-46`）/ 2859（`:59-69`）的防御区饱和与相等；`toBe(0)` 为 Fairy 钳制推导值（上游只断言 ≥ 0）                                    | `zzz-hp/scripts/test-defense-zone-clamp.mjs:39-46`、`:59-69`               | 迁移 |
| [`anomaly-damage.test.ts`](../../packages/core/test/anomaly-damage.test.ts)：火 9.8 秒的 19 个半秒补偿段（14 为推导值）；冰 9.8 秒 → 5.175（上游原值） | `zzz-hp/scripts/test-formula-align-compare.mjs:45`、`:259-261`、`:240-242` | 迁移 |
| [`anomaly-damage-level.test.ts`](../../packages/core/test/anomaly-damage-level.test.ts)：59 级倍率截断                                                 | `zzz-hp/scripts/test-formula-align-compare.mjs:36-37`                      | 迁移 |

具体断言：

- 直伤：攻击 3000、增伤 50%、暴率 50% / 暴伤 100%、防御 794、易伤 1.35、失衡 1.9，非暴击 5771.25、
  暴击 11542.5、期望 8656.875，取整 `8657`。
- 异常：同一面板下使用精通 300、异常倍率区 5、异常等级 60、易伤 1.6，失衡期望 205200；
  非失衡失衡区 1.25，期望 135000。
- 防御：敌防 953，固定穿透 953 与 `953 × 3 = 2859` 均使有效防御为 0，防御区同为 1；上游只对有效防御断言 ≥ 0，
  0 是 Fairy 整体钳制后的推导值。该结果与“只对乘算部分取 max”的旧错误不同。
- 紊乱时长：火 9.8 秒对应上游断言的有效时长 `floor(9.8 / 0.5) = 19`；Fairy 测试断言其补偿模型推导值 `4.5 + 19 × 0.5 = 14`，
  并注明 14 不是上游直接断言的倍率。冰 9.8 秒的倍率 5.175 是上游直接断言值（`:240-242`）。
- 等级倍率：59 级截断为 `1.983`，不是四舍五入的 `1.9831`。

## 已覆盖但未重复迁移

以下上游数值在 Fairy 现有测试中已有同口径断言，本轮只做对照，不重复新增：

| 上游场景                                        | Fairy 现有覆盖                                                                                                    |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 锐暴区、溢出层、非锐化路径与锐化增伤            | `packages/core/test/sharp-critical.test.ts:44-120`、`packages/core/test/effects/static-damage.test.ts:1507-1592`  |
| 紊乱 / 耀变暴击子类与旧异常暴击回退             | `packages/core/test/effects/static-damage.test.ts:369-469`、`:572-713`                                            |
| 紊乱倍率修正作用于完整准备区                    | `packages/core/test/effects/static-catalog.test.ts:245-269`（#268 迁移）                                          |
| Sunna、Cissia、血髓秘匣、青衣、卢西娅的转模曲线 | `packages/core/test/effects/static-catalog-data.test.ts:341-522`、`:7656-7708`                                    |
| 异常等级 60、常见紊乱时长档位                   | `packages/core/test/anomaly-damage-level.test.ts`、`packages/core/test/zzz-calculator-comparison.test.ts:242-276` |

## 跨实现差异与未覆盖边界

以下项目没有迁移为相等断言。第 1–10 条属于 ZZZ-HP 应用层能力或测试可复现性边界，不是 Fairy 缺陷；第 11 条已在后续修复 PR 中处理并补充回归，第 12 条仍是 Fairy 的输入域边界。

1. **仓库外方案库**：`test-buff-build-parity`、`test-damage-zone-routing` 第 6 节、`test-legacy-effect-contracts`
   依赖 `ZZZ_SCHEME_FILE` / `ZZZ_DEV_ROOT` 指向的方案 JSON。干净导出下分别中止；没有为运行它们伪造方案文件。
   这是测试可复现性限制，不是计算错误。
2. **无视防御与减防上限**：ZZZ-HP `computeDefenseZone` 把无视防御与减防各夹到 100%
   （[`damageCalc.ts:319-320`](https://github.com/Nie7bai/ZZZ-HP/blob/991bb0ef2a00387f8a1fa18293bbda17256d7270/zzz-hp/src/utils/damageCalc.ts#L319-L320)）。
   Fairy `calculateTargetEffectiveDefense` 不施加上游逐项的无视防御/减防 100% UI 上限；防御调整倍率与
   最终有效防御的非负钳制见第 11 条与[防御区规范](../specs/core/factors/defense.md#目标有效防御)。上游当前用例都在界内，因此不影响对照。
3. **命破防御区**：上游 `isMb` 路径把防御区固定为 1。Fairy 静态公式不建模“命破主控”这一 UI 状态，
   未迁移该分支。
4. **通用乱流倍率**：`test-mult-factor-zone` 第 5、6 节使用通用 `turbulenceBaseMult = 12.5` 与 7.5%/秒补偿，
   并允许面板/招式修正乘全区。Fairy 的乱流公开接口是按元素档位的 standard-vortex 倍率
   （`frost`、`assault`、`burn`、`shock`、`corruption`、`frostbite`），没有通用乱流基础值与修正通道。
   两者不能互相代入，未迁移。
5. **招式小类紊乱基础倍率与手填最终倍率区**：上游第 3、4 节允许小类把紊乱基础从 4.5 提到 6，或直接手填 5
   再乘 1.2。Fairy 的 `standard-disorder` 基础倍率由原异常属性固定，没有单招式基础倍率覆盖参数；
   这属于 ZZZ-HP 技能栏/面板组合语义，未迁移。
6. **紊乱/耀变暴击率超过 100%**：上游注释写“critRate 不 clamp”，期望为 `preCrit × (1 + 率 × 爆伤)`；
   Fairy 在期望组合处把有效暴击率夹到 `[0, 1]`
   （[`static-damage.ts:1185`](../../packages/core/src/effects/internal/static-damage.ts#L1185)）。上游普通暴击区
   本身也把暴击率夹到 `[0, 1]`（`damageCalc.ts:476`），只有异常类子区未夹（`damageCalc.ts:755-772`），
   因此 Fairy 行为与上游普通直伤暴击区一致。上游当前 61 项只使用 0%、50%、100%，没有实际触发该差异；
   登记为边界差异，不据此改写断言。
7. **耀嘉音 2 影转模曲线**：`test-buff-conversions` 的 `[0, -1200]`、`[2000, 580]`、`[3428.56, 1599.996]` 等值
   是 ZZZ-HP 的原始曲线；Fairy 保留已验收的具名修正 `astra-mindscape-2`
   （见[耀嘉音 2 影的具名差异](../specs/effects/examples.md#zzz-hp-的参考边界)与 `static-catalog.json` 的 `differences`）。
   不把上游原始曲线当作相等期望。
8. **异放倍率解析与技能等级上下限**：`test-release-mult` 与 `test-skill-talent-levels` 验证的是 ZZZ-HP
   面板解析、行级过滤、影画对应的技能等级上下限和导入脚本 helper。Fairy 的异放倍率由静态规则/技能系数表达，
   没有同名 UI 字段；`991bb0e` 新增的异放等级缩放（225 + 20 × (L − 1)，14 级 485）也没有直接对应的公开公式输入，
   未迁移。
9. **流程行级 override 与分组等价**：`test-buff-row-e2e`、`test-buff-row-override`、
   `test-buff-group-equivalence` 等依赖 ZZZ-HP 的 `groupId`、`buffOverride`、流程行模型；Fairy 没有这些概念。
10. **优化器、方案包、路由与后端并发**：`test-affix-optimizer`、`test-affix-sweep-caps`、`test-game-affix-rules`、
    `test-scheme-pack-merge`、`test-shared-scheme-pack`、`test-mode-panel-routes`、`test-agent-save-stale` 等
    属于应用层能力，未纳入公式迁移。
11. **防御百分比调整为负时的单调性（已修复）**：`calculateTargetEffectiveDefense` 曾没有把
    `(1 + 防御百分比调整)` 夹到 ≥ 0，导致敌防 953、`defensePercentageAdjustments: [-1.2]`、
    `penetrationRatios: [1.2]` 时两个负因子相乘、有效防御为 `38.12`，增加减防反而让防御区变差。
    现已按[目标有效防御规范](../specs/core/factors/defense.md#目标有效防御)在乘算穿透倍率前把防御
    调整倍率钳制到不低于 `0`，并在钳制前检查有限性；最终非负钳制保持不变。回归见
    `packages/core/test/defense.test.ts` 的负调整倍率与单调性用例。
    上游 `damageCalc.ts:312-335` 先把穿透率夹到 `[0, 0.95]`、减防与无视防御各夹到 `[0, 1]`，
    再计算 `max(0, 1 − ignore − reduce) × (1 − penRate)`，因此不会出现双负相乘。
    穿透率缺少 95% 上限仍是第 12 条差异。
12. **Fairy 穿透率没有 95% 上限**：Fairy 的 `penetrationRatios` 不夹到 `0.95`。敌防 953、
    只给 `penetrationRatios: [1.2]` 时有效防御为 `0`、防御区为 `1`；上游 `damageCalc.ts:312-335`
    将穿透率夹到 `0.95`，同一输入得到 `953 × 0.05 = 47.65`、防御区约 `0.943`。
    这是与第 11 条独立的输入域差异；用户裁定暂不修改，待取得游戏依据后再定。
    本轮不修改生产代码、不加断言。

## 验证记录

上游执行：

- 78 个脚本全部枚举并执行；75 个退出码为 0，3 个因缺少仓库外方案文件中止。
- 中断前的部分通过：`test-damage-zone-routing` 31 项、`test-legacy-effect-contracts` 33 项。
- 逐脚本日志、退出码与耗时保存在 `/tmp/fairy-zzzhp-991bb0e-results/`；导出树为
  `/tmp/fairy-zzzhp-991bb0e-UtWRAK`。两者均为仓库外临时产物，不进入 Git、构建或 CI。

Fairy 对照与回归：

- 公式对照：61 项通过，0 项失败（`/tmp/fairy-991-compare.mjs`）。
- 定向测试：`pnpm --filter @randomplay/core exec vitest run test/zzz-hp-991bb0e-formula-backport.test.ts test/anomaly-damage.test.ts test/anomaly-damage-level.test.ts`
  通过，3 个文件、134 项。
- `pnpm --filter @randomplay/core typecheck` 通过（先执行 `pnpm --filter @randomplay/core build` 生成 `dist`）。
- `pnpm check`：通过。core 99 个文件、5683 项通过（另 3 个文件、24 项 skipped）；data 110 个文件、4755 项通过；
  打包消费验收 2 项通过；lint、format 与 spec-types 检查均通过。该结果来自本轮审查修复前的同一套测试文件；
  第 1 轮审查修复只调整测试断言与文档，未改生产代码或数据，因此复用该结果，并重新运行定向测试与格式检查。
- `pnpm format:check`：独立复跑通过（2922 个文件）。

第 1 轮审查修复（覆盖 `198a8407`）：

- 时长用例只保留火 9.8 秒样本，并注明 14 是 Fairy 补偿模型推导值、上游只断言有效时长 19。
- 防御用例改用上游实际比较的 953 与 `953 × 3 = 2859`，并断言两个穿透值的防御区相等。
- 修正 `zzz-calculator-comparison.test.ts` 与 `effects/` 下测试文件的路径和行号。
- 登记 `calculateTargetEffectiveDefense` 在负防御百分比调整下的单调性边界，未改代码、未加断言。

第 2 轮审查修复（覆盖 `4850152d`）：

- 恢复冰 9.8 秒 → 5.175 的上游直接断言，引用 `test-formula-align-compare.mjs:240-242`。
- 防御用例拆开 953 与 2859 的引用，并注明 `toBe(0)` 是 Fairy 钳制推导值、上游只断言 ≥ 0。
- “已覆盖”表的行号边界逐条对齐到 `it` 块起止。
- 第 11 条改为直接陈述事实与上游 `damageCalc.ts:312-335` 依据；新增第 12 条独立登记穿透率缺少 95% 上限。

## 复现

```sh
tmp=$(mktemp -d)
git -C /path/to/ZZZ-HP archive 991bb0ef2a00387f8a1fa18293bbda17256d7270 | tar -x -C "$tmp"
ln -s /path/to/ZZZ-HP/zzz-hp/node_modules "$tmp/zzz-hp/node_modules"
ln -s /path/to/ZZZ-HP/zzz-hp-backend/node_modules "$tmp/zzz-hp-backend/node_modules"
cd "$tmp/zzz-hp"
./node_modules/.bin/vite-node scripts/test-formula-align-compare.mjs
```

一次性对照脚本不进入仓库；迁移后的回归只依赖 Fairy 内快照与公开公式，普通测试离线运行。

## 未修改内容

- 未修改生产代码、`definitions`、`integrated`、数据管理状态、版本号或 CI 结构。
- 未修改 `docs/HISTORY.md`。
