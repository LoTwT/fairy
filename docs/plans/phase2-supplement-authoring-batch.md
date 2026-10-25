# Phase 2 P2-4c：已有作者选项的补充记录批量迁移

- 状态：已实现；基线 `origin/main @ 29ab5777`（P4-1 #310 已合并）。
- 分支：`data/p2-4c-supplement-authoring`。
- 范围：只把已有作者选项对应的 23 条 `integrated` 补充记录迁入作者层；
  不改 converter、正式 effects 制品、`integrated`、`dist`、`snapshotId`、
  publication/manifests、公开 exports 或 core/shared 运行时。

## 1. 目标

P2-4b-lite 已证明补充记录的按 `supplementId` 原位替换路径可用，但当时只迁移了
`nanoka:agents:miyabi:frostburn-break-damage` 一条。P4-1 把 28 个机制选项纳入作者层后，
更多补充记录具备了挂载位置；本批把其中 23 条从 converter 基线复制到作者记录，
使已作者化补充记录从 1 条增加到 24 条，同时保持三个 effects 制品逐字节不变。

## 2. 覆盖

正式 `static-coverage.json` 当前有 101 条补充记录：

| 状态           | 数量 | 本批处理                          |
| -------------- | ---: | --------------------------------- |
| `integrated`   |   68 | 新增 23 条；连同既有 1 条共 24 条 |
| `out-of-scope` |   33 | 不处理，仍由 converter 生成       |

已迁移的 24 条 `integrated` 记录对应 24 个不同 `optionId`，每个选项恰好一条。
其中 3 个选项有多条作者记录：

- `nanoka:agents:miyabi:frostburn-break-damage`：P2-4b-lite 已挂在
  `miyabi-frostburn-main`。
- `nanoka:w-engines:13112:retaliation-defense-damage`：挂在
  `w-engine:13112:nanoka:retaliation-defense-damage`；该补充记录的 `effectIds`
  同时覆盖 `:guaranteed-critical` 规则。
- `nanoka:agents:alice:m6-proficiency-damage`：挂在
  `agent:1401:nanoka:m6-proficiency-damage:mindscape:6`；`effectIds` 同时覆盖
  `:guaranteed-critical` 规则。

补充记录是选项级覆盖，不是规则级覆盖；因此多规则选项只在一条作者记录上声明一次，
不重复声明同一 `supplementId`。

## 3. 实现

- [`supplement-records.ts`](../../packages/data/scripts/static-effects/authoring/supplement-records.ts)
  新增 23 个 `AuthoringSupplementalRecord` 常量，值逐字段复制 revision 52 的
  `static-coverage.json`，键序与基线条目一致。
- [`mechanism-records.ts`](../../packages/data/scripts/static-effects/authoring/mechanism-records.ts)
  在对应 23 条作者记录上增加 `supplementalRecords`，不新增作者选项或规则。
- 编译仍按 `supplementId` 原位替换，不新增、删除或重排补充记录；生成路径不读取
  这些基线条目。

## 4. 验证

| 入口                                                              | 结果                                                                                                                  |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @randomplay/data authoring:verify`                 | 49 records、45 options、19 coverage positions、19 skill targets、**24 supplemental records**；0 differences、字节一致 |
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

- 仍有 44 条 `integrated` 补充记录的 `optionId` 没有对应作者记录；要迁移它们，
  必须先补作者选项，不能只声明补充记录。
- 33 条 `out-of-scope` 记录带 `reason`，作者层仍不表达该字段，继续由 converter 维护。
- 补充记录的 `effectIds` 只校验存在性，不校验是否属于同一选项或与规则状态一致；
  该限制沿用 P2-4a/P2-4b-lite。

## 6. 明确不改

`packages/data/scripts/static-effects/convert.ts`、`packages/data/definitions/effects/*`、
`packages/data/integrated/*`、`packages/data/dist/*`、`snapshotId`、publication/manifests、
公开 exports 与 core/shared 运行时均保持原样。

## 7. 后续状态

[P2-4d](phase2-w-engine-supplement-authoring.md) 已把 16 条音擎 integrated 补充记录
对应的选项纳入 authoring。当前已作者化补充记录为 40/68 条；剩余 28 条 integrated
记录仍缺作者选项，33 条 out-of-scope 记录仍由 converter 维护。本页的“23 条新增”
与“剩余 44 条”保留 P2-4c 当时事实。
