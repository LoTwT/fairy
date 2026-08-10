# 紊乱失衡值提升区

紊乱失衡值提升区接收原异常状态的虚拟代理人已经加权完成的失衡值提升区倍率，规则来源为
[原始攻略中的虚拟代理人记录规则](../../../references/zzz-data-introduction.txt#L267-L271)和
[紊乱失衡值计算规则](../../../references/zzz-data-introduction.txt#L293-L297)。

原始攻略在异常积蓄时记录每次攻击已经计算完成的失衡值提升区结果，再按照有效异常积蓄贡献进行
加权。该值不是一组尚待汇总的提升或降低贡献，因此不能作为 `DazeDealtFactorInput` 传给
`dazeDealtFactor` 重新计算。

## 身份与公开契约

| 项目       | 定义                            |
| ---------- | ------------------------------- |
| 中文名称   | 紊乱失衡值提升区                |
| `factorId` | `disorder_daze_dealt`           |
| 身份常量   | `DISORDER_DAZE_DEALT_FACTOR_ID` |
| 公开定义   | `disorderDazeDealtFactor`       |
| 输入类型   | `DisorderDazeDealtFactorInput`  |
| 结果语义   | `Multiplier`                    |

公开类型形态如下。该代码块描述公开契约，不限定内部实现方式。

```ts
export type DisorderDazeDealtFactorInput = number

export declare const DISORDER_DAZE_DEALT_FACTOR_ID: "disorder_daze_dealt"

export declare const DEFAULT_DISORDER_DAZE_DEALT_FACTOR_INPUT: DisorderDazeDealtFactorInput

export declare const disorderDazeDealtFactor: Factor<DisorderDazeDealtFactorInput>
```

由 `Factor<DisorderDazeDealtFactorInput>` 的公共契约可得，`disorderDazeDealtFactor.calculate` 接收
`DisorderDazeDealtFactorInput`，返回 `FactorResult`。

`DisorderDazeDealt` 是 core 根据 `Disorder` 与 `Daze dealt` 组合建立的范围标识，不是游戏文本提供的
完整英文乘区名称。它表示紊乱失衡值计算专用的、已经完成虚拟代理人加权的造成侧倍率。

## 输入语义

`DisorderDazeDealtFactorInput` 直接表示原异常状态的虚拟代理人失衡值提升区结果。调用方必须先完成：

1. 为每次参与原异常状态的有效代理人异常积蓄取得当次攻击已经结算并钳制后的失衡值提升区结果；
2. 排除邦布造成的异常积蓄和超过本次异常触发阈值的溢出部分；
3. 按每条记录的有效异常积蓄占比，对各自的失衡值提升区结果执行加权平均。

输入是上述加权平均的最终倍率，不是百分比贡献。加权结果 `1.2` 直接以 `1.2` 传入，不能转换为
`dazeDealtIncreases: [0.2]` 并声称该数组保存真实效果贡献。

加权、记录筛选和有效异常积蓄占比计算发生在本乘区调用之前。本乘区不接收异常积蓄记录、权重、
代理人身份或效果来源。

## 与失衡值提升区的关系

本乘区与[失衡值提升区](daze-dealt.md)表示公式中的同一个造成侧乘区位置，但输入所处的计算阶段不同：

- `dazeDealtFactor` 从本次常规失衡值计算适用的提升和降低贡献计算倍率；
- `disorderDazeDealtFactor` 接收原异常状态记录中各次已结算倍率的加权结果。

分别钳制后的倍率加权平均，不等于先加权原始贡献再重新计算和钳制。因此紊乱失衡值公式只能采用
本乘区，不能同时采用本乘区与 `dazeDealtFactor`，也不能把同一结果在两个乘区中重复计算。

本乘区不表示第二个额外相乘的失衡值提升区。

## 默认输入

`DEFAULT_DISORDER_DAZE_DEALT_FACTOR_INPUT` 遵循[公共默认输入规则](../index.md#乘区默认输入)，精确值为：

```ts
1
```

数值是不可变原始值，不需要运行时冻结。该常量只表示原异常状态的虚拟代理人失衡值提升区结果已经
确认为恒等倍率 `1`，不代表游戏内角色、异常状态或失衡值调整的默认值。

## 计算规则

```text
紊乱失衡值提升区结果 = input
```

输入已经是完成逐记录结算和虚拟代理人加权的最终倍率。本乘区只验证并返回该值，不再次加上基础值
`1`，不执行求和、钳制、取整或截断。

## 输入值域

- 输入必须是 `[0, 4]` 范围内的有限数，两个端点都有效；该范围继承被记录的失衡值提升区结果范围。
- 超出范围表示上游没有按已确认的失衡值提升区规则建立虚拟代理人结果，必须抛出错误，不能静默
  钳制。
- 输入不携带属性、来源或结算时点；本乘区无法验证调用方是否使用了原异常状态的正确记录。

## 适用边界

本乘区只服务于需要使用虚拟代理人失衡值提升区结果的紊乱失衡值计算，不负责：

- 记录异常积蓄时的失衡值提升区结果；
- 计算或归一化异常积蓄贡献权重；
- 判断邦布、溢出积蓄、攻击、效果或异常状态是否参与加权；
- 根据当前角色状态重新计算造成失衡值提升或降低；
- 计算目标实时的受到失衡值提升区或失衡抗性区；
- 决定某次紊乱或特殊紊乱是否产生失衡值。

如果全部有效代理人积蓄都被排除，攻略没有提供建立虚拟代理人的规则。调用方不得以默认输入代替
缺失的虚拟代理人并声称结果完整。

## 有效性与失败行为

| 失败条件                                | 行为              |
| --------------------------------------- | ----------------- |
| 输入不是 `number`                       | 抛出 `TypeError`  |
| 输入是 `NaN`、`Infinity` 或 `-Infinity` | 抛出 `RangeError` |
| 输入小于 `0` 或大于 `4`                 | 抛出 `RangeError` |

`defineFactor` 按公共契约检查最终结果是否有限。合法输入直接作为结果返回，不增加重复的中间校验。

## 代码组织

紊乱失衡值提升区的生产代码统一放在 `packages/core/src/factors/disorder-daze-dealt.ts`。该文件包含身份
常量、默认输入、输入类型、`Factor` 定义、范围常量和本乘区独有的输入校验。范围常量不对外导出。

`packages/core/src/index.ts` 只负责重新导出公开 API，测试保存在
`packages/core/test/disorder-daze-dealt.test.ts`。
