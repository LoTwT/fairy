# Phase 4 P4-0：机制 schema 盘点与收敛设计

- 状态：盘点完成；建议做**目录变体机制判别联合**的窄收敛，不做跨制品全局统一。
- 基线：`origin/main @ 0d94faddc420cd85cea93f7755a54d723eaca1da`；分支 `docs/phase4-mechanism-schema-audit`。
- 语料：静态效果 revision `51`，`ruleSetId` `zzz-hp-static-effects`，固定源 `2628b32`。
- 范围：本 PR 只新增本文与索引入口；不改 `shared`/`core`/`data` 生产代码、类型、制品或公开导出。

## 1. 结论摘要

**值得做，但只做窄收敛。** 当前机制语义分散在四处：

1. 规则层 `kind` / `activation` / 专用 `operation.kind`；
2. 目录变体的 9 个并列 optional 字段；
3. 目录根部 4 个异构 `mechanisms` 形状；
4. 三种作用域不同的互斥表达（`activation.exclusiveGroup`、`option.exclusiveGroup`、`squadUniqueEffect`）。

其中真正有数据、重复校验、且已出现 authoring 断层的是第 2 项。规则层的
`continuous` / `triggered` / `instant` / 状态 / 冷却 / 叠层在当前 931 条规则中
**全部为 0**，先统一它们只会制造没有数据验证的抽象。因此推荐：

- **做**：把目录变体的机制开关收敛为一个 `StaticCatalogVariantMechanism` 判别联合；
- **后做/条件做**：给目录根部 `mechanisms` 增加统一 envelope；
- **不做**：把规则激活、目录选择与来源读取合并成一个全局 `mechanisms` 联合。

如果 Phase 4 不打算新增机制族，保持现状并补强校验也成立；见 3.2 的方案 A。
下面给出可执行的门槛与拆分，而不是把“收敛”本身当成目标。

## 2. 现状清单

### 2.1 规则层

正式类型在 [`packages/shared/src/effects.ts`](../../packages/shared/src/effects.ts)，
运行时校验入口是 [`parse-effect-rule-set.ts`](../../packages/core/src/effects/parse-effect-rule-set.ts)
与 [`internal/rule.ts`](../../packages/core/src/effects/internal/rule.ts)。

| 字段                        | 类型                                        | 可选性 / 默认     | 当前数据                                     | 约束                                       |
| --------------------------- | ------------------------------------------- | ----------------- | -------------------------------------------- | ------------------------------------------ |
| `kind`                      | `contribution` / `instant` / `modification` | 必填              | 927 / 0 / 4                                  | 判别规则形态；字段互斥由类型与校验器执行   |
| `activation.kind`           | `continuous` / `supplied` / `triggered`     | contribution 必填 | 927 `supplied`；0 / 0                        | `instant`/`modification` 禁止 `activation` |
| `activation.maximumLayers`  | `NumericExpression<"count">`                | `supplied` 可选   | 927 条全部提供；字面量 1—50                  | 正整数；`triggered` 走 `layering.maximum`  |
| `activation.exclusiveGroup` | `string`                                    | 可选              | 7 条（Roxy 4 + 魂锁 3）                      | 同一绑定内同组只能有一条 supplied 规则     |
| `trigger`                   | `Trigger`                                   | `triggered` 必填  | 0                                            | `eventKinds`、`when`、可选冷却             |
| `lifetime`                  | `triggered` 限时 / 状态绑定                 | `triggered` 必填  | 0                                            | 计时或状态身份                             |
| `layering`                  | `LayeringPolicy`                            | `triggered` 必填  | 0                                            | 分组键、上限、满层策略                     |
| `cooldown`                  | `CooldownPolicy`                            | `Trigger` 可选    | 0                                            | 按分组与分区计时                           |
| `uniqueness`                | `UniquenessPolicy`                          | contribution 可选 | 0                                            | 按 key + 作用域选择来源                    |
| `scope`                     | `entity` / `hit`                            | contribution 必填 | 350 / 577                                    | `hit` 才能读命中事实                       |
| `beneficiary`               | `TargetSelector`                            | contribution 必填 | holder 693 / team 231 / team-except-holder 3 | 与 target 和命中上下文联动                 |
| `operation.kind`            | 封闭联合                                    | 必填              | 见下表                                       | 决定数值落点与专用结算                     |
| `phase` / `target`          | modification 专用                           | modification 必填 | 4 条均为 configuration/effect                | 修改目标必须是已定义规则或状态             |

当前 `operation.kind` 分布（931 条）：

| 类别                               | 数量 | 说明                        |
| ---------------------------------- | ---: | --------------------------- |
| `factor-contribution`              |  514 | 通道贡献                    |
| `stat-adjustment`                  |  385 | 属性调整；其中 `direct` 156 |
| `hit-adjustment`                   |   21 | 独立伤害项倍率              |
| `guaranteed-critical`              |    2 | 必定暴击                    |
| `alice-core-periodic-damage`       |    1 | 爱丽丝周期伤害              |
| `astra-yao-m4-quick-assist-damage` |    1 | 耀嘉音 M4 附伤              |
| `lucy-guard-boar-inheritance`      |    1 | 露西小猪继承                |
| `lucy-guard-boar-m6-damage`        |    1 | 露西 M6 猪雨                |
| `stun-damage-replacement`          |    1 | 叶瞬光帷幕失衡替代          |
| `modification` 规则                |    4 | 参数/输出修改               |

**类型允许但当前为 0**：`instant` 规则、`continuous` 激活、`triggered` 激活、
`trigger` / `lifetime` / `layering` / `cooldown` / `uniqueness`、`RuleSet.states`。
`actions` 只有 1 条。不要把“类型已实现”误读为“数据已验证”。

### 2.2 目录层

正式类型是 [`StaticCatalogVariant`](../../packages/shared/src/effects.ts) 与
[`StaticCatalogMechanism`](../../packages/shared/src/effects.ts)；
校验与消费在 [`internal/static-catalog.ts`](../../packages/core/src/effects/internal/static-catalog.ts)。

| 字段                             | 类型            | 可选性 |          当前使用 | 机制含义                                      |
| -------------------------------- | --------------- | ------ | ----------------: | --------------------------------------------- |
| `option.exclusiveGroup`          | `string`        | 可选   |         13 个选项 | 目录选择层同组互斥（按 `bindingId`）          |
| `variant.target`                 | `self` / `team` | 可选   |         68 个变体 | 覆盖 option target，不是机制开关              |
| `variant.damageItemRequirements` | 非空数组        | 可选   |         22 个变体 | 独立结算项发现与校验                          |
| `variant.exclusiveDamageItem`    | `true`          | 可选   |          7 个变体 | 命中只能包含声明的唯一项                      |
| `layerCountInputName`            | `string`        | 可选   |          3 个变体 | `selection.layers` → count 输入桥             |
| `holderLevelInputName`           | `string`        | 可选   |          1 个变体 | holder 等级 → count 输入桥                    |
| `windsweptDirectDamage`          | 对象            | 可选   |          1 个变体 | 风化直接伤害资格 0/1 输入                     |
| `elementBuffInputs`              | 非空数组        | 可选   |          2 个变体 | 元素增益有效集合 → 0/1 输入                   |
| `declaredTeammateBeneficiary`    | `true`          | 可选   |          1 个变体 | 调用方逐次声明同队受益者                      |
| `squadUniqueEffect`              | `true`          | 可选   |          1 个变体 | 跨绑定全队唯一                                |
| `parameterMapping`               | 对象            | 可选   |          1 个变体 | 耀变精通受限换算                              |
| `variant.status`                 | 三值字面量      | 必填   | 1,235 / 122 / 110 | 覆盖状态；`reason`/`explanation` 只作证据说明 |

`variant.damageItemRequirements` 的 22 个变体全部只有 1 项要求；其中
`requiredDirectMultiplier` 18、`requiredSkillCategory` 16、
`requiredCriticalRateDeclaration` 4、`originalAnomalyAttribute` 1。
`source` 为 `holder-current` 19 / `anomaly-source` 3；`role` 为 base 21 / settlement 1。

### 2.3 机制组合实际统计

1,467 个目录变体中，只有 **30 个（2.0%）** 使用至少一个机制 optional 字段：

| 组合                                           | 变体数 | 代表                               |
| ---------------------------------------------- | -----: | ---------------------------------- |
| `damageItemRequirements` 单独                  |     13 | 猫又爪印、伊芙琳 M6、仪玄落雷      |
| `damageItemRequirements + exclusiveDamageItem` |      7 | 耀嘉音 M4、比格气缸、星见雅霜灼·破 |
| `damageItemRequirements + layerCountInputName` |      2 | 南宫羽 M6 颤音改（非物理/物理）    |
| `layerCountInputName` 单独                     |      1 | 莱特昂扬完整状态                   |
| `holderLevelInputName`                         |      1 | 洛克茜额外能力等级                 |
| `windsweptDirectDamage`                        |      1 | 洛克茜风化直接伤害                 |
| `elementBuffInputs`                            |      2 | 洛克茜核心元素暴击/锐暴            |
| `declaredTeammateBeneficiary`                  |      1 | 莱特 M4 前场回能                   |
| `squadUniqueEffect`                            |      1 | 绯月银棺全队增伤                   |
| `parameterMapping`                             |      1 | 蕾米埃尔耀变精通映射               |

其余目录结构：

- 9 个变体各自引用多条规则（莱特/柚叶/蕾米埃尔 2 条，菲欧妮 12/16/17 条）；
- 13 个选项有 `option.exclusiveGroup`；7 条规则有 `activation.exclusiveGroup`；
  两者作用域不同，不能互相替代；
- `mechanisms` 4 项：`lucy-guard-boar`、`remielle-special-voidflare`、
  `astra-yao-m4-quick-assist-damage`、`alice-core-periodic-damage`；
  其中 3 项共绑定 7 个选项（露西 5、耀嘉音 1、爱丽丝 1），蕾米埃尔不绑定选项。

### 2.4 生成层与作者层

- [`supplements.ts`](../../packages/data/scripts/static-effects/supplements.ts) 的
  `SupplementVariantSpec` 镜像了共享类型的 9 个机制字段，并在
  [`convert.ts`](../../packages/data/scripts/static-effects/convert.ts) 中逐字段透传。
  当前 101 条补充记录（68 integrated / 33 out-of-scope），生成 72 条规则、63 个选项。
- [`mechanisms.ts`](../../packages/data/scripts/static-effects/mechanisms.ts) 只生成蕾米埃尔读取元数据；
  露西、耀嘉音、爱丽丝的 mechanism 绑定散落在 `lucy-guard-boar.ts`、`convert.ts` 与补充登记中。
- [`authoring/types.ts`](../../packages/data/scripts/static-effects/authoring/types.ts) 是封闭子集：
  `AuthoringActivation` 只有 `supplied`；`AuthoringOperation` 只有 4 个 factor channel、
  `stat-adjustment`、`hit-adjustment`；`AuthoringCondition` 只有 5 种；
  `AuthoringMechanism` 只有 `single-rule` / `complete-state` / `independent-settlement` / `unsupported`。
- [`authoring/compile.ts`](../../packages/data/scripts/static-effects/authoring/compile.ts) 的
  `EXPRESSIBLE_VARIANT_FIELDS` 不含 `layerCountInputName`、`holderLevelInputName`、
  `windsweptDirectDamage`、`elementBuffInputs`、`declaredTeammateBeneficiary`、
  `squadUniqueEffect`、`parameterMapping`；选中这些基线条目会**明确拒绝**而不是静默丢弃。
  `damageItemRequirements` / `exclusiveDamageItem` 只允许由 `independent-settlement` 生成。
- 当前作者记录 19 条：14 条 `single-rule`、2 条 `complete-state`、3 条
  `independent-settlement`、0 条 `unsupported`；补充来源只按 `supplementId` 原位替换
  coverage 记录，不能表达 `SupplementVariantSpec` 的机制字段。

**结论**：authoring 层不是“少写几个字段”，而是无法表达当前 30 个机制变体中的 10 个：
`layerCountInputName` 3（含南宫羽 2 个同时带伤害项要求的变体）、
`holderLevelInputName` 1、`windsweptDirectDamage` 1、`elementBuffInputs` 2、
`declaredTeammateBeneficiary` 1、`squadUniqueEffect` 1、`parameterMapping` 1。
其余 20 个变体可由 `independent-settlement` 表达。

## 3. 消费者地图

### 3.1 按层

| 层            | 位置                                                                                                  | 依赖的机制字段                                                                        | 读写             | 契约级别   |
| ------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------- | ---------- |
| shared        | `effects.ts` `Activation` / `ContributionRule` / `StaticCatalogVariant` / `StaticCatalogMechanism`    | 全部                                                                                  | 类型定义         | 公开       |
| core 解析     | `parse-effect-rule-set.ts`、`internal/rule.ts`                                                        | `kind`、`activation`、`trigger`、`lifetime`、`layering`、`uniqueness`、专用 operation | 读 + 校验        | 公开运行时 |
| core 执行     | `internal/prepare.ts`、`state.ts`、`evaluate.ts`、`advance.ts`、`modification.ts`                     | 激活、层数、互斥组、唯一性、生命周期                                                  | 读 + 执行        | 运行时     |
| core 目录     | `internal/static-catalog.ts`                                                                          | 全部 variant 机制字段、option 互斥组、`mechanisms` 绑定                               | 读 + 校验 + 选择 | 公开运行时 |
| core 具名机制 | `alice-core-periodic.ts`、`astra-yao-m4.ts`、`lucy-guard-boar*.ts`、`special-voidflare.ts`            | `mechanisms[]` 与对应 rule/option/target                                              | 读 + 校验        | 公开运行时 |
| core 静态伤害 | `internal/static-damage.ts`                                                                           | `windsweptDirectDamage`、具名机制分支                                                 | 读               | 运行时     |
| data 转换     | `convert.ts`                                                                                          | 全部字段的生成                                                                        | 写               | 生成器     |
| data 补充     | `supplements.ts`                                                                                      | `SupplementVariantSpec` 镜像                                                          | 写               | 内部脚本   |
| data 作者     | `authoring/types.ts`、`compile.ts`                                                                    | 子集；未建模字段拒绝                                                                  | 读 + 写          | 内部脚本   |
| data-product  | `static-coverage.ts`                                                                                  | catalog 顶层键、`mechanisms` 数量、variant 子集                                       | 读               | 内部 CLI   |
| 清单/发布     | `manifests.ts`、`prepare-publication.ts`、`prepare-calculation-data.ts`、`definitions-publication.ts` | 制品字节、`mechanismCount`、`snapshotId`                                              | 读 + 写          | 构建/发布  |
| 测试          | `core/test/effects/*`、`data/test/*`                                                                  | 见 5.3                                                                                | 读               | CI         |
| 文档          | `specs/effects/*`、`specs/data/*`、`specs/core/static-calculation.md`、`specs/data/consumption.md`    | 字段语义与计数                                                                        | 文本             | 规范       |

### 3.2 公开契约与内部实现

**公开契约**（`@randomplay/core` 类型导出、`@randomplay/data` JSON 子路径）：

- `RuleSet` / `EffectRule` / `Activation` / `Trigger` / `TriggeredLifetime` / `LayeringPolicy` / `UniquenessPolicy`；
- `StaticEffectCatalog` / `StaticCatalogOption` / `StaticCatalogVariant` / `StaticCatalogMechanism`；
- `static.json`、`static-catalog.json`、`static-coverage.json` 的实际 JSON 形状；
- `CalculationDataVersion.contractVersion` 与 `snapshotId`。

**内部实现**：

- `SupplementVariantSpec` / `SupplementRuleSpec` / `AuthoringMechanism`（只在 scripts 内）；
- `convert.ts` 的 `semantics.ts` 登记键、`mechanisms.ts` 构造逻辑；
- `internal/*` 校验器与选择循环的函数边界；
- `static-coverage.json` 的覆盖明细（包括其 `reason`）被视为审计输出，而不是计算输入。

`data-product` 的 `parseStaticCatalog` 会断言 catalog 顶层键（含 `mechanisms`）与 option 键，
但 **variant 解析不拒绝未知键**，只读取
`target/configuration/status/references/effectIds/maximumLayers/inputs/differences/reason/explanation`。
因此变体字段收敛对 P1-1 读取器是安全的；把 `mechanisms` 从数组改成对象则不安全
（`mechanismCount` 直接取数组长度）。

## 4. 收敛方案

### 4.1 推荐：目录变体 `mechanism` 判别联合

在 `StaticCatalogVariant` 上增加一个可选的 `mechanism`，把 9 个并列 optional 字段收进一个判别联合：

```ts
type StaticCatalogVariantMechanism =
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
  | { kind: "windswept-direct"; metadata: StaticCatalogWindsweptDirectDamage }
  | {
      kind: "element-buff-inputs"
      inputs: NonEmpty<{ element: DamageElement; inputName: string }>
    }
  | {
      kind: "luminize-proficiency-mapping"
      mapping: StaticCatalogParameterMapping
    }

interface StaticCatalogVariant {
  // ...现有非机制字段不变
  readonly mechanism?: StaticCatalogVariantMechanism
}
```

`variant.maximumLayers` 仍是变体级字段：`complete-state` 时它表示逻辑层数上限，
规则侧仍必须是一次 `supplied` 且 `maximumLayers` 为字面量 1。
`option.exclusiveGroup`、`variant.target`、`status/reason/explanation` 不进入该联合。
`StaticCatalogWindsweptDirectDamage` 与 `StaticCatalogParameterMapping` 是建议从现有匿名字段提取的具名类型。
`independent-settlement.completeState` 目前只覆盖南宫羽 2 个变体；若未来“独立结算 + 层数桥”
组合增多，应改为通用 bridge 数组，而不是继续加嵌套字段。

**为什么不是全局单一联合**：规则激活在 `parseEffectRuleSet` 时校验，目录选择在
`calculateStaticDamageFromCatalog` 时校验，蕾米埃尔读取在 damage 输入时校验；
三者分别属于不同制品与不同消费入口。合并会要求规则制品携带目录选择元数据，
或要求解析规则时跨制品 join，违反 `parseRuleSet` 的独立契约。共享**判别词汇**，
而不是共享一个对象，才是可验证的边界。

### 4.2 迁移映射

| 旧字段                                             | 新位置                                                         | 迁移规则                    | 不变量                                                                                                                                         |
| -------------------------------------------------- | -------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `damageItemRequirements`                           | `mechanism.damageItemRequirements`（`independent-settlement`） | 原数组原序复制              | 非空；`itemId` 唯一；每项只对应一个真实伤害项                                                                                                  |
| `exclusiveDamageItem: true`                        | `mechanism.isolateDamageItems: true`                           | 仅 `independent-settlement` | 恰好一个 requirement；启用时命中项集合必须完全相等                                                                                             |
| `layerCountInputName`（无 damageItemRequirements） | `mechanism.layerCountInputName`（`complete-state`）            | 1:1                         | 恰好一条 supplied 贡献（字面量 1 层）消费该 count 输入；`variant.maximumLayers` 为逻辑上限                                                     |
| `layerCountInputName`（有 damageItemRequirements） | `mechanism.completeState.layerCountInputName`                  | 嵌套                        | 同上；`damageItemRequirements` 规则不变                                                                                                        |
| `holderLevelInputName`                             | `mechanism.holderLevelInputName`（`holder-level`）             | 1:1                         | `variant.maximumLayers === 1`；同一条单实例贡献消费；不得与其他输入同名                                                                        |
| `windsweptDirectDamage`                            | `mechanism.metadata`（`windswept-direct`）                     | 1:1                         | `applierTeam: "holder"`；`variant.maximumLayers === 1`；唯一 hit 作用域、无条件、`windswept-direct-damage-coefficient-increase` 贡献消费该输入 |
| `elementBuffInputs`                                | `mechanism.inputs`（`element-buff-inputs`）                    | 1:1                         | 非空；元素与输入名均唯一；`variant.maximumLayers === 1`；每条输入由唯一 supplied 单实例贡献的 `when` 消费                                      |
| `declaredTeammateBeneficiary: true`                | `mechanism.kind = "declared-teammate-beneficiary"`             | 去掉布尔值                  | 有效 target 为 `team`；启用的选择必须带 `beneficiaryActorId`；受益者同队且非 holder                                                            |
| `squadUniqueEffect: true`                          | `mechanism.kind = "squad-unique"`                              | 去掉布尔值                  | 同队同 optionId 最多一个启用来源；0 层不占名额                                                                                                 |
| `parameterMapping`                                 | `mechanism.mapping`（`luminize-proficiency-mapping`）          | 1:1                         | 恰好一条 `luminize-proficiency-input` 贡献；`source` 与表达式匹配                                                                              |
| `variant.target`                                   | 不变                                                           | 不是机制                    | 有效 target = `variant.target ?? option.target`                                                                                                |
| `option.exclusiveGroup`                            | 不变                                                           | 目录选择互斥                | 按 `(bindingId, group)` 最多一个启用选项                                                                                                       |
| `activation.exclusiveGroup`                        | 不变                                                           | 规则层互斥                  | 按 binding 的同组 supplied 规则最多一条                                                                                                        |

**新增不变量**：

1. 一个变体最多一个 `mechanism`；省略即普通静态贡献。
2. 联合的每个 arm 只允许其字段；不再通过“字段是否存在”推断机制。
3. 同一变体内所有派生输入名（`inputs`、layer、holder-level、element、windswept）互不重名。
4. `effectIds` 必须非空且属于该选项的目录实体；`mechanism` 的存在不改变身份校验。
5. `status` 与 `reason` 只描述覆盖状态；不得用 `reason` 代替机制 kind。
6. JSON 键序由生成器固定；迁移只改语义位置，不改数值、引用与 effectId。

### 4.3 备选方案

| 方案 | 做法                                                                | 优点                                          | 缺点                                                                   | 建议                            |
| ---- | ------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------- |
| A    | 保持现状，只补强跨字段校验                                          | 无破坏、无快照变动；最快                      | 9 个并列字段仍在；非法组合仍可表达；每新增机制要再加一个 optional 字段 | 若 Phase 4 不新增机制族，可接受 |
| B    | 只收敛目录变体 optional 字段（4.1）                                 | 判别明确；校验集中；authoring 只做一个 switch | 破坏公开类型与制品字节；30 个变体迁移；联合 arm 可能增长               | **推荐**                        |
| C    | 把规则激活、instant/triggered、目录选择、根部 `mechanisms` 全部合并 | 词汇最统一                                    | 0 数据验证的 arm；跨制品 join；破坏面最大                              | 不做                            |

### 4.4 不保留兼容读取的影响

| 项                                     | 影响                                                                                                 | 建议                                                                     |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `StaticEffectCatalog.schemaVersion`    | 目录形状破坏                                                                                         | 1 → 2                                                                    |
| `RuleSet.schemaVersion`                | 规则形状不变则不变                                                                                   | 1（若同时改规则再升 2）                                                  |
| `CALCULATION_CONTRACT_VERSION`         | `StaticCalculationData` 内含 catalog；新 core 不能读旧 data，反之亦然                                | 2 → 3（若用户决定只把 catalog 当数据外壳，可保留 2，但需在消费文档写明） |
| `revision`                             | 三个 effects 制品共享 revision                                                                       | 51 → 52                                                                  |
| `snapshotId`                           | `static-catalog.json` 字节进入摘要                                                                   | 必变；当前基线为 `sha256:02398d0f…`（主工作区生成物）                    |
| `publication.json`                     | 只描述 integrated 归档 → 发布派生，不含 definitions                                                  | 不变                                                                     |
| `definitions-publication.json`         | 覆盖 `dist/definitions` 全部文件                                                                     | 重新生成，sha/bytes 变化                                                 |
| data-product `static-effects` manifest | artifacts 的 sha256/bytes                                                                            | 重新生成；`mechanismCount` 仍为 4                                        |
| consumers                              | 构造 `StaticCatalogVariant` 的代码编译失败；旧 core 拒绝新 catalog（未知键），新 core 拒绝旧 catalog | 与 `@randomplay/core`/`@randomplay/data` 同版发布，建议 `0.5.0`          |
| `loadIndex` / integrated v4            | 不涉及                                                                                               | 不变                                                                     |

## 5. 迁移拆分

### 5.1 为什么不能把 shared 类型与 core parser 先拆成两个绿色 PR

在“不做兼容读取”的前提下：

- 新 parser 只接受 `mechanism`，旧 `static-catalog.json` 会被拒绝；
- 新 converter 只产出 `mechanism`，旧 parser 会因未知字段拒绝；
- 因此不存在“只改 shared+parser、不换制品”的绿色中间态。

可选做法只有两种：

1. **一个原子 PR**：shared 类型 + core 校验 + converter/supplements + 三个制品 + 测试。
   推荐；变更集中、回滚边界清晰。
2. **临时双形状窗口**：每个 family 一个 PR，parser 同时接受旧字段与新 `mechanism`，
   全部 family 迁移完成后删除旧字段。需要用户明确授权“临时兼容读取”并给出删除截止点；
   与本次任务“不做兼容读取”的约束冲突，默认不采用。

### 5.2 建议的 PR 序列

| 步骤 | 主题                              | 输入                                                                     | 输出                                                                                     | 主要风险                                | 回滚边界                           | 建议               |
| ---- | --------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------- | ------------------ |
| P4-0 | 本盘点                            | 当前代码/制品                                                            | 本文档 + 索引入口                                                                        | 无                                      | 仅 docs                            | 现在               |
| P4-1 | authoring 机制覆盖                | `authoring/types.ts`、`compile.ts`、当前 19 条记录                       | 作者层可表达 30 个机制变体；具名机制元数据保持基线；等价 harness 仍 0 diff；不改正式制品 | canonical 视图、未建模字段拒绝          | 纯 scripts/tests，回滚无制品影响   | **先做**           |
| P4-2 | 目录变体 `mechanism` 联合（原子） | shared、core `static-catalog.ts`、convert/supplements、三个 effects 制品 | 30 个变体迁移；删除 9 个旧字段；`schemaVersion` 2、`revision` 52、`snapshotId` 更新      | 公开契约、golden、snapshot 链           | 整个 PR（含制品）一起回滚          | **做**             |
| P4-3 | 目录根部 `mechanisms` envelope    | 4 个具名机制、core 四个 validator、converter                             | 统一 `binding` 与引用闭合；payload 保持具名                                              | 具名机制、data-product `mechanismCount` | 只影响 `mechanisms` 块，可独立回滚 | 后做/条件做        |
| P4-4 | 文档与发布                        | 规范、修订记录、消费文档、release notes                                  | revision 52 记录、contractVersion 说明、0.5.0 发布说明                                   | 文档漂移、计数过期                      | docs/release only                  | 与 P4-2 同批或紧随 |
| P4-5 | activation/instant/triggered 收敛 | 规则类型、evaluator                                                      | 不实施                                                                                   | 无数据验证                              | 不做                               | **不做**           |

如果用户接受临时双形状窗口，P4-2 可再拆为
“settlement family（22 个变体）→ selection/input family（8 个变体）”，
但必须在同一 release 内完成，且最终状态不保留旧字段。

### 5.3 先做 / 后做 / 不做

- **先做**：P4-1。它不影响正式制品，能先证明 authoring 可以覆盖全部机制，
  并暴露 canonical 比较、补充记录与 mechanism 投影的真实缺口。
- **做**：P4-2。当前唯一同时满足“有真实数据、重复校验、authoring 断层”的收敛点。
- **后做/条件做**：P4-3。只有出现第 5 个具名机制、第二个 `mechanisms` 消费者，
  或需要跨机制统一查询时再做。
- **不做**：P4-5；把 `activation.exclusiveGroup`、`option.exclusiveGroup`、
  `squadUniqueEffect` 改名合并；为兼容旧制品保留旧字段。
- **不做**：一个跨规则/目录/来源的全局 `mechanisms` 单联合。

## 6. 风险与未决问题

### 6.1 风险

1. **数据迁移**：30 个变体的迁移是机械的，但会改变 `static-catalog.json` 的键序与字节；
   三个 effects 制品共享 revision，必须同批重生成。任何手写 JSON 都会绕过生成器守卫。
2. **公开契约**：`StaticCatalogVariant` 是 `@randomplay/core` 的公开类型，且 `static-catalog.json`
   是 `@randomplay/data` 的公开子路径；破坏性变更必须与两个包同版发布。
3. **测试矩阵**：现有 1,866 条 `static-catalog` 用例覆盖真实制品与合成变体，但没有覆盖
   “多个机制 arm 组合”的负例；需要为每个 arm 增加类型反例与运行时负例。
4. **序列化/性能**：嵌套对象只影响 30 个变体，体积变化可忽略；校验循环次数不变。
   主要成本是 `snapshotId`、golden 与摘要 fixture 的全量刷新，不是运行时性能。
5. **authoring 安全网**：P4-2 先于 P4-1 时，所有选中机制变体的作者记录会被
   `EXPRESSIBLE_VARIANT_FIELDS` 拒绝；这是安全失败，但会阻塞迁移，因此建议 P4-1 先行。
6. **双事实来源**：`supplements.ts` 镜像共享类型；若只改 shared 不改 supplements，
   生成器会产出半新半旧形状。需要用 `satisfies` 或类型级测试钉住镜像。
7. **根部 envelope**：`mechanismCount` 被 data-product 与结构基线读取；把数组改成对象
   或改变成员形状会影响 P1-1，应在 P4-3 单独验收。

### 6.2 需要用户拍板的开放问题

1. **迁移方式**：接受一个原子 PR，还是授权临时双形状窗口并按 family 拆分？
2. **`contractVersion`**：按推荐升到 3、发 `0.5.0`，还是只升 catalog `schemaVersion`、
   保留 2 并把 catalog 视为数据外壳？
3. **根部 `mechanisms`**：现在就做统一 envelope，还是等第 5 个具名机制/第二个消费者出现？
4. **未来机制**：Phase 4 是否已计划 `triggered` / `instant` / `continuous` 数据？
   如果是，是否现在就在联合里预留 arm；如果不是，明确不预留。
5. **`damageItemRequirements`**：22 个变体都只有 1 项；是否收窄为单对象？
   建议保留数组，以免阻断未来的多项独立结算。
6. **机制命名**：是否采用 `mechanism`（变体级）与现有 `mechanisms`（目录级）的单复数命名？
7. **authoring 归属**：`mechanisms.ts`、`lucy-guard-boar.ts`、`convert.ts` 中的具名机制
   是否迁入 authoring，还是继续由生成器内部维护？
8. **`status/reason`**：是否继续与 `mechanism` 分离？建议分离，避免把证据状态误当机制类型。

## 7. 证据

### 7.1 基线

- `origin/main` / 工作区 HEAD：`0d94faddc420cd85cea93f7755a54d723eaca1da`。
- `static.json` SHA-256：`3a30bd0e5e5bc8fc2087163da1fc5e857cbca71ccc1bf2bf8c3b2777193ce823`。
- `static-catalog.json` SHA-256：`c8455d57b00a0329da50841e4d1a0bcc7e35bc28fd2b4319520dba01ab1c670c`。
- `static-coverage.json` SHA-256：`6cb0457f6a3456a23b82439d064f092825949a8fa71be0500aea025cd6ce2c5b`。
- 当前 `snapshotId`：`sha256:02398d0fc76b4eed4bd7aaccd1370f8c161b5331266a0442c1f54ee67668f03c`
  （主工作区 `.generated/calculation-data.ts`；与 `static-e2e.test.ts` 的固定值一致）。
- 主工作区数据管理状态：`phase: idle`，`indexSha256`
  `d68ad1d80b203b9633f2cd6d176e4051c15c52f2ea3c0d71a2d2310c8b1a1b6d`
  与 `packages/data/integrated/index.json` 实际 SHA-256 一致；本 PR 未写入管理记录。

### 7.2 统计命令

本次盘点使用临时脚本（未入库），核心统计可复现为：

```bash
node - <<'NODE'
const fs = require('node:fs')
const r = JSON.parse(fs.readFileSync('packages/data/definitions/effects/static.json', 'utf8'))
const c = JSON.parse(fs.readFileSync('packages/data/definitions/effects/static-catalog.json', 'utf8'))
const count = (xs, f) => xs.reduce((m, x) => ((m[f(x)] = (m[f(x)] ?? 0) + 1), m), {})
console.log('rules', r.effects.length, count(r.effects, (e) => e.kind))
console.log('activation', count(r.effects.filter((e) => e.kind === 'contribution'), (e) => e.activation.kind))
console.log('options', c.options.length, 'variants', c.options.reduce((n, o) => n + o.variants.length, 0))
console.log('mechanisms', c.mechanisms.map((m) => m.mechanism))
const flags = ['damageItemRequirements','layerCountInputName','holderLevelInputName','windsweptDirectDamage','elementBuffInputs','declaredTeammateBeneficiary','squadUniqueEffect','parameterMapping','exclusiveDamageItem']
const combos = {}
for (const o of c.options) for (const v of o.variants) {
  const present = flags.filter((f) => v[f] !== undefined)
  if (present.length) combos[present.join('+')] = (combos[present.join('+')] ?? 0) + 1
}
console.log('variant mechanism combos', combos)
NODE
```

输出摘要：931 条规则（927 contribution / 4 modification）；927 条 `supplied`，
`continuous`/`triggered`/`instant` 均为 0；986 个选项、1,467 个变体；
30 个变体使用机制字段；组合分布见 2.3。

### 7.3 测试与检查

| 入口                                                                                                                                         | 结果                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `pnpm --filter @randomplay/core exec vitest run test/effects/static-catalog.test.ts test/effects/static-catalog-data.test.ts --reporter=dot` | 2 个文件、1,866 个测试通过（67.22s）                                                      |
| `pnpm check:quality`                                                                                                                         | 通过；oxlint 0 errors（仓库既有 127 warnings）、oxfmt 与 spec 类型检查通过、core 构建通过 |
| `git diff --stat origin/main`                                                                                                                | 仅 `docs/` 文件                                                                           |
| `pnpm --filter @randomplay/core verify:pack` / `pnpm --filter @randomplay/data verify:pack`                                                  | 迁移 PR 的必跑项；本 docs-only PR 不改变制品                                              |
| `.github/workflows/check.yml` 6 项                                                                                                           | Source/Package × Node 24.11.0/24 + 两个 gate                                              |

### 7.4 关键文件

- 类型：[`packages/shared/src/effects.ts`](../../packages/shared/src/effects.ts)
- 解析：[`packages/core/src/effects/parse-effect-rule-set.ts`](../../packages/core/src/effects/parse-effect-rule-set.ts)、
  [`internal/rule.ts`](../../packages/core/src/effects/internal/rule.ts)
- 目录校验/消费：[`internal/static-catalog.ts`](../../packages/core/src/effects/internal/static-catalog.ts)
- 具名机制：[`internal/alice-core-periodic.ts`](../../packages/core/src/effects/internal/alice-core-periodic.ts)、
  [`internal/astra-yao-m4.ts`](../../packages/core/src/effects/internal/astra-yao-m4.ts)、
  [`internal/lucy-guard-boar-rules.ts`](../../packages/core/src/effects/internal/lucy-guard-boar-rules.ts)、
  [`internal/special-voidflare.ts`](../../packages/core/src/effects/internal/special-voidflare.ts)
- 生成：[`convert.ts`](../../packages/data/scripts/static-effects/convert.ts)、
  [`supplements.ts`](../../packages/data/scripts/static-effects/supplements.ts)、
  [`mechanisms.ts`](../../packages/data/scripts/static-effects/mechanisms.ts)
- 作者层：[`authoring/types.ts`](../../packages/data/scripts/static-effects/authoring/types.ts)、
  [`authoring/compile.ts`](../../packages/data/scripts/static-effects/authoring/compile.ts)
- 读取器：[`data-product/static-coverage.ts`](../../packages/data/scripts/data-product/static-coverage.ts)、
  [`data-product/manifests.ts`](../../packages/data/scripts/data-product/manifests.ts)
- 发布：[`prepare-calculation-data.ts`](../../packages/data/scripts/prepare-calculation-data.ts)、
  [`definitions-publication.ts`](../../packages/data/scripts/definitions-publication.ts)
- 规范：[`specs/effects/index.md`](../specs/effects/index.md)、
  [`specs/effects/execution.md`](../specs/effects/execution.md)、
  [`specs/data/zzz-hp-static-effects.md`](../specs/data/zzz-hp-static-effects.md)、
  [`specs/data/consumption.md`](../specs/data/consumption.md)、
  [`specs/packages.md`](../specs/packages.md)

### 7.5 盘点中发现的口径问题

- “机制”一词在数据文档中同时指：补充来源机制（`supplement.kind`）、具名机制
  （`catalog.mechanisms`）与机制开关（variant optional 字段）。本文不修改既有规范，
  只建议 Phase 4 统一术语；见 6.2 第 6 项。
- `activation.exclusiveGroup` 与 `option.exclusiveGroup` 同时存在且作用域不同：
  前者按绑定约束 supplied 规则，后者在目录选择阶段约束选项。当前文档没有并列解释两者，
  容易在新增机制时选错层；建议在 P4-2/P4-3 的规范更新中补一节对照。
