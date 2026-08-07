# 异常增伤区

异常增伤区汇总本次异常伤害适用的异常伤害提升和降低贡献，规则来源为
[原始攻略中的异常增伤区](../../../references/zzz-data-introduction.txt#L258)。Nanoka 3.0 的英文游戏文本会按
上下文使用 `Anomaly DMG` 或 `Attribute Anomaly DMG`；公开标识使用能够覆盖统一乘区语义的
`AnomalyDamageBonus`。

## 身份与公开契约

| 项目       | 定义                             |
| ---------- | -------------------------------- |
| 中文名称   | 异常增伤区                       |
| `factorId` | `anomaly_damage_bonus`           |
| 身份常量   | `ANOMALY_DAMAGE_BONUS_FACTOR_ID` |
| 公开定义   | `anomalyDamageBonusFactor`       |
| 输入类型   | `AnomalyDamageBonusFactorInput`  |
| 结果语义   | `Multiplier`                     |

公开类型形态如下。该代码块描述公开契约，不限定内部实现方式。

```ts
export type AnomalyDamageBonusFactorInput = readonly number[]

export declare const ANOMALY_DAMAGE_BONUS_FACTOR_ID: "anomaly_damage_bonus"

export declare const DEFAULT_ANOMALY_DAMAGE_BONUS_FACTOR_INPUT: AnomalyDamageBonusFactorInput

export declare const anomalyDamageBonusFactor: Factor<AnomalyDamageBonusFactorInput>
```

由 `Factor<AnomalyDamageBonusFactorInput>` 的通用契约可得，`anomalyDamageBonusFactor.calculate` 接收
`AnomalyDamageBonusFactorInput`，返回 `FactorResult`。

`AnomalyDamageBonusFactorInput` 是一次异常增伤区计算的完整贡献数组。攻略确认“造成的异常伤害
提升”和“受到的异常伤害提升”进入同一个乘区并同向加算，因此二者不是不同的计算参数，不拆成两个
字段。

每个成员都是已经转换为小数的有符号贡献。游戏文本中的 `16%` 以 `0.16` 传入：

- 造成或受到的异常伤害提升使用正数；
- 造成或受到的异常伤害降低使用负数；
- `0` 表示没有贡献。

Nanoka 3.0 游戏文本已经存在“首领受到的异常伤害降低 `30%`”及英文 `Anomaly DMG taken is reduced by
30%`，因此降低使用负贡献是当前语义，不是仅为未来保留。数组成员不表示最终倍率，已经包含基础值
`1` 的倍率不能作为贡献传入。

## 默认输入

`DEFAULT_ANOMALY_DAMAGE_BONUS_FACTOR_INPUT` 遵循[公共默认输入规则](../index.md#乘区默认输入)，具体是
冻结的空数组。将其传给 `anomalyDamageBonusFactor.calculate` 时结果为恒等倍率 `1`。

该常量表示本次结算没有适用的异常伤害提升或降低贡献，不代表任何代理人、目标或游戏内默认状态。

## 适用边界

异常伤害公式可以同时采用通用增伤区、减易伤区和异常增伤区，但同一项数值贡献只能进入符合其语义
的一个乘区：

- 通用的“造成的伤害提升或降低”属于增伤区；
- 通用的“受到的伤害提升或降低”属于减易伤区；
- 明确限定异常伤害的“造成或受到的异常伤害提升或降低”属于异常增伤区。

一个效果可以包含多个语义不同的数值条款；调用方应分别建立贡献并传入各自所属乘区，而不是因为它们
来自同一个效果就只保留其中一项。

异常精通、异常暴击、异常积蓄、抗性、防御、失衡易伤和基础异常伤害倍率均不属于本乘区。调用方只
传入本次结算实际适用的贡献；本乘区不保存攻击方或目标身份，也不判断持续时间、触发条件、异常类型
或快照时点。

### 紊乱与效果标签

紊乱伤害仍采用同一个异常增伤区，但紊乱与其他异常效果具有不同标签。作用于某一特定属性异常的
效果通常不作用于由该异常结算的紊乱；只有规则已经确认覆盖紊乱时，调用方才能把对应贡献传入紊乱
伤害的异常增伤区。

本乘区不接收 `isDisorder`、异常类型或效果标签字段，也不根据自然语言推断效果是否适用。文案与实际
效果不一致的特例由上游效果解析按照已确认行为处理，不能硬编码进乘区。

## 数组语义

- 空数组没有异常增伤贡献，结果为 `1`。
- 每个数组成员独立参与求和，内容相同的成员不会合并或去重。
- 输入按数组顺序求和，顺序不表示业务优先级。
- 数组成员允许任意有限有符号数，不设置未经来源确认的单项上限。
- 计算不得修改输入数组。

## 计算规则

```text
未钳制值 = 1 + Σ inputs
异常增伤区结果 = clamp(未钳制值, 0, 3)
```

钳制在求和并加上基础值 `1` 后执行。未钳制值小于 `0` 时结果为 `0`，大于 `3` 时结果为 `3`，位于
`[0, 3]` 时保持原值。结果不执行取整或截断。

## 有效性与失败行为

| 失败条件                                    | 行为              |
| ------------------------------------------- | ----------------- |
| 输入不是数组                                | 抛出 `TypeError`  |
| 数组成员不是 `number`                       | 抛出 `TypeError`  |
| 数组成员是 `NaN`、`Infinity` 或 `-Infinity` | 抛出 `RangeError` |
| 钳制前的未钳制值不是有限数值                | 抛出 `RangeError` |

钳制可能把 `Infinity` 或 `-Infinity` 转换为有限边界值，因此必须先检查未钳制值，再执行钳制。

## 代码组织

异常增伤区的生产代码统一放在 `packages/core/src/factors/anomaly-damage-bonus.ts`。该文件包含身份常量、
默认输入、输入类型、`Factor` 定义、范围常量及异常增伤区的求和和钳制逻辑。范围常量和私有辅助函数不
对外导出。

`packages/core/src/index.ts` 只负责重新导出公开 API，测试保存在
`packages/core/test/anomaly-damage-bonus.test.ts`。
