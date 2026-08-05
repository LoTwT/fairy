# 防御区

防御区根据攻击方等级基数和受击敌人的有效防御产生防御倍率，规则来源为
[原始攻略中的防御区](../../../references/zzz-data-introduction.txt#L85)。

## 身份与公开契约

| 项目       | 定义                 |
| ---------- | -------------------- |
| 中文名称   | 防御区               |
| `factorId` | `defense`            |
| 身份常量   | `DEFENSE_FACTOR_ID`  |
| 公开定义   | `defenseFactor`      |
| 输入类型   | `DefenseFactorInput` |
| 结果语义   | `Multiplier`         |

防御区及其配套 helper 的公开类型形态如下。该代码块描述公开契约，不限定内部实现方式。

```ts
export interface DefenseFactorInput {
  readonly attackerLevelBase: number
  readonly targetEffectiveDefense: number
}

export interface CalculateTargetBaseDefenseParams {
  readonly targetLevelBase: number
  readonly targetLevelOneBaseDefense: number
}

export interface CalculateTargetEffectiveDefenseParams {
  readonly targetBaseDefense: number
  readonly defensePercentageAdjustments: readonly number[]
  readonly penetrationRatios: readonly number[]
  readonly penetrationValues: readonly number[]
}

export declare const DEFENSE_FACTOR_ID: "defense"

export declare function calculateDefenseLevelBase(level: number): number

export declare function calculateTargetBaseDefense(
  params: CalculateTargetBaseDefenseParams,
): number

export declare function calculateTargetEffectiveDefense(
  params: CalculateTargetEffectiveDefenseParams,
): number

export declare const defenseFactor: Factor<DefenseFactorInput>
```

由 `Factor<DefenseFactorInput>` 的通用契约可得，`defenseFactor.calculate` 接收
`DefenseFactorInput`，返回 `FactorResult`。

`DefenseFactorInput` 只包含防御区主公式直接使用的两个参数：

- `attackerLevelBase` 是已经完成等级查表的攻击方等级基数。
- `targetEffectiveDefense` 是已经完成防御调整、穿透和非负钳制的目标有效防御。

两个值都必须是可以直接进入防御区主公式的计算结果，不保存等级、原始数据、调整来源或其他结算
上下文。调用方已有合法计算结果时可以直接传入；需要从更早阶段计算时使用本规范定义的配套 helper。

## 主公式

```text
防御区结果
= attackerLevelBase
  / (targetEffectiveDefense + attackerLevelBase)
```

`attackerLevelBase` 必须是正有限数，`targetEffectiveDefense` 必须是非负有限数。防御区不再次钳制
有效防御，也不执行取整或截断，因此结果有效范围为 `(0, 1]`。

当攻击方等级基数为 `794`、目标有效防御为 `952.8` 时：

```text
防御区结果 = 794 / (952.8 + 794)
```

该结果不得截断为攻略展示的四位近似值 `0.4545`。

## 配套计算

配套 helper 负责计算防御区主公式所需的参数，不是 `Factor`，也不建立新的乘区。helper 只接受语义
已经确定的数值，不读取 Nanoka 实体，不判断效果是否适用，也不保存来源信息。

### 等级基数

`calculateDefenseLevelBase` 根据等级查询防御计算使用的等级基数。等级必须是正整数；`1` 至 `59`
级使用下表，`60` 级及
以上固定使用 `794`，不得插值或继续外推。

| 等级 | 基数 | 等级 | 基数 | 等级   | 基数 |
| ---: | ---: | ---: | ---: | ------ | ---: |
|    1 |   50 |   21 |  181 | 41     |  436 |
|    2 |   54 |   22 |  191 | 42     |  452 |
|    3 |   58 |   23 |  201 | 43     |  469 |
|    4 |   62 |   24 |  211 | 44     |  485 |
|    5 |   66 |   25 |  222 | 45     |  502 |
|    6 |   71 |   26 |  233 | 46     |  519 |
|    7 |   76 |   27 |  245 | 47     |  537 |
|    8 |   82 |   28 |  256 | 48     |  555 |
|    9 |   88 |   29 |  268 | 49     |  573 |
|   10 |   94 |   30 |  281 | 50     |  592 |
|   11 |  100 |   31 |  293 | 51     |  610 |
|   12 |  107 |   32 |  306 | 52     |  629 |
|   13 |  114 |   33 |  319 | 53     |  649 |
|   14 |  121 |   34 |  333 | 54     |  669 |
|   15 |  129 |   35 |  347 | 55     |  689 |
|   16 |  137 |   36 |  361 | 56     |  709 |
|   17 |  145 |   37 |  375 | 57     |  730 |
|   18 |  153 |   38 |  390 | 58     |  751 |
|   19 |  162 |   39 |  405 | 59     |  772 |
|   20 |  172 |   40 |  421 | `>=60` |  794 |

该表是 `calculateDefenseLevelBase` 的固定规则，不由调用方作为可替换配置提供。攻击方和目标使用
同一张表。

### 目标基础防御

```text
目标基础防御
= targetLevelOneBaseDefense / 50 * targetLevelBase
```

`targetLevelBase` 可以采用 `calculateDefenseLevelBase` 的结果；`targetLevelOneBaseDefense` 是目标的
1 级基础防御。`50` 是 1 级等级基数，是目标基础防御换算中的固定常量。

两个参数必须分别为正有限数和非负有限数。结果必须是非负有限数，不执行取整、截断或钳制。

例如目标等级基数为 `794`、1 级基础防御为 `60` 时，目标基础防御为：

```text
60 / 50 * 794 = 952.8
```

### 目标有效防御

```text
防御调整倍率
= 1 + Σ defensePercentageAdjustments

穿透倍率
= 1 - Σ penetrationRatios

未钳制有效防御
= targetBaseDefense
  * 防御调整倍率
  * 穿透倍率
  - Σ penetrationValues

目标有效防御 = max(未钳制有效防御, 0)
```

- `targetBaseDefense` 是尚未包含本次三个调整数组的目标基础防御。
- `defensePercentageAdjustments` 使用有符号小数。防御提升使用正数，防御降低和无视防御使用负数。
- `penetrationRatios` 使用已经转换为小数的有符号穿透率贡献；游戏文本中的 `24%` 以 `0.24` 传入。
- `penetrationValues` 使用有符号固定值贡献，与防御值使用相同数值单位。

防御降低和无视防御通过负数进入同一个防御调整数组，再与穿透率乘算，最后减去穿透值。调用方负责
确定每项效果是否适用，不得把同一项调整预先计入 `targetBaseDefense` 后再次放入调整数组。

钳制前必须检查未钳制有效防御是否有限，避免 `max` 把 `-Infinity` 转换为有限的 `0`。结果不执行
取整或截断。

三个数组具有相同的集合语义：

- 空数组表示对应调整总和为 `0`。
- 每个成员独立参与求和，内容相同的成员不会合并或去重。
- 成员按数组顺序求和，顺序不表示业务优先级。
- helper 不得修改参数对象或其中的数组。

## 适用边界

当前防御区和配套 helper 只规范代理人或邦布对敌人造成伤害时使用的敌人防御计算。它们不负责：

- 从 Nanoka 实体或其他数据源读取等级及基础防御；
- 根据敌人类型推断缺失的 1 级基础防御；
- 判断某个防御变化、无视防御或穿透效果是否适用于本次攻击；
- 计算敌人对代理人或邦布造成伤害时的受击方防御；
- 决定顶层公式是否采用防御区。

贯穿伤害（`Sheer DMG`）跳过防御区。该规则属于顶层公式的乘区组合，不通过向防御区传入模式字段
实现。

## 有效性与失败行为

| 公开 API                          | 失败条件                                       | 行为              |
| --------------------------------- | ---------------------------------------------- | ----------------- |
| `defenseFactor.calculate`         | 输入不是非数组对象或为 `null`                  | 抛出 `TypeError`  |
| `defenseFactor.calculate`         | 任一字段不是 `number`                          | 抛出 `TypeError`  |
| `defenseFactor.calculate`         | 任一字段不是有限数值                           | 抛出 `RangeError` |
| `defenseFactor.calculate`         | 攻击方等级基数不大于 `0`                       | 抛出 `RangeError` |
| `defenseFactor.calculate`         | 目标有效防御小于 `0`                           | 抛出 `RangeError` |
| `defenseFactor.calculate`         | 最终结果不在 `(0, 1]`                          | 抛出 `RangeError` |
| `calculateDefenseLevelBase`       | 等级不是 `number`                              | 抛出 `TypeError`  |
| `calculateDefenseLevelBase`       | 等级不是有限整数或小于 `1`                     | 抛出 `RangeError` |
| `calculateTargetBaseDefense`      | 参数不是非数组对象或为 `null`                  | 抛出 `TypeError`  |
| `calculateTargetBaseDefense`      | 任一字段不是 `number`                          | 抛出 `TypeError`  |
| `calculateTargetBaseDefense`      | 任一字段不是有限数值                           | 抛出 `RangeError` |
| `calculateTargetBaseDefense`      | 目标等级基数不大于 `0` 或 1 级基础防御小于 `0` | 抛出 `RangeError` |
| `calculateTargetBaseDefense`      | 结果不是有限数值                               | 抛出 `RangeError` |
| `calculateTargetEffectiveDefense` | 参数不是非数组对象或为 `null`                  | 抛出 `TypeError`  |
| `calculateTargetEffectiveDefense` | 任一调整字段不是数组                           | 抛出 `TypeError`  |
| `calculateTargetEffectiveDefense` | 基础防御或任一数组成员不是 `number`            | 抛出 `TypeError`  |
| `calculateTargetEffectiveDefense` | 基础防御或任一数组成员不是有限数值             | 抛出 `RangeError` |
| `calculateTargetEffectiveDefense` | 基础防御小于 `0`                               | 抛出 `RangeError` |
| `calculateTargetEffectiveDefense` | 钳制前有效防御或最终结果不是有限数值           | 抛出 `RangeError` |

`defineFactor` 按公共契约检查防御区最终结果是否有限。其他返回数值的 helper 必须在各自公开返回前执行
同样的有限性检查。

## 代码组织

防御区的生产代码统一放在 `packages/core/src/factors/defense.ts`。该文件包含身份常量、公开输入与参数
类型、`Factor` 定义、三个配套 helper、等级基数表、范围常量及防御区独有的校验和计算逻辑。等级基数
表、固定常量和私有辅助函数不对外导出。

`packages/core/src/index.ts` 只负责重新导出公开 API，测试统一保存在
`packages/core/test/defense.test.ts`。
