# 喧响获得效率区

喧响获得效率区汇总本次喧响值回复计算适用的喧响值获得效率贡献，规则来源为
[原始攻略中的喧响值获得效率](../../../references/zzz-data-introduction.txt#L355-L357)。公开标识和中英文
用词遵循[喧响相关术语](../index.md#喧响相关术语)，使用 `DecibelGenerationRate`。

## 身份与公开契约

| 项目       | 定义                                |
| ---------- | ----------------------------------- |
| 中文名称   | 喧响获得效率区                      |
| `factorId` | `decibel_generation_rate`           |
| 身份常量   | `DECIBEL_GENERATION_RATE_FACTOR_ID` |
| 公开定义   | `decibelGenerationRateFactor`       |
| 输入类型   | `DecibelGenerationRateFactorInput`  |
| 结果语义   | `Multiplier`                        |

公开类型形态如下。该代码块描述公开契约，不限定内部实现方式。

```ts
export type DecibelGenerationRateFactorInput = readonly number[]

export declare const DECIBEL_GENERATION_RATE_FACTOR_ID: "decibel_generation_rate"

export declare const DEFAULT_DECIBEL_GENERATION_RATE_FACTOR_INPUT: DecibelGenerationRateFactorInput

export declare const decibelGenerationRateFactor: Factor<DecibelGenerationRateFactorInput>
```

由 `Factor<DecibelGenerationRateFactorInput>` 的公共契约可得，
`decibelGenerationRateFactor.calculate` 接收 `DecibelGenerationRateFactorInput`，返回
`FactorResult`。

`DecibelGenerationRateFactorInput` 是一次喧响获得效率区计算的完整贡献数组。每个成员表示一项已经转换
为小数的有符号喧响值获得效率贡献：

- 游戏文本中的 `30%` 提升以 `0.3` 传入；
- 轻招架造成的 `50%` 降低以 `-0.5` 传入，重招架造成的 `30%` 降低以 `-0.3` 传入；
- `0` 表示没有贡献。

数组成员不表示最终倍率，已经包含基础值 `1` 的倍率不能作为贡献传入。调用方只传入本次回复事件实际
适用的贡献；代理人、技能、动作、效果、触发条件和持续时间是否匹配，不由本乘区判断。

## 默认输入

`DEFAULT_DECIBEL_GENERATION_RATE_FACTOR_INPUT` 遵循
[公共默认输入规则](../index.md#乘区默认输入)，具体是一个独立创建并冻结的空数组。将其传给
`decibelGenerationRateFactor.calculate` 时结果为恒等倍率 `1`。

该常量只表示本次计算没有喧响值获得效率调整，不代表代理人的游戏内默认属性或效果状态。它不得引用
`DEFAULT_ENERGY_GENERATION_RATE_FACTOR_INPUT`、`DEFAULT_ADRENALINE_GENERATION_RATE_FACTOR_INPUT` 或
其他乘区的默认输入，运行时对象身份也必须与这些常量不同。

## 数组语义

- 空数组没有喧响值获得效率贡献，结果为 `1`。
- 每个成员表示一项独立贡献；内容相同的成员不会合并或去重。
- 成员按数组索引顺序求和，顺序不表示业务优先级。
- 数组成员允许任意有限有符号数，不设置未经来源确认的单项上限。
- 计算不得修改输入数组。

## 计算规则

```text
未钳制值 = 1 + Σ inputs
喧响获得效率区结果 = clamp(未钳制值, 0, 3)
```

钳制在按数组索引顺序求和并加上基础值 `1` 后执行。未钳制值小于 `0` 时结果为 `0`，大于 `3` 时结果
为 `3`，位于 `[0, 3]` 时保持原值。钳制前必须检查未钳制值是否有限，结果不执行取整或截断。

攻略同时给出了提升与降低来源，并明确喧响获得效率区的有效范围为 `[0, 3]`。输入采用有符号贡献表达
同一被调整量的正向或负向变化，不为降低来源建立独立字段或特殊机制。

## 输入准备

调用方必须按照一次具体喧响值回复事件筛选贡献：

- 代理人自身、危局强袭战、活动及其他效果提供的持续或条件性提升，只在条件和持续时间匹配时传入；
- 秽息司祭技能造成的轻招架或重招架效率降低，只应用到对应招架事件；
- 同一事件采用的基础喧响值回复和效率贡献必须属于同一结算快照；效率在事件之间发生变化时分别计算；
- 特殊效果是否受 `Decibel Generation Rate` 调整，必须由调用方依据该效果规则确认，本乘区不默认适用。

本乘区只汇总已经完成百分比到小数转换的贡献，不读取 Nanoka 实体、效果文本、持续时间或代理人状态，
也不保存来源和贡献分析明细。

## 资源状态与伴随获得边界

喧响获得效率区只产生本次回复采用的倍率，不读取当前喧响值或喧响值上限，不处理喧响槽写入、溢出、
喧响等级、显示取整或终结技消耗。

“伴随获得效率”是攻略中与本乘区并列相乘的另一项业务量，具有触发者与其他代理人的独立语义。本乘区
不接收伴随获得效率，不判断本次接收者是否为触发者，也不判断特殊效果能否产生伴随回复。
[喧响值伴随获得效率](accompanying-decibel-generation-rate.md)由独立 `Factor` 计算；不能把 `50%`、
`52.5%` 或触发者使用的恒等倍率 `1` 混入本乘区的贡献数组。

## 有效性与失败行为

| 失败条件                                    | 行为              |
| ------------------------------------------- | ----------------- |
| 输入不是数组                                | 抛出 `TypeError`  |
| 数组成员不是 `number`                       | 抛出 `TypeError`  |
| 数组成员是 `NaN`、`Infinity` 或 `-Infinity` | 抛出 `RangeError` |
| 钳制前的未钳制值不是有限数值                | 抛出 `RangeError` |

钳制可能把 `Infinity` 或 `-Infinity` 转换为有限边界值，因此必须先检查未钳制值，再执行钳制。

## 代码组织

喧响获得效率区的生产代码统一放在
`packages/core/src/factors/decibel-generation-rate.ts`。该文件包含身份常量、默认输入、输入类型、
`Factor` 定义、范围常量及本乘区独有的求和和钳制逻辑。范围常量和私有辅助函数不对外导出。

`packages/core/src/index.ts` 只负责重新导出公开 API，测试保存在
`packages/core/test/decibel-generation-rate.test.ts`。
