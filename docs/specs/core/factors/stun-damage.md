# 失衡易伤区

失衡易伤区根据受击方当前是否失衡，汇总对应的失衡易伤倍率并产生伤害倍率，规则来源为
[原始攻略中的失衡易伤区](../../../references/zzz-data-introduction.txt#L134)。游戏中文文本中的“失衡易伤
倍率”对应英文文本 `Stun DMG Multiplier`。

## 身份与公开契约

| 项目       | 定义                    |
| ---------- | ----------------------- |
| 中文名称   | 失衡易伤区              |
| `factorId` | `stun_damage`           |
| 身份常量   | `STUN_DAMAGE_FACTOR_ID` |
| 公开定义   | `stunDamageFactor`      |
| 输入类型   | `StunDamageFactorInput` |
| 结果语义   | `Multiplier`            |

公开类型形态如下。该代码块描述公开契约，不限定内部实现方式。

```ts
export interface StunDamageFactorInput {
  readonly isTargetStunned: boolean
  readonly targetBaseStunDamageMultiplier: number
  readonly targetStunDamageMultiplierAdjustments: readonly number[]
}

export declare const STUN_DAMAGE_FACTOR_ID: "stun_damage"

export declare const DEFAULT_STUN_DAMAGE_FACTOR_INPUT: StunDamageFactorInput

export declare const stunDamageFactor: Factor<StunDamageFactorInput>
```

由 `Factor<StunDamageFactorInput>` 的通用契约可得，`stunDamageFactor.calculate` 接收
`StunDamageFactorInput`，返回 `FactorResult`。

- `isTargetStunned` 记录受击方当前是否失衡。
- `targetBaseStunDamageMultiplier` 是当前状态下已经确定的基础乘数。
- `targetStunDamageMultiplierAdjustments` 保存本次计算适用的失衡易伤倍率调整。

`targetBaseStunDamageMultiplier` 是可以直接参与乘法的倍率，不是攻略公式中需要再加 `1` 的比例贡献。
例如受击方在当前状态下的基础失衡易伤贡献为 `50%` 时，调用方应把它换算为 `1.5` 后传入，而不是
传入 `0.5`。`targetStunDamageMultiplierAdjustments` 的每个成员是对该倍率的有符号加算调整；游戏文本中的
“失衡易伤倍率提升 `25%`”以 `0.25` 传入。

这种边界使 core 接收语义明确且可直接计算的数值，不负责把 Nanoka 字段、游戏面板或其他原始数据
解释为基础倍率。

## 默认输入

`DEFAULT_STUN_DAMAGE_FACTOR_INPUT` 遵循[公共默认输入规则](../index.md#乘区默认输入)，精确内容为：

```ts
{
  isTargetStunned: false,
  targetBaseStunDamageMultiplier: 1,
  targetStunDamageMultiplierAdjustments: [],
}
```

外层对象和嵌套空数组都必须冻结。将该常量传给 `stunDamageFactor.calculate` 时结果为恒等倍率 `1`。
该常量表示公式组合中的“目标未失衡且没有失衡易伤调整”，不代表游戏内敌人的默认失衡易伤倍率。

## 适用边界

调用方必须先确定受击方当前是否失衡，并选择该状态对应的基础倍率和动态调整。失衡易伤区不负责：

- 根据失衡值或失衡条判断、进入或结束失衡状态；
- 从敌人类型推断默认失衡易伤倍率；
- 判断某个调整只在失衡或未失衡状态下生效；
- 处理持续时间、叠层、触发条件或效果来源；
- 判断调用方是否应采用默认输入。

采用失衡易伤区的公式始终调用本乘区。代理人和邦布不具有失衡条，敌人对代理人或邦布造成伤害时，
调用方应显式传入 `DEFAULT_STUN_DAMAGE_FACTOR_INPUT`，由本乘区产生恒等倍率 `1`。这只是统一公式组合
使用的计算输入，不用于声称代理人或邦布具有未失衡状态。

Nanoka 3.0 的中英文游戏文本均使用 `Stun DMG Multiplier` 表示失衡易伤倍率。未失衡场景只说明该
倍率提升在目标未失衡时仍可生效，没有提供独立术语。本规范不另设公开英文名称，通过
`isTargetStunned` 区分结算分支。

## 数组语义

- `targetStunDamageMultiplierAdjustments` 为空数组时，调整总和为 `0`。
- 每个数组成员独立参与求和，内容相同的成员不会合并或去重。
- 成员按数组顺序求和，顺序不表示业务优先级。
- 计算不得修改输入对象或其中的数组。

## 计算规则

```text
未钳制值 = targetBaseStunDamageMultiplier + Σ targetStunDamageMultiplierAdjustments

失衡易伤区结果 = clamp(未钳制值, 0.2, 5)，isTargetStunned 为 true 时
失衡易伤区结果 = clamp(未钳制值, 1, 3)，isTargetStunned 为 false 时
```

钳制在全部调整求和后执行。必须先检查未钳制值是否有限，结果不执行取整或截断。

`targetBaseStunDamageMultiplier` 已经包含基础值，因此公式不会再额外加 `1`。同一项动态调整不能既被
调用方预先计入 `targetBaseStunDamageMultiplier`，又作为数组成员传入。

## 输入值域

- `targetBaseStunDamageMultiplier` 必须是非负有限数。
- `targetStunDamageMultiplierAdjustments` 的成员允许任意有限有符号数值；正数表示提升，负数表示降低。
- 两类数值均为已经转换为小数的无量纲数值，游戏文本中的 `25%` 以 `0.25` 表示。
- 单项输入不设置未经来源确认的上限，最终按当前状态对应的范围钳制。

## 有效性与失败行为

| 失败条件                                  | 行为              |
| ----------------------------------------- | ----------------- |
| 输入不是非数组对象或为 `null`             | 抛出 `TypeError`  |
| `isTargetStunned` 不是 `boolean`          | 抛出 `TypeError`  |
| 调整字段不是数组                          | 抛出 `TypeError`  |
| 基础倍率或调整数组成员不是 `number`       | 抛出 `TypeError`  |
| 基础倍率或调整数组成员不是有限数值        | 抛出 `RangeError` |
| `targetBaseStunDamageMultiplier` 小于 `0` | 抛出 `RangeError` |
| 钳制前的未钳制值不是有限数值              | 抛出 `RangeError` |

## 代码组织

失衡易伤区的生产代码统一放在 `packages/core/src/factors/stun-damage.ts`。该文件包含身份常量、默认
输入、输入类型、`Factor` 定义、范围常量及失衡易伤区独有的求和和钳制逻辑。范围常量和私有辅助
函数不对外导出。

`packages/core/src/index.ts` 只负责重新导出公开 API，测试保存在独立测试文件中。
