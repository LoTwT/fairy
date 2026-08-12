# 喧响值伴随获得效率

喧响值伴随获得效率表示一名代理人触发喧响值回复时，其他代理人按何种比例获得伴随喧响值。规则来源
为[原始攻略中的喧响值回复公式与伴随获得说明](../../../references/zzz-data-introduction.txt#L340-L359)。
攻略将它作为喧响值回复公式中的独立乘法项，因此由统一的 `Factor` 模型承载。触发者自身不发生伴随
获得；同一顶层公式计算触发者时，显式传入恒等倍率 `1`，保留该乘区在公式中的固定位置。

公开标识采用[喧响相关术语](../index.md#喧响相关术语)中定义的
`AccompanyingDecibelGenerationRate`。

## 身份与公开契约

| 项目       | 定义                                                |
| ---------- | --------------------------------------------------- |
| 中文名称   | 喧响值伴随获得效率                                  |
| `factorId` | `accompanying_decibel_generation_rate`              |
| 身份常量   | `ACCOMPANYING_DECIBEL_GENERATION_RATE_FACTOR_ID`    |
| 公开定义   | `accompanyingDecibelGenerationRateFactor`           |
| 输入类型   | `AccompanyingDecibelGenerationRateFactorInput`      |
| 结果语义   | 本次接收者采用的喧响值伴随获得最终倍率 `Multiplier` |

公开类型形态如下。该代码块描述公开契约，不限定内部实现方式。

```ts
export type AccompanyingDecibelGenerationRateFactorInput = number

export declare const ACCOMPANYING_DECIBEL_GENERATION_RATE_FACTOR_ID: "accompanying_decibel_generation_rate"

export declare const DEFAULT_ACCOMPANYING_DECIBEL_GENERATION_RATE_FACTOR_INPUT: AccompanyingDecibelGenerationRateFactorInput

export declare const accompanyingDecibelGenerationRateFactor: Factor<AccompanyingDecibelGenerationRateFactorInput>
```

由 `Factor<AccompanyingDecibelGenerationRateFactorInput>` 的公共契约可得，
`accompanyingDecibelGenerationRateFactor.calculate` 接收
`AccompanyingDecibelGenerationRateFactorInput`，返回 `FactorResult`。

## 输入语义

`AccompanyingDecibelGenerationRateFactorInput` 直接表示调用方已经为本次接收者确定的最终倍率：

- `1` 表示不执行伴随折算，适用于触发者自身或效果明确指定的直接接收者；
- `0.5` 表示把应用本乘区前的结算结果按 `50%` 计为本次接收者的结果；
- `0.525` 表示把应用本乘区前的结算结果按 `52.5%` 计为本次接收者的结果；
- `0` 表示已确认本次接收者的最终倍率为零。

输入不是提升或降低贡献，也不包含基础值。调用方不能把游戏文本中的 `50%` 当作 `0.5` 的增量再加
到 `1` 上。主公式只直接使用一个最终倍率，因此不增加只有同名字段的对象包装，也不使用贡献数组。

本乘区不接收 `recipientRole`、`isAccompanying`、触发者身份或接收者身份。一次公式调用只计算一个
接收者，角色关系与倍率选择必须在调用本乘区前完成。

## 默认输入

`DEFAULT_ACCOMPANYING_DECIBEL_GENERATION_RATE_FACTOR_INPUT` 遵循
[公共默认输入规则](../index.md#乘区默认输入)，值为 `1`。将其传给
`accompanyingDecibelGenerationRateFactor.calculate` 时得到恒等倍率 `1`。

该常量用于触发者自身、效果明确指定的直接接收者，或已经确认最终倍率恰为 `1` 的接收者计算。它不是
游戏内默认伴随比例，也不能代替攻略列出的 `0.5`、`0.525` 或其他伴随接收者实际倍率。采用默认输入时，
调用方仍须显式把它传入公式。该数值是不可变原始值，不需要运行时冻结。

## 计算规则

```text
喧响值伴随获得效率结果 = input
```

计算直接返回已经准备好的最终倍率，不增加常量，不执行求和、钳制、取整或截断。输入和结果必须是
非负有限数，`0` 有效。

攻略列出了 `50%` 和 `52.5%` 两类实例，但没有给出该倍率的完整有效范围、调整公式或上限。实现不得
将输入限制在这两个值之间，也不得把大于 `1` 的有限输入钳制为 `1`。大于 `1` 的非负有限数保持原值。

## 倍率归属与输入准备

现有来源确认了触发者与其他代理人的区分，也说明部分特殊效果不会使其他代理人伴随获得喧响值，但
没有提供可由 core 根据代理人身份推导最终倍率的完整规则。调用方必须先完成以下准备：

- 确定本次公式调用对应的唯一接收者；
- 根据已经确认的角色规则、事件来源和结算关系，得到该接收者的最终倍率；
- 确认该倍率与本次基础喧响值及喧响值获得效率属于同一结算事件。

无法确认最终倍率归属时，不得使用某个常见比例代替，也不能把公式结果声明为完整。后续数据层可以
维护角色到最终倍率的映射，但这些版本化数据不固化为 core 常量。

触发者自身采用恒等倍率 `1`。其他代理人只有在来源规则确认会产生伴随获得时，才使用各自已经确定的
最终比例。特殊效果明确不产生伴随获得时，效果明确指定的每个直接接收者都以自身直接获得的数值作为
基础喧响值，并显式传入恒等输入 `1`；不得为未被效果直接指定的代理人追加伴随调用，也不能用恒等输入
将该特殊效果扩散给这些代理人。

## 适用边界

本乘区只校验并返回已经准备好的最终倍率，不负责：

- 判断某项技能、特殊动作、影画、音擎或活动效果是否产生伴随获得；
- 判断倍率属于触发者还是接收者，或根据前台、后台位置选择倍率；
- 从代理人身份、技能数据、Nanoka 内部字段或游戏文本推导倍率；
- 汇总倍率贡献、应用未经确认的基础值、调整规则或有效范围；
- 读取当前喧响值和上限，处理资源槽写入、取整、溢出或消耗；
- 保存来源、接收者列表或贡献分析记录。

## 有效性与失败行为

| 失败条件                                | 行为              |
| --------------------------------------- | ----------------- |
| 输入不是 `number`                       | 抛出 `TypeError`  |
| 输入是 `NaN`、`Infinity` 或 `-Infinity` | 抛出 `RangeError` |
| 输入小于 `0`                            | 抛出 `RangeError` |

`defineFactor` 按公共契约再次检查最终结果是否有限。合法输入直接返回，不增加重复的范围校验。

## 代码组织

喧响值伴随获得效率的生产代码统一放在
`packages/core/src/factors/accompanying-decibel-generation-rate.ts`。该文件包含身份常量、默认输入、输入
类型、`Factor` 定义及本乘区独有的输入校验，不包含代理人映射、事件筛选或资源槽逻辑。

`packages/core/src/index.ts` 只负责重新导出公开 API，测试保存在
`packages/core/test/accompanying-decibel-generation-rate.test.ts`。
