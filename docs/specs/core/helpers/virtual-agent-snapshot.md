# 虚拟代理人快照

虚拟代理人快照按照有效代理人异常积蓄贡献，对异常伤害及紊乱失衡值需要保留的历史属性执行加权，
规则来源为[原始攻略中的异常伤害计算说明](../../../references/zzz-data-introduction.txt#L267-L272)。

游戏文本与 Nanoka 数据中没有“虚拟代理人”实体。`VirtualAgentSnapshot` 是 core 根据攻略计算模型建立
的规范化标识，不表示游戏提供了同名对象、面板或固定英文术语。

## 公开契约

```ts
export interface VirtualAgentContributionRecord {
  readonly effectiveAnomalyBuildup: number
  readonly level: number
  readonly anomalyProficiency: number
  readonly finalAttack: number
  readonly finalImpact: number
  readonly penetrationRatio: number
  readonly penetrationValue: number
  readonly damageBonusFactorResult: number
  readonly dazeDealtFactorResult: number
}

export interface VirtualAgentSnapshot {
  readonly level: number
  readonly anomalyProficiency: number
  readonly finalAttack: number
  readonly finalImpact: number
  readonly penetrationRatio: number
  readonly penetrationValue: number
  readonly damageBonusFactorResult: number
  readonly dazeDealtFactorResult: number
}

/** 根据已经筛选并裁剪的有效代理人异常积蓄记录计算虚拟代理人快照。 */
export declare function calculateVirtualAgentSnapshot(
  contributionRecords: readonly VirtualAgentContributionRecord[],
): VirtualAgentSnapshot
```

函数直接接收同质记录数组，不增加只包含 `contributionRecords` 的参数对象。返回值是一个新建的
`VirtualAgentSnapshot`，不是 `FactorResult`、`FormulaResult`、公式输入或异常状态对象。

## 贡献记录

每个 `VirtualAgentContributionRecord` 表示一次代理人攻击对当前异常状态实际贡献、且规则确认参与
异常伤害结算的有效异常积蓄及该次攻击留下的历史数值：

| 字段                      | 语义                                                                 |
| ------------------------- | -------------------------------------------------------------------- |
| `effectiveAnomalyBuildup` | 该次攻击实际写入本次异常触发周期、未溢出且参与异常伤害结算的积蓄值   |
| `level`                   | 该次攻击记录的代理人等级                                             |
| `anomalyProficiency`      | 该次攻击记录的最终异常精通                                           |
| `finalAttack`             | 该次攻击记录的最终攻击力                                             |
| `finalImpact`             | 该次攻击记录的最终冲击力                                             |
| `penetrationRatio`        | 该次攻击记录的穿透率                                                 |
| `penetrationValue`        | 该次攻击记录的穿透值                                                 |
| `damageBonusFactorResult` | 该次攻击已经结算并钳制完成的增伤区结果，不是原始增伤贡献             |
| `dazeDealtFactorResult`   | 该次攻击已经结算并钳制完成的失衡值提升区结果，不是原始提升或降低贡献 |

相同代理人在异常积蓄期间可能因属性或效果变化产生多条记录。helper 不接收代理人 ID，也不按代理人合并
记录；每条记录独立参与加权。记录数组按实际异常积蓄事件的先后顺序提供，helper 必须按索引读取并
校验记录。精确整数归约的结果不依赖加法顺序。

距离衰减不增加为记录字段。攻略确认距离衰减已经反映在该次攻击实际造成的异常积蓄中，因此它只通过
`effectiveAnomalyBuildup` 改变权重，不能在快照或后续异常伤害、紊乱失衡值中再次相乘。

## 有效积蓄与状态边界

helper 只接收已经完成来源筛选和溢出裁剪的代理人记录，不读取原始积蓄事件或异常槽。调用方必须先按
事件顺序完成以下状态处理：

1. 让代理人、邦布及效果规则明确不参与异常伤害结算的积蓄都按实际顺序占用本次异常触发周期的剩余
   阈值；
2. 在触发异常的事件上，将超过剩余阈值的溢出部分裁掉；
3. 排除邦布记录及效果规则明确不参与异常伤害结算的代理人记录，只把其余代理人实际写入且未溢出的
   正数积蓄作为 `effectiveAnomalyBuildup`；
4. 在异常触发时计算并保存快照，使后续普通紊乱仍能取得被覆盖原异常状态的快照。

邦布积蓄会影响代理人后续还能写入多少有效积蓄，因此不能在计算槽位占用和溢出之前删除。以阈值
`100`、代理人 A 积蓄 `30`、邦布积蓄 `50`、代理人 B 积蓄 `40` 为例，B 只有 `20` 写入本周期；传给
helper 的 A、B 权重基数应分别为 `30` 和 `20`，而不是 `30` 和 `40`。

代理人身份本身不能证明积蓄参与异常伤害结算。Nanoka 3.1 本地数据缓存
`packages/data/raw/nanoka/3.1/{en,zh}/character/1411.json:354,359` 中的柚叶技能，以及
`packages/data/raw/nanoka/3.1/{en,zh}/character/1561.json:2001` 中的维琳娜影画，都存在攻击正常累积
异常积蓄、但该积蓄不参与异常伤害结算的规则。这类积蓄仍先占用阈值，再与邦布记录一并从快照贡献
记录中排除。调用方必须在建立记录前完成效果适用性判断，不能把“代理人来源”直接等同于“参与异常
伤害结算”。这些路径只作为本地数据观察依据；原始缓存不随仓库分发，不能作为公开规范链接。

helper 不接收 `isBangboo`、异常触发阈值、当前槽位值、溢出值、触发次数或异常状态标识，也不负责
排序原始事件。完全被排除或裁剪为 `0` 的记录不得作为零权重占位项传入。

如果处理后没有任何有效代理人记录，攻略没有提供虚拟代理人的回退规则。空数组必须失败，不能返回
默认代理人、全零快照或等级 `1` 快照。

## 输入值域

| 字段                      | 有效范围                                                 |
| ------------------------- | -------------------------------------------------------- |
| `effectiveAnomalyBuildup` | 严格大于 `0` 的有限 `number`                             |
| `level`                   | `[1, 60]` 范围内的整数                                   |
| `anomalyProficiency`      | 非负有限 `number`                                        |
| `finalAttack`             | 非负有限 `number`                                        |
| `finalImpact`             | 非负有限 `number`                                        |
| `penetrationRatio`        | 有限有符号 `number`                                      |
| `penetrationValue`        | 有限有符号 `number`                                      |
| `damageBonusFactorResult` | `[0, 6]` 范围内的有限 `number`，继承增伤区结果范围       |
| `dazeDealtFactorResult`   | `[0, 4]` 范围内的有限 `number`，继承失衡值提升区结果范围 |

`level` 的当前上限与代理人等级及[异常伤害等级区](../factors/anomaly-damage-level.md#等级值域)、
[紊乱失衡等级区](../factors/disorder-daze-level.md#等级值域)一致。未来等级上限变化时，必须同时重新
确认两个下游等级乘区的公式和值域，不能只放宽本 helper。

`finalImpact` 在建立快照时不钳制到 `1000`。紊乱失衡值使用快照时，由基础失衡区在加权完成后统一应用
冲击力有效范围。穿透率和穿透值可以包含有符号调整；来源没有给出额外输入范围，helper 不静默钳制它们。

## 加权规则

设第 `i` 条记录的 `effectiveAnomalyBuildup` 为 `e_i`，参与加权的任一记录字段为 `x_i`。攻略定义的
数学结果为：

```text
权重 w_i = e_i / Σ e_i
字段加权结果 = Σ (w_i × x_i)
虚拟代理人等级 = floor(等级加权结果)
```

除 `level` 外的七个字段都保留加权结果，不执行取整、截断或钳制。`level` 只在完整加权结果产生后
向下取整，不能先对单条记录或中间累计值取整。

### 共同精确表示

二进制浮点归一化可能让有效贡献下溢为 `0`，也可能在数学结果恰为整数时产生略小的近似值。定义
binary64 最小正值单位 `U = 2^-1074`；每个有限 `number` 都能唯一表示为一个整数与 `U` 的乘积。
实现必须读取实际 binary64 位，不能通过十进制字符串、浮点除法或 `Math.log2` 恢复这个整数：

1. 设 binary64 的 11 位指数域为 `b`，52 位尾数域为 `f`；
2. `b = 0` 时，绝对值对应的整数为 `f`；
3. `b > 0` 时，绝对值对应的整数为 `(2^52 + f) × 2^(b - 1)`；
4. 字段值带符号时，根据符号位给整数添加符号；正零和负零都对应整数 `0`。

因此，每个有效积蓄可以精确写成 `e_i = W_i × U`，其中 `W_i` 是严格大于 `0` 的 `BigInt`；每个
连续字段可以精确写成 `x_i = X_i × U`，其中 `X_i` 是有符号 `BigInt`。全部字段复用共同整数分母：

```text
D = Σ W_i
```

实现必须按数组数值索引从小到大读取、校验并缓存记录，再按相同索引顺序建立整数和，不能调用自定义
`Symbol.iterator` 或重排记录。`BigInt` 加法没有舍入，因此最终数值不依赖记录排列；索引顺序约束的是
可观察的输入访问，而不是浮点累计顺序。

### 等级的精确取整

等级整数分子为 `N_level = Σ (W_i × BigInt(level_i))`。快照等级使用 `BigInt` 整数除法计算
`N_level / D`，再将 `[1, 60]` 范围内的商转换为 `number`。

全部权重和等级都是正整数，因此 `BigInt` 整数除法等价于对精确加权等级执行 `floor`。实现不得用
epsilon、近似相等判断或浮点在线均值替代该规则。例如两条记录的
`(effectiveAnomalyBuildup, level)` 分别为 `(1, 1)` 和 `(6, 15)` 时，精确加权等级为 `13`；先计算
浮点权重再加权会得到 `12.999999999999998`，并错误向下取整为 `12`。

### 其他字段的精确加权

直接计算 `Σ (e_i × x_i) / Σ e_i` 可能让权重和或单项乘积先溢出，分别缩放权重与字段又可能让两个
仍应共同产生有限贡献的因子分别下溢。除等级外的七个字段都按以下规则计算：

```text
N = Σ (W_i × X_i)
精确字段结果 = (N / D) × U
```

表达式中的除法是有理数除法，不能先执行 `BigInt` 整数除法。结果必须按 IEEE 754
roundTiesToEven 舍入为 binary64 `number`：

1. `N = 0` 时返回正零；否则令 `A = abs(N)`；
2. 精确求 `h = floor(log2(A / D))`；其中 `bitLength(v)` 表示正整数 `v` 的二进制位数。先令
   `h = bitLength(A) - bitLength(D)`；当 `h >= 0 && A < (D << h)`，或
   `h < 0 && (A << (-h)) < D` 时，令 `h -= 1`；不得用浮点对数判断边界；
3. 令 `s = max(0, h - 52)`，以 `BigInt` 对 `A` 除以 `D × 2^s`，得到商 `q` 和余数 `r`；
4. `2r > D × 2^s` 时令 `q += 1`；二者相等且 `q` 为奇数时也令 `q += 1`；
5. 令 `C = q × 2^s`，则舍入后结果的绝对值为 `C × U`。

最终 `number` 必须直接从 `C` 构造：

- `C = 0` 时，根据 `N` 的符号返回正零或负零；
- `0 < C < 2^52` 时，指数域为 `0`，尾数域为 `C`；
- `C >= 2^52` 时，令 `k = bitLength(C) - 53`，有效数为 `C >> k`，指数域为 `k + 1`，尾数域为
  `(C >> k) - 2^52`；
- 根据 `N` 的符号设置符号位，再把完整 64 位模式解释为 `number`。

舍入步骤保证构造正规数时右移不会丢弃非零位。非零负值舍入到零时必须返回负零；精确分子 `N = 0`
时必须返回正零。合法输入的精确加权结果位于该字段输入值的闭区间内，因此不会舍入为无穷大。

正确舍入不能先把任一 `BigInt` 转换为 `number` 后相除，也不能使用 epsilon、最低权重、分别缩放权重
与字段或外部任意精度依赖。比如两条记录的 `(effectiveAnomalyBuildup, finalAttack)` 分别为
`(1e308, 1e-300)` 和 `(1e-300, 1e308)` 时，结果必须是 `2e-300`，不能因交叉下溢变为 `0`。

以下向量固定关键舍入边界；位模式按 64 位十六进制大端顺序表示：

| 权重 `e_i`                             | 字段 `x_i`                                      | 预期结果与位模式                           |
| -------------------------------------- | ----------------------------------------------- | ------------------------------------------ |
| `[1e308, 1e-300]`                      | `[1e-300, 1e308]`                               | `2e-300`；`01b56e1fc2f8f359`               |
| `[Number.MIN_VALUE, Number.MAX_VALUE]` | `[Number.MAX_VALUE, Number.MIN_VALUE]`          | `2 × Number.MIN_VALUE`；`0000000000000002` |
| `[1, 1]`                               | `[1, 1 + Number.EPSILON]`                       | 向偶数舍入为 `1`；`3ff0000000000000`       |
| `[1, 1]`                               | `[1 + Number.EPSILON, 1 + 2 × Number.EPSILON]`  | 向偶数舍入到上界；`3ff0000000000002`       |
| `[1, 2]`                               | `[0, 1]`                                        | `2 / 3`；`3fe5555555555555`                |
| `[1, 1]`                               | `[0, Number.MIN_VALUE]`                         | 正零；`0000000000000000`                   |
| `[1, 1]`                               | `[-Number.MIN_VALUE, -0]`                       | 负零；`8000000000000000`                   |
| `[1, 1]`                               | `[-Number.MIN_VALUE, Number.MIN_VALUE]`         | 精确抵消后的正零；`0000000000000000`       |
| `[1, 1]`                               | `[最大次正规数, 最小正规数]`                    | 最小正规数；`0010000000000000`             |
| `[Number.MAX_VALUE, Number.MAX_VALUE]` | `[Number.MAX_VALUE 的前驱值, Number.MAX_VALUE]` | 前驱值；`7feffffffffffffe`                 |

实现必须在公开返回前把七个正确舍入结果和精确取整后的等级作为内部不变式重新检查，且不得为了掩盖
计算错误而静默钳制输出。对任何通过输入校验的调用，正权加权结果都位于各字段输入的闭区间内，因此
该内部检查不可由合法调用方输入触发，不构成额外公开失败分支。

## 返回值与不可变性

返回快照的字段与贡献记录中的八个历史字段一一对应，不包含 `effectiveAnomalyBuildup`、总权重、单条
权重、记录副本或来源分析。

helper 必须新建并使用 `Object.freeze` 冻结返回的 `VirtualAgentSnapshot`。快照只包含数值，浅冻结已经
覆盖全部成员。函数不得修改、排序或冻结调用方的输入数组及记录对象；调用方在函数返回后修改原记录，
不得改变已返回快照。

## 与现有计算的组合

虚拟代理人快照是公式调用前的公共输入准备结果，不是一个额外乘区：

- [异常伤害公式](../formulas/anomaly-damage.md)使用快照的 `finalAttack`、`damageBonusFactorResult`、
  `anomalyProficiency`、`level`、`penetrationRatio` 和 `penetrationValue`；普通紊乱伤害使用被覆盖原异常
  状态保存的同一快照；
- [紊乱失衡值公式](../formulas/disorder-daze.md)使用同一快照的 `finalImpact`、
  `dazeDealtFactorResult` 和 `level`；
- 目标防御状态、抗性、减易伤、失衡易伤、失衡抗性和受到失衡值提升区仍按结算时状态实时建立；
- 异常增伤区和异常暴击区按当前结算的异常效果实时建立，不进入快照。

`damageBonusFactorResult` 必须直接传给
[已结算增伤区](../factors/settled-damage-bonus.md)，不能作为
`DamageBonusFactorInput` 成员，也不能通过先加权原始增伤贡献来替代。`dazeDealtFactorResult` 可以直接
作为[紊乱失衡值提升区](../factors/disorder-daze-dealt.md)输入。

helper 不返回完整 `AnomalyDamageFormulaInput` 或 `DisorderDazeFormulaInput`。基础伤害倍率、目标实时
乘区、异常效果实时乘区、紊乱默认失衡倍率和特殊效果输入仍由对应公式规范及调用方维护。

## 适用边界

本 helper 不负责：

- 计算单次异常积蓄值或异常触发阈值；
- 读取或更新异常槽、处理冷却、触发异常、覆盖异常状态或保存状态生命周期；
- 识别代理人、邦布、技能、攻击属性或效果标签；
- 从 `AnomalyBuildupFormulaInput`、`FormulaResult`、Nanoka 数据或日志自动恢复贡献记录；
- 重新计算记录中的增伤区、失衡值提升区或最终属性；
- 为不经过异常积蓄的直接异常效果建立或猜测虚拟代理人快照；
- 决定紊乱失衡值采用原异常还是新异常属性对应的失衡抗性；
- 计算异常伤害、紊乱伤害、紊乱失衡值或其显示结果。

## 有效性与失败行为

| 失败条件                                                    | 行为              |
| ----------------------------------------------------------- | ----------------- |
| 输入不是数组                                                | 抛出 `TypeError`  |
| 输入数组为空                                                | 抛出 `RangeError` |
| 数组项不是非数组对象、为 `null`，或稀疏数组索引没有自有成员 | 抛出 `TypeError`  |
| 任一字段不是 `number`                                       | 抛出 `TypeError`  |
| 任一字段不是有限数值                                        | 抛出 `RangeError` |
| `effectiveAnomalyBuildup` 不大于 `0`                        | 抛出 `RangeError` |
| `level` 不是整数或不在 `[1, 60]`                            | 抛出 `RangeError` |
| 任一非负字段小于 `0`                                        | 抛出 `RangeError` |
| 任一乘区结果字段超出自身结果范围                            | 抛出 `RangeError` |

多个失败条件同时存在时，不承诺字段校验错误的优先级。运行时必须按数组索引读取并校验每个成员，自定义
`Symbol.iterator` 不得跳过、重排或替换索引成员。

## 代码组织

生产代码放在 `packages/core/src/anomaly.ts`，只包含两个公开类型、公开 helper 及其私有校验、binary64
分解、精确有理数归约和正确舍入逻辑。该文件不依赖具体公式，不实现异常槽状态机，也不重复实现任何
`Factor` 算法。

`packages/core/src/index.ts` 只负责重新导出公开 API。测试放在 `packages/core/test/anomaly.test.ts`，必须覆盖
单条与多条记录、同一代理人的多条记录、邦布、效果级排除和溢出输入准备示例、等级最终向下取整、
整数边界的精确等级取整、连续字段交叉极值、roundTiesToEven 的正规数与次正规数边界、字段结果范围、
有符号穿透、空数组、稀疏数组、自定义迭代器、全部可由调用方输入触发的失败行为、输入不变性及返回
冻结。打包验证必须覆盖两个公开类型和函数的安装后运行时与类型消费。
