# Phase 2 P2-4d：音擎补充选项批量作者化

- 状态：已合并 #312（squash merge `6163ac8d`）；基线 `origin/main @ 6c2177b3`（P2-4c #311 已合并）。
- 分支：`data/p2-4d-supplement-options`。
- 范围：把 16 条仅有补充来源的音擎选项纳入 authoring；不改 converter、正式
  effects 制品、`integrated`、`dist`、`snapshotId`、publication/manifests、公开
  exports 或 core/shared 运行时。

## 1. 目标

P2-4c 只迁移了已有作者选项的补充记录；剩余 44 条 integrated 补充记录中有 16 条
属于音擎，且这些选项的规则可由现有 authoring 能力直接表达。本批补齐这 16 个
选项和规则，使所有音擎 integrated 补充记录进入作者层。

## 2. 覆盖

| 项               | 本批前 | 本批后 |
| ---------------- | -----: | -----: |
| authoring 记录   |     49 |     65 |
| option groups    |     45 |     61 |
| 已作者化补充记录 |  24/68 |  40/68 |
| 剩余 integrated  |     44 |     28 |
| out-of-scope     |     33 |     33 |

16 条记录全部是单规则、单变体、`converted`、无目录机制、无 coverage 位置：

- 13 条 `stat-adjustment`：防御、冲击力、暴击率等。
- 3 条 `factor-contribution`：2 条 `damage-bonus`，1 条
  `attacker-resistance-ignore`。
- 涉及 13 个音擎实体；索魂影眸拆成 3 个互斥魂锁档位，绯月银棺包含暴击率与风抗
  忽视两个独立选项。

剩余 28 条 integrated 都属于代理人或驱动盘；其中洛克茜的减抗/失衡易伤需要新增
factor channel，露西、爱丽丝与叶瞬光使用尚不在 authoring operation 封闭联合中的
专用结算。这些留给后续批次，不在本批扩大作者操作类型。

## 3. 实现

- [`w-engine-records.ts`](../../packages/data/scripts/static-effects/authoring/w-engine-records.ts)
  新增 16 条单规则作者记录，规则、选项和变体逐字段来自 revision 52。
- [`w-engine-supplement-records.ts`](../../packages/data/scripts/static-effects/authoring/w-engine-supplement-records.ts)
  新增 16 条 `AuthoringSupplementalRecord`，值逐字段复制
  `static-coverage.json`，键序与基线条目一致。
- [`records.ts`](../../packages/data/scripts/static-effects/authoring/records.ts)
  把 `P2_4D_W_ENGINE_AUTHORING_RECORDS` 并入正式作者记录。
- 编译仍按 `supplementId` 原位替换；规则与目录变体由既有 authoring 编译器生成。

## 4. 验证

| 入口                                                              | 结果                                                                                                                  |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @randomplay/data authoring:verify`                 | 65 records、61 options、19 coverage positions、19 skill targets、**40 supplemental records**；0 differences、字节一致 |
| 定向 `static-effects-authoring` 测试                              | 3 个文件、50 个测试通过                                                                                               |
| `pnpm --filter @randomplay/data typecheck`                        | 通过                                                                                                                  |
| `pnpm --filter @randomplay/data check:source`                     | 通过（108 files、4,721 tests）                                                                                        |
| `pnpm --filter @randomplay/core check:source`                     | 通过（98 files、5,696 passed、24 skipped）                                                                            |
| `pnpm check:quality`                                              | 通过                                                                                                                  |
| `pnpm --filter @randomplay/data verify:pack`                      | 通过                                                                                                                  |
| `pnpm --filter @randomplay/data verify:nanoka:current integrated` | 通过，`phase: idle`；`indexSha256` 与实际索引一致                                                                     |

三制品摘要保持：

| 制品                   | SHA-256                                                            |
| ---------------------- | ------------------------------------------------------------------ |
| `static.json`          | `94466666e043a2b1ae8f803b4cbb9bc815c958e2113d57f13f81686411771922` |
| `static-catalog.json`  | `58bc6f51fbf3ca999da80df7d953cbbd282bf92ecc2a3e61362567b2a5ed3e14` |
| `static-coverage.json` | `978b5e99b58a2b6be218c555d14b2db5b52359c24caaf469540d5c286d341e54` |

## 5. 剩余范围

- 28 条 integrated 补充记录仍缺作者选项：洛克茜 9 条、露西 2 条、爱丽丝 1 条、
  叶瞬光 1 条、猫又 2 条、其余代理人及驱动盘 13 条。
- 33 条 out-of-scope 记录带 `reason`，作者层仍不表达该字段，继续由 converter 维护。
- 后续批次若要覆盖洛克茜的 `target-resistance-reduction`、
  `stun-damage-adjustment`，或露西/爱丽丝/叶瞬光的专用结算，需要单独扩展
  `AUTHORING_FACTOR_CHANNELS` / `AuthoringOperation` 并补负例。

## 6. 明确不改

`packages/data/scripts/static-effects/convert.ts`、`packages/data/definitions/effects/*`、
`packages/data/integrated/*`、`packages/data/dist/*`、`snapshotId`、publication/manifests、
公开 exports 与 core/shared 运行时均保持原样。

## 7. 后续状态

[P2-4e](phase2-agent-supplement-authoring.md) 已把 10 条单变体代理人/驱动盘选项纳入
authoring，[P2-4f](phase2-multi-variant-supplement-authoring.md) 又纳入 5 个多 variant
选项，[P2-4g](phase2-roxy-supplement-authoring.md) 又纳入 8 条洛克茜单规则选项，
[P2-4h](phase2-multi-rule-supplement-authoring.md) 又纳入洛克茜初始回能转化，
[P2-4i](phase2-special-operation-supplement-authoring.md) 又补齐最后 4 条专用结算。
**integrated 补充记录已达到 68/68 全部作者化**；33 条 out-of-scope 记录仍由 converter
维护。本页的“剩余 28 条”保留 P2-4d 当时事实。
