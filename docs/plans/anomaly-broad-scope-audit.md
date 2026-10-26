# 宽口径异常增伤审计

日期：2026-10-26

状态：已随静态 effects revision `55` 实施。

## 背景

修订 54 只修正了维琳娜 M0/M2/M6 的 `anomalyDmgBonus` 与
`turbulenceDmgBonus` 重复计入。991bb0e 升级审计留下的开放问题是：
Fairy 的 `anomalyDmgBonus` / `anomalyCritRate` / `anomalyCritDmg`
宽映射覆盖普通异常、异放、乱流与耀变（暴击通道不含耀变），
但同一实体或同一块 note 可能只指向其中一个子类。本次逐项核对
ZZZ-HP `991bb0e` 块 note 与 Nanoka `3.3.12+19634983` 中英文，
把只指向单一子类的记录收窄。

## 裁定

| 实体/记录                                                                        | 原文范围                                            | 修正前                                                                    | 裁定                                                                    |
| -------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 格莉丝 M0 `eff-ms4o80e9-lgnv30`                                                  | 目标受到的[感电]伤害 18%，最多 2 层                 | `anomalyDmgBonus` 命中异常/异放/乱流/耀变                                 | 收窄为 `anomaly`（普通电属性异常）；层数与数值不变                      |
| 薇薇安 M0 `legacy-team-anomalyDmgBonus`                                          | 全队[侵蚀]伤害 12%                                  | 宽映射命中异常/异放/乱流/耀变                                             | 收窄为 `anomaly`（普通以太异常）；[紊乱]由独立 `disorderDmgBonus` 承担  |
| 爱丽丝 M2 `legacy-team-anomalyDmgBonus`                                          | 全队[强击]伤害 15%                                  | 宽映射命中异常/异放/乱流/耀变                                             | 收窄为 `anomaly`（普通物理异常）；[紊乱]由独立 `disorderDmgBonus` 承担  |
| 简核心被动 `eff-ms34bcgu-8f1m63` / `eff-ms34c40c-3b3j3z` / `eff-ms34ci0p-usidux` | [强击]伤害的 40% 暴击率、50% 暴伤、异常精通转暴击率 | `anomalyCritRate`/`anomalyCritDmg` 命中异常/异放/乱流                     | 收窄为 `anomaly`；转化表达式与数值不变                                  |
| 简潜能 `eff-ms34gorp-xrbl8x`                                                     | [强击]暴伤 10/15/20/25/30%                          | 潜能档位记录仍命中异常/异放/乱流                                          | 收窄为 `anomaly`；通过 `potential-level.damageKindScope` 与档位参数组合 |
| 简 M2 `legacy-team-anomalyCritDmg`                                               | [强击]暴伤额外 50%                                  | 宽映射命中异常/异放/乱流                                                  | 收窄为 `anomaly`                                                        |
| 琳琅鎏心（14156）精炼 1—5 `legacy-self-anomalyDmgBonus`                          | [乱流]和[风化]伤害每层 7/8/9/10/11%，最多 2 层      | 宽映射命中异常/异放/乱流/耀变；与同块 `turbulenceDmgBonus` 在乱流命中重复 | 收窄为 `anomaly`（风化）；[乱流]只由 `turbulenceDmgBonus` 承担          |

同一实体上仍保留宽口径、且原文确实写“所有属性异常伤害”的记录不纳入本批，
例如简 M4 18%、薇薇安 M1 16%、柚叶、蕾米埃尔、奇巧零食四件套、
灵魂摇滚四件套、壳中之灵与 14158 音擎。菲欧妮的宽口径与子类记录目前全部为
`semantic-conflict`，不产生贡献，暂不需要收窄。

## 证据

- 格莉丝：Nanoka `agents/1181/details.zh.json` 与 `details.en.json` 的
  `/passive/level/1181501/desc/1`；固定源
  `/agents/29/mindscapeBuffs/0/effectBlocks/1/effects/0`。
- 薇薇安：Nanoka `agents/1331` 的 `/passive/level/1331501/desc/1`；固定源
  `/agents/54/mindscapeBuffs/0/effectBlocks/0/effects/0`。
- 爱丽丝：Nanoka `agents/1401` 的 `/talent/2/desc`；固定源
  `/agents/38/mindscapeBuffs/2/effectBlocks/0/effects/0`。
- 简：Nanoka `agents/1261` 的 `/passive/level/1261507/desc/0` 与
  `/talent/2/desc`；固定源
  `/agents/44/mindscapeBuffs/0/effectBlocks/1/effects/1`、`/effects/4`、
  `/effects/7`、`/agents/44/mindscapeBuffs/0/effectBlocks/2/effects/0` 与
  `/agents/44/mindscapeBuffs/2/effectBlocks/0/effects/1`。
- 琳琅鎏心：Nanoka `w-engines/14156/details.zh.json` 与 `details.en.json`
  的 `/talents/1/desc`、`/talents/5/desc`；固定源
  `/wengines/74/refinementBuffs/0—4/effectBlocks/0/effects/1`。

## 实现

- 沿用 `damage-kind-scope-correction`，登记 raw/normalized 编码、完整块 note、
  全局映射当前伤害种类与收窄后的伤害种类；任一漂移拒绝生成。
- 新增 5 个具名差异：
  `grace-anomaly-damage-kind-scope`、`vivian-m0-anomaly-damage-kind-scope`、
  `alice-anomaly-damage-kind-scope`、`jane-anomaly-critical-kind-scope`、
  `joyau-dore-anomaly-damage-kind-scope`。
- `potential-level` 新增可选 `damageKindScope`，只用于简的潜能暴伤记录；
  档位参数先应用，再收窄 `hit.damageKind`，不改变潜能门槛或数值。
- 保留全部公开 `optionId`/`effectId`、数值、通道、潜能/精炼档位与层数上限。
- 爱丽丝/简新增的 `turbulenceDmgBonus`、`anomalyReleaseDmgBonus`、
  `turbulenceCrit*`、`anomalyReleaseCrit*` 记录继续为 `semantic-conflict`，
  不生成贡献。

## 制品变化

- coverage：1,162 converted / 121 corrected / 92 unsupported
  → 1,150 converted / 133 corrected / 92 unsupported。
- catalog 变体：1,230 converted / 127 corrected / 126 unsupported
  → 1,218 converted / 139 corrected / 126 unsupported。
- 规则 931、选项 1,002、实体 196、pack 1,118 与原始效果 1,375 均不变。
- 12 个来源位置从 converted 变为 corrected；没有公开 ID 删除。

## 验证

```sh
pnpm --filter @randomplay/data generate:static-effects /path/to/ZZZ-HP-991bb0e /tmp/out
pnpm --filter @randomplay/data authoring:verify
pnpm --filter @randomplay/core exec vitest run test/effects/static-catalog-data.test.ts
pnpm --filter @randomplay/data test
pnpm check
pnpm --filter @randomplay/data verify:artifact-dependencies
pnpm --filter @randomplay/data audit:data-identity
pnpm --filter @randomplay/data verify:nanoka:current integrated
```

负例位于 `packages/core/test/effects/static-catalog-data.test.ts`：

- 简的 40%/50% 暴击只作用于 `anomaly`，异放/乱流/紊乱不生效。
- 爱丽丝 M2 15% 只作用于 `anomaly`，异放/乱流不生效。
- 格莉丝/薇薇安命名异常增伤只在 `anomaly` 生效；薇薇安的 12% 不进入异放结算。
- 简潜能暴伤只作用于 `anomaly`。
- 琳琅鎏心宽口径单独在乱流不生效；与乱流记录同时选择时只计 7% 一次。

## 数据管理

本批只改 Git 跟踪的静态 effects 制品、技能清单摘要、测试与文档，不改 Nanoka
整合规则、来源版本或 `packages/data/integrated`。主工作区仍需执行
`pnpm --filter @randomplay/data verify:nanoka:current integrated` 并按
[来源数据整合规范](../specs/data/integration.md#数据管理状态的同步维护)复核管理状态。

## 单独发现（已由修订 56 修正）

- `w-engine:14147`（怒目金刚）精炼 2 的固定源
  `/wengines/42/refinementBuffs/1/effectBlocks/0/effects/1` 的块 note 写
  “火属性贯穿伤害提升 10.35%”，但 `stat` 被上游写成
  `turbulenceDmgBonus`；精炼 1/3/4/5 同位置均为 `pierceDmgBonus`。
  该来源 stat 修正已单独落地为修订 56，详见
  [怒目金刚精炼 2 贯穿伤害修正](wrathful-vajra-r2-sheer-correction.md)；
  本页保留发现记录，不回写该批次的 converted/corrected 计数。

## 回退

- 回退本批即恢复 revision 54 的宽口径行为；三制品、技能清单摘要与测试一并回退。
- 若语义守卫拒绝生成，先确认是编码或块 note 漂移，还是全局伤害种类映射变化；
  禁止放宽守卫来跑通。
