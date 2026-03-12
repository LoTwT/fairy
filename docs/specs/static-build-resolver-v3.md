# 静态构筑解析系统 V3 范围

本文档冻结 `Static Build Resolver` 的第三版实现范围，目标是把：

- `anomaly`
- `disorder`

接入同一套静态构筑解析系统，但不把范围一次性扩成“全 specialty 全矩阵 全团队模拟”。

## 当前状态

- `V3.1 anomaly` 已实现到单次 `resolveStaticBuildDamage`
- `V3.2 disorder` 已实现到单次 `resolveStaticBuildDamage`
- `V3.3 curated effect coverage` 已开始补 anomaly / disorder 的直接效果定义
- `resolveStaticBuildSkillMatrix` 仍只支持 `normal / sheer`

## 1. V3 目标

V3 只做一条主线：

- 把异常 / 紊乱伤害接入 `resolveStaticBuildDamage`

V3 不做：

- 动态异常积蓄模拟
- 团队多角色加权虚拟代理人模拟
- 异常 / 紊乱技能矩阵
- 全 specialty 扩展

V3 的阶段顺序固定为：

1. `V3.1 anomaly`
2. `V3.2 disorder`

两者共享同一套 contract 设计，但实现顺序必须先 `anomaly` 再 `disorder`。

## 2. V3 范围

### 2.1 输入模式

V3 继续只支持 `finalPanel`，不支持 `derivedPanel`。

### 2.2 伤害类型

V3 新增支持：

- `anomaly`
- `disorder`

约定：

- `resolveStaticBuildDamage` 将扩展为支持四种伤害类型：`normal` / `sheer` / `anomaly` / `disorder`
- `resolveStaticBuildSkillMatrix` 在 V3 仍只覆盖 `normal` / `sheer`
- 异常 / 紊乱的“技能矩阵”在 V3 明确 out-of-scope

### 2.3 计算模式

V3 延续 V2 的三种模式：

- `baseline`
- `full-buff`
- `manual`

默认仍为 `baseline`。

### 2.4 支持对象

V3 主线只扩到**异常代理人**及其兼容音擎，不扩到支援 / 防护 / 击破。

当前发布数据中的异常代理人共 `9` 名：

- `爱芮` `1501`
- `爱丽丝` `1401`
- `薇薇安` `1331`
- `简` `1261`
- `派派` `1281`
- `柳` `1221`
- `柏妮思` `1171`
- `格莉丝` `1181`
- `雅` `1091`

当前发布数据中的异常音擎共 `15` 把，继续按 `specialty` 做兼容校验。

当前 anomaly / disorder 的直接 curated coverage 已覆盖一批高价值来源：

- 代理人：`格莉丝`、`柳`、`简`、`派派`、`薇薇安`、`爱芮`
- 音擎：`壳中之灵`、`十方锻星`、`飞鸟星梦`、`淬锋钳刺`、`时流贤者`、`灼心摇壶`、`霰落星殿`、`触电唇彩`、`雨林饕客`
- 驱动盘：`自由蓝调 2 件`、`混沌爵士 2/4 件`、`混沌重金属 2 件`

尚未能直接表达的异常掌控换算、剩余持续时间换算、随机增益与独立异常槽机制，继续通过更细的 `assumptions` 处理。

### 2.5 支持的驱动盘

V3 不自动放开所有驱动盘，仍维持 curated 策略。

V3 第一批新增以下异常向驱动盘：

- `自由蓝调` `31300`
- `混沌重金属` `32300`
- `混沌爵士` `31800`

其余驱动盘若缺少异常 / 紊乱相关定义，继续通过 `assumptions` 明示。

## 3. V3 输入 Contract 变化

### 3.1 `loadout`

V3 需要新增：

- `agentLevel`

约定：

- 对 `normal` / `sheer`，`agentLevel` 仍可选
- 对 `anomaly` / `disorder`，若未提供 `agentLevel`，V3 第一版默认按 `60` 处理，并在 `assumptions` 中显式记录

理由：

- 异常 / 紊乱公式需要 `virtualAgentLevel`
- 当前 resolver 不能再把这部分完全塞进 `enemy.attackerLevel`

### 3.2 `finalPanel`

V3 需要新增：

- `anomalyProficiency`
- `anomalyCritRate`
- `anomalyCritDamage`

约定：

- `attack` 继续作为异常 / 紊乱的基础攻击快照
- `anomalyProficiency` 对应计算器中的 `virtualAgentAnomalyProficiency`
- `anomalyCritRate` / `anomalyCritDamage` 只作用于异常 / 紊乱，不影响常规暴击区

### 3.3 `scenario`

V3 需要把 `scenario` 冻结为按 `damageType` 区分的 discriminated union：

- `normal`
- `sheer`
- `anomaly`
- `disorder`

其中：

#### `anomaly`

最小字段：

- `damageType: "anomaly"`
- `attribute`
- `skillTag`
- `damageMultiplier`
- `extraAbilityActive`
- `combatTags`
- `enemy`

约定：

- `damageMultiplier` 直接对应 `calcAnomalyDamage()` 的异常倍率输入
- V3 第一版不负责从积蓄过程反推倍率

#### `disorder`

最小字段：

- `damageType: "disorder"`
- `attribute`
- `skillTag`
- `anomalyType`
- `remainingTime`
- `extraAbilityActive`
- `combatTags`
- `enemy`

约定：

- `anomalyType` 表示被消耗的原异常类型
- `remainingTime` 表示被消耗异常的剩余持续时间
- V3 第一版不模拟团队真实积蓄过程，只消费显式传入的 `anomalyType + remainingTime`

## 4. V3 输出 Contract 变化

### 4.1 `damageParams`

V3 需要把输出 union 扩展为：

- `NormalDamageParams`
- `SheerDamageParams`
- `AnomalyDamageParams`
- `DisorderDamageParams`

### 4.2 `resolvedPanel`

V3 需要新增：

- `agentLevel`
- `anomalyProficiency`
- `anomalyCritRate`
- `anomalyCritDamage`

### 4.3 `resolvedBuckets`

V3 需要新增：

- `anomalyProficiency`
- `anomalyBonusDamageSum`
- `anomalyCritRate`
- `anomalyCritDamage`

约定：

- `damageLevelMultiplier` 不作为 bucket 暴露，它由 `agentLevel` 派生
- 异常 / 紊乱继续复用已有的：
  - `bonusDamageSum`
  - `resistanceReduction`
  - `ignoreResistance`
  - `vulnerabilityBonus`
  - `damageReduction`
  - `stunVulnerability`
  - `nonStunVulnerability`

## 5. Effect Schema 变化

### 5.1 新增 bucket

`StaticBuildBucket` 需要扩展：

- `anomalyProficiency`
- `anomalyBonusDamageSum`
- `anomalyCritRate`
- `anomalyCritDamage`

### 5.2 modifier applicability

V3 需要在 modifier 层新增一层显式适用范围，至少覆盖：

- 是否仅作用于 `anomaly`
- 是否可作用于 `disorder`
- 是否属于“异常通用增伤”还是“特定属性异常增伤”

第一版约定：

- 任何 `anomalyBonusDamageSum` modifier 默认只作用于 `anomaly`
- 若要作用于 `disorder`，必须显式声明

这样可以避免把“单一属性异常增伤”错误地直接套进紊乱。

## 6. Profile / Pipeline 变化

V3 需要新增 profile：

- `standard-anomaly`
- `standard-disorder`

约定：

- 两者的基础伤害主属性均为 `attack`
- `standard-anomaly` 输出 `AnomalyDamageParams`
- `standard-disorder` 输出 `DisorderDamageParams`
- V3 第一版不引入异常 specialty 的专属 profile 特判；先用标准管线打通

## 7. 单代理人快照约束

V3 第一版必须明确一个限制：

- resolver 只支持**单代理人静态快照**

这意味着：

- `virtualAgentAttack = resolvedPanel.attack`
- `virtualAgentLevel = resolvedPanel.agentLevel`
- `virtualAgentAnomalyProficiency = resolvedPanel.anomalyProficiency`

不支持：

- 多代理人按积蓄占比加权后的虚拟代理人
- 邦布积蓄参与
- 溢出积蓄回推

如果用户需要团队级虚拟代理人，这属于后续阶段，不在 V3 第一版内。

## 8. V3 明确不做

V3 第一版明确不做：

- `resolveStaticBuildSkillMatrix` 的异常 / 紊乱矩阵
- 动态异常积蓄与触发时机模拟
- 团队多角色加权虚拟代理人
- 自动从文本推导 `damageMultiplier`
- 自动从战斗流程推导 `remainingTime`

## 9. 验收标准

进入 V3 实现阶段前，至少满足：

1. `scenario` 已冻结为按 `damageType` 区分的 union
2. `finalPanel` / `resolvedPanel` / `resolvedBuckets` 的新增字段已冻结
3. 异常 / 紊乱 bucket 与 modifier applicability 规则已明确
4. 已确认 V3 第一版只做单代理人静态快照，不做团队虚拟代理人
5. 已确认异常 / 紊乱矩阵不在第一版范围内

满足以上条件后，才开始真正改 resolver runtime contract。
