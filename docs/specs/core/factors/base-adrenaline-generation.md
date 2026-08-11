# 闪能累积基础区

闪能累积基础区计算应用闪能获得效率前的闪能累积量，规则来源为
[原始攻略中的闪能公式](../../../references/zzz-data-introduction.txt#L322-L335)：

```text
闪能累积基础区
= Σ 基础闪能累积值
  + 最终闪能自动累积 × 有效累积时间
```

“闪能累积基础区”是 core 对原公式括号整体建立的计算名称，不是游戏文本提供的固定乘区术语。公开
标识采用 `BaseAdrenalineGeneration`，其[术语证据与命名边界](../index.md#闪能相关术语)由 core 术语表
统一维护；`Base` 表示尚未应用闪能获得效率的公式基础量。

## 身份与公开契约

| 项目       | 定义                                   |
| ---------- | -------------------------------------- |
| 中文名称   | 闪能累积基础区                         |
| `factorId` | `base_adrenaline_generation`           |
| 身份常量   | `BASE_ADRENALINE_GENERATION_FACTOR_ID` |
| 公开定义   | `baseAdrenalineGenerationFactor`       |
| 输入类型   | `BaseAdrenalineGenerationFactorInput`  |
| 结果语义   | 尚未应用闪能获得效率的闪能累积值       |

公开类型形态如下。该代码块描述公开契约，不限定内部实现方式。

```ts
export interface BaseAdrenalineGenerationFactorInput {
  readonly baseAdrenalineGenerationValues: readonly number[]
  readonly finalAdrenalineRegen: number
  readonly effectiveAdrenalineRegenDurationInSeconds: number
}

export declare const BASE_ADRENALINE_GENERATION_FACTOR_ID: "base_adrenaline_generation"

export declare const baseAdrenalineGenerationFactor: Factor<BaseAdrenalineGenerationFactorInput>
```

由 `Factor<BaseAdrenalineGenerationFactorInput>` 的公共契约可得，
`baseAdrenalineGenerationFactor.calculate` 接收 `BaseAdrenalineGenerationFactorInput`，返回
`FactorResult`。

## 输入语义

`BaseAdrenalineGenerationFactorInput` 是一次闪能累积基础区计算的完整输入：

- `baseAdrenalineGenerationValues` 保存原公式中参与求和的各项“基础闪能累积值”。每项都是已经查表、
  换算并确认适用本次计算的一次性闪能增加量，单位为闪能点数。
- `finalAdrenalineRegen` 是本次计算采用的最终闪能自动累积，单位为闪能点数每秒。它必须已经完成基础、
  初始和最终属性计算。
- `effectiveAdrenalineRegenDurationInSeconds` 是 `finalAdrenalineRegen` 在本次计算中实际生效的时间，单位
  为秒。它只包含调用方已经确认满足闪能自动累积条件的时间。

三个字段只保存可直接参与计算的最终数值，不记录技能、效果、角色、资源状态或数据来源。

`finalAdrenalineRegen` 是 core 对攻略“闪能自动累积”参数建立的描述性字段，不将 `Adrenaline Regen`
声明为已经确认的固定游戏属性术语。攻略中的“闪能自动累积”“闪能自动回复”均指向这个按秒数值；core
不据此建立两个不同输入。

## 配套属性计算

闪能自动累积属于[通用属性计算适用范围](base-damage.md#配套属性计算)。调用方可以依次使用
`calculateInitialStat` 和 `calculateFinalStat` 计算最终闪能自动累积，再将结果作为
`finalAdrenalineRegen` 传入。

本乘区不重复实现闪能专用属性 helper，也不隐式调用通用属性 helper。基础属性、初始属性、最终属性及
各项调整的精确算法和失败行为由基础伤害区中的配套属性计算规范统一维护。

## 默认输入

闪能累积基础区产生的是闪能点数，不是倍率，没有乘法恒等输入，因此不公开
`DEFAULT_BASE_ADRENALINE_GENERATION_FACTOR_INPUT`。

调用方必须提供完整输入。显式传入空 `baseAdrenalineGenerationValues`、`finalAdrenalineRegen: 0` 和
`effectiveAdrenalineRegenDurationInSeconds: 0` 时结果为 `0`；这只是合法零累积，不是公式组合中的恒等
倍率。

## 数组语义

- 空 `baseAdrenalineGenerationValues` 表示本次计算没有一次性闪能累积，数组求和结果为 `0`。
- 每个成员表示一项独立的一次性增加量；内容相同的成员不会合并或去重。
- 成员按数组索引顺序求和，顺序不表示业务优先级。
- 计算不得修改输入对象或数组。

## 计算规则

```text
一次性累积量 = Σ baseAdrenalineGenerationValues
自动累积量 = finalAdrenalineRegen × effectiveAdrenalineRegenDurationInSeconds
闪能累积基础区结果 = 一次性累积量 + 自动累积量
```

实现必须先按数组索引顺序求和，再计算自动累积量，最后执行两者的加法。普通加法、乘法和顺序归约不
建立额外的中间校验边界；公开返回前由 `Factor` 公共契约检查最终结果是否有限。

结果不执行钳制、取整、截断或固定小数位格式化。攻略没有提供闪能累积的离散帧结算或显示取整规则，
因此使用 JavaScript `number` 的 IEEE 754 语义返回未取整数值。

## 输入值域

- `baseAdrenalineGenerationValues` 的每个成员必须是非负有限数，`0` 有效。
- `finalAdrenalineRegen` 必须是非负有限数，`0` 有效。
- `effectiveAdrenalineRegenDurationInSeconds` 必须是非负有限数，允许小数秒，`0` 有效。
- 攻略没有给出这些输入的有效上限，因此不增加未经来源确认的上限。
- 负数表示闪能消耗或负时间，不能作为闪能累积量传入本乘区。

## 适用边界

调用方必须在调用前完成以下输入准备：

- 从技能表或已确认规则取得本次一次性闪能累积的基础值；
- 判断闪能自动累积实际生效的时间；
- 将一次性累积和最终闪能自动累积统一换算为契约规定的闪能点数及每秒点数。

攻略列出的代理人、技能和基础闪能累积值属于数据事实，不固化为 core 常量。来源筛选、触发次数、结算
快照、区间拆分及闪能获得效率适用性由
[闪能累积值公式](../formulas/adrenaline-generation.md#输入准备与结算快照)统一维护，不属于本乘区的直接
输入语义。

本乘区不读取当前闪能或闪能上限，不限制可写入的实际累积量，也不处理闪能溢出、消耗、技能发动条件、
资源槽写入、触发冷却或来源分析。

能量是独立的 `Energy` 资源。即使其攻略公式与闪能累积同构，也不得把能量数值传入本乘区；能量回复由
[能量回复基础区](base-energy-generation.md)和对应公式处理。

## 有效性与失败行为

| 失败条件                                                  | 行为                                |
| --------------------------------------------------------- | ----------------------------------- |
| 输入不是非数组对象或为 `null`                             | 抛出 `TypeError`                    |
| `baseAdrenalineGenerationValues` 不是数组                 | 抛出 `TypeError`                    |
| 任一数值字段或数组成员不是 `number`                       | 抛出 `TypeError`                    |
| 任一数值字段或数组成员是 `NaN`、`Infinity` 或 `-Infinity` | 抛出 `RangeError`                   |
| 任一数值字段或数组成员小于 `0`                            | 抛出 `RangeError`                   |
| 闪能累积基础区最终结果不是有限数值                        | 由 `defineFactor` 抛出 `RangeError` |

## 代码组织

闪能累积基础区的生产代码统一放在 `packages/core/src/factors/base-adrenaline-generation.ts`。该文件包含
身份常量、输入类型、`Factor` 定义及本乘区独有的输入校验和计算逻辑，不包含查表、时间线或资源槽逻辑。

`packages/core/src/index.ts` 只负责重新导出公开 API，测试保存在
`packages/core/test/base-adrenaline-generation.test.ts`。
