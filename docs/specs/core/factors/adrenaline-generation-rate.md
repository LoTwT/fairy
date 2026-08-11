# 闪能获得效率区

闪能获得效率区汇总本次闪能累积计算适用的闪能获得效率贡献，规则来源为
[原始攻略中的闪能获得效率区](../../../references/zzz-data-introduction.txt#L335-L338)。按照
[闪能相关术语](../index.md#闪能相关术语)，公开标识使用 `AdrenalineGenerationRate`。

## 身份与公开契约

| 项目       | 定义                                   |
| ---------- | -------------------------------------- |
| 中文名称   | 闪能获得效率区                         |
| `factorId` | `adrenaline_generation_rate`           |
| 身份常量   | `ADRENALINE_GENERATION_RATE_FACTOR_ID` |
| 公开定义   | `adrenalineGenerationRateFactor`       |
| 输入类型   | `AdrenalineGenerationRateFactorInput`  |
| 结果语义   | `Multiplier`                           |

公开类型形态如下。该代码块描述公开契约，不限定内部实现方式。

```ts
export type AdrenalineGenerationRateFactorInput = readonly number[]

export declare const ADRENALINE_GENERATION_RATE_FACTOR_ID: "adrenaline_generation_rate"

export declare const DEFAULT_ADRENALINE_GENERATION_RATE_FACTOR_INPUT: AdrenalineGenerationRateFactorInput

export declare const adrenalineGenerationRateFactor: Factor<AdrenalineGenerationRateFactorInput>
```

由 `Factor<AdrenalineGenerationRateFactorInput>` 的公共契约可得，
`adrenalineGenerationRateFactor.calculate` 接收 `AdrenalineGenerationRateFactorInput`，返回
`FactorResult`。

`AdrenalineGenerationRateFactorInput` 是一次闪能获得效率区计算的完整贡献数组。每个成员表示一项已经
转换为小数的有符号闪能获得效率贡献：

- 游戏文本中的 `15%` 提升以 `0.15` 传入；
- 效率降低以负数传入；
- `0` 表示没有贡献。

数组成员不表示最终倍率，已经包含基础值 `1` 的倍率不能作为贡献传入。调用方只传入本次闪能累积实际
适用的贡献；角色、技能、累积来源、触发条件和持续时间是否匹配，不由本乘区判断。

中文游戏文本中的“闪能获得效率”和“闪能回复效率”经数据层归一化后都作为本乘区的贡献，不建立第二个
`Factor`。

## 默认输入

`DEFAULT_ADRENALINE_GENERATION_RATE_FACTOR_INPUT` 遵循
[公共默认输入规则](../index.md#乘区默认输入)，具体是冻结的空数组。将其传给
`adrenalineGenerationRateFactor.calculate` 时结果为恒等倍率 `1`。

该常量只表示本次计算没有闪能获得效率调整，不代表代理人的游戏内默认属性或效果状态。它与
`DEFAULT_ENERGY_GENERATION_RATE_FACTOR_INPUT` 是两个独立常量，不互相引用。

## 数组语义

- 空数组没有闪能获得效率贡献，结果为 `1`。
- 每个成员表示一项独立贡献；内容相同的成员不会合并或去重。
- 成员按数组索引顺序求和，顺序不表示业务优先级。
- 数组成员允许任意有限有符号数，不设置未经来源确认的单项上限。
- 计算不得修改输入数组。

## 计算规则

```text
未钳制值 = 1 + Σ inputs
闪能获得效率区结果 = clamp(未钳制值, 0, 3)
```

钳制在按数组索引顺序求和并加上基础值 `1` 后执行。未钳制值小于 `0` 时结果为 `0`，大于 `3` 时结果
为 `3`，位于 `[0, 3]` 时保持原值。钳制前必须检查未钳制值是否有限，结果不执行取整或截断。

攻略只列举了闪能获得效率提升来源，但同时明确给出了包含下界 `0` 的最终有效范围。输入采用有符号
贡献以表达同一被调整量的正向或负向变化，不为尚未确认的降低来源建立独立字段或特殊机制。

## 适用边界

`Adrenaline Generation Rate` 可能只适用于特定招式或特定持续时间。调用方必须按本次具体累积事件筛选
贡献，不能仅因角色当前拥有某项效果就无条件传入。

攻略说明闪能获得效率影响“几乎所有”闪能累积，而不是所有累积。只有已经确认采用该倍率的一次性累积
和自动累积才能与本乘区结果组合；效果是否受该倍率加成不由本乘区推断。

本乘区不负责：

- 计算闪能自动累积、基础闪能累积值或实际累积时间；
- 判断攻击命中、技能标签、角色资格、效果条件或持续时间；
- 读取当前闪能、闪能上限，处理资源槽写入、溢出或消耗；
- 保存贡献来源、原始效果文本或分析明细。

`Energy Generation Rate` 是能量获得效率的独立游戏属性。与闪能获得效率数值相同的效果可以分别向两个
资源提供贡献，但能量贡献不能直接传给本乘区并把它作为能量乘区使用。

## 有效性与失败行为

| 失败条件                                    | 行为              |
| ------------------------------------------- | ----------------- |
| 输入不是数组                                | 抛出 `TypeError`  |
| 数组成员不是 `number`                       | 抛出 `TypeError`  |
| 数组成员是 `NaN`、`Infinity` 或 `-Infinity` | 抛出 `RangeError` |
| 钳制前的未钳制值不是有限数值                | 抛出 `RangeError` |

钳制可能把 `Infinity` 或 `-Infinity` 转换为有限边界值，因此必须先检查未钳制值，再执行钳制。

## 代码组织

闪能获得效率区的生产代码统一放在
`packages/core/src/factors/adrenaline-generation-rate.ts`。该文件包含身份常量、默认输入、输入类型、
`Factor` 定义、范围常量及本乘区独有的求和和钳制逻辑。范围常量和私有辅助函数不对外导出。

`packages/core/src/index.ts` 只负责重新导出公开 API，测试保存在
`packages/core/test/adrenaline-generation-rate.test.ts`。
