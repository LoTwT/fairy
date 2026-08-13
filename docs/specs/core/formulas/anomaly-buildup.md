# 异常积蓄值公式

异常积蓄值公式按照固定顺序组合基础异常积蓄值、异常掌控区、异常积蓄效率区和抗性区，规则来源为
[原始攻略中的异常积蓄值公式](../../../references/zzz-data-introduction.txt#L224)。原始完整公式还包含距离
衰减区；该机制尚不具备可实现规则，因此当前公式只完整支持已经确认不适用距离衰减的计算。

## 身份与公开契约

| 项目        | 定义                                        |
| ----------- | ------------------------------------------- |
| 中文名称    | 异常积蓄值                                  |
| `formulaId` | `anomaly_buildup`                           |
| 身份常量    | `ANOMALY_BUILDUP_FORMULA_ID`                |
| 公开定义    | `anomalyBuildupFormula`                     |
| 输入类型    | `AnomalyBuildupFormulaInput`                |
| 结果类型    | `FormulaResult<AnomalyBuildupFormulaInput>` |

公开类型形态如下。该代码块描述公开契约，不限定内部实现文件中的声明顺序。

```ts
export interface AnomalyBuildupFormulaInput {
  readonly baseAnomalyBuildup: BaseAnomalyBuildupFactorInput
  readonly anomalyMastery: AnomalyMasteryFactorInput
  readonly anomalyBuildupRate: AnomalyBuildupRateFactorInput
  readonly resistance: ResistanceFactorInput
}

export declare const ANOMALY_BUILDUP_FORMULA_ID: "anomaly_buildup"

export declare const anomalyBuildupFormula: Formula<AnomalyBuildupFormulaInput>
```

`AnomalyBuildupFormulaInput` 的每个字段都对应一个具体乘区的完整输入。`resistance` 复用已有
`resistanceFactor`，但调用方必须传入本次攻击属性对应的异常积蓄抗性快照及其调整，不能传入伤害
抗性或失衡抗性。

公式顶层不增加攻击属性、代理人类型、距离、异常槽状态或数据来源字段。

## 输入与默认值

四个字段全部必填，也不接受 `undefined`。调用方已经确认某个倍率乘区在本次计算中应产生恒等倍率
`1` 时，必须显式传入对应乘区公开的默认输入：

| 字段                 | 对应乘区                                             | 恒等输入                                    |
| -------------------- | ---------------------------------------------------- | ------------------------------------------- |
| `baseAnomalyBuildup` | [基础异常积蓄值](../factors/base-anomaly-buildup.md) | 无默认值，必须提供本次基础异常积蓄值        |
| `anomalyMastery`     | [异常掌控区](../factors/anomaly-mastery.md)          | `DEFAULT_ANOMALY_MASTERY_FACTOR_INPUT`      |
| `anomalyBuildupRate` | [异常积蓄效率区](../factors/anomaly-buildup-rate.md) | `DEFAULT_ANOMALY_BUILDUP_RATE_FACTOR_INPUT` |
| `resistance`         | [抗性区](../factors/resistance.md)                   | `DEFAULT_RESISTANCE_FACTOR_INPUT`           |

各常量的精确内容与不可变性由对应乘区规范维护。它们只表示产生恒等倍率 `1` 的计算输入，不表示游戏内
默认属性、默认抗性或默认效果。基础异常积蓄值没有恒等输入；调用方仍可显式传入 `0` 并得到最终结果
`0`。

本次计算存在实际乘区数据时，不得用恒等输入替代该数据并声称结果完整。公式不自动补充、合并或克隆
默认输入，也不公开完整的默认 `AnomalyBuildupFormulaInput`。

## 计算规则

在当前支持边界内，异常积蓄值采用以下乘区组合：

```text
异常积蓄值
= 基础异常积蓄值
  × 异常掌控区
  × 异常积蓄效率区
  × 异常积蓄抗性区
```

`resistanceFactor` 在本公式中产生异常积蓄抗性区结果。具体公式的 `calculate` 必须直接调用四个已定义
的 `Factor`，再以同一顺序相乘。约束形态如下：

```ts
const factorResults = {
  baseAnomalyBuildup: baseAnomalyBuildupFactor.calculate(
    input.baseAnomalyBuildup,
  ),
  anomalyMastery: anomalyMasteryFactor.calculate(input.anomalyMastery),
  anomalyBuildupRate: anomalyBuildupRateFactor.calculate(
    input.anomalyBuildupRate,
  ),
  resistance: resistanceFactor.calculate(input.resistance),
} satisfies FormulaFactorResults<AnomalyBuildupFormulaInput>

const value =
  factorResults.baseAnomalyBuildup *
  factorResults.anomalyMastery *
  factorResults.anomalyBuildupRate *
  factorResults.resistance

return { value, factorResults }
```

一次成功计算必须调用每个乘区一次。即使基础异常积蓄值或其他较早乘区返回 `0`，也不能提前返回；
`factorResults` 必须始终包含全部四项结果。任一乘区抛出错误时，公式立即失败并传播原错误，不返回
部分结果。

乘法使用 JavaScript `number` 的 IEEE 754 语义，并严格保留攻略中当前支持乘区的顺序，不进行代数
重排。`defineFormula` 在公开返回前检查最终 `value` 和全部乘区结果是否有限。

## 距离衰减边界

原始完整公式在异常积蓄抗性区之后还会乘以距离衰减区。当前
[特殊乘区规范](../factors/special.md)确认距离衰减规则不足，禁止建立通用或任意倍率形式的占位乘区。
因此：

- `AnomalyBuildupFormulaInput` 不包含距离、距离衰减类型、预计算距离衰减倍率或占位字段；
- 只有调用方已经确认本次攻击不适用距离衰减时，本公式结果才是完整异常积蓄值；
- 已知本次攻击适用距离衰减但对应乘区尚未实现时，不能把本公式结果声明为完整；
- 无法确认距离衰减是否适用时，调用方必须补充上下文，core 不默认按恒等倍率 `1` 处理。

这些条件发生在公式调用之前。当前输入不包含距离衰减上下文，公式无法在运行时验证调用方是否满足
该前置条件。

## 输入准备

调用方必须在调用公式前完成以下输入准备：

- `baseAnomalyBuildup` 使用本次技能或攻击段已经查表得到的基础异常积蓄值，不能从伤害倍率或等级
  推导；
- `anomalyMastery` 使用本次计算采用的最终异常掌控，向下取整由 `anomalyMasteryFactor` 完成；
- `anomalyBuildupRate` 只包含本次攻击实际适用的异常积蓄效率与异常积蓄值贡献；
- `resistance` 使用本次攻击属性对应的异常积蓄抗性。属性映射和效果适用性遵循
  [抗性区的适用边界](../factors/resistance.md#适用边界)，由调用方判断。

非物理属性代理人的物理伤害无法积蓄物理异常，属于调用方在建立公式输入前处理的适用性规则。公式
不增加 `isApplicable`、代理人属性或攻击属性字段，也不根据基础异常积蓄值是否为 `0` 反推适用性。

代理人和邦布都可以产生异常积蓄。本公式不区分二者；邦布积蓄不参与后续异常伤害的虚拟代理人加权，
不影响本公式计算其当次异常积蓄值。

## 异常触发阈值配套计算

[原始攻略中的异常触发阈值规则](../../../references/zzz-data-introduction.txt#L234-L250)根据阈值档位、阈值表类型和
目标对同一属性已触发异常的次数查询基础阈值，再应用目标固有的基础阈值倍率和当前场景的
阈值倍率。该计算具有独立、确定的输入与算法，由公开 helper 统一维护，不建立额外 `Factor`
或 `Formula`。

`AnomalyTriggerThreshold`、`AnomalyTriggerThresholdTier` 和 `AnomalyTriggerThresholdKind` 是 core
根据攻略建立的规范化标识，不表示游戏文本提供了完整的同名英文词组。
Nanoka 3.1 中的 `element_abnormal` 和 `*_buildup_curve` 是技术字段，不作为公开 API
命名来源。

### 公开契约

```ts
export type AnomalyTriggerThresholdTier = "normal" | "elite" | "boss"

export type AnomalyTriggerThresholdKind = "standard" | "physical"

export interface CalculateAnomalyTriggerThresholdParams {
  readonly thresholdTier: AnomalyTriggerThresholdTier
  readonly thresholdKind: AnomalyTriggerThresholdKind
  readonly previousAnomalyTriggerCountForAttribute: number
  readonly baseThresholdMultiplier: number
  readonly scenarioThresholdMultiplier: number
}

/** 根据已确认的阈值表条件和倍率计算异常触发阈值。 */
export declare function calculateAnomalyTriggerThreshold(
  params: CalculateAnomalyTriggerThresholdParams,
): number
```

`thresholdTier` 选择攻略中的普通、精英或首领阈值档位。它是调用方已解析的查表条件，
不表示 core 对目标的图鉴等阶或实体类型进行了分类。

`thresholdKind` 选择攻略已确认的标准表或物理表。`standard` 只表示本规范中的标准阈值表，
不等同于所有非物理属性。`physical` 表示物理阈值表。调用方必须先确认本次属性应采用哪张表，
再调用 helper。

`previousAnomalyTriggerCountForAttribute` 是同一目标对同一属性已触发异常的次数。`0`
表示即将计算第一次触发所需的阈值，`1` 表示该属性已触发一次，以此类推。计数必须
由调用方从对应属性积蓄槽的状态中取得，只在该属性实际成功触发异常后增加，
且不会随时间重置。helper 不会读取或更新触发次数。

`baseThresholdMultiplier` 是目标固有的基础异常积蓄阈值倍率，`scenarioThresholdMultiplier`
是当前战斗或玩法场景应用的阈值倍率。两个字段都接收已经转换为小数的完整倍率，提升
`20%` 传入 `1.2`，没有对应调整时显式传入 `1`。字段不接收提升贡献值 `0.2`。

当同一语义层存在多个效果时，调用方只能在已确认该层的组合规则后建立最终倍率。helper 不接收
效果来源数组，也不推测同层调整之间如何组合。

### 固定阈值表

helper 必须直接使用下表固定数值。表头 `0`至`8` 表示
`previousAnomalyTriggerCountForAttribute`，`9+` 表示计数大于或等于 `9`。

| `thresholdTier` | `thresholdKind` | `0`  | `1`  | `2`  | `3`  | `4`  | `5`  | `6`  | `7`  | `8`  | `9+` |
| --------------- | --------------- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| `normal`        | `standard`      | 600  | 612  | 624  | 636  | 648  | 660  | 673  | 686  | 699  | 712  |
| `normal`        | `physical`      | 720  | 734  | 748  | 762  | 777  | 792  | 807  | 823  | 839  | 855  |
| `elite`         | `standard`      | 2250 | 2295 | 2340 | 2386 | 2433 | 2481 | 2530 | 2580 | 2631 | 2683 |
| `elite`         | `physical`      | 2700 | 2754 | 2809 | 2865 | 2922 | 2980 | 3039 | 3099 | 3160 | 3223 |
| `boss`          | `standard`      | 3000 | 3060 | 3121 | 3183 | 3246 | 3310 | 3376 | 3443 | 3511 | 3581 |
| `boss`          | `physical`      | 3600 | 3672 | 3745 | 3819 | 3895 | 3972 | 4051 | 4132 | 4214 | 4298 |

物理表的数值必须逐项保留，不得在运行时通过标准表乘以 `1.2` 推导。攻略已给出经过处理的整数表值，
后续档位会出现 `612 * 1.2 = 734.4`、但物理表明确记录为 `734` 的差异。

### 计算规则

helper 按以下顺序计算：

```text
表格索引 = min(previousAnomalyTriggerCountForAttribute, 9)

表格阈值 = 查询 thresholdTier 和 thresholdKind 对应表的表格索引项

异常触发阈值
= 表格阈值
  * baseThresholdMultiplier
  * scenarioThresholdMultiplier
```

`previousAnomalyTriggerCountForAttribute` 大于 `9` 时始终使用 `9+` 档，不继续外推阈值增长公式。

乘法使用 JavaScript `number` 的 IEEE 754 语义，并严格保留“表格阈值、基础阈值倍率、场景阈值倍率”
的顺序。helper 不对最终值取整、截断或格式化，也不为了使结果接近攻略展示整数而修正浮点误差。

攻略给出的首次触发示例为：

| `thresholdTier` | `thresholdKind` | `baseThresholdMultiplier` | `scenarioThresholdMultiplier` | 十进制数学结果 |
| --------------- | --------------- | ------------------------- | ----------------------------- | -------------- |
| `boss`          | `standard`      | `1.2`                     | `1.1`                         | `3960`         |
| `boss`          | `physical`      | `1.2`                     | `1.1`                         | `4752`         |
| `boss`          | `standard`      | `1.1`                     | `1.1`                         | `3630`         |
| `boss`          | `physical`      | `1.1`                     | `1.1`                         | `4356`         |

表中结果是攻略使用的十进制数学表达。JavaScript 运行时返回的 `number` 可以保留 IEEE 754
浮点误差，测试不得因此向 helper 加入未经来源确认的取整规则。

### 阈值表选择边界

攻略明确记录，黄金邦布和白金邦布在图鉴中归为 `1` 阶敌人，却采用精英阈值；渔人蟹在图鉴中归为
`2` 阶敌人，却采用首领阈值。因此 helper 不接收图鉴等阶、敌人 ID 或名称，也不根据这些值推导
`thresholdTier`。

Nanoka 3.1 技术数据中存在风属性专用的积蓄曲线，引用数据中的目标选择了
该曲线，可见
[Nanoka 3.1 敌人数据中的曲线选择](../../../../packages/data/raw/nanoka/3.1/en/monster/10001.json#L1540-L1545)。将
[同文件中的技术表值](../../../../packages/data/raw/nanoka/3.1/en/monster/10001.json#L2487-L2517)与攻略已知的六组首次触发阈值对照，
可推断 `10006 / 20006 / 30006` 对应的 `300 / 1150 / 1500` 是另一组普通、精英和首领
基准值。这是对技术字段的对照推断，不是 Nanoka 提供的公开字段契约。

这组基准值不等于攻略中的标准表，当前规则也没有给出风属性在各次触发后的完整阈值表。
`AnomalyTriggerThresholdKind` 因此不包含 `wind`，也不将 `standard` 解释为所有非物理属性。

烈霜、玄墨、凛刃等特殊属性应采用哪张阈值表，也必须由调用方根据已确认规则选择。helper 不接收
属性名、不做属性映射，也不允许使用一个任意表值绕过 `thresholdKind` 的闭集。

helper 只计算一个已选定表的异常触发阈值。它不负责：

- 从 Nanoka 实体、图鉴等阶、敌人标签或属性名建立查表条件；
- 读取当前异常积蓄值，比较积蓄值与阈值，或计算剩余积蓄量；
- 判断异常是否在冷却时间内，触发异常状态，或更新异常槽与触发次数；
- 记录、过滤或分配用于后续虚拟代理人加权的有效异常积蓄；
- 推导同一语义层内多个阈值调整的组合规则。

### 有效性与失败行为

| 失败条件                                                         | 行为              |
| ---------------------------------------------------------------- | ----------------- |
| 参数不是非数组对象或为 `null`                                    | 抛出 `TypeError`  |
| `thresholdTier` 不是字符串                                       | 抛出 `TypeError`  |
| `thresholdTier` 不在三个受支持值中                               | 抛出 `RangeError` |
| `thresholdKind` 不是字符串                                       | 抛出 `TypeError`  |
| `thresholdKind` 不在 `standard` 或 `physical` 中                 | 抛出 `RangeError` |
| `previousAnomalyTriggerCountForAttribute` 不是 `number`          | 抛出 `TypeError`  |
| `previousAnomalyTriggerCountForAttribute` 不是有限整数或小于 `0` | 抛出 `RangeError` |
| 任一阈值倍率不是 `number`                                        | 抛出 `TypeError`  |
| 任一阈值倍率不是有限数值或小于 `1`                               | 抛出 `RangeError` |
| 最终异常触发阈值不是有限数值                                     | 抛出 `RangeError` |

当前来源只确认阈值保持不变或提升，因此两个倍率的有效范围是 `[1, +Infinity)` 中的有限数值。
如果后续取得阈值降低的可复现规则，应根据新语义修订字段值域，不在当前规范中预留未确认的输入。

参数对象不得被修改。多个失败条件同时存在时，不承诺字段校验错误的优先级。

## 取整与累计边界

异常掌控向下取整由 `anomalyMasteryFactor` 在乘区内部完成。其他三个乘区和顶层公式不执行取整或
截断，`anomalyBuildupFormula.calculate` 返回一次计算产生的未取整异常积蓄值。

公式不读取当前异常槽，不把结果限制到剩余积蓄阈值，也不计算溢出部分。多次攻击的槽位累计、显示
取整和进度比例属于公式之外的状态处理。

## 返回结果

`anomalyBuildupFormula.calculate` 返回 `FormulaResult<AnomalyBuildupFormulaInput>`：

- `value` 是四个乘区结果相乘得到的未取整异常积蓄值；
- `factorResults` 的键与 `AnomalyBuildupFormulaInput` 完全一致，分别保存四个乘区的最终
  `FactorResult`；其中 `factorResults.resistance` 是异常积蓄抗性区结果。

返回结果只提供公式值和乘区结果，不复制输入，也不记录攻击来源、异常槽状态、有效积蓄贡献或溢出
积蓄。后续虚拟代理人能力需要独立记录参与异常伤害计算的有效积蓄，不能从单个 `FormulaResult` 自动
恢复这些上下文。

## 适用边界

本公式还不负责：

- 从游戏文本、Nanoka 数据、技能对象或面板数据建立各乘区输入；
- 判断代理人、邦布、攻击属性、技能标签、效果条件和持续时间是否适用；
- 自动查询或应用本规范的异常触发阈值 helper，或更新异常积蓄槽、积蓄比例、触发次数和冷却时间；
- 过滤邦布积蓄或溢出积蓄，建立虚拟代理人，或计算异常伤害；
- 计算失衡值、常规伤害、贯穿伤害及其他公式。

## 有效性与失败行为

| 失败条件                                              | 行为                                 |
| ----------------------------------------------------- | ------------------------------------ |
| 输入不是非数组对象或为 `null`                         | 抛出 `TypeError`                     |
| 任一必填字段缺失、为 `undefined` 或不符合乘区输入契约 | 传播对应乘区抛出的错误               |
| 任一乘区计算失败                                      | 传播对应乘区抛出的错误               |
| 最终异常积蓄值不是有限数值                            | 由 `defineFormula` 抛出 `RangeError` |

多个失败条件同时存在时，不承诺乘区校验错误的优先级。成功返回时，结果对象及其 `factorResults` 按
`defineFormula` 公共契约冻结。

## 代码组织

通用 `Formula` 类型与 `defineFormula` 统一放在 `packages/core/src/formula.ts`。异常积蓄值公式及其阈值 helper
的生产代码放在 `packages/core/src/formulas/anomaly-buildup.ts`。阈值表及其索引逻辑是该 helper 的内部实现，
不作为可替换配置或独立 API 导出。该文件不重复实现任何乘区算法，也不包含距离衰减、积蓄槽或
虚拟代理人逻辑。

`packages/core/src/index.ts` 只负责重新导出公开 API。异常积蓄值公式使用独立测试文件，同一测试文件覆盖
阈值 helper 的公开契约、六组固定表值、`9+` 档、倍率顺序、不可变性和失败行为。打包验证必须覆盖新增的
公开类型与函数。
