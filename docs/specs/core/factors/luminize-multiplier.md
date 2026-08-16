# 耀变倍率区

耀变倍率区根据本次触发耀变的招式倍率、蕾米埃尔实时异常精通与核心技换算率，计算一枚虚曜对应的
耀变倍率。Nanoka 3.1 本地数据 `packages/data/raw/nanoka/3.1/{en,zh}/character/1581.json:359,364,1293,1486`
分别提供长按普通攻击、强化长按普通攻击、终结技和登场支援技的招式倍率；同文件 `:1952-2036` 说明
招式倍率还会根据蕾米埃尔异常精通的一定比例提升。

[蕾米埃尔详细机制攻略](https://a.4399.cn/gl/53681368_359313.html)进一步确认异常精通换算结果与招式
耀变倍率直接相加，影画 4 的“额外提升 `12%`”在相加后作为独立倍率相乘。Nanoka 3.1 同文件 `:2094`
和 `:2106` 分别确认影画 4 的 `12%` 与影画 6 特殊虚曜的 `25%` 伤害比例。

## 身份与公开契约

| 项目       | 定义                            |
| ---------- | ------------------------------- |
| 中文名称   | 耀变倍率区                      |
| `factorId` | `luminize_multiplier`           |
| 身份常量   | `LUMINIZE_MULTIPLIER_FACTOR_ID` |
| 公开定义   | `luminizeMultiplierFactor`      |
| 输入类型   | `LuminizeMultiplierFactorInput` |
| 结果语义   | `Multiplier`                    |

```ts
export interface LuminizeMultiplierFactorInput {
  readonly baseLuminizeMultiplier: number
  readonly remielleAnomalyProficiency: number
  readonly anomalyProficiencyConversionRate: number
  readonly multiplicativeLuminizeMultiplierAdjustments: readonly number[]
}

export declare const LUMINIZE_MULTIPLIER_FACTOR_ID: "luminize_multiplier"

export declare const luminizeMultiplierFactor: Factor<LuminizeMultiplierFactorInput>
```

## 输入语义

- `baseLuminizeMultiplier` 是本次招式已经按技能等级查表得到的耀变倍率小数。`320%` 以 `3.2` 传入；
- `remielleAnomalyProficiency` 是本次耀变结算时蕾米埃尔的非负有限异常精通，不是虚曜保存的来源角色
  异常精通；
- `anomalyProficiencyConversionRate` 是蕾米埃尔当前核心技等级提供的每点异常精通换算率。游戏文本中的
  `0.2%` 以 `0.002` 传入；
- `multiplicativeLuminizeMultiplierAdjustments` 是在基础倍率与异常精通换算结果相加后依次相乘的非负
  有限倍率。影画 4 以 `1.12` 传入，影画 6 产生的四分之一特殊虚曜可额外以 `0.25` 传入；
- 空调整数组合法，表示没有额外乘法调整。

本乘区不接收技能名称、技能等级、核心技等级、影画等级或虚曜类型。调用方负责从版本化角色数据和
实际状态选择四项输入，core 不固化具体招式表或角色养成状态。

## 计算规则

```text
异常精通附加耀变倍率 = remielleAnomalyProficiency × anomalyProficiencyConversionRate
加算后耀变倍率 = baseLuminizeMultiplier + 异常精通附加耀变倍率
耀变倍率区结果 = 加算后耀变倍率
for adjustment of multiplicativeLuminizeMultiplierAdjustments:
  耀变倍率区结果 = 耀变倍率区结果 × adjustment
```

例如核心技 F 级换算率为 `0.002`、蕾米埃尔异常精通为 `400`、招式耀变倍率为 `3.2` 时，基础结果为
`4`；影画 4 同时适用时结果为 `4 × 1.12 = 4.48`。

乘法调整按数组索引顺序依次应用，内容相同的成员不合并或去重；稀疏数组空位按 `undefined` 成员处理并
失败。计算使用 JavaScript `number` 的 IEEE 754 语义，不重排、不取整、不钳制，也不进行固定小数位
修正。最终结果必须有限。

## 默认输入

耀变倍率区没有乘法恒等默认输入。招式倍率是本乘区必需的业务数据，不能用空对象、`0` 或任意全局
常量替代。公式调用方必须提供完整 `LuminizeMultiplierFactorInput`。

`0` 是合法的基础倍率、异常精通、换算率或乘法调整，表示其对应的真实计算数据为零，不是字段缺失。
本乘区不得自动补充 Nanoka 当前版本的技能倍率或核心技换算率。

## 适用边界

耀变倍率区只计算一枚虚曜在一次耀变伤害实例中采用的最终耀变倍率，不负责：

- 选择触发耀变的招式或从技能等级查表；
- 判断影画 4、影画 6 或其他效果是否适用；
- 计算、保存或消费虚曜；
- 计算异化区、虚曜异常效果强度或特殊虚曜的增伤区；
- 汇总多枚虚曜或多次耀变；
- 计算最终耀变伤害或显示伤害。

本乘区使用耀变发生时蕾米埃尔的实时异常精通；虚曜中保存的异常精通由
[耀变伤害公式](../formulas/luminize-damage.md)的异常精通区使用，二者不能互换。

## 有效性与失败行为

| 失败条件                                                   | 行为              |
| ---------------------------------------------------------- | ----------------- |
| 输入不是非数组对象或为 `null`                              | 抛出 `TypeError`  |
| 任一标量字段不是 `number`                                  | 抛出 `TypeError`  |
| 任一标量字段不是有限数或小于 `0`                           | 抛出 `RangeError` |
| `multiplicativeLuminizeMultiplierAdjustments` 不是数组     | 抛出 `TypeError`  |
| 数组成员或稀疏空位不是 `number`                            | 抛出 `TypeError`  |
| 数组成员不是有限数或小于 `0`                               | 抛出 `RangeError` |
| 异常精通换算、加算后倍率或依序相乘后的最终结果不是有限数值 | 抛出 `RangeError` |

多个失败条件同时存在时，不承诺字段校验错误的优先级。计算不得修改或冻结输入对象及数组；`defineFactor` 按
公共契约检查最终结果是否有限。

## 代码组织

耀变倍率区生产代码统一放在 `packages/core/src/factors/luminize-multiplier.ts`。该文件包含身份常量、输入
类型、`Factor` 定义和本乘区独有校验，不包含技能表、角色状态、虚曜状态或最终伤害公式。

`packages/core/src/index.ts` 只负责重新导出公开 API。测试保存在
`packages/core/test/luminize-multiplier.test.ts`，必须覆盖公开身份与类型、代表值、加算后乘算顺序、空数组、
重复调整、稀疏数组、不可变性、全部字段失败及溢出。
