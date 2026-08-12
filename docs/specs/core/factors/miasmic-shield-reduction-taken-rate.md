# 秽盾被削减效率区

秽盾被削减效率区汇总本次秽盾削减值计算中承受侧适用的秽盾被削减效率贡献，规则来源为
[原始攻略中的秽盾削减值说明](../../../references/zzz-data-introduction.txt#L373-L384)。公开标识和中英文用词
遵循[秽盾相关术语](../index.md#秽盾相关术语)，使用 `MiasmicShieldReductionTakenRate`，与造成侧的
`MiasmicShieldReductionRate` 明确区分。

## 身份与公开契约

| 项目       | 定义                                            |
| ---------- | ----------------------------------------------- |
| 中文名称   | 秽盾被削减效率区                                |
| `factorId` | `miasmic_shield_reduction_taken_rate`           |
| 身份常量   | `MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_FACTOR_ID` |
| 公开定义   | `miasmicShieldReductionTakenRateFactor`         |
| 输入类型   | `MiasmicShieldReductionTakenRateFactorInput`    |
| 结果语义   | `Multiplier`                                    |

公开类型形态如下。该代码块描述公开契约，不限定内部实现方式。

```ts
export type MiasmicShieldReductionTakenRateFactorInput = readonly number[]

export declare const MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_FACTOR_ID: "miasmic_shield_reduction_taken_rate"

export declare const DEFAULT_MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_FACTOR_INPUT: MiasmicShieldReductionTakenRateFactorInput

export declare const miasmicShieldReductionTakenRateFactor: Factor<MiasmicShieldReductionTakenRateFactorInput>
```

由 `Factor<MiasmicShieldReductionTakenRateFactorInput>` 的公共契约可得，
`miasmicShieldReductionTakenRateFactor.calculate` 接收 `MiasmicShieldReductionTakenRateFactorInput`，返回
`FactorResult`。

`MiasmicShieldReductionTakenRateFactorInput` 是一次秽盾被削减效率区计算的完整贡献数组。每个成员表示
一项已经转换为小数的有符号秽盾被削减效率贡献：

- 秽盾被削减效率提升 `2.5%` 以 `0.025` 传入；
- 被轻招架削减秽盾的效率降低 `50%` 以 `-0.5` 传入，被重招架削减秽盾的效率降低 `30%` 以 `-0.3`
  传入；
- `0` 表示没有贡献。

数组成员不表示最终倍率，已经包含基础值 `1` 的倍率不能作为贡献传入。调用方只传入本次攻击结算事件
和目标快照实际适用的贡献；目标、技能、动作、状态、触发条件和持续时间是否匹配，不由本乘区判断。

## 默认输入

`DEFAULT_MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_FACTOR_INPUT` 遵循
[公共默认输入规则](../index.md#乘区默认输入)，具体是一个独立创建并冻结的空数组。将其传给
`miasmicShieldReductionTakenRateFactor.calculate` 时结果为恒等倍率 `1`。

该常量只表示本次计算没有秽盾被削减效率调整，不代表目标在游戏内没有其他秽盾状态或效果。它不得引用
`DEFAULT_MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_INPUT` 或其他乘区的默认输入，运行时对象身份也必须与这些
常量不同。

## 数组语义

- 空数组没有秽盾被削减效率贡献，结果为 `1`。
- 每个成员表示一项独立贡献；内容相同的成员不会合并或去重。
- 成员按数组索引顺序求和，顺序不表示业务优先级。
- 数组成员允许任意有限有符号数，不设置未经来源确认的单项上限。
- 计算不得修改输入数组。

## 计算规则

```text
未钳制值 = 1 + Σ inputs
秽盾被削减效率区结果 = clamp(未钳制值, 0.2, 3)
```

钳制在按数组索引顺序求和并加上基础值 `1` 后执行。未钳制值小于 `0.2` 时结果为 `0.2`，大于 `3` 时
结果为 `3`，位于 `[0.2, 3]` 时保持原值。钳制前必须检查未钳制值是否有限，结果不执行取整或截断。

现有来源分别给出了秽盾被削减效率的提升与降低，并且攻略明确该乘区的有效范围为 `[0.2, 3]`。
输入采用有符号贡献表达同一被调整量的正向或负向变化，不为降低来源建立独立字段或特殊机制。

## 贡献归属

本乘区只处理效果语义为“秽盾被削减效率提升”或“秽盾被削减效率降低”的承受侧贡献。乘区归属取决于
效果描述，不取决于效果由攻击方、受击方或其他机制提供：

- 效果提高或降低代理人造成的秽盾削减值时，贡献属于
  [秽盾削减效率区](miasmic-shield-reduction-rate.md)，不得传入本乘区；
- 技能或动作的基础秽盾削减值属于
  [基础秽盾削减值](base-miasmic-shield-reduction.md)，不得作为效率贡献传入；
- 敌人的弱点、属性抗性、失衡抗性及其他抗性不属于秽盾被削减效率，不得传入本乘区；
- 同一项调整不能同时计入秽盾削减效率区和秽盾被削减效率区。

调用方必须先按照本次攻击结算事件和目标快照筛选适用贡献。本乘区不读取 Nanoka 实体、效果文本、
技能阶段或目标状态，也不保存来源和贡献分析明细。

## 秽盾状态边界

秽盾被削减效率区只产生本次计算采用的承受侧倍率，不读取当前秽盾值或秽盾上限，不判断目标是否正在
持有秽盾，也不处理秽盾削减、自然衰减、恢复、消耗、打破或净除。目标是否具有可削减的秽盾及本次攻击
是否命中，应由调用方在建立输入前确认。

## 有效性与失败行为

| 失败条件                                    | 行为              |
| ------------------------------------------- | ----------------- |
| 输入不是数组                                | 抛出 `TypeError`  |
| 数组成员不是 `number`                       | 抛出 `TypeError`  |
| 数组成员是 `NaN`、`Infinity` 或 `-Infinity` | 抛出 `RangeError` |
| 钳制前的未钳制值不是有限数值                | 抛出 `RangeError` |

钳制可能把 `Infinity` 或 `-Infinity` 转换为有限边界值，因此必须先检查未钳制值，再执行钳制。

## 代码组织

秽盾被削减效率区的生产代码统一放在
`packages/core/src/factors/miasmic-shield-reduction-taken-rate.ts`。该文件包含身份常量、默认输入、输入类型、
`Factor` 定义、范围常量及本乘区独有的求和和钳制逻辑。范围常量和私有辅助函数不对外导出。

`packages/core/src/index.ts` 只负责重新导出公开 API，测试保存在
`packages/core/test/miasmic-shield-reduction-taken-rate.test.ts`。
