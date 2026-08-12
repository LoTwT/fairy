# 秽盾削减效率区

秽盾削减效率区汇总本次秽盾削减值计算适用的攻击侧秽盾削减效率贡献，规则来源为
[原始攻略中的秽盾削减值公式](../../../references/zzz-data-introduction.txt#L373-L384)。公开标识遵循
[秽盾相关术语](../index.md#秽盾相关术语)，使用 `MiasmicShieldReductionRate`。

## 身份与公开契约

| 项目       | 定义                                      |
| ---------- | ----------------------------------------- |
| 中文名称   | 秽盾削减效率区                            |
| `factorId` | `miasmic_shield_reduction_rate`           |
| 身份常量   | `MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_ID` |
| 公开定义   | `miasmicShieldReductionRateFactor`        |
| 输入类型   | `MiasmicShieldReductionRateFactorInput`   |
| 结果语义   | `Multiplier`                              |

公开类型形态如下。该代码块描述公开契约，不限定内部实现方式。

```ts
export type MiasmicShieldReductionRateFactorInput = readonly number[]

export declare const MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_ID: "miasmic_shield_reduction_rate"

export declare const DEFAULT_MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_INPUT: MiasmicShieldReductionRateFactorInput

export declare const miasmicShieldReductionRateFactor: Factor<MiasmicShieldReductionRateFactorInput>
```

由 `Factor<MiasmicShieldReductionRateFactorInput>` 的公共契约可得，
`miasmicShieldReductionRateFactor.calculate` 接收 `MiasmicShieldReductionRateFactorInput`，返回
`FactorResult`。

`MiasmicShieldReductionRateFactorInput` 是一次秽盾削减效率区计算的完整贡献数组。每个成员表示一项
已经转换为小数的有符号秽盾削减效率贡献：

- 游戏文本中的 `15%` 提升以 `0.15` 传入；
- 叶瞬光的“秽息净化效率提升 `50%`”属于造成侧秽盾削减效率，以 `0.5` 传入；
- 某项效果使秽盾削减效率降低 `50%` 时以 `-0.5` 传入；
- `0` 表示没有贡献。

数组成员不表示最终倍率，已经包含基础值 `1` 的倍率不能作为贡献传入。调用方只传入本次秽盾削减事件
实际适用的攻击侧贡献；代理人、技能、动作、效果、触发条件和持续时间是否匹配，不由本乘区判断。

## 默认输入

`DEFAULT_MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_INPUT` 遵循
[公共默认输入规则](../index.md#乘区默认输入)，具体是一个独立创建并冻结的空数组。将其传给
`miasmicShieldReductionRateFactor.calculate` 时结果为恒等倍率 `1`。

该常量只表示本次计算没有攻击侧秽盾削减效率调整，不代表代理人的游戏内默认属性或效果状态。它不得
引用其他乘区的默认输入，运行时对象身份也必须与其他数组默认输入不同。

## 数组语义

- 空数组没有秽盾削减效率贡献，结果为 `1`。
- 每个成员表示一项独立贡献；内容相同的成员不会合并或去重。
- 成员按数组索引顺序求和，顺序不表示业务优先级。
- 数组成员允许任意有限有符号数，不设置未经来源确认的单项上限。
- 计算不得修改输入数组。

## 计算规则

```text
未钳制值 = 1 + Σ inputs
秽盾削减效率区结果 = clamp(未钳制值, 0.2, 3)
```

钳制在按数组索引顺序求和并加上基础值 `1` 后执行。未钳制值小于 `0.2` 时结果为 `0.2`，大于 `3` 时
结果为 `3`，位于 `[0.2, 3]` 时保持原值。钳制前必须检查未钳制值是否有限，结果不执行取整或截断。

攻略明确秽盾削减效率区的有效范围为 `[0.2, 3]`。输入采用有符号贡献表达同一被调整量的正向或负向
变化，不为降低来源建立独立字段或特殊机制。

## 输入准备

调用方必须按照一次具体秽盾削减事件筛选贡献：

- 代理人自身、鸣徽、战斗环境及其他效果提供的持续或条件性调整，只在条件和持续时间匹配时传入；
- `Miasma purification rate` / “秽息净化效率”按照
  [秽盾相关术语](../index.md#秽盾相关术语)归入本乘区，不归入秽盾被削减效率区，也不表示秽盾净除事件；
- 同一事件采用的基础秽盾削减值和效率贡献必须属于同一结算快照；效率在事件之间发生变化时分别
  计算；
- 效果语义为秽盾被削减效率时，该贡献属于独立的秽盾被削减效率区，不得传入本乘区；
- 同一项调整不能已经包含在基础秽盾削减值中后再次放入贡献数组。

本乘区只汇总已经完成百分比到小数转换的攻击侧贡献，不读取 Nanoka 实体、效果文本、持续时间、代理人
状态或目标状态，也不保存来源和贡献分析明细。

## 与其他秽盾机制的边界

秽盾被削减效率区是攻略中与本乘区并列相乘的另一项业务量，表示本次目标侧采用的效率调整。本乘区不
接收秽盾被削减效率，也不根据敌人、技能阶段或招架类型判断目标侧倍率。攻略列出的秽息司祭在部分技能
期间被轻招架或重招架削减秽盾的效率降低，属于秽盾被削减效率区，不得作为本乘区的负贡献。

攻略同时确认当前不存在秽盾削减抗性，代理人技能的秽盾削减值与敌人弱点或抗性无关。本乘区不接收
抗性、属性或弱点字段，也不复用 `resistanceFactor`。

本乘区还不负责：

- 从代理人、技能、动作、鸣徽、战斗环境或其他来源判断贡献是否适用；
- 计算或查找基础秽盾削减值，以及根据闪避反击、招架支援或终结技选择基础值；
- 读取或修改当前秽盾，处理秽盾上限、自然衰减、剩余量钳制、破盾、秽盾净除或秽浊流界状态；
- 执行取整、汇总多个削减事件，或保存来源和贡献分析记录。

## 有效性与失败行为

| 失败条件                                    | 行为              |
| ------------------------------------------- | ----------------- |
| 输入不是数组                                | 抛出 `TypeError`  |
| 数组成员不是 `number`                       | 抛出 `TypeError`  |
| 数组成员是 `NaN`、`Infinity` 或 `-Infinity` | 抛出 `RangeError` |
| 钳制前的未钳制值不是有限数值                | 抛出 `RangeError` |

负的有限数组成员是合法的降低贡献，不因小于 `0` 抛出错误。钳制可能把 `Infinity` 或 `-Infinity` 转换为
有限边界值，因此必须先检查未钳制值，再执行钳制。

## 代码组织

秽盾削减效率区的生产代码统一放在
`packages/core/src/factors/miasmic-shield-reduction-rate.ts`。该文件包含身份常量、默认输入、输入类型、
`Factor` 定义、范围常量及本乘区独有的求和和钳制逻辑。范围常量和私有辅助函数不对外导出。

`packages/core/src/index.ts` 只负责重新导出公开 API，测试保存在
`packages/core/test/miasmic-shield-reduction-rate.test.ts`。
