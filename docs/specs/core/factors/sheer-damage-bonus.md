# 贯穿增伤区

贯穿增伤区汇总本次贯穿伤害适用的贯穿增伤贡献，规则来源为
[原始攻略中的贯穿增伤区](../../../references/zzz-data-introduction.txt#L142)。游戏中文文本中的“贯穿伤害”
对应英文文本 `Sheer DMG`。

## 身份与公开契约

| 项目       | 定义                           |
| ---------- | ------------------------------ |
| 中文名称   | 贯穿增伤区                     |
| `factorId` | `sheer_damage_bonus`           |
| 身份常量   | `SHEER_DAMAGE_BONUS_FACTOR_ID` |
| 公开定义   | `sheerDamageBonusFactor`       |
| 输入类型   | `SheerDamageBonusFactorInput`  |
| 结果语义   | `Multiplier`                   |

公开类型形态如下。该代码块描述公开契约，不限定内部实现方式。

```ts
export type SheerDamageBonusFactorInput = readonly number[]

export declare const SHEER_DAMAGE_BONUS_FACTOR_ID: "sheer_damage_bonus"
export declare const DEFAULT_SHEER_DAMAGE_BONUS_FACTOR_INPUT: SheerDamageBonusFactorInput

export declare const sheerDamageBonusFactor: Factor<SheerDamageBonusFactorInput>
```

由 `Factor<SheerDamageBonusFactorInput>` 的通用契约可得，`sheerDamageBonusFactor.calculate` 接收
`SheerDamageBonusFactorInput`，返回 `FactorResult`。

`SheerDamageBonusFactorInput` 是一次贯穿增伤区计算的完整贡献数组。每个成员表示一项已经转换为小数
的有符号贯穿增伤贡献。游戏文本中的 `10%` 以 `0.1` 传入。贯穿伤害提升使用正数；未来若出现贯穿
伤害降低，则使用负数；`0` 表示没有贡献。数组成员不表示最终倍率，已经包含基础值 `1` 的最终倍率
不能作为贡献传入。

调用方只传入本次贯穿伤害实际适用的贡献。角色特性、技能标签、触发条件和持续时间是否匹配，不由
贯穿增伤区判断。

## 默认输入

`DEFAULT_SHEER_DAMAGE_BONUS_FACTOR_INPUT` 遵循[公共默认输入规则](../index.md#乘区默认输入)，具体是
冻结的空数组：

```ts
Object.freeze([])
```

它表示没有贯穿增伤贡献，`sheerDamageBonusFactor.calculate` 对其返回恒等倍率 `1`。它不表示任何
代理人的面板贯穿增伤或游戏内默认值。

## 适用边界

贯穿增伤区只用于贯穿伤害（`Sheer DMG`）：

- 通用的“造成的伤害提升”仍属于增伤区；贯穿伤害公式可以同时采用增伤区和贯穿增伤区。
- 贯穿伤害跳过防御区，不代表贯穿增伤区替代或计算防御区。
- 常规伤害、异常伤害及其他非贯穿伤害不采用贯穿增伤区。

顶层公式负责选择乘区组合；本乘区不接收伤害类型字段，也不自行判断当前伤害是否为贯穿伤害。

## 数组语义

- 空数组没有贯穿增伤贡献，结果为 `1`。
- 每个数组成员独立参与求和，内容相同的成员不会合并或去重。
- 输入按数组顺序求和，顺序不表示业务优先级。
- 计算不得修改输入数组。

## 计算规则

```text
未钳制值 = 1 + Σ inputs
贯穿增伤区结果 = clamp(未钳制值, 0.2, 9)
```

钳制在求和并加上基础值 `1` 后执行。未钳制值小于 `0.2` 时结果为 `0.2`，大于 `9` 时结果为 `9`，
位于 `[0.2, 9]` 时保持原值。结果不执行取整或截断。

## 有效性与失败行为

| 失败条件                                    | 行为              |
| ------------------------------------------- | ----------------- |
| 输入不是数组                                | 抛出 `TypeError`  |
| 数组成员不是 `number`                       | 抛出 `TypeError`  |
| 数组成员是 `NaN`、`Infinity` 或 `-Infinity` | 抛出 `RangeError` |
| 钳制前的未钳制值不是有限数值                | 抛出 `RangeError` |

钳制可能把 `Infinity` 或 `-Infinity` 转换为有限边界值，因此必须先检查未钳制值，再执行钳制。

## 代码组织

贯穿增伤区的生产代码统一放在 `packages/core/src/factors/sheer-damage-bonus.ts`。该文件包含身份常量、
默认输入、输入类型、`Factor` 定义、范围常量及贯穿增伤区的求和和钳制逻辑。范围常量和私有辅助函数
不对外导出。

`packages/core/src/index.ts` 只负责重新导出公开 API，测试保存在独立测试文件中。
