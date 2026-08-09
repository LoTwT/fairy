# 受到失衡值提升区

受到失衡值提升区汇总本次失衡值计算中承受侧适用的受到失衡值提升和受到失衡值降低，规则来源为
[原始攻略中的受到失衡值提升区](../../../references/zzz-data-introduction.txt#L167-L170)。游戏英文文本使用
`Daze taken` 描述承受侧的失衡值。公开标识使用 `DazeTaken`，与造成侧的 `DazeDealt` 明确区分。

## 身份与公开契约

| 项目       | 定义                   |
| ---------- | ---------------------- |
| 中文名称   | 受到失衡值提升区       |
| `factorId` | `daze_taken`           |
| 身份常量   | `DAZE_TAKEN_FACTOR_ID` |
| 公开定义   | `dazeTakenFactor`      |
| 输入类型   | `DazeTakenFactorInput` |
| 结果语义   | `Multiplier`           |

公开类型形态如下。该代码块描述公开契约，不限定内部实现方式。

```ts
export interface DazeTakenFactorInput {
  readonly targetDazeTakenIncreases: readonly number[]
  readonly targetDazeTakenReductions: readonly number[]
}

export declare const DAZE_TAKEN_FACTOR_ID: "daze_taken"

export declare const DEFAULT_DAZE_TAKEN_FACTOR_INPUT: DazeTakenFactorInput

export declare const dazeTakenFactor: Factor<DazeTakenFactorInput>
```

由 `Factor<DazeTakenFactorInput>` 的通用契约可得，`dazeTakenFactor.calculate` 接收
`DazeTakenFactorInput`，返回 `FactorResult`。

`DazeTakenFactorInput` 是一次受到失衡值提升区计算的完整输入：

- `targetDazeTakenIncreases` 保存本次计算适用的受击方受到失衡值提升贡献。
- `targetDazeTakenReductions` 保存本次计算适用的受击方受到失衡值降低贡献。

两个数组的成员都使用非负小数。游戏文本中的 `50%` 以 `0.5` 传入；字段语义决定计算方向，调用方
不得为受到失衡值降低贡献添加负号。数组成员不表示最终倍率，已经包含基础值 `1` 的倍率不能作为
贡献传入。

## 默认输入

`DEFAULT_DAZE_TAKEN_FACTOR_INPUT` 遵循[公共默认输入规则](../index.md#乘区默认输入)，精确内容为：

```ts
{
  targetDazeTakenIncreases: [],
  targetDazeTakenReductions: [],
}
```

外层对象和两个嵌套空数组都必须冻结。将该常量传给 `dazeTakenFactor.calculate` 时结果为恒等倍率
`1`。该常量只表示本次计算没有受到失衡值提升或降低，不代表目标在游戏内存在默认的受到失衡值
调整。

## 适用边界

受到失衡值提升区只处理效果语义为“受到的失衡值提升”和“受到的失衡值降低”的贡献。乘区归属取决于
效果描述，不取决于效果由攻击方、受击方或其他机制提供：

- 受击方状态使“代理人对其造成的失衡值降低”时，该贡献属于失衡值提升区，不得作为“受到的失衡值
  降低”传入本乘区。
- 效果语义为“造成的失衡值提升”或“造成的失衡值降低”时，贡献属于失衡值提升区，不得传入本乘区。
- 失衡抗性属于抗性区，不得作为受到失衡值降低传入本乘区。
- `Stun DMG Multiplier` 只影响伤害，不参与失衡值计算。
- 已确认的 `Daze Vulnerability` 特殊文本遵循[失衡相关术语](../index.md#失衡相关术语)，不表示本乘区的
  `Daze taken`。

调用方只传入本次失衡值计算实际适用的贡献。目标状态、属性类型、命中方向、部位、触发条件和持续时间
是否匹配，不由本乘区判断。同一项调整不能同时计入本乘区和失衡值提升区。

## 数组语义

- 两个数组都为空时没有受到失衡值调整，结果为 `1`。
- 每个成员独立参与求和，内容相同的成员不会合并或去重。
- 成员按各自数组中的顺序求和，顺序不表示业务优先级。
- 计算不得修改输入对象或其中的数组。

## 计算规则

```text
未钳制值
= 1
  + Σ targetDazeTakenIncreases
  - Σ targetDazeTakenReductions

受到失衡值提升区结果 = clamp(未钳制值, 0, 4)
```

钳制在两个数组分别求和并加上基础值 `1` 后执行。未钳制值小于 `0` 时结果为 `0`，大于 `4` 时结果
为 `4`，位于 `[0, 4]` 时保持原值。钳制前必须检查未钳制值是否有限，结果不执行取整或截断。

## 输入值域

- 两个数组的成员都必须是非负有限数，`0` 有效。
- 所有贡献均使用已经转换为小数的无量纲数值。
- 单项输入不设置未经来源确认的上限，最终统一按受到失衡值提升区范围钳制。

## 有效性与失败行为

| 失败条件                                    | 行为              |
| ------------------------------------------- | ----------------- |
| 输入不是非数组对象或为 `null`               | 抛出 `TypeError`  |
| 任一贡献字段不是数组                        | 抛出 `TypeError`  |
| 数组成员不是 `number`                       | 抛出 `TypeError`  |
| 数组成员是 `NaN`、`Infinity` 或 `-Infinity` | 抛出 `RangeError` |
| 数组成员小于 `0`                            | 抛出 `RangeError` |
| 钳制前的未钳制值不是有限数值                | 抛出 `RangeError` |

## 代码组织

受到失衡值提升区的生产代码统一放在 `packages/core/src/factors/daze-taken.ts`。该文件包含身份常量、默认
输入、输入类型、`Factor` 定义、范围常量及本乘区独有的求和和钳制逻辑。范围常量和私有辅助函数不对外
导出。

`packages/core/src/index.ts` 只负责重新导出公开 API，测试保存在
`packages/core/test/daze-taken.test.ts`。
