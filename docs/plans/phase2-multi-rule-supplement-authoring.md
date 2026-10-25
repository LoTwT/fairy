# Phase 2 P2-4h：洛克茜初始回能转化

- 状态：已实现；基线 `origin/main @ 015833b1`（P2-4g #315 已合并）。
- 分支：`data/p2-4h-multi-rule-supplement`。
- 范围：把洛克茜 `initial-energy-regen-conversion` 纳入 authoring；不改 converter、
  正式 effects 制品、`integrated`、`dist`、`snapshotId`、publication/manifests、
  公开 exports 或 core/shared 运行时。

## 1. 目标

该选项的一个变体由攻击力与冲击力两条 `stat-adjustment` 规则共同表达。既有
`single-rule` 只允许一条记录，`single-rule-per-variant` 只描述“每个变体一条规则”，
因此新增作者层分组 `multi-rule`：同一选项的多条记录共同构成一个或多个变体，
不写入 `variant.mechanism`，也不等同于 `complete-state`。

## 2. 覆盖

| 项               | 本批前 | 本批后 |
| ---------------- | -----: | -----: |
| authoring 记录   |     93 |     95 |
| option groups    |     84 |     85 |
| 已作者化补充记录 |  63/68 |  64/68 |
| 剩余 integrated  |      5 |      4 |
| out-of-scope     |     33 |     33 |

两条记录共享同一选项描述；变体 `effectKeys` 同时引用攻击力与冲击力规则。
补充记录只挂在第一条记录上，`effectIds` 已覆盖两条规则。

## 3. 实现

- [`multi-rule-supplement-records.ts`](../../packages/data/scripts/static-effects/authoring/multi-rule-supplement-records.ts)
  新增 2 条作者记录。
- [`multi-rule-supplement-source-records.ts`](../../packages/data/scripts/static-effects/authoring/multi-rule-supplement-source-records.ts)
  新增 1 条补充记录。
- [`types.ts`](../../packages/data/scripts/static-effects/authoring/types.ts)、
  [`compile.ts`](../../packages/data/scripts/static-effects/authoring/compile.ts)
  增加 `multi-rule` 分组及“至少两条记录”基数校验。
- 迁移测试增加单记录负例。

## 4. 验证

| 入口                                                              | 结果                                                                                                                  |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @randomplay/data authoring:verify`                 | 95 records、85 options、24 coverage positions、19 skill targets、**64 supplemental records**；0 differences、字节一致 |
| 定向 `static-effects-authoring` 测试                              | 3 个文件、53 个测试通过                                                                                               |
| `pnpm --filter @randomplay/data typecheck`                        | 通过                                                                                                                  |
| `pnpm --filter @randomplay/data check:source`                     | 通过（108 files、4,724 tests）                                                                                        |
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

剩余 4 条 integrated：

- 露西 2 条：`lucy-guard-boar-inheritance`、`lucy-guard-boar-m6-damage`。
- 爱丽丝 1 条：`alice-core-periodic-damage`。
- 叶瞬光 1 条：`stun-damage-replacement`。

这些都需要扩展 `AuthoringOperation` 并补对应负例。33 条 out-of-scope 记录继续由
converter 维护。

## 6. 明确不改

`packages/data/scripts/static-effects/convert.ts`、`packages/data/definitions/effects/*`、
`packages/data/integrated/*`、`packages/data/dist/*`、`snapshotId`、publication/manifests、
公开 exports 与 core/shared 运行时均保持原样。
