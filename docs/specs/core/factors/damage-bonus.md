# 增伤区

增伤区汇总本次伤害适用的增伤贡献，规则来源为
[原始攻略中的增伤区](../../../references/zzz-data-introduction.txt#L74)。

## 身份与公开契约

| 项目       | 定义                     |
| ---------- | ------------------------ |
| 中文名称   | 增伤区                   |
| `factorId` | `damage_bonus`           |
| 身份常量   | `DAMAGE_BONUS_FACTOR_ID` |
| 公开定义   | `damageBonusFactor`      |
| 输入类型   | `DamageBonusFactorInput` |
| 结果语义   | `Multiplier`             |

公开类型形态如下。该代码块描述公开契约，不限定内部实现方式。

```ts
export type DamageBonusFactorInput = readonly number[]

export declare const DAMAGE_BONUS_FACTOR_ID: "damage_bonus"

export declare const DEFAULT_DAMAGE_BONUS_FACTOR_INPUT: DamageBonusFactorInput

export declare const damageBonusFactor: Factor<DamageBonusFactorInput>
```

由 `Factor<DamageBonusFactorInput>` 的通用契约可得，`damageBonusFactor.calculate` 接收
`DamageBonusFactorInput`，返回 `FactorResult`。

`DamageBonusFactorInput` 是一次增伤区计算的完整贡献数组。每个成员表示一项已经转换为小数的有符号
增伤贡献。游戏文本中的 `25%` 以 `0.25` 传入。伤害提升使用正数，伤害降低使用负数，`0` 表示没有
贡献。数组成员不表示最终倍率，已经包含基础值 `1` 的最终倍率不能作为增伤贡献传入。

调用方只传入本次伤害实际适用的贡献。技能标签、属性、攻击类型、触发条件和持续时间是否匹配，不由
增伤区判断。

## 默认输入

`DEFAULT_DAMAGE_BONUS_FACTOR_INPUT` 遵循[公共默认输入规则](../index.md#乘区默认输入)，具体是冻结的
空数组。将其传给 `damageBonusFactor.calculate` 时结果为恒等倍率 `1`。

该常量只表示公式组合中的“没有增伤贡献”，不代表游戏内默认增伤。

## 数组语义

- 空数组没有增伤贡献，结果为 `1`。
- 每个数组成员独立参与求和，内容相同的成员不会合并或去重。
- 输入按数组顺序求和，顺序不表示业务优先级。
- 计算不得修改输入数组。

## 计算规则

```text
未钳制值 = 1 + Σ inputs
增伤区结果 = clamp(未钳制值, 0, 6)
```

钳制在求和并加上基础值 `1` 后执行。未钳制值小于 `0` 时结果为 `0`，大于 `6` 时结果为 `6`，
位于 `[0, 6]` 时保持原值。结果不执行取整或截断。

## 与已结算增伤区的关系

本乘区负责一次即时伤害，或普通异常与普通紊乱路径中一次异常积蓄记录所需的原始增伤贡献计算。
异常积蓄期间，每条有效代理人记录应先保存本乘区已经求和并钳制后的结果；跨记录加权由
[虚拟代理人快照帮助函数](../helpers/virtual-agent-snapshot.md)完成。

普通异常与普通紊乱路径采用[已结算增伤区](settled-damage-bonus.md)接收快照加权后的最终倍率，不重新
调用本乘区。分别钳制后的倍率加权平均不等于先加权原始贡献再统一钳制，因此不能把快照结果作为本
乘区数组成员，也不能把多条记录的原始贡献先合并后声称得到同一虚拟代理人结果。其他异常伤害路径
只有在自身可靠规则已经明确最终倍率时，才能直接建立已结算增伤区输入。

常规伤害和贯穿伤害仍直接采用本乘区。

## 有效性与失败行为

| 失败条件                                    | 行为              |
| ------------------------------------------- | ----------------- |
| 输入不是数组                                | 抛出 `TypeError`  |
| 数组成员不是 `number`                       | 抛出 `TypeError`  |
| 数组成员是 `NaN`、`Infinity` 或 `-Infinity` | 抛出 `RangeError` |
| 钳制前的未钳制值不是有限数值                | 抛出 `RangeError` |

钳制可能把 `Infinity` 或 `-Infinity` 转换为有限边界值，因此必须先检查未钳制值，再执行钳制。

## 代码组织

增伤区的生产代码统一放在 `packages/core/src/factors/damage-bonus.ts`。该文件包含身份常量、默认输入、
输入类型、`Factor` 定义、范围常量及增伤区的求和和钳制逻辑。范围常量和私有辅助函数不对外导出。

`packages/core/src/index.ts` 只负责重新导出公开 API，测试保存在独立测试文件中。
