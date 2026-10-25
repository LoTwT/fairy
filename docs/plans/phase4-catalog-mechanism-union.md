# Phase 4 P4-2：目录变体机制判别联合

- 状态：已合并 #303（`1b111b58`）；P4-2 hardening 见文末第 10 节。
- 基线：`origin/main @ d8a8f202`（P4-0 审计已合并）。
- 分支：`data/phase4-catalog-mechanism-union`；独立 worktree，不修改主工作区。
- 契约：公开 `StaticCatalogVariant` 与 `static-catalog.json` 的原子破坏性变更；不保留旧字段兼容读取。

## 1. 范围

本批只收敛目录变体的 9 个并列 optional 机制字段：

`damageItemRequirements`、`exclusiveDamageItem`、`layerCountInputName`、
`holderLevelInputName`、`windsweptDirectDamage`、`elementBuffInputs`、
`declaredTeammateBeneficiary`、`squadUniqueEffect`、`parameterMapping`。

明确不动：

- 规则层 `activation` / `triggered` / `continuous` / `instant` / `modification`；
- 目录根部 `mechanisms` envelope；
- `option.exclusiveGroup` 与 `activation.exclusiveGroup`；
- `variant.target`、`status`、`reason`、`explanation` 与 `maximumLayers`；
- `damageItemRequirements` 仍为数组；
- `integrated` 归档与 `publication.json`。

## 2. 正式形状

在 [`packages/shared/src/effects.ts`](../../packages/shared/src/effects.ts) 增加：

```ts
export type StaticCatalogVariantMechanism =
  | { kind: "complete-state"; layerCountInputName: string }
  | { kind: "holder-level"; holderLevelInputName: string }
  | {
      kind: "independent-settlement"
      damageItemRequirements: NonEmpty<StaticCatalogDamageItemRequirement>
      isolateDamageItems?: true
      completeState?: { layerCountInputName: string }
    }
  | { kind: "declared-teammate-beneficiary" }
  | { kind: "squad-unique" }
  | {
      kind: "windswept-direct"
      metadata: StaticCatalogWindsweptDirectDamage
    }
  | {
      kind: "element-buff-inputs"
      inputs: NonEmpty<StaticCatalogElementBuffInput>
    }
  | {
      kind: "luminize-proficiency-mapping"
      mapping: StaticCatalogParameterMapping
    }
```

`StaticCatalogVariant` 只保留一个可选 `mechanism`。匿名对象提取为具名类型
`StaticCatalogWindsweptDirectDamage`、`StaticCatalogElementBuffInput` 与
`StaticCatalogParameterMapping`。

命名理由：

- 变体级用单数 `mechanism`，与目录根部复数 `mechanisms` 区分：前者描述一个变体的
  选择/结算机制，后者是跨选项的具名机制读取元数据。
- `independent-settlement` 保留既有词汇；布尔 `exclusiveDamageItem` 改为正交的
  `isolateDamageItems`，直接表达“命中只能包含声明的伤害项”。
- `windswept-direct` 与 `luminize-proficiency-mapping` 的 payload 分别命名为
  `metadata` 与 `mapping`，避免 arm 自身字段与内部对象重名。
- `element-buff-inputs` 的 payload 是 `inputs`；`complete-state` 与 `holder-level`
  各自只有一个派生输入名，保持直接字段。
- 南宫羽两个“独立结算 + 层数桥接”变体使用 `independent-settlement.completeState`，
  不新增并列字段；未来若组合增多，再评估通用 bridge 数组。

不变量：

1. 一个变体最多一个 `mechanism`；省略即普通静态贡献。
2. 每个 arm 只接受自己的字段；联合内部不得出现其他 arm 或旧字段。
3. 同一变体的派生输入名（`inputs`、层数、holder 等级、元素、风化）互不重名。
4. `isolateDamageItems` 只接受字面量 `true`，且该 arm 恰好一个伤害项要求。
5. `status` / `reason` / `explanation` 继续与机制分离，不用证据状态替代机制 kind。

## 3. 迁移映射

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

30 个机制变体的 arm 分布：

| arm                             | 数量 | 代表                                  |
| ------------------------------- | ---: | ------------------------------------- |
| `independent-settlement`        |   22 | 猫又爪印、星见雅霜灼·破、南宫羽颤音改 |
| `element-buff-inputs`           |    2 | 洛克茜核心元素暴击/锐暴               |
| `complete-state`                |    1 | 莱特昂扬完整状态                      |
| `holder-level`                  |    1 | 洛克茜额外能力等级                    |
| `windswept-direct`              |    1 | 洛克茜风化直接伤害                    |
| `declared-teammate-beneficiary` |    1 | 莱特 M4 前场回能                      |
| `squad-unique`                  |    1 | 绯月银棺全队增伤                      |
| `luminize-proficiency-mapping`  |    1 | 蕾米埃尔耀变精通映射                  |

其中 7 个 `independent-settlement` 变体启用 `isolateDamageItems`，2 个南宫羽变体启用
`completeState`。

## 4. 生成与作者层

- [`convert.ts`](../../packages/data/scripts/static-effects/convert.ts) 的固定来源生成与
  [`supplements.ts`](../../packages/data/scripts/static-effects/supplements.ts) 的
  `SupplementVariantSpec` 都只产出/镜像 `mechanism`；补充定义的
  `layerCountMaximumLayers` 仍独立表示逻辑层数上限。
- [`semantics.ts`](../../packages/data/scripts/static-effects/semantics.ts)、
  `roxy-*.ts`、`yixuan-thunder.ts` 等生成器登记同步改为 arm 形状。
- 三个 effects 制品由生成器重生成，不手写 JSON；`static.json` 规则语义不变。
- authoring 的 `EXPRESSIBLE_VARIANT_FIELDS` 只接受 `mechanism`，不再接受旧字段。
  `compileVariant` 只对 `independent-settlement` 生成该 arm（含可选
  `isolateDamageItems`）；其余 arm 继续明确拒绝。
- 当前 19 条作者记录中只有猫又爪印与星见雅霜灼·破的 2 个选项需要该 arm；其余
  无法表达的 10 个机制变体均不在当前 19 条记录内。完整作者层覆盖由
  [P4-1](phase4-authoring-mechanism-coverage.md) 接续完成；本批制品不变。

## 5. 版本与身份

| 项                                                                 | 旧           | 新                    |
| ------------------------------------------------------------------ | ------------ | --------------------- |
| `StaticEffectCatalog.schemaVersion`                                | 1            | 2                     |
| effects `revision`（三制品）                                       | 51           | 52                    |
| `CALCULATION_CONTRACT_VERSION`                                     | 2            | 3                     |
| 根包 / `@randomplay/core` / `@randomplay/data`                     | 0.4.0        | 0.5.0                 |
| `@randomplay/shared`                                               | 0.0.0        | 0.0.0（私有，不发布） |
| `snapshotId`                                                       | 由生成链重算 | 新摘要                |
| `static.json.schemaVersion` / `static-coverage.json.schemaVersion` | 1            | 1（形状未变）         |

`definitions-publication.json`、data-product manifest 摘要、`.generated/calculation-data.ts`
与固定 `snapshotId` fixture 随生成链更新。`integrated` 未改，`publication.json` 不变。

## 6. 验证

| 入口                                                              | 结果                                                                                                          |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @randomplay/data authoring:verify`                 | 19 records、0 differences、字节一致                                                                           |
| `pnpm --filter @randomplay/data typecheck`                        | 通过                                                                                                          |
| `pnpm --filter @randomplay/data check:source`                     | 通过                                                                                                          |
| `pnpm --filter @randomplay/core check:source`                     | 通过                                                                                                          |
| `pnpm check:quality`                                              | 通过                                                                                                          |
| `pnpm --filter @randomplay/data verify:pack`                      | 通过                                                                                                          |
| `pnpm --filter @randomplay/core verify:pack`                      | 通过                                                                                                          |
| `pnpm --filter @randomplay/data verify:nanoka:current integrated` | `phase: idle`，`indexSha256` 与实际索引一致                                                                   |
| 静态核对                                                          | 变体顶层旧 9 字段 0；`mechanism` 恰好 30 个变体；catalog `schemaVersion` 2、revision 52；`static.json` 931 条 |

## 7. 制品事实

| 制品                   | 值                                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `static.json`          | `94466666e043a2b1ae8f803b4cbb9bc815c958e2113d57f13f81686411771922`（931 条规则；忽略 revision 后与 51 语义相同） |
| `static-catalog.json`  | `58bc6f51fbf3ca999da80df7d953cbbd282bf92ecc2a3e61362567b2a5ed3e14`                                               |
| `static-coverage.json` | `978b5e99b58a2b6be218c555d14b2db5b52359c24caaf469540d5c286d341e54`（忽略 revision 后与 51 语义相同）             |
| skills `manifest.json` | `b059afc2ae5f86d0442dd607d4fa5496f94527ee2b1e25385fca7941d772060b`（只更新 `staticCatalogSha256`）               |
| `snapshotId`           | `sha256:a971140ac2ddcb0bf5f7c1e4dfa4763269ba1550ad1395fa7965a2741abe1de0`                                        |

`dist/definitions-publication.json` 中三个 effects 制品的归档摘要是上表前三项；发布副本摘要由构建阶段重算并复验。data-product manifest 的 `rulesVersion` 为 `zzz-hp-static-effects/52`，目录 `mechanismCount` 仍为 4。

## 8. 回滚边界

shared 类型、core 校验/执行、converter/supplements、三个 effects 制品、技能清单的
`staticCatalogSha256`、发布摘要与 authoring 支持必须整体回滚。任何保留旧字段的双形状
窗口都不属于本批；它需要单独的兼容读取授权与删除截止点。

`integrated` 与 `publication.json` 不在本批差异内；若它们出现变化，说明生成链边界被
越过，应先停止并要求重新核对。

## 9. 后置事项

- P4-1：已完成。8 个机制 arm 均已纳入 authoring，当前 30 个机制变体全部覆盖；
  见[P4-1 实施记录](phase4-authoring-mechanism-coverage.md)。本批当时只做
  `independent-settlement` 最小支持，后续记录不回写本批制品。
- P4-3：目录根部 `mechanisms` envelope；本批不动。
- 规则层 `activation` / `triggered` / `continuous` / `instant` 收敛继续不做，直到有真实数据。

## 10. P4-2 hardening

- 状态：已合并 #304（squash merge `ee85d2e6`）；hardening 基线 `origin/main @ 1b111b58`。

#303 合并后 review 发现三处安全/诊断缺口；本 follow-up 只修复这些缺口，不改变迁移
结果（旧目录机械映射后与新目录仍然完全相等），也不改正式 effects 制品、`integrated`、
`dist`、`snapshotId`、publication/manifests 或公开契约形状。

- **authoring 基线 arm 校验**：[compile.ts](../../packages/data/scripts/static-effects/authoring/compile.ts)
  的 `assertSelectedEntriesExpressible` 同时校验基线变体的 arm。作者记录为
  `independent-settlement` 时，每个基线变体都必须声明
  `mechanism.kind === "independent-settlement"`；缺失或其他 arm 明确抛错，不再让
  `compileVariant` 静默替换。作者记录为其他 kind 时，任何基线变体都不得携带
  `mechanism`。负例覆盖“独立结算 + complete-state”“独立结算 + 无 mechanism”与
  既有的“非独立结算 + mechanism”。
- **data-product 逐制品 schemaVersion**：`loadStaticEffectsProduct` 显式断言
  `static.json` 为 1、`static-catalog.json` 为 2、`static-coverage.json` 为 1；
  错误包含制品路径与期望/实际值，不恢复三制品共享版本假设。合成负例覆盖 catalog
  1/3、coverage 2 与 static 2。
- **叶子级错误指针**：[static-catalog.ts](../../packages/core/src/effects/internal/static-catalog.ts)
  的机制解析把 complete-state 桥接、complete-state / holder-level arm、windswept
  metadata、element-buff input 与 parameter mapping 的错误指回具体字段；错误码语义
  保持不变。负例覆盖 completeState、windswept metadata、element-buff input 与
  parameter mapping 四类叶子路径，并补充两个 arm 与 windswept 子字段。

### 验证

| 入口                                                                                  | 结果                                                                           |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `pnpm --filter @randomplay/data authoring:verify`                                     | 19 records、1 supplement、0 differences、三制品字节一致                        |
| `pnpm --filter @randomplay/data typecheck`                                            | 通过                                                                           |
| `pnpm --filter @randomplay/data check:source`                                         | 通过（108 files、4,717 tests）                                                 |
| `pnpm --filter @randomplay/core build && pnpm --filter @randomplay/core check:source` | 通过（98 files、5,683 passed、24 skipped）                                     |
| `pnpm check:quality`                                                                  | 通过                                                                           |
| `pnpm --filter @randomplay/data verify:pack`                                          | 通过（2 tests）                                                                |
| `pnpm --filter @randomplay/core verify:pack`                                          | 通过（1 test）                                                                 |
| `pnpm --filter @randomplay/data verify:nanoka:current integrated`                     | `verified: true`、`phase: idle`；`indexSha256` 与 `integrated/index.json` 一致 |

新增负例先在修复前的源文件上实际失败，再在修复后通过；测试计数：data
`static-effects-authoring.test.ts` 21 项、`data-product.test.ts` 28 项，core
`static-catalog.test.ts` 60 项。`packages/data/definitions`、`integrated` 与 `dist`
的 diff 为空，`snapshotId` 保持
`sha256:a971140ac2ddcb0bf5f7c1e4dfa4763269ba1550ad1395fa7965a2741abe1de0`。
