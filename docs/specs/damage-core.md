# 伤害计算核心 V1 规格

> 参考来源：`docs/references/zzz-data-introduction.txt`

## 范围

本规格只覆盖：

- 常规伤害
- 贯穿伤害（`sheer`）

本规格明确不覆盖：

- 异常伤害
- 紊乱伤害
- 失衡值与异常积蓄
- 能量、秽息、部位破坏、打断
- 从 `data/source` 或原文本中自动解析乘区
- 分段倍率推导

## 设计目标

- 所有计算能力尽可能实现为纯函数
- npm 包公开 API 只暴露稳定的战斗语义数值接口
- skill 与后续数据整理统一围绕本规格定义的输入字段适配
- 伤害倍率完全以调用方传入值为准，不做隐式推导

## API 分层

### Resolved Core

`resolved core` 只接收已经归一化好的乘区结果，不接受角色名、装备名、文本描述等高层信息。

公开函数：

- `calcResolvedNormalDamage(input)`
- `calcResolvedSheerDamage(input)`

### Factor Helpers

`factor helpers` 负责逐乘区计算，供调用方自由组合、缓存或热替换。

公开函数：

- `calcBaseDamage`
- `getAttackerLevelBase`
- `calcBonusMultiplier`
- `calcCritMultiplier`
- `calcExpectedCritMultiplier`
- `calcDefenseMultiplier`
- `calcResistanceMultiplier`
- `calcVulnerabilityMultiplier`
- `calcDazeVulnerabilityMultiplier`
- `calcSheerBonusMultiplier`

### Display Helpers

`display helpers` 负责游戏展示层数值处理。

公开函数：

- `ceilDisplayDamage`
- `sumDisplayedSegments`

## 类型契约

### Resolved Inputs

```ts
interface ResolvedNormalDamageInput {
  baseDamage: number
  bonusMultiplier: number
  critMultiplier: number
  defenseMultiplier: number
  resistanceMultiplier: number
  vulnerabilityMultiplier: number
  dazeVulnerabilityMultiplier: number
  specialMultiplier?: number
}

interface ResolvedSheerDamageInput {
  baseDamage: number
  bonusMultiplier: number
  critMultiplier: number
  sheerBonusMultiplier: number
  resistanceMultiplier: number
  vulnerabilityMultiplier: number
  dazeVulnerabilityMultiplier: number
  specialMultiplier?: number
}
```

### Result

```ts
interface DamageBreakdown {
  baseDamage: number
  bonusMultiplier: number
  critMultiplier: number
  defenseMultiplier: number
  resistanceMultiplier: number
  vulnerabilityMultiplier: number
  dazeVulnerabilityMultiplier: number
  sheerBonusMultiplier: number
  specialMultiplier: number
}

interface DamageResult {
  total: number
  breakdown: DamageBreakdown
}
```

约定：

- `breakdown.baseDamage` 是基础伤害区最终标量
- `breakdown` 只保留最终参与公式的 resolved 数值
- 乘区来源拆分、提供方明细由上层处理，不进入核心返回结构

## 公式

### 常规伤害

```text
常规伤害 =
  基础伤害区
  × 增伤区
  × 暴击区
  × 防御区
  × 抗性区
  × 减易伤区
  × 失衡易伤区
  × 特殊乘区
```

### 贯穿伤害

```text
贯穿伤害 =
  基础伤害区
  × 增伤区
  × 暴击区
  × 贯穿增伤区
  × 抗性区
  × 减易伤区
  × 失衡易伤区
  × 特殊乘区
```

说明：

- `sheer` 跳过防御区
- `sheer` 使用贯穿增伤区替代防御区

## Helper 规格

### `calcBaseDamage(attributeValue, multipliers)`

公式：

```text
基础伤害区 = 对应属性值 × Σ伤害倍率
```

上游所需数据：

- 当前伤害使用的属性值
  - 常规伤害通常是攻击力
  - 贯穿伤害通常是贯穿力
- 伤害倍率数组

### `getAttackerLevelBase(level)`

公式：

- 1-60 级按固定表查值
- 60 级以上固定为 `794`

上游所需数据：

- 攻击者等级

### `calcBonusMultiplier(sum)`

公式：

```text
增伤区 = 1 + Σ增伤
```

Clamp：

- `[0, 6]`

上游所需数据：

- 所有增伤效果汇总后的总和

### `calcCritMultiplier(params, isCrit)`

公式：

- 暴击时：`1 + critDamage`
- 未暴击：`1`

Clamp：

- `critDamage` clamp 到 `[0, 5]`

上游所需数据：

- 暴击伤害
- 当前是否暴击

### `calcExpectedCritMultiplier(params)`

公式：

```text
暴击期望 = 1 + critRate × critDamage
```

Clamp：

- `critRate` clamp 到 `[0, 1]`
- `critDamage` clamp 到 `[0, 5]`

上游所需数据：

- 暴击率总和
- 暴击伤害总和

### `calcDefenseMultiplier(params)`

公式：

```text
防御区 = 攻击方等级基数 / (受击方有效防御 + 攻击方等级基数)

受击方有效防御 =
  max(
    0,
    受击方防御 × (1 - 穿透率) - 穿透值
  )

受击方防御 =
  基础防御 × (1 + 防御加成 - 防御降低)
```

约定：

- `calcDefenseMultiplier(params)` 接收 `attackerLevel`
- helper 内部通过 `getAttackerLevelBase(level)` 计算攻击方等级基数
- `defenseReduction` 同时承载减防与无视防御汇总值

上游所需数据：

- 攻击者等级
- 敌人基础防御
- 防御加成
- 减防 / 无视防御
- 穿透率
- 穿透值

### `calcResistanceMultiplier(params)`

公式：

```text
抗性区 = 1 - 受击方抗性 + 抗性降低 + 无视抗性
```

Clamp：

- `[0, 2]`

上游所需数据：

- 敌方属性抗性
- 减抗
- 无视抗性

### `calcVulnerabilityMultiplier(params)`

公式：

```text
减易伤区 = 1 + 易伤 - 减伤
```

Clamp：

- `[0.2, 2]`

上游所需数据：

- 易伤总和
- 减伤总和

### `calcDazeVulnerabilityMultiplier(params)`

公式：

- 失衡时：`1 + stunVulnerability`
- 未失衡时：`1 + nonStunVulnerability`

Clamp：

- 失衡时 `[0.2, 5]`
- 未失衡时 `[1, 3]`

上游所需数据：

- 当前是否失衡
- 失衡易伤倍率
- 未失衡时失衡易伤倍率

### `calcSheerBonusMultiplier(sum)`

公式：

```text
贯穿增伤区 = 1 + 贯穿增伤
```

Clamp：

- `[0.2, 9]`

上游所需数据：

- 所有贯穿增伤效果汇总后的总和

## Display Helpers 规格

### `ceilDisplayDamage(value)`

规则：

- 单段伤害按游戏展示向上取整

### `sumDisplayedSegments(values)`

规则：

- 先对每段伤害分别 `ceil`
- 再求和

说明：

- 本模块不推导分段倍率
- 若调用方已知每段 raw damage，可传入本 helper 获得显示总伤

## 测试要求

- 因子测试：每个 helper 单独断言
- 核心测试：`calcResolvedNormalDamage` 与 `calcResolvedSheerDamage`
- 展示测试：单段取整与多段显示求和
- 关键样例至少覆盖：
  - 60 级攻击者打 60+ 首领默认防御区
  - 秽盾 `+80% defense`
  - 穿透率、减防、穿透值
  - 弱点/抗性属性
  - 失衡与未失衡两套失衡易伤
  - `sheer` 跳过防御区
  - `sumDisplayedSegments([114.01, 114.01]) = 230`
