# 喧响值回复公式

喧响值回复公式按照固定顺序组合基础喧响值回复、喧响获得效率区和喧响值伴随获得效率，规则来源为
[原始攻略中的喧响值回复公式](../../../references/zzz-data-introduction.txt#L339-L359)：

```text
喧响值回复
= 基础喧响值回复
  × 喧响获得效率区
  × 伴随获得效率
```

公开标识采用[喧响相关术语](../index.md#喧响相关术语)中定义的 `DecibelGeneration`。本公式一次为一个
接收者计算喧响值回复量。

## 身份与公开契约

| 项目        | 定义                                           |
| ----------- | ---------------------------------------------- |
| 中文名称    | 喧响值回复                                     |
| `formulaId` | `decibel_generation`                           |
| 身份常量    | `DECIBEL_GENERATION_FORMULA_ID`                |
| 公开定义    | `decibelGenerationFormula`                     |
| 输入类型    | `DecibelGenerationFormulaInput`                |
| 结果类型    | `FormulaResult<DecibelGenerationFormulaInput>` |

公开类型形态如下。该代码块描述公开契约，不限定内部实现文件中的声明顺序。

```ts
export interface DecibelGenerationFormulaInput {
  readonly baseDecibelGeneration: BaseDecibelGenerationFactorInput
  readonly decibelGenerationRate: DecibelGenerationRateFactorInput
  readonly accompanyingDecibelGenerationRate: AccompanyingDecibelGenerationRateFactorInput
}

export declare const DECIBEL_GENERATION_FORMULA_ID: "decibel_generation"

export declare const decibelGenerationFormula: Formula<DecibelGenerationFormulaInput>
```

`DecibelGenerationFormulaInput` 的每个字段都对应一个具体乘区的完整输入。公式顶层不增加触发者、接收
者、前台位置、后台位置、技能、动作、当前喧响值、喧响值上限或数据来源字段。

## 输入与默认值

三个字段全部必填，也不接受 `undefined`。调用方已经确认某个倍率乘区在本次计算中应产生恒等倍率
`1` 时，必须显式传入对应乘区公开的默认输入：

| 字段                                | 对应乘区                                                                 | 恒等输入                                                    |
| ----------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------- |
| `baseDecibelGeneration`             | [基础喧响值回复](../factors/base-decibel-generation.md)                  | 无默认值，必须提供本次基础喧响值                            |
| `decibelGenerationRate`             | [喧响获得效率区](../factors/decibel-generation-rate.md)                  | `DEFAULT_DECIBEL_GENERATION_RATE_FACTOR_INPUT`              |
| `accompanyingDecibelGenerationRate` | [喧响值伴随获得效率](../factors/accompanying-decibel-generation-rate.md) | `DEFAULT_ACCOMPANYING_DECIBEL_GENERATION_RATE_FACTOR_INPUT` |

各常量的精确内容和不可变性由对应乘区规范维护。它们只表示计算组合中的恒等倍率，不代表游戏内默认属性、
默认效果或默认伴随比例。基础喧响值回复没有恒等输入；调用方仍可显式传入 `0` 并得到最终结果 `0`。

本次计算存在实际乘区数据时，不得用恒等输入替代该数据并声称结果完整。公式不自动补充、合并或克隆
默认输入，也不公开完整的默认 `DecibelGenerationFormulaInput`。

## 计算规则

具体公式的 `calculate` 必须直接调用三个已定义的 `Factor`，再按攻略顺序相乘。约束形态如下：

```ts
const factorResults = {
  baseDecibelGeneration: baseDecibelGenerationFactor.calculate(
    input.baseDecibelGeneration,
  ),
  decibelGenerationRate: decibelGenerationRateFactor.calculate(
    input.decibelGenerationRate,
  ),
  accompanyingDecibelGenerationRate:
    accompanyingDecibelGenerationRateFactor.calculate(
      input.accompanyingDecibelGenerationRate,
    ),
} satisfies FormulaFactorResults<DecibelGenerationFormulaInput>

const value =
  factorResults.baseDecibelGeneration *
  factorResults.decibelGenerationRate *
  factorResults.accompanyingDecibelGenerationRate

return { value, factorResults }
```

一次成功计算必须调用三个乘区各一次。即使基础喧响值回复或其他较早乘区返回 `0`，也不能提前返回；
`factorResults` 必须始终包含三项结果。任一乘区抛出错误时，公式立即失败并传播原错误，不返回部分
结果。

乘法使用 JavaScript `number` 的 IEEE 754 语义，并严格保留攻略中的乘区顺序，不进行代数重排。
`defineFormula` 在公开返回前检查最终 `value` 和三个乘区结果是否有限。

## 一次调用只计算一个接收者

一次 `decibelGenerationFormula.calculate` 调用只计算一个已确定接收者的喧响值回复。调用方按以下规则
建立输入：

| 结算路径                       | `accompanyingDecibelGenerationRate`                                                                      |
| ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| 触发者自身                     | 显式传入恒等输入 `1`                                                                                     |
| 已确认会伴随获得的其他代理人   | 分别传入每名接收者已经确定的最终比例                                                                     |
| 已确认不产生伴随获得的特殊效果 | 每个直接接收者都以直接获得的数值作为基础值，并显式传入恒等输入 `1`；不为未被直接指定的代理人追加伴随调用 |
| 无法确认接收者倍率或适用性     | 停止该接收者计算，先补充对应来源规则                                                                     |

公式不接收 `recipientRole` 判别联合，也不返回触发者与其他代理人的批量结果。触发者和其他接收者之间的
关系已经体现在调用方选择的最终伴随倍率中，再增加角色字段不会参与任何算术，也无法替代来源适用性判断。

同一事件有多个接收者时，调用方为每名接收者分别调用公式。公式不读取队伍编成，不生成接收者列表，也不
负责把多次结果写入各自的喧响槽。

## 效率归属与输入准备

调用方必须在调用公式前完成以下输入准备：

- 从技能表或已经确认的动作规则取得本次事件的基础喧响值回复；
- 筛选本次结算实际适用的 `Decibel Generation Rate` 贡献；
- 根据角色规则、事件来源和触发者与接收者的关系，得到本次接收者的最终伴随获得倍率；
- 确保三个输入属于同一事件和同一结算快照。

现有攻略没有提供足以让 core 从代理人身份自动判断两类效率归属的完整规则。调用方必须使用其采用的
数据来源或已经验证的游戏规则，明确本次 `decibelGenerationRate` 采用哪名代理人的贡献，以及伴随比例
由触发者还是接收者决定。任一项无法确认时，不得用常见比例或其他代理人的属性替代，也不能把计算
结果声明为完整。

基础喧响值回复采用单个事件值。技能、特殊动作和额外效果具有不同的获得效率或伴随适用性时，必须
分别计算，不能先合并基础值再共用一组倍率。公式不接收来源数组，也不在内部拆分事件。

## 返回结果

`decibelGenerationFormula.calculate` 返回 `FormulaResult<DecibelGenerationFormulaInput>`：

- `value` 是三个乘区结果相乘得到的、本次接收者未取整的喧响值回复量；
- `factorResults.baseDecibelGeneration` 是本次事件采用的基础喧响值；
- `factorResults.decibelGenerationRate` 是钳制后的最终喧响获得效率倍率；
- `factorResults.accompanyingDecibelGenerationRate` 是本次接收者采用的最终伴随获得倍率。

返回结果不复制输入，也不记录触发者、接收者、队伍位置、来源、事件类型或实际写入资源槽的数值。

## 取整与资源状态边界

攻略说明当前喧响值会取整后显示，但没有确认显示取整就是单次回复的结算取整。三个乘区和顶层公式都
不执行 `floor`、`ceil`、固定小数位处理或按帧量化，`decibelGenerationFormula.calculate` 返回未取整数值。

公式不读取当前喧响值或喧响值上限，不把结果限制到当前缺失量，也不处理超过上限的溢出部分。资源槽
写入、显示取整、事件顺序、终结技消耗、喧响等级和当前资源判定属于公式之外的状态处理。

攻略中的 `3000` 初始上限、具体技能基础值、特殊动作表和角色伴随比例属于数据与状态事实，不作为
公式默认值，也不固化为 core 常量。

## 适用边界

本公式还不负责：

- 从 Nanoka 内部字段、技能对象、角色对象或游戏文本建立乘区输入；
- 判断技能是否命中、特殊动作是否触发、一次事件产生几次回复或是否进入冷却；
- 根据角色身份、前台或后台位置决定获得效率和伴随比例；
- 判断影画、音擎、活动效果及其他额外喧响值是否允许伴随获得；
- 汇总多个事件、计算队伍总回复，或更新当前喧响值与喧响等级；
- 保存来源、生成时间线或执行贡献分析；
- 计算能量、闪能、伤害、失衡值、异常积蓄或其他公式。

## 有效性与失败行为

| 失败条件                                              | 行为                                 |
| ----------------------------------------------------- | ------------------------------------ |
| 输入不是非数组对象或为 `null`                         | 抛出 `TypeError`                     |
| 任一必填字段缺失、为 `undefined` 或不符合乘区输入契约 | 传播对应乘区抛出的错误               |
| 任一乘区计算失败                                      | 传播对应乘区抛出的错误               |
| 最终喧响值回复不是有限数值                            | 由 `defineFormula` 抛出 `RangeError` |

多个失败条件同时存在时，不承诺乘区校验错误的优先级。成功返回时，结果对象及其 `factorResults` 按
`defineFormula` 公共契约冻结。

## 代码组织

通用 `Formula` 类型与 `defineFormula` 统一放在 `packages/core/src/formula.ts`。喧响值回复公式的生产代码
放在 `packages/core/src/formulas/decibel-generation.ts`，只包含身份常量、输入类型和公式定义，不重复
实现任何乘区算法，也不包含队伍分发、事件筛选或资源槽逻辑。

`packages/core/src/index.ts` 只负责重新导出公开 API。喧响值回复公式使用独立测试文件，打包验证必须
覆盖新增的公开输入类型、身份常量和公式定义。
