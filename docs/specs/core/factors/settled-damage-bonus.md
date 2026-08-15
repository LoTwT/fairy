# 已结算增伤区

已结算增伤区接收已经按来源规则完成计算、钳制及必要加权的增伤区最终倍率。普通异常伤害的主要来源
是[虚拟代理人快照](../helpers/virtual-agent-snapshot.md)，规则依据
[原始攻略中的虚拟代理人记录规则](../../../references/zzz-data-introduction.txt#L267-L271)。攻略在每次异常
积蓄时记录当次攻击已经计算完成的增伤区，再按参与异常伤害结算的有效代理人积蓄贡献进行加权。

该值不是一组尚待汇总的增伤贡献，因此不能作为 `DamageBonusFactorInput` 传给 `damageBonusFactor`
重新计算。

## 身份与公开契约

| 项目       | 定义                             |
| ---------- | -------------------------------- |
| 中文名称   | 已结算增伤区                     |
| `factorId` | `settled_damage_bonus`           |
| 身份常量   | `SETTLED_DAMAGE_BONUS_FACTOR_ID` |
| 公开定义   | `settledDamageBonusFactor`       |
| 输入类型   | `SettledDamageBonusFactorInput`  |
| 结果语义   | `Multiplier`                     |

公开类型形态如下。该代码块描述公开契约，不限定内部实现方式。

```ts
export type SettledDamageBonusFactorInput = number

export declare const SETTLED_DAMAGE_BONUS_FACTOR_ID: "settled_damage_bonus"

export declare const DEFAULT_SETTLED_DAMAGE_BONUS_FACTOR_INPUT: SettledDamageBonusFactorInput

export declare const settledDamageBonusFactor: Factor<SettledDamageBonusFactorInput>
```

`SettledDamageBonus` 是 core 为表达增伤区输入阶段建立的范围标识，不是游戏文本提供的完整英文乘区
名称。它表示已经根据对应来源规则完成计算的通用增伤区倍率，不表示第二个额外相乘的增伤区，也不
保证该值来自某一种特定来源。

## 输入语义

普通异常伤害使用虚拟代理人快照中的 `damageBonusFactorResult` 作为
`SettledDamageBonusFactorInput`。快照建立前，每条有效代理人积蓄记录必须先保存当次攻击经
`damageBonusFactor` 求和并钳制后的增伤区结果；快照再对这些结果加权。

输入是最终倍率，不是百分比贡献。加权结果 `1.2` 直接以 `1.2` 传入，不能作为 `[1.2]` 传给
`damageBonusFactor`，也不能转换为伪造的原始贡献数组后声称保留了真实效果来源。

其他结算路径只有在自身规则已经明确如何建立完整增伤区最终倍率时，才能把该倍率直接传入。本乘区
只验证数值和值域，不恢复或验证输入来源。存在一个合法标量不代表该路径的攻击力、异常精通、等级、
穿透或其他公式输入已经确认。

## 与通用增伤区的关系

本乘区与[增伤区](damage-bonus.md)表示伤害公式中的同一个乘区位置，但输入处于不同阶段：

- `damageBonusFactor` 从一次即时伤害适用的原始有符号增伤贡献计算并钳制倍率；
- `settledDamageBonusFactor` 接收已经按对应来源规则完成结算的最终倍率；普通异常伤害使用虚拟代理人
  加权后的倍率。

分别钳制后的倍率加权平均，不等于先加权原始贡献再统一计算和钳制。异常伤害公式只采用本乘区接收
已经结算的增伤区结果；常规伤害和贯穿伤害继续采用通用增伤区。任一公式都不能同时乘以两个增伤区。

## 默认输入

`DEFAULT_SETTLED_DAMAGE_BONUS_FACTOR_INPUT` 遵循[公共默认输入规则](../index.md#乘区默认输入)，精确
值为：

```ts
1
```

数值是不可变原始值，不需要运行时冻结。该常量只表示调用方已经确认本次已结算增伤区结果为恒等倍率
`1`，不代表默认代理人、默认异常状态或缺失快照。普通异常路径没有有效代理人快照时，不能用该常量
替代快照并声称异常伤害结果完整。

## 计算规则

```text
已结算增伤区结果 = input
```

输入已经按对应来源规则完成计算、钳制及必要加权。本乘区只验证并返回该值，不再次加上基础值 `1`，
不执行求和、钳制、取整或截断。

## 输入值域

- 输入必须是 `[0, 6]` 范围内的有限数，两个端点都有效；该范围继承通用增伤区结果范围。
- 超出范围表示输入不符合已结算增伤区结果值域，必须抛出错误，不能静默钳制。
- 输入不携带记录、权重、属性、效果来源或结算时点；本乘区无法验证具体来源，也不能证明其他公式
  输入已经完整建立。

## 适用边界

本乘区只服务于异常伤害公式中已经完成来源侧计算的增伤区结果，不负责：

- 记录异常积蓄时的增伤区结果；
- 筛选或裁剪异常积蓄记录；
- 计算虚拟代理人快照或其他来源的增伤区结果；
- 根据当前代理人状态重新计算通用增伤贡献；
- 判断无积蓄直接异常效果使用实时代理人、既有快照还是其他输入；
- 计算实时异常增伤区、目标侧乘区或最终异常伤害。

## 有效性与失败行为

| 失败条件                                | 行为              |
| --------------------------------------- | ----------------- |
| 输入不是 `number`                       | 抛出 `TypeError`  |
| 输入是 `NaN`、`Infinity` 或 `-Infinity` | 抛出 `RangeError` |
| 输入小于 `0` 或大于 `6`                 | 抛出 `RangeError` |

`defineFactor` 按公共契约检查最终结果是否有限。合法输入直接作为结果返回，不增加重复的中间校验。

## 代码组织

生产代码统一放在 `packages/core/src/factors/settled-damage-bonus.ts`。该文件包含身份常量、默认输入、
输入类型、`Factor` 定义、范围常量和本乘区独有的输入校验。范围常量不对外导出。

`packages/core/src/index.ts` 只负责重新导出公开 API，测试保存在
`packages/core/test/settled-damage-bonus.test.ts`。打包验证必须覆盖公开输入类型、身份常量、默认
输入和运行时定义。
