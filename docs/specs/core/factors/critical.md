# 暴击区

暴击区根据本次伤害是否暴击，汇总适用的暴击伤害贡献并产生暴击倍率，规则来源为
[原始攻略中的暴击区](../../../references/zzz-data-introduction.txt#L80)。

## 身份与公开契约

| 项目       | 定义                  |
| ---------- | --------------------- |
| 中文名称   | 暴击区                |
| `factorId` | `critical`            |
| 身份常量   | `CRITICAL_FACTOR_ID`  |
| 公开定义   | `criticalFactor`      |
| 输入类型   | `CriticalFactorInput` |
| 结果语义   | `Multiplier`          |

公开类型形态如下。该代码块描述公开契约，不限定内部实现方式。

```ts
export interface CriticalFactorInput {
  readonly isCritical: boolean
  readonly criticalDamageContributions: readonly number[]
}

export declare const CRITICAL_FACTOR_ID: "critical"

export declare const DEFAULT_CRITICAL_FACTOR_INPUT: CriticalFactorInput

export declare const criticalFactor: Factor<CriticalFactorInput>
```

由 `Factor<CriticalFactorInput>` 的通用契约可得，`criticalFactor.calculate` 接收
`CriticalFactorInput`，返回 `FactorResult`。

`CriticalFactorInput` 是一次暴击区计算的完整输入：

- `isCritical` 表示本次伤害是否已经确定为暴击；
- `criticalDamageContributions` 保存本次伤害适用的暴击伤害贡献。

贡献数组的每个成员都是已经转换为小数的有符号数值。游戏文本中的 `50%` 以 `0.5` 传入。暴击伤害
提升使用正数，暴击伤害降低使用负数，`0` 表示没有贡献。数组成员不表示最终倍率，已经包含基础值
`1` 的暴击倍率不能作为暴击伤害贡献传入。

基础暴击伤害属于进攻方属性，不是暴击区固定常量。当 `isCritical` 为 `true` 时，调用方必须将基础
暴击伤害与本次实际适用的其他暴击伤害贡献一并传入；暴击区不补充代理人或敌人的默认属性。

## 默认输入

`DEFAULT_CRITICAL_FACTOR_INPUT` 遵循[公共默认输入规则](../index.md#乘区默认输入)，精确内容为：

```ts
{
  isCritical: false,
  criticalDamageContributions: [],
}
```

外层对象和嵌套空数组都必须冻结。将该常量传给 `criticalFactor.calculate` 时结果为恒等倍率 `1`。
该常量表示公式组合中的“本次伤害未暴击”，不代表游戏内角色的默认暴击状态或暴击属性。

## 适用边界

调用方必须在调用前确定本次伤害是否暴击，并通过 `isCritical` 传入已确定的状态。暴击区不执行随机
判定，也不接收暴击率。

- `isCritical` 为 `true` 时，暴击区汇总贡献并计算暴击倍率。
- `isCritical` 为 `false` 时，暴击区返回恒等倍率 `1`。此时合法的贡献数组不参与求和，也不影响
  结果。

公式始终调用暴击区，不在公式外省略该乘区。状态分支由暴击区根据自己的完整输入处理。

攻击是否能够暴击、一次攻击是否已经触发暴击，以及技能标签、属性、触发条件和持续时间是否匹配，
均由调用方在建立输入前确定。

## 贡献数组语义

- `isCritical` 为 `true` 时，空数组表示暴击伤害贡献为 `0`，结果为 `1`。
- 每个数组成员独立参与求和，内容相同的成员不会合并或去重。
- 输入按数组顺序求和，顺序不表示业务优先级。
- 无论 `isCritical` 的值如何，都必须校验贡献数组本身及其每个成员。未暴击时不对合法贡献执行求和。
- 计算不得修改输入对象或贡献数组。

## 计算规则

```text
暴击区结果 = 1，isCritical 为 false 时

有效暴击伤害 = clamp(Σ criticalDamageContributions, 0, 5)
暴击区结果 = 1 + 有效暴击伤害，isCritical 为 true 时
```

暴击时，钳制在所有贡献求和后执行。暴击伤害之和小于 `0` 时按 `0` 计算，大于 `5` 时按 `5` 计算，
位于 `[0, 5]` 时保持原值。因此暴击区结果的有效范围为 `[1, 6]`。未暴击时不计算贡献总和，直接
返回 `1`。结果不执行取整或截断。

## 暴击期望边界

暴击区只计算一次已经确定结算结果的伤害，不计算暴击期望。暴击率不是
`CriticalFactorInput` 的成员，不得将暴击率混入 `criticalDamageContributions`。

`1 + 暴击率 × 暴击伤害` 是对多次伤害结果进行概率加权的期望计算，不是单次暴击区的归约规则。
需要暴击期望时必须使用独立的期望计算能力，不得通过改变 `criticalFactor.calculate` 的输入语义或返回
类型实现。

## 有效性与失败行为

| 失败条件                                    | 行为              |
| ------------------------------------------- | ----------------- |
| 输入不是非数组对象或为 `null`               | 抛出 `TypeError`  |
| `isCritical` 不是 `boolean`                 | 抛出 `TypeError`  |
| 贡献字段不是数组                            | 抛出 `TypeError`  |
| 数组成员不是 `number`                       | 抛出 `TypeError`  |
| 数组成员是 `NaN`、`Infinity` 或 `-Infinity` | 抛出 `RangeError` |
| 暴击时钳制前的暴击伤害总和不是有限数值      | 抛出 `RangeError` |

暴击时，钳制可能把 `Infinity` 或 `-Infinity` 转换为有限边界值，因此必须先检查暴击伤害总和，再执行
钳制。未暴击时不计算总和，也不执行钳制。

## 代码组织

暴击区的生产代码统一放在 `packages/core/src/factors/critical.ts`。该文件包含身份常量、默认输入、输入
类型、`Factor` 定义、范围常量及暴击区的状态分支、求和和钳制逻辑。范围常量和私有辅助函数不对外
导出。

`packages/core/src/index.ts` 只负责重新导出公开 API，测试保存在独立测试文件中。
