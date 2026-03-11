# 静态构筑解析系统 V2 范围

本文档冻结 `Static Build Resolver` 的第二版实现范围，避免在编码过程中继续漂移。

## 1. V2 目标

V2 做两件事：

- 把「代理人 + 音擎 + 驱动盘 + 最终面板 + 静态场景」解析成可直接输入伤害计算器的结构化参数
- 在同一套构筑与上下文下，按预定义模板批量生成支持代理人的全技能 / 全段伤害矩阵

V2 不是：

- 战斗模拟器
- 循环模拟器
- 覆盖率模拟器
- 全角色全音擎全驱动盘的结构化效果数据库

## 2. V2 范围

### 2.1 输入模式

V2 只支持 `finalPanel`，不支持 `derivedPanel`。

### 2.2 伤害类型

V2 只支持：

- `normal`
- `sheer`

不支持：

- `anomaly`
- `disorder`

### 2.3 计算模式

V2 支持：

- `baseline`
- `full-buff`
- `manual`

其中：

- `baseline` 作为默认模式
- `manual` 允许在 `baseline` 或 `full-buff` 上做覆盖

### 2.4 支持的代理人

V2 当前支持以下 6 名代理人：

| 代理人   | id     | 定位 | 默认属性    | 默认伤害类型 | 设计目的                    |
| -------- | ------ | ---- | ----------- | ------------ | --------------------------- |
| 「11号」 | `1041` | 强攻 | `Fire`      | `normal`     | 火力镇压 + 攻击叠层样本     |
| 艾莲     | `1191` | 强攻 | `Ice`       | `normal`     | 冰伤 / 冲刺 / 急冻标签样本  |
| 悠真     | `1201` | 强攻 | `Electric`  | `normal`     | dash crit / 栈层暴伤样本    |
| 朱鸢     | `1241` | 强攻 | `Ether`     | `normal`     | 标准公式角色                |
| 伊芙琳   | `1321` | 强攻 | `Fire`      | `normal`     | 条件效果与阈值触发角色      |
| 仪玄     | `1371` | 命破 | `Auric Ink` | `sheer`      | 热插拔 profile / sheer 角色 |

### 2.5 支持的音擎

V2 当前支持以下 6 把音擎：

| 音擎      | id      | 对应代理人 |
| --------- | ------- | ---------- |
| 硫磺石    | `14104` | 「11号」   |
| 深海访客  | `14119` | 艾莲       |
| 残心青囊  | `14120` | 悠真       |
| 防暴者Ⅵ型 | `14124` | 朱鸢       |
| 心弦夜响  | `14132` | 伊芙琳     |
| 青溟笼舍  | `14137` | 仪玄       |

### 2.6 支持的驱动盘

V2 当前支持以下 6 套驱动盘：

| 驱动盘     | id      | 支持件数 |
| ---------- | ------- | -------- |
| 炎狱重金属 | `32200` | 2 / 4    |
| 雷暴重金属 | `32400` | 2 / 4    |
| 极地重金属 | `32500` | 2 / 4    |
| 啄木鸟电音 | `31000` | 2 / 4    |
| 河豚电音   | `31100` | 2 / 4    |
| 云岿如我   | `33100` | 2 / 4    |

### 2.7 技能矩阵支持

V2 已支持一层批量技能矩阵 builder：

- 接口：`resolveStaticBuildSkillMatrix`
- 输出：`rows[]`，每行包含 `group`、`label`、`metadata`、`skillTag`、`skillMultiplier` 与单次 `build` 结果
- 覆盖范围：当前 6 名支持代理人的手工模板
- 当前技能标签与倍率提取来源：`data/zh-CN/agent-details.json`，因此矩阵行名默认返回中文标签

`metadata` 用于给 UI、Agent 和上层消费方提供更稳定的结构化维度，当前包含：

- `order`：矩阵内稳定顺序
- `actionName`：原始动作前缀，如 `普通攻击`、`强化特殊技`、`终结技`
- `skillName`：主技能名，如 `请勿抵抗`、`月辉丝`、`霜锋`
- `qualifiers`：剩余限定词，如 `以太`、`I型`、`缠绕`
- `entryType`：`hit` / `total` / `extra` / `variant` / `size-variant`
- `segmentLabel` / `segmentIndex`：段数信息，如 `三段` / `3`
- `targetSize`：仅对 `霜锋` 这类体型分支返回 `small` / `medium` / `large`

约定：

- 单场景精确计算继续使用 `resolveStaticBuildDamage`
- 全技能 / 全段 / 完整伤害表使用 `resolveStaticBuildSkillMatrix`
- 技能矩阵内部仍逐行复用单场景 resolver，不维护第二套公式

## 3. V2 输入 Contract

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

V2 的最终面板支持以下字段：

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
- 若缺少 `baseAttack`，V2 不会强行估算这类效果，而是标记为未支持
- `sheerForce` 优先用于命破 profile；若缺失，仪玄可退化为用 `hp × 0.1` 推导

### 3.3 `scenario`（单场景 resolver）

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

V2 的单场景 resolver 采用 `skillTag` 而不是完整技能 ID，支持：

- `basic`
- `dash`
- `special`
- `enhancedSpecial`
- `chain`
- `ultimate`
- `assist`

约定：

- V2 的一次计算只对应一个显式给定的静态场景
- `skillMultiplier` 只表示当前这一次结算要计算的那一段/那一次命中

### 3.4 `context`（技能矩阵 builder）

`resolveStaticBuildSkillMatrix` 不直接接收单条 `scenario`，而是接收共享上下文：

- `attribute`
- `extraAbilityActive`
- `combatTags`
- `enemy`

矩阵中的每一行技能模板会补上自己的：

- `damageType`
- `skillTag`
- `skillMultiplier`
- 可选属性覆盖
- 可选战斗标签

### 3.5 `effectOverrides`

V2 支持按 `effectId` 覆盖：

- `enabled`
- `stacks`

## 4. V2 输出 Contract

V2 输出至少包含：

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

技能矩阵 builder 额外输出：

- `rows`
  - `id`
  - `group`
  - `label`
  - `skillTag`
  - `damageType`
  - `attribute`
  - `skillMultiplier`
  - `build`

## 4.1 实际调用示例

### 示例 1：单技能 / 单场景 resolver

适用：

- 用户已经给出主 C 构筑、最终面板、单个技能倍率和敌人参数
- 目标是一次只算一个技能 / 一段命中

`zzz-agent` tool 层输入示例：

```json
{
  "agent": "朱鸢",
  "wEngine": "防暴者Ⅵ型",
  "driveDiscs": [{ "name": "啄木鸟电音", "pieces": 4 }],
  "coreSkillLevel": 7,
  "wEngineRefinement": 1,
  "mode": "baseline",
  "finalPanel": {
    "attack": 3200,
    "baseAttack": 1200,
    "critRate": 0.55,
    "critDamage": 1.4
  },
  "scenario": {
    "damageType": "normal",
    "skillTag": "basic",
    "skillMultiplier": "350%",
    "attribute": "以太",
    "combatTags": ["suppressionMode"],
    "enemy": {
      "defenderBaseDefense": 953,
      "defenderResistance": 0.2
    }
  }
}
```

预期：

- 返回 `found=true`
- 结果位于 `build`
- 由上层自行决定如何展示单次 `damage`、`resolvedBuckets` 与 `trace`

### 示例 2：全技能 / 全段矩阵

适用：

- 用户明确要求“完整伤害表”“全技能”“所有段数”
- 目标是批量输出支持代理人的技能矩阵

`zzz-agent` tool 层输入示例：

```json
{
  "agent": "仪玄",
  "wEngine": "青溟笼舍",
  "driveDiscs": [{ "name": "云岿如我", "pieces": 4 }],
  "coreSkillLevel": 7,
  "wEngineRefinement": 1,
  "mode": "full-buff",
  "finalPanel": {
    "attack": 2500,
    "critRate": 0.4,
    "critDamage": 1.2,
    "hp": 18000
  },
  "context": {
    "extraAbilityActive": true,
    "enemy": {
      "defenderBaseDefense": 953,
      "defenderResistance": 0.2,
      "isStunned": true
    }
  }
}
```

预期：

- 返回 `found=true`
- 结果位于 `matrix`
- 顶层优先消费：
  - `matrix.summary`
  - `matrix.effectSummary`
  - `matrix.rows[*].damage`
- 如需完整逐行调试信息，才显式传 `includeDetails=true`

### 示例 3：unsupported probe

适用：

- 用户只是想知道当前 resolver 是否支持某个代理人
- 或者用户点名要求矩阵，但该代理人不在当前支持范围内

`zzz-agent` tool 层输入示例：

```json
{
  "agent": "安比",
  "finalPanel": {
    "attack": 2000,
    "critRate": 0.5,
    "critDamage": 1
  },
  "context": {
    "enemy": {
      "defenderBaseDefense": 953,
      "defenderResistance": 0.2
    }
  }
}
```

预期：

- 返回 `found=false`
- 返回 `message`
- 返回 `supportedAgents`
- 可选返回 `candidates`

上层约定：

- 先原样提示当前不支持范围
- 不要自动回退到旧路径
- 只有用户明确接受“按旧路径继续估算”时，才再走 `lookup + calcDamage`

## 5. V2 Effect 范围

### 5.1 已支持的 bucket

V2 只支持下列结构化 bucket：

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

V2 明确不做：

- 自动解析所有角色文本
- 面板自动推导
- 为任意代理人自动生成全技能 / 全段矩阵
- 动态覆盖率推演
- 时间轴触发
- 能量、控制、回复等非伤害机制

## 6. V2 Profile 范围

V2 继续只实现两个 profile：

### 6.1 `standard-normal`

适用：

- 「11号」
- 艾莲
- 悠真
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

## 7. V2 默认策略

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

## 8. V2 验收标准

V2 完成后必须满足：

1. `zzz-data` 能独立解析当前 6 名支持代理人的静态构筑并输出 `damageParams`
2. `仪玄` 能通过 profile 走 `sheer` 管线，不复用标准 `normal` 公式
3. `zzz-data` 能为当前 6 名支持代理人批量输出全技能 / 全段矩阵，并逐行复用单场景 resolver
4. `zzz-agent` 能通过高层 tool 调用单场景 resolver 与技能矩阵 builder，而不必重新人工抽取乘区
5. 每次计算都能给出 effect trace 与 assumptions
6. 缺少关键输入时，系统优先显式标记 `unsupportedEffects`，而不是静默猜测
