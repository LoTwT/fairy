# 锐化增伤区

锐化增伤区汇总本次锐化伤害适用的独立锐化增伤贡献。它独立于通用增伤区：上游固定来源
（ZZZ-HP 增益基线 `fac62407`）把 `sharpenDmgBonus` 与通用 `dmgBonus` 分开结算，锐化伤害公式
同时采用两者。游戏中文文本中的“锐化伤害”对应英文文本 `Sharpen DMG`，接入背景见
[ZZZ-HP 静态增益数据接入修订 9](../../data/zzz-hp-static-effects.md#修订-9锐化与锐暴公式及实体接入)。

## 身份与公开契约

| 项目       | 定义                             |
| ---------- | -------------------------------- |
| 中文名称   | 锐化增伤区                       |
| `factorId` | `sharpen_damage_bonus`           |
| 身份常量   | `SHARPEN_DAMAGE_BONUS_FACTOR_ID` |
| 公开定义   | `sharpenDamageBonusFactor`       |
| 输入类型   | `SharpenDamageBonusFactorInput`  |
| 结果语义   | `Multiplier`                     |

公开类型形态如下。该代码块描述公开契约，不限定内部实现方式。

```ts
export type SharpenDamageBonusFactorInput = readonly number[]

export declare const SHARPEN_DAMAGE_BONUS_FACTOR_ID: "sharpen_damage_bonus"
export declare const DEFAULT_SHARPEN_DAMAGE_BONUS_FACTOR_INPUT: SharpenDamageBonusFactorInput

export declare const sharpenDamageBonusFactor: Factor<SharpenDamageBonusFactorInput>
```

由 `Factor<SharpenDamageBonusFactorInput>` 的通用契约可得，`sharpenDamageBonusFactor.calculate` 接收
`SharpenDamageBonusFactorInput`，返回 `FactorResult`。

`SharpenDamageBonusFactorInput` 是一次锐化增伤区计算的完整贡献数组。每个成员表示一项已经转换为
小数的有符号锐化增伤贡献：游戏文本中的 `10%` 以 `0.1` 传入。锐化伤害提升使用正数，未来若出现锐化
伤害降低则使用负数，`0` 表示没有贡献。数组成员不表示最终倍率；已经包含基础值 `1` 的最终倍率
不能作为贡献传入。

调用方只传入本次锐化伤害实际适用的贡献。角色特性、技能标签、触发条件和持续时间是否匹配，不由
锐化增伤区判断。

## 默认输入

`DEFAULT_SHARPEN_DAMAGE_BONUS_FACTOR_INPUT` 遵循[公共默认输入规则](../index.md#乘区默认输入)，具体是
冻结的空数组：

```ts
Object.freeze([])
```

它表示没有锐化增伤贡献，`sharpenDamageBonusFactor.calculate` 对其返回恒等倍率 `1`。它不表示任何
代理人的面板锐化增伤或游戏内默认值。

## 适用边界

锐化增伤区只用于锐化伤害（`Sharpen DMG`）：

- 通用的“造成的伤害提升”仍属于增伤区；锐化伤害公式可以同时采用增伤区和锐化增伤区。
- 常规伤害、贯穿伤害、异常伤害及其他非锐化伤害不采用锐化增伤区。

顶层公式负责选择乘区组合；本乘区不接收伤害类型字段，也不自行判断当前伤害是否为锐化伤害。

## 数组语义

- 空数组没有锐化增伤贡献，结果为 `1`。
- 每个数组成员独立参与求和，内容相同的成员不会合并或去重。
- 输入按数组顺序求和，顺序不表示业务优先级。
- 计算不得修改输入数组。

## 计算规则

```text
未钳制值 = 1 + Σ inputs
锐化增伤区结果 = max(0, 未钳制值)
```

下界 `0` 在求和并加上基础值 `1` 之后执行；负贡献可以把乘区压到 `0`，但不能产生负值。与通用增伤区
和贯穿增伤区不同，本乘区不设上限钳制：固定来源的锐化增伤链没有上限语义，上限也不能从其他增伤
乘区推定。结果不执行取整或截断。

## 有效性与失败行为

| 失败条件                                    | 行为              |
| ------------------------------------------- | ----------------- |
| 输入不是数组                                | 抛出 `TypeError`  |
| 数组成员不是 `number`                       | 抛出 `TypeError`  |
| 数组成员是 `NaN`、`Infinity` 或 `-Infinity` | 抛出 `RangeError` |
| 钳制前的未钳制值不是有限数值                | 抛出 `RangeError` |

钳制可能把 `Infinity` 或 `-Infinity` 转换为有限边界值，因此必须先检查未钳制值，再执行钳制。

## 代码组织

锐化增伤区的生产代码统一放在 `packages/core/src/factors/sharpen-damage-bonus.ts`。该文件包含身份
常量、默认输入、输入类型、`Factor` 定义、范围常量及锐化增伤区的求和与下界逻辑。范围常量和私有
辅助函数不对外导出。

`packages/core/src/index.ts` 只负责重新导出公开 API，测试保存在独立测试文件中。
