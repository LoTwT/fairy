# 紊乱失衡值公式

紊乱失衡值公式按照固定顺序组合基础失衡区、失衡抗性区、紊乱失衡值提升区、受到失衡值提升区和
紊乱失衡等级区，规则来源为
[原始攻略中的紊乱失衡值公式](../../../references/zzz-data-introduction.txt#L292-L297)。

Nanoka 3.1 的同路径中英文游戏文本使用 `Disorder` 对应“紊乱”，例如
[英文文本](../../../../packages/data/raw/nanoka/3.1/en/character/1401.json#L1965)和
[中文文本](../../../../packages/data/raw/nanoka/3.1/zh/character/1401.json#L1965)。`DisorderDaze` 是 core
将官方 `Disorder` 与 `Daze` 标识组合得到的范围名称，不表示游戏文本提供了完整的“紊乱失衡值”英文
术语。

## 身份与公开契约

| 项目             | 定义                                      |
| ---------------- | ----------------------------------------- |
| 中文名称         | 紊乱失衡值                                |
| `formulaId`      | `disorder_daze`                           |
| 身份常量         | `DISORDER_DAZE_FORMULA_ID`                |
| 公开定义         | `disorderDazeFormula`                     |
| 输入类型         | `DisorderDazeFormulaInput`                |
| 标准失衡倍率常量 | `DEFAULT_DISORDER_DAZE_MULTIPLIER`        |
| 结果类型         | `FormulaResult<DisorderDazeFormulaInput>` |

公开类型形态如下。该代码块描述公开契约，不限定内部实现文件中的声明顺序。

```ts
export interface DisorderDazeFormulaInput {
  readonly baseDaze: BaseDazeFactorInput
  readonly resistance: ResistanceFactorInput
  readonly disorderDazeDealt: DisorderDazeDealtFactorInput
  readonly dazeTaken: DazeTakenFactorInput
  readonly disorderDazeLevel: DisorderDazeLevelFactorInput
}

export declare const DISORDER_DAZE_FORMULA_ID: "disorder_daze"

export declare const DEFAULT_DISORDER_DAZE_MULTIPLIER: 2

export declare const disorderDazeFormula: Formula<DisorderDazeFormulaInput>
```

`DisorderDazeFormulaInput` 的每个字段都对应一个具体乘区的完整输入。公式顶层不增加异常类型、异常
积蓄记录、虚拟代理人、目标状态、失衡条、数据来源或其他结算上下文字段。

## 输入与默认值

五个字段全部必填，也不接受 `undefined`。调用方已经确认某个倍率乘区在本次计算中应产生恒等倍率
`1` 时，必须显式传入对应乘区公开的默认输入：

| 字段                | 对应乘区                                              | 恒等输入                                   |
| ------------------- | ----------------------------------------------------- | ------------------------------------------ |
| `baseDaze`          | [基础失衡区](../factors/base-daze.md)                 | 无默认值，必须提供本次基础失衡区输入       |
| `resistance`        | [抗性区](../factors/resistance.md)                    | `DEFAULT_RESISTANCE_FACTOR_INPUT`          |
| `disorderDazeDealt` | [紊乱失衡值提升区](../factors/disorder-daze-dealt.md) | `DEFAULT_DISORDER_DAZE_DEALT_FACTOR_INPUT` |
| `dazeTaken`         | [受到失衡值提升区](../factors/daze-taken.md)          | `DEFAULT_DAZE_TAKEN_FACTOR_INPUT`          |
| `disorderDazeLevel` | [紊乱失衡等级区](../factors/disorder-daze-level.md)   | 无默认值，必须提供实际虚拟代理人等级       |

各默认输入常量的精确内容与不可变性由对应乘区规范维护。它们只表示计算组合中的恒等状态，不表示游戏内
默认抗性、默认效果或默认虚拟代理人。基础失衡区和紊乱失衡等级区都没有恒等输入。

本次结算存在实际乘区数据时，不得用恒等输入替代该数据并声称结果完整。公式不自动补充、合并或克隆
默认输入，也不公开完整的默认 `DisorderDazeFormulaInput`。

## 标准失衡倍率

攻略确认普通紊乱失衡值的默认失衡倍率为 `200%`。公开常量
`DEFAULT_DISORDER_DAZE_MULTIPLIER` 的精确值为：

```ts
2
```

该常量是建立 `BaseDazeFactorInputItem.dazeMultiplier` 时使用的游戏规则默认值，不是
`BaseDazeFactorInput` 的恒等输入。数值是不可变原始值，不需要运行时冻结。

调用方没有已确认的特殊覆盖规则时，应使用该常量；只有具体机制明确改变紊乱失衡倍率时，才能显式
传入其他非负有限值。公式不根据紊乱类型或角色身份推断覆盖值。

普通紊乱的标准基础失衡区输入包含一项：

```ts
const baseDaze: BaseDazeFactorInput = [
  {
    finalImpact: virtualImpact,
    dazeMultiplier: DEFAULT_DISORDER_DAZE_MULTIPLIER,
  },
]
```

该示例只说明输入契约，不建立 `virtualImpact` 的计算 helper，也不要求公式内部重建数组。

## 计算规则

紊乱失衡值采用以下乘区组合：

```text
紊乱失衡值
= 基础失衡区
  × 失衡抗性区
  × 紊乱失衡值提升区
  × 受到失衡值提升区
  × 紊乱失衡等级区
```

具体公式的 `calculate` 必须直接调用五个已定义的 `Factor`，再以同一顺序相乘。约束形态如下：

```ts
const factorResults = {
  baseDaze: baseDazeFactor.calculate(input.baseDaze),
  resistance: resistanceFactor.calculate(input.resistance),
  disorderDazeDealt: disorderDazeDealtFactor.calculate(input.disorderDazeDealt),
  dazeTaken: dazeTakenFactor.calculate(input.dazeTaken),
  disorderDazeLevel: disorderDazeLevelFactor.calculate(input.disorderDazeLevel),
} satisfies FormulaFactorResults<DisorderDazeFormulaInput>

const value =
  factorResults.baseDaze *
  factorResults.resistance *
  factorResults.disorderDazeDealt *
  factorResults.dazeTaken *
  factorResults.disorderDazeLevel

return { value, factorResults }
```

一次成功计算必须调用每个乘区一次。即使基础失衡区或其他较早乘区返回 `0`，也不能提前返回；
`factorResults` 必须始终包含全部五项结果。任一乘区抛出错误时，公式立即失败并传播原错误，不返回
部分结果。

乘法使用 JavaScript `number` 的 IEEE 754 语义，并严格保留攻略中的乘区顺序，不进行代数重排。
`defineFormula` 在公开返回前检查最终 `value` 和全部乘区结果是否有限。

## 虚拟代理人输入准备

本公式使用原异常状态的虚拟代理人，而不是触发紊乱的新异常来源。虚拟代理人是攻略描述输入加权的
计算模型，不建立为 `DisorderDazeFormulaInput` 字段或 core 公开对象类型。

调用方必须在调用公式前完成以下准备：

- 按参与原异常状态的每条有效代理人异常积蓄占比，对记录的冲击力执行加权平均，并将结果作为
  `baseDaze` 中的 `finalImpact`；基础失衡区随后应用冲击力 `[0, 1000]` 有效范围；
- 按相同权重对每条记录已经结算的失衡值提升区结果执行加权平均，并将结果作为
  `disorderDazeDealt`；不能对原始提升与降低贡献重新加权后调用 `dazeDealtFactor`；
- 按相同权重对记录等级执行加权平均并向下取整，再将得到的整数作为 `disorderDazeLevel`；
- 使用紊乱结算时目标的实时失衡抗性建立 `resistance`，使用目标实时受到失衡值调整建立
  `dazeTaken`；
- 排除邦布造成的异常积蓄和超过本次异常触发阈值的溢出部分。如果排除后没有有效代理人积蓄，不能
  建立虚拟代理人，也不能调用本公式并声称结果完整。

Nanoka 原始字段解释、异常积蓄记录、权重计算、效果适用性判断和目标抗性属性选择都发生在公式调用
之前。本公式不直接接收 Nanoka 实体或内部字段，也无法验证不同字段是否来自同一个原异常状态和正确
结算时点。

攻略没有确认紊乱失衡值应选择原异常属性还是新触发异常属性对应的失衡抗性。调用方只有在已经从
其他可靠规则确认属性选择后，才能建立 `resistance` 并把公式结果声明为完整；core 不根据任一异常
类型进行猜测。

## 距离衰减边界

紊乱失衡值公式不包含距离衰减区。距离衰减已经作用于各次攻击实际造成的异常积蓄，并由此影响虚拟
代理人的加权权重；本公式不得再次乘以距离衰减倍率。

因此 `DisorderDazeFormulaInput` 不包含距离、距离衰减类型或预计算距离衰减倍率，也不采用
[特殊乘区规范](../factors/special.md)中的任何占位设计。该边界不同于原始公式明确包含距离衰减区的
常规失衡值公式。

## 返回结果

`disorderDazeFormula.calculate` 返回 `FormulaResult<DisorderDazeFormulaInput>`：

- `value` 是五个乘区结果相乘得到的未取整紊乱失衡值；
- `factorResults` 的键与 `DisorderDazeFormulaInput` 完全一致，分别保存五个乘区的最终
  `FactorResult`。

返回结果只提供本次公式值和乘区结果，不复制输入，也不提供虚拟代理人快照、异常积蓄贡献拆分、
来源追踪或目标失衡条状态。

## 取整、累积与状态边界

虚拟代理人的加权等级向下取整发生在建立公式输入之前。五个乘区和顶层公式都不执行显示取整、失衡
条截断或格式化；`disorderDazeFormula.calculate` 返回未取整失衡值。

公式不读取或修改当前失衡条，不把结果限制到剩余失衡值上限，也不计算失衡比例。调用方完成失衡条
状态处理后，可以使用[失衡比例显示值帮助函数](../helpers/displayed-daze-percentage.md)计算显示百分比。
上限锁定、无法失衡状态、达到阈值后的状态转换，以及紊乱触发冷却仍属于公式之外的状态处理。

## 与其他计算路径的边界

- [常规失衡值公式](regular-daze.md)没有紊乱失衡等级区，并使用当次常规失衡值计算的造成侧贡献；
  本公式不能通过嵌套或调用 `regularDazeFormula` 实现，只复用语义相同且输入阶段兼容的具体乘区。
- [异常伤害公式](anomaly-damage.md)已经可以计算普通紊乱伤害；本公式只计算紊乱额外产生的失衡值，
  不再次计算或返回紊乱伤害。
- 直接失衡值累积、回复和自动回复不经过本公式。
- `Stun DMG Multiplier` 属于伤害公式中的失衡易伤区，不参与紊乱失衡值计算。

## 适用边界

本公式只适用于已经确认会产生上述标准失衡值收益、且能够完整建立五项乘区输入的普通紊乱结算。
Nanoka 3.1 游戏文本没有确认 `Polarity Disorder` 等特殊紊乱是否产生相同失衡值收益，因此调用方不得
仅因效果名称包含 `Disorder` 就自动采用本公式。

本公式还不负责：

- 判断两种属性异常是否触发紊乱、处理原异常覆盖或紊乱冷却；
- 建立虚拟代理人或计算异常积蓄权重；
- 判断特殊紊乱是否产生失衡值、覆盖默认失衡倍率或采用不同公式；
- 计算异常伤害、异常积蓄值、常规失衡值或其他公式。

## 有效性与失败行为

| 失败条件                                              | 行为                                 |
| ----------------------------------------------------- | ------------------------------------ |
| 输入不是非数组对象或为 `null`                         | 抛出 `TypeError`                     |
| 任一必填字段缺失、为 `undefined` 或不符合乘区输入契约 | 传播对应乘区抛出的错误               |
| 任一乘区计算失败                                      | 传播对应乘区抛出的错误               |
| 最终紊乱失衡值不是有限数值                            | 由 `defineFormula` 抛出 `RangeError` |

多个失败条件同时存在时，不承诺乘区校验错误的优先级。成功返回时，结果对象及其 `factorResults` 按
`defineFormula` 公共契约冻结。

## 代码组织

通用 `Formula` 类型与 `defineFormula` 统一放在 `packages/core/src/formula.ts`。紊乱失衡值公式的生产
代码放在 `packages/core/src/formulas/disorder-daze.ts`，只包含身份常量、标准失衡倍率常量、输入类型和
公式定义，不重复实现任何乘区算法，也不包含虚拟代理人输入准备或失衡条状态机逻辑。

`packages/core/src/index.ts` 只负责重新导出公开 API。紊乱失衡值公式使用独立测试文件，打包验证必须
覆盖新增的公开输入类型、身份常量、标准失衡倍率常量和公式定义。
