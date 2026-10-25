# Phase 4 P4-1：authoring 机制覆盖

- 状态：已实现；基线 `origin/main @ 36a8e799`（P0/P1 hardening 已合并）。
- 范围：只改 `packages/data/scripts/static-effects/authoring` 与对应测试/文档；
  不改正式 effects 制品、`integrated`、`dist`、`publication.json`、`snapshotId`、
  shared/core 运行时或公开契约形状。

## 1. 目标

让 authoring 层完整表达 P4-2 引入的 8 个 `StaticCatalogVariantMechanism` arm，
并把当前 30 个机制变体全部纳入作者记录；`authoring:verify` 仍须三制品语义 0 diff、
字节一致。

## 2. 设计

- `AuthoringOptionVariant.catalogMechanism` 直接承载正式
  `StaticCatalogVariantMechanism`。它与记录级 `mechanism` 分工：
  - `catalogMechanism` 决定写入 `variant.mechanism` 的 arm 与 payload；
  - 记录级 `mechanism` 继续表达规则分组（`single-rule`、`complete-state`、
    `independent-settlement`、`unsupported`）和 `independent-settlement` 的
    `damageItem`/`skillTarget` 校验字段。
- `independent-settlement` 可省略 `skillTarget`（无独立技能标签的选项）；
  显式 `catalogMechanism` 的 `damageItemRequirements` 必须与记录级
  `damageItem` 完全一致，`isolateDamageItems` 必须与
  `exclusiveDamageItem` 一致，避免两处声明漂移。
- 扩展 authoring operation：`astra-yao-m4-quick-assist-damage` 与
  `guaranteed-critical`。
- 扩展 factor channel：`windswept-direct-damage-coefficient-increase` 与
  `luminize-proficiency-input`。
- 扩展规则字段：`uniqueness`（4 条全队唯一规则，其中 2 条属于本次机制选项）。
- 编译期解析集中到 `authoringVariantMechanism`；显式 arm 与基线变体做完整
  `stableStringify` 比对，不再只比对 kind。

## 3. 覆盖

| 项                   |                                                                      值 |
| -------------------- | ----------------------------------------------------------------------: |
| authoring 记录       |                                                49 条（原 19 + 新增 30） |
| option groups        |                                                45 个（原 17 + 新增 28） |
| 目录机制变体         |                                                       30 个（全部覆盖） |
| 目录机制 arm         | 22 independent-settlement、2 element-buff-inputs，其余 6 个 arm 各 1 个 |
| skill targets        |                                                 19 个（原 2 + 新增 17） |
| coverage positions   |                                                 19 个（原 15 + 新增 4） |
| supplemental records |                                                     1 条（仍为霜灼·破） |

新增记录放在
[`mechanism-records.ts`](../../packages/data/scripts/static-effects/authoring/mechanism-records.ts)，
是 revision 52 的一次性机械转录；生成路径不读取选中基线条目。原 19 条记录保持原位，
通过 `MIGRATED_AUTHORING_RECORDS` 合并后统一验证。

## 4. 验证

| 入口                                                              | 结果                                                                                                 |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `pnpm --filter @randomplay/data authoring:verify`                 | 49 records、45 options、19 coverage positions、19 skill targets、1 supplement；语义 0 diff、字节一致 |
| `pnpm --filter @randomplay/data check:source`                     | 通过（108 files、4,721 tests）                                                                       |
| `pnpm --filter @randomplay/core check:source`                     | 通过（98 files、5,696 passed、24 skipped）                                                           |
| `pnpm check:quality`                                              | 通过                                                                                                 |
| `pnpm --filter @randomplay/data verify:pack`                      | 通过                                                                                                 |
| `pnpm --filter @randomplay/core verify:pack`                      | 通过                                                                                                 |
| `pnpm --filter @randomplay/data verify:nanoka:current integrated` | 通过，`phase: idle`                                                                                  |

## 5. 边界

- 本批不新增正式机制、不改 shared/core 类型或执行语义；只补齐作者层能力与转录。
- P4-3（目录根部 `mechanisms` envelope）与 P4-5（规则层 activation 收敛）继续后置。
- P4-1 当时有 67 条 integrated 补充记录、33 条 out-of-scope 补充记录仍由 converter 维护；
  本批只把 1 条既有补充记录保持作者化。后续
  [P2-4c](phase2-supplement-authoring-batch.md) 已把 23 条已有作者选项的 integrated
  记录迁入作者层，当前剩余 44 条 integrated。
