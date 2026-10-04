# 特殊虚曜伤害等级区

特殊虚曜伤害等级区把蕾米埃尔自身特殊虚曜耀变结算采用的代理人等级转换为等级补正倍率。它是
[异常伤害等级区](anomaly-damage-level.md)在特殊虚曜场景下的具名分支：两者共享 `1 + (level - 1) / 59`
的数学形态，但异常伤害等级区按通用异常伤害规则截断四位小数，本乘区不截断。上游固定来源
（ZZZ-HP 增益基线 `fac62407` 的 `computeRemielSelfRadianceStandardLevelZone`，[remielUtils.ts](https://github.com/LoTwT/ZZZ-HP/blob/fac62407f3d3995f8200a66be0038f292b1455fa/zzz-hp/src/utils/remielUtils.ts)）
把该函数称为“标准等级区”，且只在 `subKind === 'radiance'` 且异常强度提供者为蕾米埃尔的耀变链路
（[damageCalc.ts](https://github.com/LoTwT/ZZZ-HP/blob/fac62407f3d3995f8200a66be0038f292b1455fa/zzz-hp/src/utils/damageCalc.ts)）
中调用，不扩散到普通异常、紊乱、异放和乱流。core 按其消费场景命名为“特殊虚曜伤害等级区”，避免与
通用异常伤害等级区混淆。

## 身份与公开契约

| 项目       | 定义                                       |
| ---------- | ------------------------------------------ |
| 中文名称   | 特殊虚曜伤害等级区                         |
| `factorId` | `special_voidflare_damage_level`           |
| 身份常量   | `SPECIAL_VOIDFLARE_DAMAGE_LEVEL_FACTOR_ID` |
| 公开定义   | `specialVoidflareDamageLevelFactor`        |
| 输入类型   | `SpecialVoidflareDamageLevelFactorInput`   |
| 结果语义   | `Multiplier`                               |

公开类型形态如下。该代码块描述公开契约，不限定内部实现方式。

```ts
export type SpecialVoidflareDamageLevelFactorInput = number

export declare const SPECIAL_VOIDFLARE_DAMAGE_LEVEL_FACTOR_ID: "special_voidflare_damage_level"

export declare const DEFAULT_SPECIAL_VOIDFLARE_DAMAGE_LEVEL_FACTOR_INPUT: SpecialVoidflareDamageLevelFactorInput

export declare const specialVoidflareDamageLevelFactor: Factor<SpecialVoidflareDamageLevelFactorInput>
```

由 `Factor<SpecialVoidflareDamageLevelFactorInput>` 的通用契约可得，
`specialVoidflareDamageLevelFactor.calculate` 接收 `SpecialVoidflareDamageLevelFactorInput`，返回
`FactorResult`。

`SpecialVoidflareDamageLevelFactorInput` 直接表示本次特殊虚曜耀变结算采用的蕾米埃尔等级。主公式只
直接使用这一个数值，因此不增加只有同名字段的对象包装；耀变公式层面的具名分支选择由
[耀变伤害公式](../formulas/luminize-damage.md)维护。

## 默认输入

`DEFAULT_SPECIAL_VOIDFLARE_DAMAGE_LEVEL_FACTOR_INPUT` 遵循[公共默认输入规则](../index.md#乘区默认输入)，
精确值为：

```ts
1
```

数值是不可变原始值，不需要运行时冻结。等级 `1` 产生恒等倍率 `1`，因此可以作为公式组合的默认
输入；它不代表蕾米埃尔的实际等级。

## 等级值域

- 输入必须是 `[1, 60]` 范围内的有限整数，两个端点都有效。这与异常伤害等级区的业务值域一致。
- 小数、`NaN`、`Infinity` 及越界等级无效，本乘区不取整也不钳制。固定上游来源的计算 helper
  `clampRemielLevel` 由 `computeRemielSelfRadianceSpecialLevelZone` 与
  `computeRemielSelfRadianceStandardLevelZone` 直接调用，其结果经 `computeRemielSelfAnomalyBase` 进入
  耀变链路：上游计算链会先 `Math.round` 再钳制到 `[1, 60]`，不是仅展示层行为。core 已确定采用严格
  公共 API，非法值直接报错，不隐式修正为合法等级。这是与固定上游的具名输入契约差异，已定案，
  不改变游戏内的等级值域。调用方必须提供已经确认的实际等级。
- 不复用防御区的等级基数表，也不复用异常伤害等级区的四位截断精度。

## 计算规则

```text
特殊虚曜伤害等级区 = 1 + (level - 1) / 59
```

计算使用 JavaScript `number` 的 IEEE 754 语义，不截断、不四舍五入、不添加 `Number.EPSILON` 修正，
也不钳制结果。结果范围为 `[1, 2]`。

| 等级 | 结果       |
| ---: | ---------- |
|    1 | `1`        |
|    2 | `60 / 59`  |
|   30 | `88 / 59`  |
|   59 | `117 / 59` |
|   60 | `2`        |

同一等级下，本乘区与异常伤害等级区的差异即为四位截断：等级 `2` 的本乘区结果为
`1.0169491525423728…`，异常伤害等级区结果为 `1.0169`。

## 适用边界

特殊虚曜伤害等级区只负责把合法等级转换为特殊虚曜耀变的等级补正倍率，不负责：

- 判断本次耀变是否结算特殊虚曜，或选择普通与特殊虚曜分支；该选择由调用方通过
  [耀变伤害公式](../formulas/luminize-damage.md)的 `anomalyDamageLevel` 具名分支表达；
- 读取蕾米埃尔角色对象、代理人 ID、影画等级或虚曜队列；
- 计算、保存或消费虚曜记录；
- 计算特殊虚曜增伤倍率；该倍率由调用方通过
  `calculateSpecialVoidflareDamageBonusMultiplier` 结果传入耀变公式的 `damageBonus`；
- 汇总多枚虚曜或多次耀变。

普通虚曜（异常强度提供者不是蕾米埃尔）的耀变结算继续使用异常伤害等级区，不采用本乘区。

## 有效性与失败行为

| 失败条件                                | 行为              |
| --------------------------------------- | ----------------- |
| 输入不是 `number`                       | 抛出 `TypeError`  |
| 输入是 `NaN`、`Infinity` 或 `-Infinity` | 抛出 `RangeError` |
| 输入不是整数                            | 抛出 `RangeError` |
| 输入小于 `1` 或大于 `60`                | 抛出 `RangeError` |

`defineFactor` 按公共契约检查本乘区最终结果是否有限。合法输入范围内的计算不会溢出，不增加逐步的
重复有限性断言。

## 代码组织

特殊虚曜伤害等级区的生产代码统一放在
`packages/core/src/factors/special-voidflare-damage-level.ts`。该文件包含身份常量、默认输入、输入
类型、`Factor` 定义、等级常量及本乘区独有的校验逻辑。内部常量和私有辅助函数不对外导出。

`packages/core/src/index.ts` 只负责重新导出公开 API，测试保存在
`packages/core/test/special-voidflare-damage-level.test.ts`。
