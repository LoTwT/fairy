# 能量获得效率区

能量获得效率区汇总本次能量回复计算适用的能量获得效率贡献，规则来源为
[原始攻略中的能量获得效率区](../../../references/zzz-data-introduction.txt#L301-L303)。Nanoka 3.1 的英文
游戏文本使用 `Energy Generation Rate` 对应“能量获得效率”，因此公开标识使用
`EnergyGenerationRate`。

## 身份与公开契约

| 项目       | 定义                               |
| ---------- | ---------------------------------- |
| 中文名称   | 能量获得效率区                     |
| `factorId` | `energy_generation_rate`           |
| 身份常量   | `ENERGY_GENERATION_RATE_FACTOR_ID` |
| 公开定义   | `energyGenerationRateFactor`       |
| 输入类型   | `EnergyGenerationRateFactorInput`  |
| 结果语义   | `Multiplier`                       |

公开类型形态如下。该代码块描述公开契约，不限定内部实现方式。

```ts
export type EnergyGenerationRateFactorInput = readonly number[]

export declare const ENERGY_GENERATION_RATE_FACTOR_ID: "energy_generation_rate"

export declare const DEFAULT_ENERGY_GENERATION_RATE_FACTOR_INPUT: EnergyGenerationRateFactorInput

export declare const energyGenerationRateFactor: Factor<EnergyGenerationRateFactorInput>
```

由 `Factor<EnergyGenerationRateFactorInput>` 的公共契约可得，`energyGenerationRateFactor.calculate`
接收 `EnergyGenerationRateFactorInput`，返回 `FactorResult`。

`EnergyGenerationRateFactorInput` 是一次能量获得效率区计算的完整贡献数组。每个成员表示一项已经转换
为小数的有符号能量获得效率贡献：

- 游戏文本中的 `15%` 提升以 `0.15` 传入；
- 效率降低以负数传入；
- `0` 表示没有贡献。

数组成员不表示最终倍率，已经包含基础值 `1` 的倍率不能作为贡献传入。调用方只传入本次回复实际
适用的贡献；角色、技能、回复来源、触发条件和持续时间是否匹配，不由本乘区判断。

## 默认输入

`DEFAULT_ENERGY_GENERATION_RATE_FACTOR_INPUT` 遵循[公共默认输入规则](../index.md#乘区默认输入)，具体是
冻结的空数组。将其传给 `energyGenerationRateFactor.calculate` 时结果为恒等倍率 `1`。

该常量只表示本次计算没有能量获得效率调整，不代表代理人的游戏内默认属性或效果状态。

## 数组语义

- 空数组没有能量获得效率贡献，结果为 `1`。
- 每个成员表示一项独立贡献；内容相同的成员不会合并或去重。
- 成员按数组顺序求和，顺序不表示业务优先级。
- 数组成员允许任意有限有符号数，不设置未经来源确认的单项上限。
- 计算不得修改输入数组。

## 计算规则

```text
未钳制值 = 1 + Σ inputs
能量获得效率区结果 = clamp(未钳制值, 0, 3)
```

钳制在按数组顺序求和并加上基础值 `1` 后执行。未钳制值小于 `0` 时结果为 `0`，大于 `3` 时结果为
`3`，位于 `[0, 3]` 时保持原值。钳制前必须检查未钳制值是否有限，结果不执行取整或截断。

攻略只列举了能量获得效率提升来源，但同时明确给出了包含下界 `0` 的最终有效范围。输入采用有符号
贡献以表达同一被调整量的正向或负向变化，不为尚未确认的降低来源建立独立字段或特殊机制。

## 适用边界

`Energy Generation Rate` 既可能是代理人在一段时间内适用的整体效果，也可能只提升当前招式的能量
获得效率。调用方必须按本次具体回复事件筛选贡献，不能仅因角色当前拥有某项效果就无条件传入。

攻略说明能量获得效率影响“几乎所有”能量回复，而不是所有回复。只有已经确认采用该倍率的一次性
回复和自动回复才能与本乘区结果组合；效果是否受该倍率加成不由本乘区推断。

本乘区不负责：

- 计算能量自动回复、基础能量回复值或实际回复时间；
- 判断攻击命中、技能标签、接战状态、角色位置、效果条件或持续时间；
- 判断能量球、特殊技能、邦布、鸣徽或活动效果是否采用能量获得效率；
- 读取当前能量、能量上限，处理资源槽写入、溢出或消耗；
- 保存贡献来源、原始效果文本或分析明细。

`Adrenaline Generation Rate` 是闪能获得效率的独立游戏属性。与能量获得效率数值相同的效果可以分别
向两个资源提供贡献，但闪能贡献不能直接传给本乘区并把它作为闪能乘区使用。闪能贡献由独立的
[闪能获得效率区](adrenaline-generation-rate.md)处理。

## 有效性与失败行为

| 失败条件                                    | 行为              |
| ------------------------------------------- | ----------------- |
| 输入不是数组                                | 抛出 `TypeError`  |
| 数组成员不是 `number`                       | 抛出 `TypeError`  |
| 数组成员是 `NaN`、`Infinity` 或 `-Infinity` | 抛出 `RangeError` |
| 钳制前的未钳制值不是有限数值                | 抛出 `RangeError` |

钳制可能把 `Infinity` 或 `-Infinity` 转换为有限边界值，因此必须先检查未钳制值，再执行钳制。

## 代码组织

能量获得效率区的生产代码统一放在
`packages/core/src/factors/energy-generation-rate.ts`。该文件包含身份常量、默认输入、输入类型、`Factor`
定义、范围常量及本乘区独有的求和和钳制逻辑。范围常量和私有辅助函数不对外导出。

`packages/core/src/index.ts` 只负责重新导出公开 API，测试保存在
`packages/core/test/energy-generation-rate.test.ts`。
