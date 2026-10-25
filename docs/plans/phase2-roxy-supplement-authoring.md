# Phase 2 P2-4g：洛克茜补充选项

- 状态：已实现；基线 `origin/main @ a9eeeaa4`（P2-4f #314 已合并）。
- 分支：`data/p2-4g-roxy-supplements`。
- 范围：把洛克茜 8 条单规则、单变体补充选项纳入 authoring；不改 converter、
  正式 effects 制品、`integrated`、`dist`、`snapshotId`、publication/manifests、
  公开 exports 或 core/shared 运行时。

## 1. 目标

P2-4f 完成后剩余 13 条 integrated 补充记录。洛克茜占 9 条，其中 8 条可直接用现有
authoring operation 表达；本批同时扩展两个 factor channel：

- `target-resistance-reduction`（影画 1 命中后减抗）
- `stun-damage-adjustment`（影画 2 与额外能力的失衡易伤）

第 9 条 `initial-energy-regen-conversion` 是一个变体下两条规则；需要单独设计通用
多规则分组，本批不迁移。

## 2. 覆盖

| 项               | 本批前 | 本批后 |
| ---------------- | -----: | -----: |
| authoring 记录   |     85 |     93 |
| option groups    |     76 |     84 |
| 已作者化补充记录 |  55/68 |  63/68 |
| 剩余 integrated  |     13 |      5 |
| out-of-scope     |     33 |     33 |

8 条记录全部是单规则、单变体、`converted`、无目录机制、无 coverage 位置：

- 2 条新增 channel 的 `factor-contribution`：减抗与失衡易伤。
- 3 条既有 `factor-contribution`：终结技增伤、风抗忽视。
- 3 条 `stat-adjustment`：暴伤与风伤锐暴伤。

## 3. 实现

- [`roxy-supplement-records.ts`](../../packages/data/scripts/static-effects/authoring/roxy-supplement-records.ts)
  新增 8 条单规则作者记录。
- [`roxy-supplement-source-records.ts`](../../packages/data/scripts/static-effects/authoring/roxy-supplement-source-records.ts)
  新增 8 条 `AuthoringSupplementalRecord`，值逐字段复制 `static-coverage.json`。
- [`types.ts`](../../packages/data/scripts/static-effects/authoring/types.ts)
  的 `AUTHORING_FACTOR_CHANNELS` 增加上述两个 channel；共用
  `FactorChannelUnitMap` 的 ratio / multiplier 单位。
- 两条核心风伤暴伤选项保留 `uniqueness`、exclusiveGroup、外部暴击率输入与职业
  分流条件。

## 4. 验证

| 入口                                                              | 结果                                                                                                                  |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @randomplay/data authoring:verify`                 | 93 records、84 options、24 coverage positions、19 skill targets、**63 supplemental records**；0 differences、字节一致 |
| 定向 `static-effects-authoring` 测试                              | 3 个文件、52 个测试通过                                                                                               |
| `pnpm --filter @randomplay/data typecheck`                        | 通过                                                                                                                  |
| `pnpm --filter @randomplay/data check:source`                     | 通过（108 files、4,723 tests）                                                                                        |
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

剩余 5 条 integrated：

- 洛克茜 `initial-energy-regen-conversion` 1 条：一个变体下两条 stat 规则，需要
  通用多规则分组。
- 露西 2 条、爱丽丝 1 条、叶瞬光 1 条：需要扩展 `AuthoringOperation` 支持专用结算。

33 条 out-of-scope 记录带 `reason`，作者层仍不表达该字段，继续由 converter 维护。

## 6. 明确不改

`packages/data/scripts/static-effects/convert.ts`、`packages/data/definitions/effects/*`、
`packages/data/integrated/*`、`packages/data/dist/*`、`snapshotId`、publication/manifests、
公开 exports 与 core/shared 运行时均保持原样。

## 7. 后续状态

[P2-4h](phase2-multi-rule-supplement-authoring.md) 已把洛克茜
`initial-energy-regen-conversion` 纳入 authoring。当前已作者化补充记录为 64/68 条；
剩余 4 条 integrated 记录仍缺专用 operation，33 条 out-of-scope 记录仍由 converter
维护。本页的“剩余 5 条”保留 P2-4g 当时事实。
