# v5（0.5.0）发布说明草稿

- 状态：草稿，未发布；等待发布决策。
- 日期：2026-10-25
- 基线：`origin/main @ 6c2177b3`
- 范围：0.5.0 的公开契约变更、制品事实、验证证据、已知限制与发布检查清单。
- 非范围：发布、打 tag、修改版本号、发布 npm 制品、创建 GitHub Release。

> 本页只描述待发布内容。2026-10-24 查询 npm registry：`@randomplay/core@0.5.0` 与
> `@randomplay/data@0.5.0` 均无制品，两个包的 `latest` 均为 `0.4.0`；当前也没有对应的 GitHub Release。
> 发布检查清单全部为“未执行”。

## 1. 版本与契约

| 项                                                                 | 值                                                                        | 说明                    |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------- | ----------------------- |
| 根包 `fairy`                                                       | `0.5.0`                                                                   | 私有仓库包              |
| `@randomplay/core`                                                 | `0.5.0`                                                                   | 待发布                  |
| `@randomplay/data`                                                 | `0.5.0`                                                                   | 待发布                  |
| `@randomplay/shared`                                               | `0.0.0`                                                                   | `private: true`，不发布 |
| `CALCULATION_CONTRACT_VERSION`                                     | `3`                                                                       | 目录变体机制判别联合    |
| `StaticEffectCatalog.schemaVersion`（`static-catalog.json`）       | `2`                                                                       | 旧字段形状不再接受      |
| effects `revision`（`static.json` / catalog / coverage）           | `52`                                                                      | 三制品同次生成          |
| `static.json.schemaVersion` / `static-coverage.json.schemaVersion` | `1` / `1`                                                                 | 形状未变                |
| `snapshotId`                                                       | `sha256:a971140ac2ddcb0bf5f7c1e4dfa4763269ba1550ad1395fa7965a2741abe1de0` | 由当前生成链复核        |
| `gameVersion`                                                      | `3.3`                                                                     | 计算数据版本            |

版本号来源：[根 `package.json`](../../package.json)、[core `package.json`](../../packages/core/package.json)、
[data `package.json`](../../packages/data/package.json) 与 [shared `package.json`](../../packages/shared/package.json)。
契约常量来源：[`packages/shared/src/calculation.ts`](../../packages/shared/src/calculation.ts)。

## 2. 破坏性变更

1. `StaticCatalogVariant` 的 9 个并列 optional 机制字段被移除，改为单一可选
   `mechanism: StaticCatalogVariantMechanism`。新类型是判别联合，每个 arm 只接受自己的字段。
2. 旧字段不再读取，也不存在双形状兼容窗口。`static-catalog.json` 中变体顶层的旧 9 字段出现次数为 0；
   `independent-settlement` 的 `damageItemRequirements` 等 arm 内部字段名仍沿用。
3. `CALCULATION_CONTRACT_VERSION` 由 `2` 升至 `3`；不支持的契约版本会被 core 拒绝。
4. `static-catalog.json` 的 `schemaVersion` 由 `1` 升至 `2`，core 校验目录 `schemaVersion`；data-product 读取器分别断言 rules=1、catalog=2、coverage=1。
5. 消费方必须与同版 core/data 一起使用。混用 0.5.0 与 0.4.x 的 data/core 会因契约或制品版本不一致而失败。

正式形状、命名理由与不变量见 [P4-2 计划第 2 节](phase4-catalog-mechanism-union.md#2-正式形状)。

## 3. 迁移映射

旧字段到新 `mechanism` arm 的机械映射如下。完整 arm 形状、组合规则与代表变体见
[P4-2 计划第 3 节](phase4-catalog-mechanism-union.md#3-迁移映射)，本页不重复规范正文。

| 旧字段                              | 新位置                                                     | 规则                         |
| ----------------------------------- | ---------------------------------------------------------- | ---------------------------- |
| `damageItemRequirements`            | `independent-settlement.damageItemRequirements`            | 原数组原序复制；非空         |
| `exclusiveDamageItem: true`         | `independent-settlement.isolateDamageItems: true`          | 仅该 arm；要求恰好一个要求项 |
| `layerCountInputName`（无伤害项）   | `complete-state.layerCountInputName`                       | 1:1                          |
| `layerCountInputName`（有伤害项）   | `independent-settlement.completeState.layerCountInputName` | 嵌套                         |
| `holderLevelInputName`              | `holder-level.holderLevelInputName`                        | 1:1                          |
| `windsweptDirectDamage`             | `windswept-direct.metadata`                                | 1:1                          |
| `elementBuffInputs`                 | `element-buff-inputs.inputs`                               | 1:1，非空                    |
| `declaredTeammateBeneficiary: true` | `declared-teammate-beneficiary`                            | 去掉布尔值                   |
| `squadUniqueEffect: true`           | `squad-unique`                                             | 去掉布尔值                   |
| `parameterMapping`                  | `luminize-proficiency-mapping.mapping`                     | 1:1                          |

## 4. 影响范围

- **公开类型**：[`StaticCatalogVariant`](../../packages/shared/src/effects.ts) 只保留一个可选 `mechanism`；
  匿名对象提取为 `StaticCatalogWindsweptDirectDamage`、`StaticCatalogElementBuffInput` 与
  `StaticCatalogParameterMapping`。
- **数据制品**：`static-catalog.json` 变为 `schemaVersion: 2`，30 个变体携带 `mechanism`；
  `static.json` 与 `static-coverage.json` 形状不变。
- **`@randomplay/core`**：类型、目录解析/校验与运行时执行改为按 `mechanism.kind` 分派；错误指针落到
  具体 arm 字段。旧字段输入被拒绝。
- **`@randomplay/data`**：`./definitions/effects/static-catalog.json` 子路径的消费方按新形状读取；
  authoring 编译器只接受 `mechanism`；P4-1 后 8 个 arm 与全部 30 个机制变体均可作者化。
- **不受影响**：规则层 `activation` / `triggered` / `continuous` / `instant` / `modification`、
  目录根部 `mechanisms` envelope、`variant.target` / `status` / `reason` / `explanation`、
  `integrated` 归档与 `publication.json`。

## 5. 数据事实

以下计数直接读取当前制品，不从旧文档复制。

| 项                | 值                                                                                | 来源                                                                                   |
| ----------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 规则              | 931 条（927 条 `contribution`、4 条 `modification`）                              | [`static.json`](../../packages/data/definitions/effects/static.json)                   |
| 目录变体          | 1,467 个                                                                          | [`static-catalog.json`](../../packages/data/definitions/effects/static-catalog.json)   |
| 机制变体          | 30 个                                                                             | 同上                                                                                   |
| 机制 arm 分布     | 22 个 `independent-settlement`、2 个 `element-buff-inputs`，其余 6 个 arm 各 1 个 | 同上                                                                                   |
| 补充记录          | 101 条（68 条 integrated、33 条 out-of-scope；其中 40 条已作者化）                | [`static-coverage.json`](../../packages/data/definitions/effects/static-coverage.json) |
| 目录实体 / 选择项 | 196 / 986                                                                         | `static-catalog.json`                                                                  |

`independent-settlement` 中 7 个变体启用 `isolateDamageItems`，2 个南宫羽变体启用 `completeState`。
已作者化的 40 条补充记录中，首条由
[P2-4b-lite 记录](phase2-miyabi-supplement-migration.md)迁移；23 条由
[P2-4c 批量迁移](phase2-supplement-authoring-batch.md)迁入；16 条音擎选项由
[P2-4d 音擎批次](phase2-w-engine-supplement-authoring.md)迁入。剩余 28 条 integrated
补充记录仍缺作者选项，33 条 out-of-scope 记录仍由 converter 维护。

## 6. 验证证据

| 入口                                                                                  | 结果                                                                                    |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `pnpm --filter @randomplay/data authoring:verify`                                     | 65 records、61 options、19 skill targets、40 supplements、0 differences、三制品字节一致 |
| `pnpm --filter @randomplay/data check:source`                                         | 通过（108 files、4,721 tests）                                                          |
| `pnpm --filter @randomplay/core build && pnpm --filter @randomplay/core check:source` | 通过（98 files、5,696 passed、24 skipped）                                              |
| `pnpm --filter @randomplay/data verify:pack`                                          | 通过（2 tests）                                                                         |
| `pnpm --filter @randomplay/core verify:pack`                                          | 通过（1 test）                                                                          |
| `pnpm check:quality`                                                                  | 通过                                                                                    |
| CI                                                                                    | #303、#304、#305、#306、#309、#310、#311 各 6/6 项检查通过                              |
| 数据管理状态                                                                          | `phase: idle`；`indexSha256` `d68ad1d8…` 与 `packages/data/integrated/index.json` 一致  |

> 2026-10-25 P0/P1/P4-1/P2-4c/P2-4d 后复验：data 108 files / 4,721 tests；core 98 files / 5,696 passed + 24 skipped；
> `authoring:verify` 65 records / 40 supplements 字节一致、`check:quality` 通过。

相关 PR：

| PR   | 内容                                                    | 合并提交   |
| ---- | ------------------------------------------------------- | ---------- |
| #303 | P4-2 目录变体机制判别联合                               | `1b111b58` |
| #304 | P4-2 hardening：基线 arm 校验、逐制品版本、叶子错误指针 | `ee85d2e6` |
| #305 | CI 显式校验 authoring 等价性与制品依赖图                | `4822a054` |
| #306 | PR04 重型用例拆分，稳定 core 测试                       | `a74f340f` |
| #309 | 机制诊断、authoring guard 与文档收口                    | `36a8e799` |
| #310 | P4-1 authoring 机制覆盖                                 | `29ab5777` |
| #311 | P2-4c 补充记录批量迁移                                  | `6c2177b3` |

数据管理状态的维护流程见[来源数据整合规范](../specs/data/integration.md#数据管理状态的同步维护)。
本 PR 只改文档，不修改 `integrated`、definitions、`dist` 或管理记录。

## 7. 已知限制

- 28 条 integrated 补充记录仍由 converter 生成，尚未进入 authoring；其 `optionId`
  还没有对应作者记录。
- 33 条 out-of-scope 补充记录带 `reason`，仍不可作者化。
- P4-3（目录根部 `mechanisms` envelope）后置。
- 规则层 `activation` / `triggered` / `continuous` / `instant` / `modification` 收敛（P4-5）不做；Phase 3 公共 manifest 外壳继续暂缓。

P4-1 已完成：8 个机制 arm 与全部 30 个机制变体均纳入 authoring，见
[P4-1 实施记录](phase4-authoring-mechanism-coverage.md)。其余限制沿用
[P4-2 计划第 4 节](phase4-catalog-mechanism-union.md#4-生成与作者层)、
[第 9 节](phase4-catalog-mechanism-union.md#9-后置事项)与 [P2-4b-lite 记录](phase2-miyabi-supplement-migration.md)。

## 8. 发布检查清单

全部未执行；执行前需取得明确的版本与发布授权，并按[包边界与联动发布](../specs/packages.md#发布操作)操作。

| 步骤                                                      | 状态   |
| --------------------------------------------------------- | ------ |
| 确认 `main` 工作区干净，且待发布提交已进入 `main`         | 未执行 |
| 确认根包 / core / data 的 `0.5.0` 版本与发布授权          | 未执行 |
| 打 `v0.5.0` tag 并推送到已核实的目标仓库                  | 未执行 |
| 发布 `@randomplay/core@0.5.0` 与 `@randomplay/data@0.5.0` | 未执行 |
| 核对 npm `latest`、dist-tags、tarball 清单与 integrity    | 未执行 |
| 创建或核对 GitHub Release `v0.5.0`                        | 未执行 |

## 9. 相关文档

- [P2-4c 补充记录批量迁移](phase2-supplement-authoring-batch.md)：23 条 integrated 补充记录作者化、累计 24 条与字节等价验证。
- [P2-4d 音擎补充选项批量作者化](phase2-w-engine-supplement-authoring.md)：16 条音擎选项作者化、累计 40 条与字节等价验证。
- [P4-1 authoring 机制覆盖](phase4-authoring-mechanism-coverage.md)：8 个 arm、30 个变体与字节等价验证。
- [P4-2 目录变体机制判别联合](phase4-catalog-mechanism-union.md)：正式形状、迁移映射、验证与回滚边界。
- [包边界与联动发布](../specs/packages.md)：同版发布规则、安装与发布操作。
- [静态效果数据接入](../specs/data/zzz-hp-static-effects.md)：当前覆盖事实与规则修订。
- [静态快照规范](../specs/effects/static-snapshot.md)：来源优先级与固定基线。
- [数据消费契约](../specs/data/consumption.md)：公开类型、JSON 子路径与发布副本。
