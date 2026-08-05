# 减易伤区

减易伤区汇总受击方在本次伤害中适用的受到伤害提升和受到伤害降低，规则来源为
[原始攻略中的减易伤区](../../../references/zzz-data-introduction.txt#L128)。

## 身份与公开契约

| 项目       | 定义                     |
| ---------- | ------------------------ |
| 中文名称   | 减易伤区                 |
| `factorId` | `damage_taken`           |
| 身份常量   | `DAMAGE_TAKEN_FACTOR_ID` |
| 公开定义   | `damageTakenFactor`      |
| 输入类型   | `DamageTakenFactorInput` |
| 结果语义   | `Multiplier`             |

公开类型形态如下。该代码块描述公开契约，不限定内部实现方式。

```ts
export interface DamageTakenFactorInput {
  readonly targetDamageTakenIncreases: readonly number[]
  readonly targetDamageTakenReductions: readonly number[]
}

export declare const DAMAGE_TAKEN_FACTOR_ID: "damage_taken"

export declare const damageTakenFactor: Factor<DamageTakenFactorInput>
```

由 `Factor<DamageTakenFactorInput>` 的通用契约可得，`damageTakenFactor.calculate` 接收
`DamageTakenFactorInput`，返回 `FactorResult`。

`DamageTakenFactorInput` 是一次减易伤区计算的完整输入：

- `targetDamageTakenIncreases` 保存本次计算适用的受击方受到伤害提升贡献。
- `targetDamageTakenReductions` 保存本次计算适用的受击方受到伤害降低贡献。

两个数组的成员都使用非负小数。游戏文本中的 `30%` 以 `0.3` 传入；字段语义决定计算方向，调用方
不得为受到伤害降低贡献添加负号。数组成员不表示最终倍率，已经包含基础值 `1` 的最终倍率不能作为
贡献传入。

调用方只传入本次伤害实际适用的贡献。效果目标、伤害类型、触发条件和持续时间是否匹配，不由减易伤区
判断。

## 适用边界

减易伤区只处理受击方一侧的“受到的伤害提升”和“受到的伤害降低”：

- “造成的伤害提升”和“造成的伤害降低”属于增伤区，不得传入减易伤区。
- 伤害抗性属于抗性区，不得作为受到伤害降低传入减易伤区。
- 只影响失衡值、异常积蓄值或其他非伤害结果的效果不属于本乘区。

减易伤区不保存受击方身份，也不根据效果来源判断一项贡献是否适用。

## 数组语义

- 两个数组都为空时没有减易伤贡献，结果为 `1`。
- 每个数组成员独立参与求和，内容相同的成员不会合并或去重。
- 成员按各自数组中的顺序求和，顺序不表示业务优先级。
- 计算不得修改输入对象或其中的数组。

## 计算规则

```text
未钳制值
= 1
  + Σ targetDamageTakenIncreases
  - Σ targetDamageTakenReductions

减易伤区结果 = clamp(未钳制值, 0.2, 2)
```

钳制在求和并加上基础值 `1` 后执行。未钳制值小于 `0.2` 时结果为 `0.2`，大于 `2` 时结果为 `2`，
位于 `[0.2, 2]` 时保持原值。因此叠加受到伤害降低不能通过本乘区把伤害降为 `0`。结果不执行取整
或截断。

## 输入值域

- `targetDamageTakenIncreases` 和 `targetDamageTakenReductions` 的成员必须是非负有限数。
- 两类数值均使用已经转换为小数的无量纲值；游戏文本中的 `30%` 以 `0.3` 表示。
- 单项输入不设置未经来源确认的上限，最终统一按减易伤区范围钳制。

## 有效性与失败行为

| 失败条件                                    | 行为              |
| ------------------------------------------- | ----------------- |
| 输入不是非数组对象或为 `null`               | 抛出 `TypeError`  |
| 受到伤害提升或降低字段不是数组              | 抛出 `TypeError`  |
| 数组成员不是 `number`                       | 抛出 `TypeError`  |
| 数组成员是 `NaN`、`Infinity` 或 `-Infinity` | 抛出 `RangeError` |
| 数组成员小于 `0`                            | 抛出 `RangeError` |
| 钳制前的未钳制值不是有限数值                | 抛出 `RangeError` |

钳制可能把 `Infinity` 或 `-Infinity` 转换为有限边界值，因此必须先检查未钳制值，再执行钳制。

## 代码组织

减易伤区的生产代码统一放在 `packages/core/src/factors/damage-taken.ts`。该文件包含身份常量、输入类型、
`Factor` 定义、范围常量及减易伤区的求和和钳制逻辑。范围常量和私有辅助函数不对外导出。

`packages/core/src/index.ts` 只负责重新导出公开 API，测试保存在独立测试文件中。
