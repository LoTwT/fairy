# Phase 2 P2-4i：最后 4 条专用结算补充选项

- 状态：已合并 #317（squash merge `828ce5a9`）；基线 `origin/main @ 8d6935a5`（P2-4h #316 已合并）。
- 分支：`data/p2-4i-special-operations`。
- 范围：把露西、爱丽丝、叶瞬光剩余 4 条 integrated 补充记录纳入 authoring；
  不改 converter、正式 effects 制品、`integrated`、`dist`、`snapshotId`、
  publication/manifests、公开 exports 或 core/shared 运行时。

## 1. 目标

P2-4h 后只剩 4 条 integrated 补充记录，均使用 authoring 尚未开放的专用结算：

- `lucy-guard-boar-inheritance`
- `lucy-guard-boar-m6-damage`
- `alice-core-periodic-damage`
- `stun-damage-replacement`

本批把四个 operation 加入 `AuthoringOperation` 封闭联合，并逐项校验固有载荷，
再迁移对应的 4 个单规则、单变体选项。

## 2. 覆盖

| 项               | 本批前 | 本批后 |
| ---------------- | -----: | -----: |
| authoring 记录   |     95 |     99 |
| option groups    |     85 |     89 |
| 已作者化补充记录 |  64/68 |  68/68 |
| 剩余 integrated  |      4 |      0 |
| out-of-scope     |     33 |     33 |

4 条记录全部是单规则、单变体、`converted`、无目录机制、无 coverage 位置。
所有 integrated 补充记录现在都有作者声明；33 条 out-of-scope 仍由 converter 维护。

## 3. 实现

- [`types.ts`](../../packages/data/scripts/static-effects/authoring/types.ts)
  的 `AuthoringOperation` 加入四个专用 operation。
- [`validation.ts`](../../packages/data/scripts/static-effects/authoring/validation.ts)
  增加载荷校验：
  - 露西小猪继承的七档 `cheerMultiplier` 必须匹配固定表；
  - 露西 M6 爆炸必须为 `3×`、fire、regular、uncategorized；
  - 爱丽丝周期附伤必须为 literal ratio `0.025`；
  - 叶瞬光失衡替代的 `bonus` / `maximumBonus` 必须是 ratio 表达式。
- [`special-operation-supplement-records.ts`](../../packages/data/scripts/static-effects/authoring/special-operation-supplement-records.ts)
  新增 4 条作者记录。
- [`special-operation-supplement-source-records.ts`](../../packages/data/scripts/static-effects/authoring/special-operation-supplement-source-records.ts)
  新增 4 条补充记录。
- 迁移测试增加畸形露西 M6 载荷负例。

## 4. 验证

| 入口                                                              | 结果                                                                                                                  |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @randomplay/data authoring:verify`                 | 99 records、89 options、24 coverage positions、19 skill targets、**68 supplemental records**；0 differences、字节一致 |
| 定向 `static-effects-authoring` 测试                              | 3 个文件、54 个测试通过                                                                                               |
| `pnpm --filter @randomplay/data typecheck`                        | 通过                                                                                                                  |
| `pnpm --filter @randomplay/data check:source`                     | 通过（108 files、4,725 tests）                                                                                        |
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

## 5. 剩余边界

- **integrated 补充记录已全部作者化（68/68）**；这是补充记录迁移的完成点。
- 33 条 out-of-scope 记录带 `reason`，作者层仍不表达该字段，继续由 converter 生成。
- 这不等于 converter 已退出：作者层当前覆盖 99/931 条规则、89/986 个选项；固定来源
  records/variants 与 33 条 out-of-scope 补充记录仍由 converter 产生，作者层通过
  `authoring:verify` 与已提交三制品保持字节等价；与 converter 当前输出的一致性
  只在持有固定来源重新生成时校验。作者层本身不是事实来源。
- P4-3（目录根部 `mechanisms` envelope）仍按触发条件后置；P4-5 不做；Phase 3 暂缓。

## 6. 明确不改

`packages/data/scripts/static-effects/convert.ts`、`packages/data/definitions/effects/*`、
`packages/data/integrated/*`、`packages/data/dist/*`、`snapshotId`、publication/manifests、
公开 exports 与 core/shared 运行时均保持原样。
