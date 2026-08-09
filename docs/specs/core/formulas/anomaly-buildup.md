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
- 计算或更新异常积蓄槽、积蓄比例、异常触发阈值、触发次数和冷却时间；
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

通用 `Formula` 类型与 `defineFormula` 统一放在 `packages/core/src/formula.ts`。异常积蓄值公式的生产代码
放在 `packages/core/src/formulas/anomaly-buildup.ts`，只包含身份常量、输入类型和公式定义，不重复实现
任何乘区算法，也不包含距离衰减、积蓄槽或虚拟代理人逻辑。

`packages/core/src/index.ts` 只负责重新导出公开 API。异常积蓄值公式使用独立测试文件，打包验证必须
覆盖新增的公开输入类型、身份常量和公式定义。
