# Phase 2 authoring 分组不变量与专用 operation 负例

- 状态：已合并 #319（squash merge `4f69e508`）；P2 follow-up 已合并 #321（`6a138847`）；基线 `origin/main @ 828ce5a9`（P2-4i #317 已合并）。
- 分支：`data/authoring-group-invariants`。
- 范围：只改 authoring 编译器、校验器与定向测试；不改 converter、正式 effects
  制品、`integrated`、`dist`、`snapshotId`、publication/manifests、公开 exports
  或 core/shared 运行时。

## 1. 背景

P2-4c 到 P2-4i 把 68/68 条 integrated 补充记录纳入 authoring。Sunna 与 Kimi
的独立 review 都指出：`single-rule-per-variant`、`multi-rule` 与
`complete-state` 在编译器里只有“至少两条记录”的基数校验，标签本身不携带
结构语义；补充记录的 `effectIds` 也只检查存在性，不检查是否属于声明的选项。

本批补齐这些不变量，并为四个专用 operation 增加负例，避免后续放宽校验时
静默回归。

## 2. 新不变量

| 机制分组                  | 不变量                                                             |
| ------------------------- | ------------------------------------------------------------------ |
| `single-rule-per-variant` | 记录数等于变体数；每个变体恰好引用一条记录；每条记录恰好被引用一次 |
| `multi-rule`              | 至少一个变体引用两条及以上记录                                     |
| `complete-state`          | 选项必须登记在 `COMPLETE_STATE_OPTIONS`；其他分组不得占用该标签    |
| 所有分组                  | 登记为 complete-state 的选项不得改用其他标签                       |

补充记录的 `effectIds` 现在必须属于其 `optionId` 已编译变体的 effectId 集合。
多变体选项允许补充记录只覆盖其中一个变体，因此校验子集而不是全部并集。

作者层 `complete-state` 标签绑定 `COMPLETE_STATE_OPTIONS`，与目录变体上的
`mechanism.kind = "complete-state"`（由 `catalogMechanism` 表达）是不同概念。
例如莱特的 elation 选项在作者层是 `single-rule`，目录变体是 `complete-state`；
两者不得按名称互相推断。

## 3. 专用 operation 校验

- 拒绝专用 operation 及其嵌套载荷的未知字段。
- 锁定单位：露西继承、露西 M6、耀嘉音 M4 为 `multiplier`；爱丽丝周期附伤为
  `ratio`。
- `stun-damage-replacement` 的 literal 或 `parameter`（constant / by-rank）
  `bonus` 必须非负，`maximumBonus` 必须在 `[0, 2]`；`input` 等运行时表达式由
  core 在求值时校验。
- 新增负例覆盖露西继承单位、爱丽丝倍率、叶瞬光 literal 上限、叶瞬光真实
  by-rank 参数越界、未知字段，以及 `stun-damage-adjustment` 的单位。
- 打包测试在离线安装失败时输出子进程 stdout/stderr，避免 CI 只留下
  `Command failed` 而丢失 pnpm 诊断；checkout 的离线安装显式使用父进程
  的 pnpm store，避免 corepack 在 CI runner 上解析到不含 `string-argv` 的
  默认 store。

## 4. 验证

| 入口                                              | 结果                                                                                                           |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @randomplay/data authoring:verify` | 99 records、89 options、24 coverage positions、19 skill targets、68 supplements；0 differences、三制品字节一致 |
| 定向 `static-effects-authoring` 测试              | 3 个文件、65 个测试通过                                                                                        |
| `pnpm --filter @randomplay/data typecheck`        | 通过                                                                                                           |
| `pnpm --filter @randomplay/data check:source`     | 通过（108 files、4,736 tests）                                                                                 |
| `pnpm --filter @randomplay/core check:source`     | 通过（98 files、5,696 passed、24 skipped）                                                                     |
| `pnpm check:quality`                              | 通过                                                                                                           |
| 数据管理状态                                      | `phase: idle`；`indexSha256 d68ad1d8…` 与实际索引一致                                                          |

三制品摘要保持：

| 制品                   | SHA-256                                                            |
| ---------------------- | ------------------------------------------------------------------ |
| `static.json`          | `94466666e043a2b1ae8f803b4cbb9bc815c958e2113d57f13f81686411771922` |
| `static-catalog.json`  | `58bc6f51fbf3ca999da80df7d953cbbd282bf92ecc2a3e61362567b2a5ed3e14` |
| `static-coverage.json` | `978b5e99b58a2b6be218c555d14b2db5b52359c24caaf469540d5c286d341e54` |

## 5. 边界

- 这不改变 68/68 的覆盖事实，也不新增作者记录或补充记录。
- 作者层仍是 converter 输出的独立断言层，不是主数据来源。
- 33 条 out-of-scope 补充记录继续由 converter 维护。
- `complete-state` 与 `multi-rule` 仍可通过改写记录内容触发字节差异；本批保证
  的是标签不能在没有登记或结构不满足时静默通过。

## 6. P2 review follow-up

2026-10-25 的 Sunna 窄范围 review 指出：`stun-damage-replacement` 的范围校验只覆盖
literal，唯一的真实记录使用 by-rank 参数，因此 `maximumBonus` 越界不会被编译期拦截。
本批补充 `parameter`（constant / by-rank）范围校验，并新增真实形状负例；同时更新
converter / authoring 边界、CI 范围、冻结流程与过期验证记录。具体见
[转换器与作者层边界决策](converter-authoring-boundary-decision.md)。
