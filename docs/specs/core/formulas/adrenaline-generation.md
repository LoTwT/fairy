# 闪能累积值公式

闪能累积值公式按照固定顺序组合闪能累积基础区和闪能获得效率区，规则来源为
[原始攻略中的闪能公式](../../../references/zzz-data-introduction.txt#L322-L338)。

按照[闪能相关术语](../index.md#闪能相关术语)，公开公式标识 `AdrenalineGeneration` 是 core 根据公式
结构建立的组合名称，不声明为固定游戏术语；它在本公式中表示两个乘区相乘产生的闪能累积值。

## 身份与公开契约

| 项目        | 定义                                              |
| ----------- | ------------------------------------------------- |
| 中文名称    | 闪能累积值                                        |
| `formulaId` | `adrenaline_generation`                           |
| 身份常量    | `ADRENALINE_GENERATION_FORMULA_ID`                |
| 公开定义    | `adrenalineGenerationFormula`                     |
| 输入类型    | `AdrenalineGenerationFormulaInput`                |
| 结果类型    | `FormulaResult<AdrenalineGenerationFormulaInput>` |

公开类型形态如下。该代码块描述公开契约，不限定内部实现文件中的声明顺序。

```ts
export interface AdrenalineGenerationFormulaInput {
  readonly baseAdrenalineGeneration: BaseAdrenalineGenerationFactorInput
  readonly adrenalineGenerationRate: AdrenalineGenerationRateFactorInput
}

export declare const ADRENALINE_GENERATION_FORMULA_ID: "adrenaline_generation"

export declare const adrenalineGenerationFormula: Formula<AdrenalineGenerationFormulaInput>
```

`AdrenalineGenerationFormulaInput` 的每个字段都对应一个具体乘区的完整输入。公式顶层不增加代理人、
技能、攻击、当前闪能、闪能上限或数据来源字段。

## 输入与默认值

两个字段全部必填，也不接受 `undefined`。调用方已经确认闪能获得效率区在本次计算中应产生恒等倍率
`1` 时，必须显式传入对应乘区公开的默认输入：

| 字段                       | 对应乘区                                                   | 恒等输入                                          |
| -------------------------- | ---------------------------------------------------------- | ------------------------------------------------- |
| `baseAdrenalineGeneration` | [闪能累积基础区](../factors/base-adrenaline-generation.md) | 无默认值，必须提供本次基础区完整输入              |
| `adrenalineGenerationRate` | [闪能获得效率区](../factors/adrenaline-generation-rate.md) | `DEFAULT_ADRENALINE_GENERATION_RATE_FACTOR_INPUT` |

默认输入常量的精确内容和不可变性由闪能获得效率区规范维护。它只表示计算组合中的恒等倍率，不代表游戏内
默认闪能获得效率。闪能累积基础区没有乘法恒等输入；调用方仍可显式建立产生 `0` 的合法输入。

本次计算存在实际效率贡献时，不得用恒等输入替代该贡献并声称结果完整。公式不自动补充、合并或克隆
默认输入，也不公开完整的默认 `AdrenalineGenerationFormulaInput`。

## 计算规则

闪能累积值采用以下乘区组合：

```text
闪能累积值
= 闪能累积基础区
  × 闪能获得效率区
```

具体公式的 `calculate` 必须直接调用两个已定义的 `Factor`，再以同一顺序相乘。约束形态如下：

```ts
const factorResults = {
  baseAdrenalineGeneration: baseAdrenalineGenerationFactor.calculate(
    input.baseAdrenalineGeneration,
  ),
  adrenalineGenerationRate: adrenalineGenerationRateFactor.calculate(
    input.adrenalineGenerationRate,
  ),
} satisfies FormulaFactorResults<AdrenalineGenerationFormulaInput>

const value =
  factorResults.baseAdrenalineGeneration *
  factorResults.adrenalineGenerationRate

return { value, factorResults }
```

一次成功计算必须调用两个乘区各一次。即使闪能累积基础区返回 `0`，也不能提前返回；
`factorResults` 必须始终包含两项结果。任一乘区抛出错误时，公式立即失败并传播原错误，不返回部分
结果。

乘法使用 JavaScript `number` 的 IEEE 754 语义，并严格保留攻略中的乘区顺序，不进行代数重排。
`defineFormula` 在公开返回前检查最终 `value` 和两个乘区结果是否有限。

## 输入准备与结算快照

一次公式调用表示共享同一个最终闪能自动累积和闪能获得效率快照的一次累积事件或连续时间段。调用方
必须在调用前完成以下准备：

- 查表或按已确认规则取得本次攻击、技能或其他一次性机制的基础闪能累积值；
- 使用[通用属性计算](../factors/base-damage.md#配套属性计算)得到本次快照的最终闪能自动累积；
- 根据已经确认的角色、效果和触发条件，计算自动累积实际生效的秒数；
- 筛选本次一次性累积和自动累积实际适用的 `Adrenaline Generation Rate` 贡献；
- 确保数组中的一次性累积、自动累积时间段和效率贡献属于同一结算快照。

如果最终闪能自动累积或 `Adrenaline Generation Rate` 在时间段中变化，调用方必须在变化点拆分输入并
分别调用公式。多个独立事件采用不同快照时也必须分别计算；公式不接收时间线，也不在内部切分区间。

攻略列出的仪玄技能与基础闪能累积值只是当时的数据实例。公式不限制代理人身份、特性或版本，也不把
这些查表值固化为 core 常量。

## 闪能获得效率适用边界

攻略确认闪能获得效率可以加成“几乎所有”闪能累积，但没有给出所有例外。因此：

- 只有调用方已经确认采用闪能获得效率的累积量，才能放入本公式并把结果声明为完整；
- 已经确认不受闪能获得效率影响的增加量不能混入 `baseAdrenalineGeneration`，再与本公式倍率相乘；
- 无法确认某项闪能增加是否采用该倍率时，调用方必须补充规则，公式不默认按适用或不适用处理；
- 特殊效果如果已经在自身规则中使用闪能获得效率推导出最终增加量，调用方必须避免再次应用本公式
  造成重复计算。

## 返回结果

`adrenalineGenerationFormula.calculate` 返回 `FormulaResult<AdrenalineGenerationFormulaInput>`：

- `value` 是闪能累积基础区与闪能获得效率区相乘得到的未取整闪能累积值；
- `factorResults.baseAdrenalineGeneration` 是应用闪能获得效率前的累积量；
- `factorResults.adrenalineGenerationRate` 是钳制后的最终闪能获得效率倍率。

返回结果只提供本次公式值和两个乘区结果，不复制输入，也不记录累积来源、攻击事件、时间线、触发
状态或实际写入资源槽的数值。

## 取整与资源状态边界

攻略没有给出闪能累积的取整、截断、逐帧离散或显示格式规则。两个乘区和顶层公式都不执行
`floor`、`ceil`、固定小数位处理或按帧量化，`adrenalineGenerationFormula.calculate` 返回未取整数值。

公式不读取当前闪能或闪能上限，不把结果限制到当前缺失闪能，也不处理超过上限的溢出部分。资源槽
写入、事件顺序、闪能消耗、技能发动条件和当前闪能判定都属于公式之外的状态处理。

攻略中出现的初始上限、自动累积数值和具体代理人规则属于数据与状态事实，不作为公式默认值，也不
限制 core API 只能服务某个代理人。

## 与能量的关系

闪能和能量是独立资源通道，来源、适用代理人和自动累积条件可能不同。本公式不接收资源类型或模式
开关，也不能用于计算能量；能量由[能量回复值公式](energy-generation.md)处理。

两套公开 API 的输入类型、字段、身份常量、默认输入、`Factor`、`Formula` 和 `factorResults` 键保持
独立，不能通过共享对象互相代替。它们只复用通用 `defineFactor`、`defineFormula`、运行时断言和属性
helper。若实现时出现完全同构的机械校验或算术，可以在包内私有层复用，但不得导出泛化的资源回复
业务模型。

## 适用边界

本公式还不负责：

- 从 Nanoka 实体、内部 `rp_recover` 字段、技能对象或游戏文本建立输入；
- 判断攻击是否命中、一次事件产生几次累积，或技能、鸣徽和活动效果是否触发；
- 判断角色是否拥有闪能资源或某项自动累积规则是否生效；
- 计算闪能上限、当前闪能、实际写入量、溢出、消耗或冷却；
- 保存来源、生成时间线或执行贡献分析；
- 计算伤害、失衡值、异常积蓄、能量回复或其他资源公式。

Nanoka 原始数据中的 `rp_recover`、`rp_recovery` 等内部字段属于数据层标识。其业务语义必须由数据清洗
层先行解释，不能不经转换直接映射为 core 输入。

## 有效性与失败行为

| 失败条件                                              | 行为                                 |
| ----------------------------------------------------- | ------------------------------------ |
| 输入不是非数组对象或为 `null`                         | 抛出 `TypeError`                     |
| 任一必填字段缺失、为 `undefined` 或不符合乘区输入契约 | 传播对应乘区抛出的错误               |
| 任一乘区计算失败                                      | 传播对应乘区抛出的错误               |
| 最终闪能累积值不是有限数值                            | 由 `defineFormula` 抛出 `RangeError` |

多个失败条件同时存在时，不承诺乘区校验错误的优先级。成功返回时，结果对象及其 `factorResults` 按
`defineFormula` 公共契约冻结。

## 代码组织

通用 `Formula` 类型与 `defineFormula` 统一放在 `packages/core/src/formula.ts`。闪能累积值公式的生产代码
放在 `packages/core/src/formulas/adrenaline-generation.ts`，只包含身份常量、输入类型和公式定义，不重复
实现任何乘区算法，也不包含查表、事件去重、时间线或资源槽逻辑。

`packages/core/src/index.ts` 只负责重新导出公开 API。闪能累积值公式使用独立测试文件，打包验证必须覆盖
新增的公开输入类型、身份常量和公式定义。
