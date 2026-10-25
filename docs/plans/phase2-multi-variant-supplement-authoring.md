# Phase 2 P2-4f：多 variant 补充选项

- 状态：已合并 #314（squash merge `a9eeeaa4`）；基线 `origin/main @ b20de333`（P2-4e #313 已合并）。
- 分支：`data/p2-4f-multi-variant-supplements`。
- 范围：把 5 个 corrected/converted 双 variant 选项纳入 authoring；不改 converter、
  正式 effects 制品、`integrated`、`dist`、`snapshotId`、publication/manifests、
  公开 exports 或 core/shared 运行时。

## 1. 目标

剩余 18 条 integrated 补充记录中有 5 个选项同时包含：

- 一条 `corrected` 固定来源规则，带 `potential-branch-gate` 差异与一个 coverage 位置；
- 一条 `converted` Nanoka 补充规则，对应新增的 `supplementId`。

本批为每个选项建立两条作者记录，共享同一选项描述；目录仍生成两个变体。

## 2. 覆盖

| 项                 | 本批前 | 本批后 |
| ------------------ | -----: | -----: |
| authoring 记录     |     75 |     85 |
| option groups      |     71 |     76 |
| 已作者化补充记录   |  50/68 |  55/68 |
| 剩余 integrated    |     18 |     13 |
| coverage positions |     19 |     24 |
| out-of-scope       |     33 |     33 |

5 个选项：

- 猫又 2 个：核心被动伤害与额外能力技能增伤。
- 艾莲 1 个：核心被动暴伤。
- 悠真 2 个：核心被动暴击率与暴伤。

每个选项生成 10 条记录：5 条 `corrected`、5 条 `converted`；只有 `converted`
记录携带补充记录。5 条 `corrected` 记录各带一个 coverage 位置。

## 3. 作者机制

新增作者层分组 `single-rule-per-variant`：

- 与目录 `mechanism` 无关，不写入 `variant.mechanism`。
- 允许多条记录共享一个选项，但每组至少两条记录。
- 每个变体通过 `effectKeys` 指向自己的规则；`corrected` / `converted` 状态和
  `differences` 分别来自对应记录。
- 既有 `single-rule` 仍严格要求一条记录，避免把普通单规则选项误拆成多条。

## 4. 实现

- [`multi-variant-supplement-records.ts`](../../packages/data/scripts/static-effects/authoring/multi-variant-supplement-records.ts)
  新增 10 条作者记录；每个选项的两条记录共享完整选项描述。
- [`multi-variant-supplement-source-records.ts`](../../packages/data/scripts/static-effects/authoring/multi-variant-supplement-source-records.ts)
  新增 5 条 `AuthoringSupplementalRecord`，值逐字段复制 `static-coverage.json`。
- [`types.ts`](../../packages/data/scripts/static-effects/authoring/types.ts)、
  [`compile.ts`](../../packages/data/scripts/static-effects/authoring/compile.ts)
  增加 `single-rule-per-variant` 分组及基数校验。
- 迁移测试改为按选项聚合 coverage 位置，并逐变体验证状态、差异与 effectIds；
  新增单记录负例。

## 5. 验证

| 入口                                                              | 结果                                                                                                                  |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @randomplay/data authoring:verify`                 | 85 records、76 options、24 coverage positions、19 skill targets、**55 supplemental records**；0 differences、字节一致 |
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

## 6. 剩余范围

剩余 13 条 integrated 补充记录：

- 洛克茜 9 条；其中 2 条需要新增 `target-resistance-reduction`、
  `stun-damage-adjustment` factor channel。
- 露西 2 条、爱丽丝 1 条、叶瞬光 1 条使用尚不在 authoring operation 封闭联合中的
  专用结算。

33 条 out-of-scope 记录带 `reason`，作者层仍不表达该字段，继续由 converter 维护。

## 7. 后续状态

[P2-4g](phase2-roxy-supplement-authoring.md) 已把洛克茜 8 条单规则选项纳入 authoring，
[P2-4h](phase2-multi-rule-supplement-authoring.md) 又纳入洛克茜初始回能转化，
[P2-4i](phase2-special-operation-supplement-authoring.md) 又补齐最后 4 条专用结算。
**integrated 补充记录已达到 68/68 全部作者化**；33 条 out-of-scope 记录仍由 converter 维护。
本页的“剩余 13 条”保留 P2-4f 当时事实。

## 8. 明确不改

`packages/data/scripts/static-effects/convert.ts`、`packages/data/definitions/effects/*`、
`packages/data/integrated/*`、`packages/data/dist/*`、`snapshotId`、publication/manifests、
公开 exports 与 core/shared 运行时均保持原样。
