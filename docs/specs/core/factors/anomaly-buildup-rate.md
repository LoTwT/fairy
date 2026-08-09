# 异常积蓄效率区

异常积蓄效率区汇总本次异常积蓄计算适用的效率调整，规则来源为
[原始攻略中的异常积蓄效率区](../../../references/zzz-data-introduction.txt#L228-L230)。Nanoka 3.0 的英文
游戏文本使用 `Anomaly Buildup Rate` 表示“属性异常积蓄效率”，因此公开标识使用
`AnomalyBuildupRate`。

## 身份与公开契约

| 项目       | 定义                             |
| ---------- | -------------------------------- |
| 中文名称   | 异常积蓄效率区                   |
| `factorId` | `anomaly_buildup_rate`           |
| 身份常量   | `ANOMALY_BUILDUP_RATE_FACTOR_ID` |
| 公开定义   | `anomalyBuildupRateFactor`       |
| 输入类型   | `AnomalyBuildupRateFactorInput`  |
| 结果语义   | `Multiplier`                     |

公开类型形态如下。该代码块描述公开契约，不限定内部实现方式。

```ts
export type AnomalyBuildupRateFactorInput = readonly number[]

export declare const ANOMALY_BUILDUP_RATE_FACTOR_ID: "anomaly_buildup_rate"

export declare const DEFAULT_ANOMALY_BUILDUP_RATE_FACTOR_INPUT: AnomalyBuildupRateFactorInput

export declare const anomalyBuildupRateFactor: Factor<AnomalyBuildupRateFactorInput>
```

由 `Factor<AnomalyBuildupRateFactorInput>` 的通用契约可得，`anomalyBuildupRateFactor.calculate` 接收
`AnomalyBuildupRateFactorInput`，返回 `FactorResult`。

`AnomalyBuildupRateFactorInput` 是一次异常积蓄效率区计算的完整贡献数组。“异常积蓄效率
提升”、“异常积蓄值提升”和“异常积蓄效率降低”都作用于同一个被调整量，即异常积蓄效率。
攻略确认前两种描述是相同效果，第三种描述表示对该被调整量的负向调整。三种描述不对应三个独立计算参数，
因此统一作为有符号贡献传入。

每个成员表示一项已经转换为小数的有符号贡献。游戏文本中的 `20%` 以 `0.2` 传入：

- 异常积蓄效率提升和异常积蓄值提升使用正数；
- 异常积蓄效率降低使用负数；
- `0` 表示没有贡献。

数组成员不表示最终倍率，已经包含基础值 `1` 的倍率不能作为贡献传入。调用方只传入本次攻击实际
适用的贡献；属性、技能、触发条件和持续时间是否匹配，不由本乘区判断。贡献的来源身份、来源类型和原始文案也由调用方保留，
不进入 `AnomalyBuildupRateFactorInput`。

## 默认输入

`DEFAULT_ANOMALY_BUILDUP_RATE_FACTOR_INPUT` 遵循[公共默认输入规则](../index.md#乘区默认输入)，具体是
冻结的空数组。将其传给 `anomalyBuildupRateFactor.calculate` 时结果为恒等倍率 `1`。

该常量表示本次计算没有异常积蓄效率调整，不代表代理人、邦布、技能或游戏内默认状态。

## 数组语义

- 空数组没有异常积蓄效率贡献，结果为 `1`。
- 每个数组成员表示一项独立来源的贡献；内容相同的成员仍独立参与求和，不会合并或去重。
- 输入按数组顺序求和，顺序不表示业务优先级。
- 数组成员允许任意有限有符号数，不设置未经来源确认的单项上限。
- 计算不得修改输入数组。

## 计算规则

```text
异常积蓄效率区结果 = 1 + Σ inputs
```

攻略没有给出异常积蓄效率区的有效范围，因此本乘区不增加上限，也不采用其他乘区的范围执行钳制。
结果为 `0` 时表示本乘区阻止本次攻击产生异常积蓄；结果小于 `0` 不能表示有效倍率，必须抛出
`RangeError`，不能静默钳制为 `0`。结果不执行取整或截断。

加法和顺序归约属于普通连续算术，不承诺逐步检查中间结果。公开返回前必须检查最终结果是否有限且
非负。

## 负结果边界

原始攻略没有说明各项降低使 `1 + Σ inputs` 小于 `0` 时，游戏会钳制为 `0`，还是该输入组合不会
出现。本规范将负结果定义为无效输入并抛出 `RangeError`，不推导未经来源确认的钳制规则。

## 适用边界

异常积蓄效率区只汇总已经判断为适用的倍率贡献，不负责：

- 记录贡献的来源身份、来源类型或原始效果文案；
- 根据攻击属性、技能类型、代理人、邦布、目标或效果条件选择贡献；
- 计算异常掌控、基础异常积蓄值、异常积蓄抗性、距离衰减或异常触发阈值；
- 将本乘区的结果写入异常积蓄槽或记录为后续异常伤害的贡献。

## 有效性与失败行为

| 失败条件                                    | 行为              |
| ------------------------------------------- | ----------------- |
| 输入不是数组                                | 抛出 `TypeError`  |
| 数组成员不是 `number`                       | 抛出 `TypeError`  |
| 数组成员是 `NaN`、`Infinity` 或 `-Infinity` | 抛出 `RangeError` |
| 最终结果不是有限数值                        | 抛出 `RangeError` |
| 最终结果小于 `0`                            | 抛出 `RangeError` |

## 代码组织

异常积蓄效率区的生产代码统一放在
`packages/core/src/factors/anomaly-buildup-rate.ts`。该文件包含身份常量、默认输入、输入类型、`Factor`
定义及异常积蓄效率区独有的求和和校验逻辑。

`packages/core/src/index.ts` 只负责重新导出公开 API，测试保存在
`packages/core/test/anomaly-buildup-rate.test.ts`。
