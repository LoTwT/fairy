# 静态构筑解析系统 V1 范围

本文档冻结 `Static Build Resolver` 的第一版实现范围，避免在编码过程中继续漂移。

## 1. V1 目标

V1 只做一件事：

- 把「代理人 + 音擎 + 驱动盘 + 最终面板 + 静态场景」解析成可直接输入伤害计算器的结构化参数

V1 不是：

- 战斗模拟器
- 循环模拟器
- 覆盖率模拟器
- 全角色全音擎全驱动盘的结构化效果数据库

## 2. V1 范围

### 2.1 输入模式

V1 只支持 `finalPanel`，不支持 `derivedPanel`。

### 2.2 伤害类型

V1 只支持：

- `normal`
- `sheer`

不支持：

- `anomaly`
- `disorder`

### 2.3 计算模式

V1 支持：

- `baseline`
- `full-buff`
- `manual`

其中：

- `baseline` 作为默认模式
- `manual` 允许在 `baseline` 或 `full-buff` 上做覆盖

### 2.4 支持的代理人

V1 只支持以下 3 名代理人：

| 代理人 | id     | 定位 | 默认属性    | 默认伤害类型 | 设计目的               |
| ------ | ------ | ---- | ----------- | ------------ | ---------------------- |
| 朱鸢   | `1241` | 强攻 | `Ether`     | `normal`     | 标准公式角色           |
| 伊芙琳 | `1321` | 强攻 | `Fire`      | `normal`     | 条件效果与阈值触发角色 |
| 仪玄   | `1371` | 命破 | `Auric Ink` | `sheer`      | 热插拔 profile 角色    |

### 2.5 支持的音擎

V1 只支持以下 3 把音擎：

| 音擎      | id      | 对应代理人 |
| --------- | ------- | ---------- |
| 防暴者Ⅵ型 | `14124` | 朱鸢       |
| 心弦夜响  | `14132` | 伊芙琳     |
| 青溟笼舍  | `14137` | 仪玄       |

### 2.6 支持的驱动盘

V1 只支持以下 3 套驱动盘：

| 驱动盘     | id      | 支持件数 |
| ---------- | ------- | -------- |
| 啄木鸟电音 | `31000` | 2 / 4    |
| 河豚电音   | `31100` | 2 / 4    |
| 云岿如我   | `33100` | 2 / 4    |

## 3. V1 输入 Contract

### 3.1 `loadout`

最小字段：

- `agentId`
- `wEngineId`
- `driveDiscSets`
  - `id`
  - `pieces`
- `coreSkillLevel`
- `wEngineRefinement`

说明：

- `driveDiscSets` 采用 `{ id, pieces }[]`
- `pieces=4` 表示同时视为拥有 2 件套和 4 件套效果

### 3.2 `finalPanel`

V1 的最终面板支持以下字段：

- `attack`
- `baseAttack`
- `critRate`
- `critDamage`
- `hp`
- `sheerForce`
- `penetrationRate`
- `penetrationValue`

约定：

- `attack` 是当前用于结算的总攻击力
- `baseAttack` 仅在需要结算「战斗中额外攻击力%」时使用
- 若缺少 `baseAttack`，V1 不会强行估算这类效果，而是标记为未支持
- `sheerForce` 优先用于命破 profile；若缺失，仪玄可退化为用 `hp × 0.1` 推导

### 3.3 `scenario`

最小字段：

- `damageType`
- `skillTag`
- `skillMultiplier`
- `attribute`
- `extraAbilityActive`
- `combatTags`
- `enemy`
  - `attackerLevel`
  - `defenderBaseDefense`
  - `defenderResistance`
  - `defenseBonus`
  - `defenseReduction`
  - `resistanceReduction`
  - `ignoreResistance`
  - `vulnerabilityBonus`
  - `damageReduction`
  - `isStunned`
  - `stunVulnerability`
  - `nonStunVulnerability`
  - `specialMultiplier`

V1 采用 `skillTag` 而不是完整技能 ID，支持：

- `basic`
- `dash`
- `enhancedSpecial`
- `chain`
- `ultimate`

### 3.4 `effectOverrides`

V1 支持按 `effectId` 覆盖：

- `enabled`
- `stacks`

## 4. V1 输出 Contract

V1 输出至少包含：

- `profile`
- `loadout`
- `resolvedPanel`
- `resolvedBuckets`
- `damageParams`
- `damage`
  - `expected`
  - `crit`
  - `noCrit`
- `trace`
- `assumptions`
- `unsupportedEffects`

## 5. V1 Effect 范围

### 5.1 已支持的 bucket

V1 只支持下列结构化 bucket：

- `attackPercent`
- `flatAttack`
- `bonusDamageSum`
- `critRate`
- `critDamage`
- `penetrationRate`
- `penetrationValue`
- `resistanceReduction`
- `ignoreResistance`
- `vulnerabilityBonus`
- `damageReduction`
- `stunVulnerability`
- `nonStunVulnerability`
- `sheerBonusSum`
- `skillMultiplierFactor`

### 5.2 不支持的内容

V1 明确不做：

- 自动解析所有角色文本
- 面板自动推导
- 动态覆盖率推演
- 时间轴触发
- 能量、控制、回复等非伤害机制

## 6. V1 Profile 范围

V1 只实现两个 profile：

### 6.1 `standard-normal`

适用：

- 朱鸢
- 伊芙琳

规则：

- 使用 `finalPanel.attack` 作为基础乘区的主数值
- 按标准 `normal` 管线结算

### 6.2 `yixuan-sheer`

适用：

- 仪玄

规则：

- 只支持 `sheer`
- 使用 `finalPanel.sheerForce` 作为主数值
- 若未提供 `sheerForce`，退化为使用 `finalPanel.hp × 0.1`
- 按 `sheer` 管线结算

## 7. V1 默认策略

### 7.1 `baseline`

- 常驻效果默认生效
- 需要明确场景标签的效果，仅在场景满足时生效
- 不自动假设所有层数叠满

### 7.2 `full-buff`

- 允许生效的层数型效果按定义的满层或高值结算
- 仍需满足场景约束
- 不强行开启 `alreadyInPanel` 效果

### 7.3 `manual`

- 先基于 `baseline` 或 `full-buff`
- 再按 `effectOverrides` 覆盖

## 8. V1 验收标准

V1 完成后必须满足：

1. `zzz-data` 能独立解析 3 名支持代理人的静态构筑并输出 `damageParams`
2. `仪玄` 能通过 profile 走 `sheer` 管线，不复用标准 `normal` 公式
3. `zzz-agent` 能通过高层 tool 调用 resolver，而不必重新人工抽取乘区
4. 每次计算都能给出 effect trace 与 assumptions
5. 缺少关键输入时，系统优先显式标记 `unsupportedEffects`，而不是静默猜测
