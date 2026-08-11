# 能量回复值公式

能量回复值公式按照固定顺序组合能量回复基础区和能量获得效率区，规则来源为
[原始攻略中的能量回复公式](../../../references/zzz-data-introduction.txt#L300-L303)。

Nanoka 3.1 的邦布技能属性使用 `Energy Generation` 对应“能量回复”，因此公开公式标识采用
`EnergyGeneration`。该标识表示本次计算产生的能量回复量；`Energy Regen` 只表示按时间自动回复的
属性，`Energy Generation Rate` 只表示能量获得效率，三者不能混用。

## 身份与公开契约

| 项目        | 定义                                          |
| ----------- | --------------------------------------------- |
| 中文名称    | 能量回复值                                    |
| `formulaId` | `energy_generation`                           |
| 身份常量    | `ENERGY_GENERATION_FORMULA_ID`                |
| 公开定义    | `energyGenerationFormula`                     |
| 输入类型    | `EnergyGenerationFormulaInput`                |
| 结果类型    | `FormulaResult<EnergyGenerationFormulaInput>` |

公开类型形态如下。该代码块描述公开契约，不限定内部实现文件中的声明顺序。

```ts
export interface EnergyGenerationFormulaInput {
  readonly baseEnergyGeneration: BaseEnergyGenerationFactorInput
  readonly energyGenerationRate: EnergyGenerationRateFactorInput
}

export declare const ENERGY_GENERATION_FORMULA_ID: "energy_generation"

export declare const energyGenerationFormula: Formula<EnergyGenerationFormulaInput>
```

`EnergyGenerationFormulaInput` 的每个字段都对应一个具体乘区的完整输入。公式顶层不增加代理人、技能、
攻击、接战状态、当前能量、能量上限或数据来源字段。

## 输入与默认值

两个字段全部必填，也不接受 `undefined`。调用方已经确认能量获得效率区在本次计算中应产生恒等倍率
`1` 时，必须显式传入对应乘区公开的默认输入：

| 字段                   | 对应乘区                                               | 恒等输入                                      |
| ---------------------- | ------------------------------------------------------ | --------------------------------------------- |
| `baseEnergyGeneration` | [能量回复基础区](../factors/base-energy-generation.md) | 无默认值，必须提供本次基础区完整输入          |
| `energyGenerationRate` | [能量获得效率区](../factors/energy-generation-rate.md) | `DEFAULT_ENERGY_GENERATION_RATE_FACTOR_INPUT` |

默认输入常量的精确内容和不可变性由能量获得效率区规范维护。它只表示计算组合中的恒等倍率，不代表游戏内
默认能量获得效率。能量回复基础区没有乘法恒等输入；调用方仍可显式建立产生 `0` 的合法输入。

本次计算存在实际效率贡献时，不得用恒等输入替代该贡献并声称结果完整。公式不自动补充、合并或克隆
默认输入，也不公开完整的默认 `EnergyGenerationFormulaInput`。

## 计算规则

能量回复值采用以下乘区组合：

```text
能量回复值
= 能量回复基础区
  × 能量获得效率区
```

具体公式的 `calculate` 必须直接调用两个已定义的 `Factor`，再以同一顺序相乘。约束形态如下：

```ts
const factorResults = {
  baseEnergyGeneration: baseEnergyGenerationFactor.calculate(
    input.baseEnergyGeneration,
  ),
  energyGenerationRate: energyGenerationRateFactor.calculate(
    input.energyGenerationRate,
  ),
} satisfies FormulaFactorResults<EnergyGenerationFormulaInput>

const value =
  factorResults.baseEnergyGeneration * factorResults.energyGenerationRate

return { value, factorResults }
```

一次成功计算必须调用两个乘区各一次。即使能量回复基础区返回 `0`，也不能提前返回；
`factorResults` 必须始终包含两项结果。任一乘区抛出错误时，公式立即失败并传播原错误，不返回部分
结果。

乘法使用 JavaScript `number` 的 IEEE 754 语义，并严格保留攻略中的乘区顺序，不进行代数重排。
`defineFormula` 在公开返回前检查最终 `value` 和两个乘区结果是否有限。

## 输入准备与结算快照

一次公式调用表示共享同一个最终能量自动回复和能量获得效率快照的一次回复事件或连续时间段。调用方
必须在调用前完成以下准备：

- 查表或按已确认规则取得本次攻击、技能或其他一次性机制的基础能量回复值；
- 使用[通用属性计算](../factors/base-damage.md#配套属性计算)得到本次快照的最终 `Energy Regen`；
- 根据已经确认的接战状态和其他触发条件，计算自动回复实际生效的秒数；
- 筛选本次一次性回复和自动回复实际适用的 `Energy Generation Rate` 贡献；
- 确保数组中的一次性回复、自动回复时间段和效率贡献属于同一结算快照。

如果 `Energy Regen` 或 `Energy Generation Rate` 在时间段中变化，调用方必须在变化点拆分输入并分别
调用公式。多个独立攻击事件采用不同快照时也必须分别计算；公式不接收时间线，也不在内部切分区间。

同一次攻击命中多个敌人通常只回复一次能量。命中判定、事件去重和回复次数由调用方在建立
`baseEnergyGeneration` 前处理，公式不根据敌人数量调整结果。

## 能量获得效率适用边界

攻略确认能量获得效率可以加成“几乎所有”能量回复效果，包括能量自动回复、攻击回能和其他特殊
一次性回复，但没有给出所有例外。因此：

- 只有调用方已经确认采用能量获得效率的回复量，才能放入本公式并把结果声明为完整；
- 已经确认不受能量获得效率影响的回复不能混入 `baseEnergyGeneration`，再与本公式倍率相乘；
- 无法确认某项回复是否采用该倍率时，调用方必须补充规则，公式不默认按适用或不适用处理；
- 特殊效果如果已经在自身规则中使用能量获得效率推导出最终回复量，调用方必须避免再次应用本公式
  造成重复计算。

攻略只说明每个能量球回复 `1%` 的能量，没有明确该百分比的换算基准，也没有确认能量球是否采用能量
获得效率。能量球数量、百分比到点数的解释和效率适用性都留在公式调用前处理，不为其增加专用字段。

## 返回结果

`energyGenerationFormula.calculate` 返回 `FormulaResult<EnergyGenerationFormulaInput>`：

- `value` 是能量回复基础区与能量获得效率区相乘得到的未取整能量回复值；
- `factorResults.baseEnergyGeneration` 是应用能量获得效率前的回复量；
- `factorResults.energyGenerationRate` 是钳制后的最终能量获得效率倍率。

返回结果只提供本次公式值和两个乘区结果，不复制输入，也不记录回复来源、攻击事件、时间线、触发
状态或实际写入资源槽的数值。

## 取整与资源状态边界

攻略没有给出能量回复的取整、截断、逐帧离散或显示格式规则。两个乘区和顶层公式都不执行
`floor`、`ceil`、固定小数位处理或按帧量化，`energyGenerationFormula.calculate` 返回未取整数值。

公式不读取当前能量或能量上限，不把结果限制到当前缺失能量，也不处理超过上限的溢出部分。资源槽
写入、事件顺序、能量消耗、技能发动条件和当前能量判定都属于公式之外的状态处理。

## 与闪能的关系

游戏文本使用 `Adrenaline` 表示闪能，使用 `Adrenaline Generation Rate` 表示闪能获得效率。闪能与
能量是独立资源通道，来源、适用代理人和自动累积条件也可能不同。

本公式不接收资源类型或模式开关，也不能用于计算闪能。闪能由独立的
[闪能累积值公式](adrenaline-generation.md)及其具体乘区处理。两套公开 API 只复用通用属性 helper，
以及实现时确认为语义相同的包内机械逻辑。

## 适用边界

本公式还不负责：

- 从 Nanoka 实体、内部 `sp_recovery` 字段、技能对象或游戏文本建立输入；
- 判断攻击是否命中、一次攻击产生几次回复，或技能、邦布、鸣徽和活动效果是否触发；
- 判断短接战、长接战、伪接战及其他状态持续时间；
- 计算能量上限、当前能量、实际写入量、溢出、消耗、掉落或冷却；
- 保存来源、生成时间线或执行贡献分析；
- 计算伤害、失衡值、异常积蓄、闪能或其他资源公式。

## 有效性与失败行为

| 失败条件                                              | 行为                                 |
| ----------------------------------------------------- | ------------------------------------ |
| 输入不是非数组对象或为 `null`                         | 抛出 `TypeError`                     |
| 任一必填字段缺失、为 `undefined` 或不符合乘区输入契约 | 传播对应乘区抛出的错误               |
| 任一乘区计算失败                                      | 传播对应乘区抛出的错误               |
| 最终能量回复值不是有限数值                            | 由 `defineFormula` 抛出 `RangeError` |

多个失败条件同时存在时，不承诺乘区校验错误的优先级。成功返回时，结果对象及其 `factorResults` 按
`defineFormula` 公共契约冻结。

## 代码组织

通用 `Formula` 类型与 `defineFormula` 统一放在 `packages/core/src/formula.ts`。能量回复值公式的生产代码
放在 `packages/core/src/formulas/energy-generation.ts`，只包含身份常量、输入类型和公式定义，不重复实现
任何乘区算法，也不包含接战状态、事件去重或资源槽逻辑。

`packages/core/src/index.ts` 只负责重新导出公开 API。能量回复值公式使用独立测试文件，打包验证必须
覆盖新增的公开输入类型、身份常量和公式定义。
