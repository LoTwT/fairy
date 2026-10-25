# Phase 2 P2-4e：单变体代理人/驱动盘补充选项

- 状态：已实现；基线 `origin/main @ 6163ac8d`（P2-4d #312 已合并）。
- 分支：`data/p2-4e-agent-supplement-options`。
- 范围：把 10 条单变体、仅有补充来源的代理人/驱动盘选项纳入 authoring；
  不改 converter、正式 effects 制品、`integrated`、`dist`、`snapshotId`、
  publication/manifests、公开 exports 或 core/shared 运行时。

## 1. 目标

P2-4d 完成后仍有 28 条 integrated 补充记录缺少作者选项。其中 10 条是单规则、
单变体的代理人或驱动盘选项，可使用现有 authoring 能力直接表达：

- 9 条 `stat-adjustment`：暴击伤害、冲击力、穿透率、能量回复。
- 1 条 `factor-contribution`：珂蕾妲强化普攻二段的 `damage-bonus`。
- 9 个代理人选项 + 1 个驱动盘选项。

猫又、艾莲、悠真的 5 条多 variant 选项，洛克茜的 9 条需要新增 factor channel 的
选项，以及露西/爱丽丝/叶瞬光的 4 条专用结算，留给后续批次。

## 2. 覆盖

| 项               | 本批前 | 本批后 |
| ---------------- | -----: | -----: |
| authoring 记录   |     65 |     75 |
| option groups    |     61 |     71 |
| 已作者化补充记录 |  40/68 |  50/68 |
| 剩余 integrated  |     28 |     18 |
| out-of-scope     |     33 |     33 |

10 条记录全部是单规则、单变体、`converted`、无目录机制、无 coverage 位置。

## 3. 实现

- [`agent-supplement-records.ts`](../../packages/data/scripts/static-effects/authoring/agent-supplement-records.ts)
  新增 10 条单规则作者记录，规则、选项和变体逐字段来自 revision 52。
- [`agent-supplement-source-records.ts`](../../packages/data/scripts/static-effects/authoring/agent-supplement-source-records.ts)
  新增 10 条 `AuthoringSupplementalRecord`，值逐字段复制
  `static-coverage.json`，键序与基线条目一致。
- [`records.ts`](../../packages/data/scripts/static-effects/authoring/records.ts)
  把 `P2_4E_AGENT_AUTHORING_RECORDS` 并入正式作者记录。
- 修正 authoring effectId 前缀校验：`drive-disc` identity 的正式前缀是 `disc`，
  不再错误要求 `drive-disc:`；新增正例/负例覆盖。

## 4. 验证

| 入口                                                              | 结果                                                                                                                  |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @randomplay/data authoring:verify`                 | 75 records、71 options、19 coverage positions、19 skill targets、**50 supplemental records**；0 differences、字节一致 |
| 定向 `static-effects-authoring` 测试                              | 3 个文件、51 个测试通过                                                                                               |
| `pnpm --filter @randomplay/data typecheck`                        | 通过                                                                                                                  |
| `pnpm --filter @randomplay/data check:source`                     | 通过（108 files、4,722 tests）                                                                                        |
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

剩余 18 条 integrated 补充记录：

- 猫又 2 条、艾莲 1 条、悠真 2 条多 variant 选项。
- 洛克茜 9 条；其中 2 条减抗/失衡易伤需要新增 factor channel。
- 露西 2 条、爱丽丝 1 条、叶瞬光 1 条使用尚不在 authoring operation 封闭联合中的
  专用结算。

33 条 out-of-scope 记录带 `reason`，作者层仍不表达该字段，继续由 converter 维护。

## 6. 明确不改

`packages/data/scripts/static-effects/convert.ts`、`packages/data/definitions/effects/*`、
`packages/data/integrated/*`、`packages/data/dist/*`、`snapshotId`、publication/manifests、
公开 exports 与 core/shared 运行时均保持原样。

## 7. 后续状态

[P2-4f](phase2-multi-variant-supplement-authoring.md) 已把 5 个 corrected/converted
双 variant 选项纳入 authoring，[P2-4g](phase2-roxy-supplement-authoring.md) 又纳入
8 条洛克茜单规则选项。当前已作者化补充记录为 63/68 条；剩余 5 条 integrated
记录仍缺作者选项，33 条 out-of-scope 记录仍由 converter 维护。本页的“剩余 18 条”
保留 P2-4e 当时事实。
