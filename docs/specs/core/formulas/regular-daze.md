# 常规失衡值公式

常规失衡值公式按照固定顺序组合基础失衡区、失衡抗性区、失衡值提升区和受到失衡值提升区，规则来源为
[原始攻略中的失衡值公式](../../../references/zzz-data-introduction.txt#L153-L154)。原始完整公式还包含距离
衰减区；该机制尚不具备可实现规则，因此当前公式只完整支持已经确认不适用距离衰减的计算。

“常规”是本项目为区分不同失衡值计算路径使用的范围标识。本公式只表示默认通过攻击造成的失衡值，
不表示所有以 `Daze` 为结果的计算。

## 身份与公开契约

| 项目        | 定义                                     |
| ----------- | ---------------------------------------- |
| 中文名称    | 常规失衡值                               |
| `formulaId` | `regular_daze`                           |
| 身份常量    | `REGULAR_DAZE_FORMULA_ID`                |
| 公开定义    | `regularDazeFormula`                     |
| 输入类型    | `RegularDazeFormulaInput`                |
| 结果类型    | `FormulaResult<RegularDazeFormulaInput>` |

公开类型形态如下。该代码块描述公开契约，不限定内部实现文件中的声明顺序。

```ts
export interface RegularDazeFormulaInput {
  readonly baseDaze: BaseDazeFactorInput
  readonly resistance: ResistanceFactorInput
  readonly dazeDealt: DazeDealtFactorInput
  readonly dazeTaken: DazeTakenFactorInput
}

export declare const REGULAR_DAZE_FORMULA_ID: "regular_daze"

export declare const regularDazeFormula: Formula<RegularDazeFormulaInput>
```

`RegularDazeFormulaInput` 的每个字段都对应一个具体乘区的完整输入。`resistance` 复用已有
`resistanceFactor`，但调用方必须传入本次攻击属性对应的失衡抗性快照及其调整，不能传入伤害抗性或
异常积蓄抗性。

公式顶层不增加攻击属性、目标状态、失衡条、距离、数据来源或其他结算上下文字段。

## 输入与默认值

四个字段全部必填，也不接受 `undefined`。调用方已经确认某个倍率乘区在本次计算中应产生恒等倍率
`1` 时，必须显式传入对应乘区公开的默认输入：

| 字段         | 对应乘区                                     | 恒等输入                             |
| ------------ | -------------------------------------------- | ------------------------------------ |
| `baseDaze`   | [基础失衡区](../factors/base-daze.md)        | 无默认值，必须提供本次基础失衡区输入 |
| `resistance` | [抗性区](../factors/resistance.md)           | `DEFAULT_RESISTANCE_FACTOR_INPUT`    |
| `dazeDealt`  | [失衡值提升区](../factors/daze-dealt.md)     | `DEFAULT_DAZE_DEALT_FACTOR_INPUT`    |
| `dazeTaken`  | [受到失衡值提升区](../factors/daze-taken.md) | `DEFAULT_DAZE_TAKEN_FACTOR_INPUT`    |

各常量的精确内容与不可变性由对应乘区规范维护。它们只表示产生恒等倍率 `1` 的计算输入，不表示游戏内
默认抗性或默认效果。基础失衡区没有恒等输入；调用方仍可显式传入空数组并得到最终结果 `0`。

本次计算存在实际乘区数据时，不得用恒等输入替代该数据并声称结果完整。公式不自动补充、合并或克隆
默认输入，也不公开完整的默认 `RegularDazeFormulaInput`。

## 计算规则

在当前支持边界内，常规失衡值采用以下乘区组合：

```text
常规失衡值
= 基础失衡区
  × 失衡抗性区
  × 失衡值提升区
  × 受到失衡值提升区
```

`resistanceFactor` 在本公式中产生失衡抗性区结果。具体公式的 `calculate` 必须直接调用四个已定义的
`Factor`，再以同一顺序相乘。约束形态如下：

```ts
const factorResults = {
  baseDaze: baseDazeFactor.calculate(input.baseDaze),
  resistance: resistanceFactor.calculate(input.resistance),
  dazeDealt: dazeDealtFactor.calculate(input.dazeDealt),
  dazeTaken: dazeTakenFactor.calculate(input.dazeTaken),
} satisfies FormulaFactorResults<RegularDazeFormulaInput>

const value =
  factorResults.baseDaze *
  factorResults.resistance *
  factorResults.dazeDealt *
  factorResults.dazeTaken

return { value, factorResults }
```

一次成功计算必须调用每个乘区一次。即使基础失衡区或其他较早乘区返回 `0`，也不能提前返回；
`factorResults` 必须始终包含全部四项结果。任一乘区抛出错误时，公式立即失败并传播原错误，不返回
部分结果。

乘法使用 JavaScript `number` 的 IEEE 754 语义，并严格保留攻略中当前支持乘区的顺序，不进行代数
重排。`defineFormula` 在公开返回前检查最终 `value` 和全部乘区结果是否有限。

## 距离衰减边界

原始完整公式在受到失衡值提升区之后还会乘以距离衰减区。当前
[特殊乘区规范](../factors/special.md)确认距离衰减规则不足，禁止建立通用或任意倍率形式的占位乘区。
因此：

- `RegularDazeFormulaInput` 不包含距离、距离衰减类型、预计算距离衰减倍率或占位字段；
- 只有调用方已经确认本次攻击不适用距离衰减时，本公式结果才是完整常规失衡值；
- 已知本次攻击适用距离衰减但对应乘区尚未实现时，不能把本公式结果声明为完整；
- 无法确认距离衰减是否适用时，调用方必须补充上下文，core 不默认按恒等倍率 `1` 处理。

这些条件发生在公式调用之前。当前输入不包含距离衰减上下文，公式无法在运行时验证调用方是否满足
该前置条件。

## 输入准备

调用方必须在调用公式前完成以下输入准备：

- `baseDaze` 中的 `finalImpact` 使用已经完成属性计算的最终冲击力；基础失衡区负责应用冲击力的
  `[0, 1000]` 有效范围；
- `baseDaze` 中每一项的 `dazeMultiplier` 使用本次原子失衡值计算中对应代数项的失衡倍率；
- `resistance` 使用本次攻击属性对应的失衡抗性。当前是否存在抗性降低或无视抗性的游戏来源，不改变
  复用 `resistanceFactor` 的公开契约；
- `dazeDealt` 和 `dazeTaken` 按效果语义分别保存造成失衡值与受到失衡值的调整，不按效果来源方分类，
  同一项效果不能重复计入两侧。

`baseDaze` 的数组组成与公式调用边界统一遵循[基础失衡区的数组语义](../factors/base-daze.md#数组语义)。

Nanoka 原始字段解释、技能参数查找、攻击段选择、属性计算和效果适用性判断都发生在公式调用之前。
本公式不直接接收 Nanoka 实体或内部 `stun_*` 字段。

## 返回结果

`regularDazeFormula.calculate` 返回 `FormulaResult<RegularDazeFormulaInput>`：

- `value` 是四个乘区结果相乘得到的未取整常规失衡值；
- `factorResults` 的键与 `RegularDazeFormulaInput` 完全一致，分别保存四个乘区的最终
  `FactorResult`；其中 `factorResults.resistance` 是失衡抗性区结果。

返回结果只提供本次公式值和乘区结果，不复制输入，也不记录攻击来源、当前失衡条或目标状态。

## 取整、累积与状态边界

各乘区和顶层公式都不执行取整或截断。`regularDazeFormula.calculate` 返回一次计算产生的未取整失衡值。

公式不读取或修改当前失衡条，不把结果限制到剩余失衡值上限，也不计算失衡比例。失衡比例显示时的
向下取整、失衡比例上限、无法失衡或临时无视常规失衡值、达到阈值后的状态转换，以及是否需要后续
带有触发失衡状态标签的攻击，都属于公式之外的状态处理。

## 与其他失衡值路径的边界

本公式只覆盖默认通过攻击造成的常规失衡值：

- [直接失衡值累积、直接回复和自动回复](../../../references/zzz-data-introduction.txt#L170-L175)不经过
  本公式；其百分比量、固定量和状态写入顺序需要后续独立设计。
- [紊乱失衡值公式](disorder-daze.md)具有独立的紊乱失衡等级区，并采用原异常状态虚拟代理人的部分
  属性，不经过本公式。它只复用输入阶段兼容的具体乘区，并独立表达虚拟代理人输入准备和额外乘区。
- `Stun DMG Multiplier` 属于伤害公式中的失衡易伤区，不参与任何失衡值累积公式。

## 适用边界

本公式还不负责：

- 从游戏文本、Nanoka 数据、技能对象或面板数据建立各乘区输入；
- 判断代理人、邦布、攻击属性、技能标签、目标状态、效果条件和持续时间是否适用；
- 计算失衡值上限、失衡比例、失衡条锁定、失衡触发、失衡持续时间、失衡恢复或可连携次数；
- 计算伤害、异常积蓄值、能量或其他公式。

## 有效性与失败行为

| 失败条件                                              | 行为                                 |
| ----------------------------------------------------- | ------------------------------------ |
| 输入不是非数组对象或为 `null`                         | 抛出 `TypeError`                     |
| 任一必填字段缺失、为 `undefined` 或不符合乘区输入契约 | 传播对应乘区抛出的错误               |
| 任一乘区计算失败                                      | 传播对应乘区抛出的错误               |
| 最终常规失衡值不是有限数值                            | 由 `defineFormula` 抛出 `RangeError` |

多个失败条件同时存在时，不承诺乘区校验错误的优先级。成功返回时，结果对象及其 `factorResults` 按
`defineFormula` 公共契约冻结。

## 代码组织

通用 `Formula` 类型与 `defineFormula` 统一放在 `packages/core/src/formula.ts`。常规失衡值公式的生产代码
放在 `packages/core/src/formulas/regular-daze.ts`，只包含身份常量、输入类型和公式定义，不重复实现
任何乘区算法，也不包含距离衰减、失衡条或失衡状态机逻辑。

`packages/core/src/index.ts` 只负责重新导出公开 API。常规失衡值公式使用独立测试文件，打包验证必须
覆盖新增的公开输入类型、身份常量和公式定义。
