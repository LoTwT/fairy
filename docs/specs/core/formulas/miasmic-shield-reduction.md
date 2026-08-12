# 秽盾削减值公式

秽盾削减值公式按照固定顺序组合基础秽盾削减值、秽盾削减效率区和秽盾被削减效率区，规则来源为
[原始攻略中的秽盾削减值说明](../../../references/zzz-data-introduction.txt#L373-L384)：

```text
秽盾削减值
= 基础秽盾削减值
  × 秽盾削减效率区
  × 秽盾被削减效率区
```

公开标识采用[秽盾相关术语](../index.md#秽盾相关术语)中定义的 `MiasmicShieldReduction`。本公式一次为
一个已确定的代理人攻击结算事件和目标快照计算秽盾削减值。

## 身份与公开契约

| 项目        | 定义                                                |
| ----------- | --------------------------------------------------- |
| 中文名称    | 秽盾削减值                                          |
| `formulaId` | `miasmic_shield_reduction`                          |
| 身份常量    | `MIASMIC_SHIELD_REDUCTION_FORMULA_ID`               |
| 公开定义    | `miasmicShieldReductionFormula`                     |
| 输入类型    | `MiasmicShieldReductionFormulaInput`                |
| 结果类型    | `FormulaResult<MiasmicShieldReductionFormulaInput>` |

公开类型形态如下。该代码块描述公开契约，不限定内部实现文件中的声明顺序。

```ts
export interface MiasmicShieldReductionFormulaInput {
  readonly baseMiasmicShieldReduction: BaseMiasmicShieldReductionFactorInput
  readonly miasmicShieldReductionRate: MiasmicShieldReductionRateFactorInput
  readonly miasmicShieldReductionTakenRate: MiasmicShieldReductionTakenRateFactorInput
}

export declare const MIASMIC_SHIELD_REDUCTION_FORMULA_ID: "miasmic_shield_reduction"

export declare const miasmicShieldReductionFormula: Formula<MiasmicShieldReductionFormulaInput>
```

`MiasmicShieldReductionFormulaInput` 的每个字段都对应一个具体乘区的完整输入。公式顶层不增加代理人、
邦布、目标、技能、动作、攻击属性、当前秽盾值、秽盾上限、目标状态或数据来源字段。

## 输入与默认值

三个字段全部必填，也不接受 `undefined`。调用方已经确认某个倍率乘区在本次计算中应产生恒等倍率 `1`
时，必须显式传入对应乘区公开的默认输入：

| 字段                              | 对应乘区                                                              | 恒等输入                                                   |
| --------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------- |
| `baseMiasmicShieldReduction`      | [基础秽盾削减值](../factors/base-miasmic-shield-reduction.md)         | 无默认值，必须提供本次基础秽盾削减值                       |
| `miasmicShieldReductionRate`      | [秽盾削减效率区](../factors/miasmic-shield-reduction-rate.md)         | `DEFAULT_MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_INPUT`       |
| `miasmicShieldReductionTakenRate` | [秽盾被削减效率区](../factors/miasmic-shield-reduction-taken-rate.md) | `DEFAULT_MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_FACTOR_INPUT` |

各常量的精确内容和不可变性由对应乘区规范维护。它们只表示计算组合中的恒等倍率，不代表代理人或目标的游戏内
默认属性、默认效果或默认秽盾状态。基础秽盾削减值没有恒等输入；调用方仍可显式传入 `0` 并得到最终结果
`0`。

本次计算存在实际乘区数据时，不得用恒等输入替代该数据并声称结果完整。公式不自动补充、合并或克隆默认
输入，也不公开完整的默认 `MiasmicShieldReductionFormulaInput`。

## 计算规则

具体公式的 `calculate` 必须直接调用三个已定义的 `Factor`，再按攻略顺序相乘。约束形态如下：

```ts
const factorResults = {
  baseMiasmicShieldReduction: baseMiasmicShieldReductionFactor.calculate(
    input.baseMiasmicShieldReduction,
  ),
  miasmicShieldReductionRate: miasmicShieldReductionRateFactor.calculate(
    input.miasmicShieldReductionRate,
  ),
  miasmicShieldReductionTakenRate:
    miasmicShieldReductionTakenRateFactor.calculate(
      input.miasmicShieldReductionTakenRate,
    ),
} satisfies FormulaFactorResults<MiasmicShieldReductionFormulaInput>

const value =
  factorResults.baseMiasmicShieldReduction *
  factorResults.miasmicShieldReductionRate *
  factorResults.miasmicShieldReductionTakenRate

return { value, factorResults }
```

一次成功计算必须调用三个乘区各一次。即使基础秽盾削减值返回 `0`，也不能提前返回；`factorResults`
必须始终包含三项结果。任一乘区抛出错误时，公式立即失败并传播原错误，不返回部分结果。

乘法使用 JavaScript `number` 的 IEEE 754 语义，并严格保留攻略中的乘区顺序，不进行代数重排。
`defineFormula` 在公开返回前检查最终 `value` 和三个乘区结果是否有限。

## 一次调用边界

一次 `miasmicShieldReductionFormula.calculate` 调用只计算一个已确定的代理人攻击结算事件对一个目标快照
产生的秽盾削减值。同一攻击命中多个目标时，调用方必须按每个目标实际适用的秽盾被削减效率分别调用
公式。

技能或动作包含多段攻击时，调用方按照采用的数据定义确定每次公式调用对应的基础秽盾削减值。不同攻击
段、动作或效果采用不同效率快照时必须分别计算，不能先合并基础值再共用一组倍率。公式不接收攻击段数组，
也不在内部拆分或汇总事件。

## 输入准备

调用方必须在调用公式前完成以下输入准备：

- 从技能表或已经确认的动作规则取得本次攻击结算事件的基础秽盾削减值，不能从伤害倍率、失衡倍率或
  其他技能参数推导；
- 筛选本次攻击实际适用的秽盾削减效率贡献；
- 按目标本次受击快照筛选实际适用的秽盾被削减效率贡献；
- 确认目标当前具有可削减的秽盾，并确保三个输入属于同一攻击结算事件和目标快照。

攻略确认邦布攻击不具有削减秽盾的能力。该规则由调用方在建立输入前处理，公式不增加 `isBangboo`、
攻击者类型或适用性字段，也不根据基础秽盾削减值是否为 `0` 反推攻击来源或适用性。

当前不存在秽盾削减抗性，代理人技能的秽盾削减值与敌人的弱点或抗性无关。因此公式不采用
`resistanceFactor`，也不接收攻击属性、敌人弱点、伤害抗性、失衡抗性或其他抗性输入。

## 返回结果

`miasmicShieldReductionFormula.calculate` 返回 `FormulaResult<MiasmicShieldReductionFormulaInput>`：

- `value` 是三个乘区结果相乘得到的、本次攻击结算事件对目标产生的未取整秽盾削减值；
- `factorResults.baseMiasmicShieldReduction` 是本次攻击采用的基础秽盾削减值；
- `factorResults.miasmicShieldReductionRate` 是钳制后的造成侧秽盾削减效率倍率；
- `factorResults.miasmicShieldReductionTakenRate` 是钳制后的承受侧秽盾被削减效率倍率。

返回结果不复制输入，也不记录攻击者、目标、技能、动作、攻击段、来源、当前秽盾值或实际写入秽盾槽的
数值。

## 取整与秽盾状态边界

三个乘区和顶层公式都不执行 `floor`、`ceil`、固定小数位处理或其他取整、截断，
`miasmicShieldReductionFormula.calculate` 返回未取整数值。

公式不读取或修改当前秽盾值与秽盾上限，不把结果限制到剩余秽盾值，也不处理溢出的削减值。秽盾槽写入、
自然衰减、恢复、消耗、打破、秽盾净除及其伤害与资源回复，以及失衡比例上限和状态转换，均属于公式之外
的状态处理。

通过崩解之法或其他已经确认的直接机制削减或破除秽盾时，其数值、触发条件和状态写入顺序需要由对应
机制独立定义，不经过本代理人攻击公式。

## 适用边界

本公式还不负责：

- 从 Nanoka 内部字段、技能对象、代理人对象或游戏文本建立乘区输入；
- 判断攻击是否命中、目标是否具有秽盾、技能或动作标签是否匹配、效果是否触发及持续时间是否有效；
- 固化招架支援、终结技或具体代理人技能的基础秽盾削减值；
- 汇总多次攻击、多段技能或多个目标的秽盾削减值；
- 计算伤害、失衡值、异常积蓄值、能量、闪能、喧响值或其他公式；
- 保存来源、生成战斗时间线或执行贡献分析。

## 有效性与失败行为

| 失败条件                                              | 行为                                 |
| ----------------------------------------------------- | ------------------------------------ |
| 输入不是非数组对象或为 `null`                         | 抛出 `TypeError`                     |
| 任一必填字段缺失、为 `undefined` 或不符合乘区输入契约 | 传播对应乘区抛出的错误               |
| 任一乘区计算失败                                      | 传播对应乘区抛出的错误               |
| 最终秽盾削减值不是有限数值                            | 由 `defineFormula` 抛出 `RangeError` |

多个失败条件同时存在时，不承诺乘区校验错误的优先级。成功返回时，结果对象及其 `factorResults` 按
`defineFormula` 公共契约冻结。

## 代码组织

通用 `Formula` 类型与 `defineFormula` 统一放在 `packages/core/src/formula.ts`。秽盾削减值公式的生产代码
放在 `packages/core/src/formulas/miasmic-shield-reduction.ts`，只包含身份常量、输入类型和公式定义，不重复
实现任何乘区算法，也不包含秽盾槽、自然衰减、崩解之法、秽盾净除或其他状态逻辑。

`packages/core/src/index.ts` 只负责重新导出公开 API。秽盾削减值公式使用独立测试文件，打包验证必须覆盖
新增的公开输入类型、身份常量和公式定义。
