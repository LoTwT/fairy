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
export type DamageBonusFactorInput = number

export declare const DAMAGE_BONUS_FACTOR_ID: "damage_bonus"

export declare const damageBonusFactor: Factor<DamageBonusFactorInput>
```

由 `Factor<DamageBonusFactorInput>` 的通用契约可得，`damageBonusFactor.calculate` 接收
`readonly DamageBonusFactorInput[]`，返回 `FactorResult`。

`DamageBonusFactorInput` 是 `number` 的语义别名，表示一项已经转换为小数的有符号增伤贡献。游戏文本
中的 `25%` 以 `0.25` 传入。伤害提升使用正数，伤害降低使用负数，`0` 表示没有贡献。输入项不表示
最终倍率，已经包含基础值 `1` 的最终倍率不能作为增伤贡献传入。

调用方只传入本次伤害实际适用的贡献。技能标签、属性、攻击类型、触发条件和持续时间是否匹配，不由
增伤区判断。

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

## 有效性与失败行为

| 失败条件                                | 行为              |
| --------------------------------------- | ----------------- |
| 输入不是 `number`                       | 抛出 `TypeError`  |
| 输入是 `NaN`、`Infinity` 或 `-Infinity` | 抛出 `RangeError` |
| 求和或加上基础值 `1` 后产生非有限数值   | 抛出 `RangeError` |

数值溢出属于计算失败，不能作为超出有效范围的普通结果进行钳制。

## 代码组织

增伤区的生产代码统一放在 `packages/core/src/factors/damage-bonus.ts`。该文件包含身份常量、输入类型、
`Factor` 定义、范围常量及仅供增伤区使用的校验和钳制逻辑。范围常量和私有辅助函数不对外导出。

`packages/core/src/index.ts` 只负责重新导出公开 API，测试保存在独立测试文件中。只有某项逻辑出现第二个
语义相同的实际使用者时，才从增伤区文件提取为公共实现。
