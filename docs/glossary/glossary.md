# 绝区零伤害计算器 · 术语词典 v0.4

作者：@UX  日期：2026-05-05  状态：v0.3.2（批量 errata，lo-user 截图全部收口 + D-11 全套官方化原则层 lock + 双语三档优先级）

## D-11 命名体系（原则层 lock，团队 4/4 一致 + lo-user 批准）

公开 schema / core API / data 字段优先使用 ZZZ 国际服**官方英文**的语义化 camelCase；旧 `breach*` 词根仅在 `sourceAliases` / migration 表中保留映射。**精确字段名**由 S2 第一产出 `naming-policy.md` + `pending-term-resolution-table.md` 锁定。

**词根矩阵（已经 lo-user 截图证实）**：

| 中文 | 官方英文词根 | v0.3.2 公开字段词根（camelCase） |
|---|---|---|
| 命破特性 | Rupture | `rupture`（agentSpecialty enum 值） |
| 贯穿力 / 贯穿伤害 / 贯穿增伤 | Sheer Force / Sheer Damage / Sheer DMG Bonus | `sheerForce` / `sheerDamage` / `sheerDamageBonus(Zone)` |
| 闪能 / 闪能上限 / 自动累积 / 获得效率 | Adrenaline / Max Adrenaline / Automatic Adrenaline Accumulation / Adrenaline Generation Rate | `adrenaline` / `maxAdrenaline` / `automaticAdrenalineAccumulation` / `adrenalineGenerationRate` |
| 异常精通 / 异常掌控 | Anomaly Proficiency / Anomaly Mastery | `anomalyProficiency` / `anomalyMastery`（v0.3.1 已 lock 候选 Y） |
| 能量回复 / 能量获得效率 / 能量上限 | Energy Regen / Energy Generation Rate / Energy Limit | `energyRegen` / `energyGenerationRate` / `maxEnergy` |
| 失衡（值/状态）/ 硬直 | Daze / Hitstun（"硬直"非官方但与 daze 解耦） | `daze*` / `hitstun` |
| 邦布 | Bangboo | `bangboo` |
| 鸣徽 | Resonium | `resonium` |
| 零号空洞 | Lost Void | `lostVoid` |
| 紊乱 | Disorder | `disorder` |
| 畏缩 | Flinch | `flinch` |

**命名规则细化**：
- 官方缩写（PEN / CRIT DMG / DEF / ATK / HP）→ 公开字段展开为可读 camelCase（`penetrationRate` / `critDamage` / `defense` / `attack` / `maxHp`）；缩写仅在 `officialEnglishName` + `sourceAliases` 保留
- 非缩写官方词（Rupture / Sheer / Adrenaline / Anomaly Mastery / Resonium 等）→ 直接采用作为 camelCase 词根
- 避免 `dmg` 缩写，公开字段用 `damage`（`sheerDamageBonus`，不写 `sheerDmgBonus`）
- 旧 `breach*` / `mutation` / `chime` / `bomb` / `staggerHit` / `def` / `critDmg` 等 v0.x 历史 ID 全部进 `sourceAliases`

## 双语 i18n 三档优先级（D-02-rev 收窄到伤害计算器实际用到部分）

🟢 **P0 必填 label.en**（V1 直接展示用到）：
- 9 项基础属性（attack / maxHp / defense / impact / critRate / critDamage / penetrationRate / flatPenetration / sheerForce）+ 异常精通 / 异常掌控
- 全部乘区（damageBonusZone / critZone / defenseZone / resistanceZone / vulnerabilityZone / dazeVulnerabilityZone / sheerDamageBonusZone / specialZone）
- 9 种异常状态（frozen / frostbite / assault / flinch / corruption / shock / burn / disorder + 紊乱）
- 鸣徽 / 影画 / 音擎 / 驱动盘 / 4 件套 / 2 件套 / 鸣徽分类（待截图）/ 潜能激化
- 敌人状态（dazed / corruptedShield / 弱点 / 抗性）
- **常用攻击标签 enum 13 项（lo-user 升级到 P0）**：basic / dash / dodgeCounter / special / exSpecial / ultimate / chain / assistAssault / parrySupportTag / quickAssist / evadeAssist / heavyHit / followUp（与 §11 完全一致）
- **式舆防卫战 + 高频剧变节点效果（lo-user 升级到 P0）**
- 错误文案 21 条 ERR-* 全套（messages.zh.json + messages.en.json）

🟡 **P1 选填**：游戏模式列表（hollowZeroAssault / lostVoid / 拟真战术鏖战 等）；非命破代理人特性详细说明

🔴 **P2 不做双语（仅 zh）**：
- 工具内系统术语（开发者读，无需双语展示）
- 邦布相关详细字段（V1 不做）
- 长尾游戏模式 / 鸣徽分类完整 enum（V1 用户手填，UI 不展示长尾）
- "V1 不计算，仅占位"标记的项
- 零号空洞子模块（Resonium Database / Corruption Research 等仅作为来源标识）

## v0.3.2 vs v0.3.1 主要变更（批量 errata）

1. ✅ **命名体系 D-11 全套官方化**：
   - `breachForce` → `sheerForce`
   - `breachDamage` → `sheerDamage`
   - `breachDamageBonusZone` → `sheerDamageBonusZone`
   - `breachEnergy` → `adrenaline`
   - `breachEnergyRegen` → `automaticAdrenalineAccumulation`
   - `breachEnergyGainEfficiency` → `adrenalineGenerationRate`
   - `energyGainEfficiency` → `energyGenerationRate`
   - 旧 ID 全部进 sourceAliases
2. ✅ **新增字段**：`maxAdrenaline` / `maxEnergy`（之前 v0.3 漏）
3. ✅ **§4.1 attribute enum 拆 6 个独立属性增伤**：`fireDamageBonus` / `iceDamageBonus` / `electricDamageBonus` / `etherDamageBonus` / `physicalDamageBonus` / `sheerDamageBonus`（数据字段层；公式 bucket 是否拆 6 个由 S2 决定）
4. ✅ **§11 13 项攻击标签 enum 全部 P0 双语 label.en**
5. ✅ **§13 鸣徽来源更正**：原"鏖战 / 危局强袭战"错误，改为 **零号空洞 (Lost Void)** + 鸣徽分类 enum 占位（[Critical] / [强袭] / [决斗] / [诡术] / [引燃] / [能量] / [黄铜镇纸] 等，待 lo-user 后续可选补图，不阻塞）
6. ✅ **§15 游戏模式新增 `lostVoid`（零号空洞）**；式舆防卫战升级到 P0；旧 `event` → `limitedEvent`（避免与 damage event 冲突）
7. ✅ **畏缩 `flinch` 锁定**（lo-user 简核心技截图证实）
8. ✅ **顶部新增 D-11 词根矩阵 + 双语三档优先级声明**
9. ✅ **sourceAliases 系统化扩充**

**仍 pending（不阻塞 V1，等数据爬虫接入英文资源时批量补）**：
- 鸣徽分类 enum 完整中英对照（lo-user 暂未截图，UX 用攻略中提到的 7 个分类先占位）
- 式舆防卫战官方英文（候选 `defenseGameMode` 暂占位）
- 拟真战术鏖战 / 鏖战高塔 / 调查员培训课 等 P1 游戏模式官方英文
- 长尾术语（部位破坏机制 / 打断系统 / 秽息系统 部分细节）官方英文

---

---

## v0.3 vs v0.2 主要差异（保留作历史记录）

1. **TechLead 5 项 v0.3 待办全部落地**：
   - `anomalyProficiencyZone` / `anomalyMasteryZone` 跟随 §1 标 ⚠️ pending
   - 版本字段族扩为 4 维：`gameVersion`（游戏大版本）/ `sourceVersion`（爬虫快照原始来源）/ `ruleSetVersion`（公式规则版本）/ `dataVersion`（data 包版本）
   - `defenseReduction`（百分比聚合）vs `defenseIgnore`（boolean 完全跳过防御链路）拆清
   - `sourceAliases` 列系统化补齐（v0.1 旧 ID + 社区常见写法）
   - §15 `event` → `limitedEvent`，避免与计算事件 / damage event 冲突
2. **i18n 双轨化（lo-user 决策 D-02-rev）**：locale code lock 为 **`zh` / `en`**（不带 region subtag）；资源文件 `messages.zh.json` / `messages.en.json`；CLI flag `--lang en|zh`，默认 `zh`
3. **JSON schema 字段名 / enum 值永远英文**，与 `--lang` 无关；`--lang` 仅影响错误消息 / 解释 / AI plugin 输出文本（TL 边界限定）

> 项目唯一权威术语对照表，作为 `@randomplay/data` schema、`@randomplay/core` API、`@randomplay/cli` 输出、AI plugin prompt 模板、UX 错误文案、QA 黄金集断言**共同基线**。
>
> **命名规则**：英文 ID 优先采用 **ZZZ 国际服官方命名**；遇官方未明的，使用语义化 camelCase 作为内部 key 并在 `officialEnglishName` 标 `pending`。
>
> 所有 ⚠️ 标记的"易混淆术语对"必须在工具中显式区分，不允许混用。

## 字段说明（v0.3 加 i18n label 列）
- **中文权威名**：玩家社区与攻略中固定用法；`label.zh` 默认显示文本来源；权威定义不变
- **`label.zh`**：默认中文展示文本（≈ 中文权威名，部分会有 UI 简化版）
- **`label.en`**：英文展示文本；`pending` 项暂用占位，等 ZZZ 国际服实测锁定
- **英文 ID**：跨包共用 key；camelCase（字段 / enum 值）或 PascalCase（类型名）
- **`idKind`**：`fieldId` / `enumValue` / `typeName` / `handlerId`
- **`officialEnglishName`**：ZZZ 国际服官方英文（已确认）/ `pending`（待确认）
- **`sourceAliases`**：其他常见英文写法（用于 data 匹配 / 爬虫别名 / AI prompt 别名 / migration），含 v0.1 旧 ID
- **类别**：15 类
- **定义**：1~2 句精简语义
- **适用层**：`data` / `snapshot` / `modifier` / `event` / `core-internal` / `多层`
- **来源**：攻略章节锚点（PART X.Y）
- **易混淆**：必须显式区分的近义术语

> **JSON 与 UI 边界**：JSON 字段名 / enum 值永远使用**英文 ID**（与 `--lang` 无关，是工程契约）；UI 展示文本根据 `--lang` 取 `label.zh` / `label.en`。

## v0.2 命名变更摘要（vs v0.1）

| v0.1 | v0.2 | 理由 |
|---|---|---|
| 异常精通 / 异常掌控 英文 ID | **暂保留 v0.1 命名（候选 X）+ 标 ⚠️ `pending official verification`** | Product / TL / UX 反复几轮后回到"基于证据收口而非凭记忆"；候选 X = `anomalyProficiency=精通(伤害)` / `anomalyMastery=掌控(积蓄)`；候选 Y = 反向。等 ZZZ 国际服客户端实测锁定 |
| `bomb` | **`bangboo`** | ZZZ 官方英文 Bangboo（TL/Product/QA 一致，已 lock） |
| `chime` | **`combatBuffToken`**（pending official English） | Product 撤回 `resonia`/`resonium`；等 ZZZ 国际服客户端文本确认后再锁 |
| `weaponEngine` | **`wEngine`** | ZZZ 官方简写 W-Engine |
| `drive` | **`driveDisc`** | ZZZ 官方 Drive Disc |
| `breachAttribute` | 合并到 `agentSpecialty: "rupture"` | ZZZ 官方特性 Rupture；不再独立 |
| `breach`（贯穿力） | **`sheerForce`** | 避免与 enum 值同名 |
| `staggerHit`（硬直） | **`hitstun`** | 解决 stagger 同时表"失衡 + 硬直" |
| `def` / `critDmg` / `penRate` / `penFlat` / `hpMax` | `defense` / `critDamage` / `penetrationRate` / `flatPenetration` / `maxHp` | 公开 schema 字段不缩写 |
| `mutation`（紊乱） | **`disorder`** | ZZZ 官方 Disorder |
| `polarityMutation` | **`polarityDisorder`** | 与 disorder 一致 |
| 原 `anomalyState`（敌人） | **`anomalyStatus`** | 与 `attribute` enum 拆开 |
| 原 §4 烈霜 / 玄墨混入异常状态 | **拆出 `attribute` enum** | QA P1 |

**已 lock 命名**：
- 失衡 → `daze*`（Product 决策 A1 与 ZZZ 国际服 "Daze" 对齐）
  - `dazeValue` / `dazeRatio` / `dazeCap` / `dazeResistance` / `dazeRecoveryRate` / `dazed` / `dazeVulnerabilityZone` / `dazeLevelZone`
- 硬直 → `hitstun`（替代 v0.1 `staggerHit`，与 daze 解耦）
- 邦布 → `bangboo`
- 紊乱 → `disorder`，极性紊乱 → `polarityDisorder`
- 命破特性合并到 `agentSpecialty: "rupture"`
- 贯穿力 → `sheerForce`
- 缩写全展开：`def → defense` / `critDmg → critDamage` / `penRate → penetrationRate` / `penFlat → flatPenetration` / `hpMax → maxHp`

**`pending official verification`**（v0.2 暂用候选，等 ZZZ 国际服客户端 / HoYoLAB 英文资料实测后锁定）：
- ⚠️ **异常精通 / 异常掌控 英文 ID**：候选 X = `anomalyProficiency=精通(伤害)` / `anomalyMastery=掌控(积蓄)`（v0.1 命名）；候选 Y = 反向。**v0.2 暂用候选 X**。中文权威名固定不变；锁定时只动英文 ID。
- ⚠️ 鸣徽 → `combatBuffToken`（候选 `Resonia` / `Resonium`，待 ZZZ 国际服客户端验证）
- ⚠️ 闪能 → `adrenaline`（候选 `sheerEnergy` / `decibel`，待 ZZZ 国际服客户端验证）
- ⚠️ 畏缩 → `flinch`（标准游戏术语 Flinch，待 ZZZ 国际服客户端二次确认）
- ⚠️ 音擎字段名 `wEngine` 或 `weaponEngine`：S2 schema discovery 时由 TechLead 锁
- ⚠️ 驱动盘字段名 `driveDisc` 或 `drive`：S2 schema discovery 时由 TechLead 锁

---

## 目录

1. [基础属性](#1-基础属性)（11）
2. [伤害乘区](#2-伤害乘区)（10）
3. [失衡系统](#3-失衡系统)（10）
4. [属性 / 异常状态](#4-属性--异常状态)（拆为属性 7 + 异常状态 9 = 16）
5. [属性异常机制 / 紊乱](#5-属性异常机制--紊乱)（17，新增虚拟代理人 5）
6. [命破 / 贯穿伤害](#6-命破--贯穿伤害)（5）
7. [秽息系统](#7-秽息系统)（10）
8. [部位破坏 / 真实伤害](#8-部位破坏--真实伤害)（7）
9. [打断系统](#9-打断系统)（10）
10. [能量 / 闪能 / 喧响](#10-能量--闪能--喧响)（11）
11. [攻击标签](#11-攻击标签)（13）
12. [敌人类型与状态](#12-敌人类型与状态)（12）
13. [角色加强系统](#13-角色加强系统)（18，新增 agentSpecialty / agentFaction / agentAttribute / coreSkill / additionalAbility）
14. [工具内系统术语](#14-工具内系统术语)（24，新增取整 / 防御链路 / 版本族 / fixture）
15. [游戏模式 / 活动](#15-游戏模式--活动)（7，新增类）

合计 **约 181 条 / 15 类**（v0.1 = 149 条 / 14 类）。

---

## 1. 基础属性

| 中文权威名 | 英文 ID | idKind | 官方英文 | 别名 | 定义 | 适用层 | 来源 | 易混淆 |
|---|---|---|---|---|---|---|---|---|
| 攻击力 | `attack` | fieldId | Attack | atk | 进攻方进攻属性 | snapshot.panel | 1.1 | 与"冲击力"区分 |
| 生命值上限 | `maxHp` | fieldId | Max HP | hpMax | 进攻方/防御方生命池上限 | snapshot.panel / enemy | 1.1 | 与"当前生命值"区分 |
| 防御力 | `defense` | fieldId | DEF | def | 防御区核心属性 | snapshot.panel / enemy | 1.4 | 与"防御区"区分 |
| 暴击率 | `critRate` | fieldId | CRIT Rate | — | 触发暴击的概率 | snapshot.panel | 1.3 | JSON 用小数 [0,1]，UI 用百分比 |
| 暴击伤害 | `critDamage` | fieldId | CRIT DMG | critDmg | 暴击额外倍率 | snapshot.panel | 1.3 | 与"异常暴击伤害"区分 |
| 穿透率 | `penetrationRate` | fieldId | PEN Ratio | penRate | 按比例穿透防御 | snapshot.panel | 1.4 | 与"穿透值"乘算关系 |
| 穿透值 | `flatPenetration` | fieldId | PEN | penFlat | 固定值穿透防御 | snapshot.panel | 1.4 | 与"穿透率"加算 |
| ⚠️ 异常精通 | `anomalyProficiency` | fieldId | Anomaly Proficiency | — | 影响**异常伤害**基础值（向下取整后参与） | snapshot.panel | 3.2.1 / 3.3.1 | ⚠️ "精通=伤害；掌控=积蓄"中文权威，已基于 ZZZ 国际服截图锁定（候选 Y） |
| ⚠️ 异常掌控 | `anomalyMastery` | fieldId | Anomaly Mastery | — | 影响异常**积蓄** | snapshot.panel | 3.2.1 | ⚠️ 同上 |
| 冲击力 | `impact` | fieldId | Impact | — | 计算失衡值的基础属性 | snapshot.panel | 2.1.2 | ⚠️ 与"攻击力"严格区分 |
| 贯穿力 | `sheerForce` | fieldId | Sheer Force | breach | 命破特性派生属性；攻击力 + 生命上限按角色独立系数 | snapshot.panel.derived | 1.1 / 1.4 | 仅命破角色 |

> **✅ 异常精通 / 异常掌控 英文 ID 已锁定（候选 Y）**：基于 @lo-user ZZZ 国际服客户端截图 + 直接确认。中文权威定义固定不变（精通=伤害，掌控=积蓄）。schema 字段可放心使用 `anomalyProficiency` / `anomalyMastery`。

---

## 2. 伤害乘区

| 中文权威名 | 英文 ID | idKind | 官方英文 | 定义 | 适用层 | 来源 | 范围 | 易混淆 |
|---|---|---|---|---|---|---|---|---|
| 基础伤害区 | `baseDamageZone` | fieldId | pending | Σ 倍率 × 对应属性 | core-internal | 1.1 | — | 区分常规 / 贯穿基础属性 |
| 增伤区 | `damageBonusZone` | fieldId | pending | 1 + Σ 增伤；属性/技能/攻击类型加算 | modifier (bucket) | 1.2 | [0, 6] | ⚠️ 不含贯穿增伤、异常增伤 |
| 暴击区 | `critZone` | fieldId | pending | 暴击 1+critDmg；非暴击 1 | core-internal | 1.3 | [1, 6] | ⚠️ 与"异常暴击区"区分 |
| 防御区 | `defenseZone` | fieldId | pending | 等级基数 / (有效防御 + 等级基数)；贯穿伤害跳过 | core-internal | 1.4 | (0, 1] | 仅常规伤害走 |
| 抗性区 | `resistanceZone` | fieldId | pending | 1 - 抗性 + 抗性降低 + 无视抗性 | modifier (bucket) | 1.5 | [0, 2] | ⚠️ 三种抗性独立 |
| 减易伤区 | `vulnerabilityZone` | fieldId | pending | 1 + 易伤 - 减伤 | modifier (bucket) | 1.6 | [0.2, 2] | ⚠️ 与"失衡易伤区"严格区分 |
| 失衡易伤区 | `dazeVulnerabilityZone` | fieldId | pending | 失衡时 / 未失衡时分两种倍率 | modifier (bucket) | 1.7 | 失衡 [0.2, 5] / 未失衡 [1, 3] | ⚠️ 仅作用于敌人 |
| 贯穿增伤区 | `sheerDamageBonusZone` | fieldId | pending | 1 + 贯穿增伤；命破贯穿伤害专用 | modifier (bucket) | 1.8 | [0.2, 9] | ⚠️ 与普通增伤区独立 |
| 特殊乘区 | `specialZone` | fieldId | — | 距离衰减区等 | modifier (bucket) | 1.9 | — | — |
| 距离衰减区 | `distanceDecayZone` | fieldId | pending | 远程衰减 | modifier (bucket) | 1.9 | — | 影响伤害 / 失衡值 / 异常积蓄 |

---

## 3. 失衡系统

> **`daze*` 已 lock**（Product 决策 A1，与 ZZZ 国际服 "Daze" 一致）。v0.1 用过的 `stagger*` 仅作为 `sourceAliases` 兜底，不进 schema。

| 中文权威名 | 英文 ID | idKind | 官方英文 | 别名 | 定义 | 适用层 | 来源 | 易混淆 |
|---|---|---|---|---|---|---|---|---|
| 失衡值 | `dazeValue` | fieldId | Daze | stagger | 累积失衡值 | core-internal | 2.1 | — |
| 失衡比例 | `dazeRatio` | fieldId | pending | — | dazeValue / dazeCap × 100%；UI 向下取整 | core-internal | 2.1.1 | 秽盾时锁 99.5% |
| 失衡值上限 | `dazeCap` | fieldId | pending | dazeMax | 触发失衡的阈值 | data.enemy | 2.1.1 | 强化型 1.13~1.5 倍 |
| 失衡抗性 | `dazeResistance` | fieldId | pending | — | 弱点 -20% / 抗性 +20% | data.enemy | 2.1.3 | 与"伤害抗性"独立 |
| 失衡值提升 | `dazeInflictBonus` | fieldId | pending | — | "造成的失衡值提升" | modifier (bucket) | 2.1.4 | [0, 4] |
| 受到失衡值提升 | `dazeReceiveBonus` | fieldId | pending | — | "受到的失衡值提升"，含畏缩 7.5% | modifier (bucket) | 2.1.5 | [0, 4] |
| 失衡恢复速度 | `dazeRecoveryRate` | fieldId | pending | — | 决定失衡持续时间（%/s） | data.enemy | 2.3.1 | 8.33%/s ~ 50%/s |
| 失衡恢复时间 | `dazeRecoveryTime` | fieldId | pending | — | 1/dazeRecoveryRate | core-internal | 2.3.1 | "失衡持续时间" 多指此 |
| 临界时间 | `criticalTime` | fieldId | pending | — | 失衡瞬间到恢复开始的延迟 | core-internal | 2.2 | 默认 1s |
| 连携补偿时间 | `chainCompensationTime` | fieldId | pending | — | 失衡期间连携技后延迟（最多 1 层） | core-internal | 2.2 | 默认 1s，不刷新 |

---

## 4. 属性 / 异常状态

> **重要拆分（QA P1）**：v0.1 把"属性"与"异常状态"混在 §4，v0.2 拆成两个独立 enum。

### 4.1 属性 `attribute`

| 中文 | 英文 ID（enumValue） | 官方英文 | 关系 |
|---|---|---|---|
| 火 | `fire` | Fire | — |
| 电 | `electric` | Electric | — |
| 冰 | `ice` | Ice | — |
| 物理 | `physical` | Physical | — |
| 以太 | `ether` | Ether | — |
| 烈霜 | `frost` | Frost | 冰的子属性，抗性 / 增伤按冰结算 |
| 玄墨 | `auricInk` | Auric Ink | 以太的子属性，抗性 / 增伤按以太结算 |

### 4.2 异常状态 `anomalyStatus`

| 中文 | 英文 ID | 官方英文 | 触发属性 | 默认持续 | 关键效果 |
|---|---|---|---|---|---|
| 冻结 | `frozen` | Freeze | 冰 / 烈霜 | 3.5s（受抗性影响） | 暂停行动，期满或重击触发碎冰 |
| 霜寒 | `frostbite` | Frostbite | 冰（10s）/ 烈霜（20s） | — | 暴击伤害 +10% |
| 强击 | `assault` | Assault | 物理 | 即时 | 713% 攻击力物理异常伤害；附畏缩 |
| 畏缩 | `flinch` | Flinch | 物理（强击附带） | 10s | 受到失衡值 +7.5% |
| 侵蚀 | `corruption` | Corruption | 以太 / 玄墨 | 10s | 0.5s 一次 62.5% 攻击力以太/玄墨异常伤害 |
| 感电 | `shock` | Shock | 电 | 10s | ≤1 次/s 125% 攻击力电异常伤害，至多 16 次 |
| 灼烧 | `burn` | Burn | 火 | 10s | 0.5s 一次 50% 攻击力火异常伤害 |
| 紊乱 | `disorder` | Disorder | 任意（覆盖触发） | 即时 | 见 §5 |

> 烈霜 / 玄墨触发的异常状态仍记为 `frozen` / `frostbite` / `corruption`，差异由 `attribute` 字段标识。

---

## 5. 属性异常机制 / 紊乱

| 中文权威名 | 英文 ID | idKind | 官方英文 | 别名 | 定义 | 适用层 | 来源 |
|---|---|---|---|---|---|---|---|
| 异常积蓄值 | `anomalyBuildup` | fieldId | pending | — | 攻击对敌人累积的异常值 | core-internal | 3.2.1 |
| 异常掌控区 | `anomalyMasteryZone` | fieldId | Anomaly Mastery Zone | — | mastery / 100，向下取整后参与异常积蓄 | core-internal | 3.2.1 |
| 异常积蓄效率区 | `anomalyEfficiencyZone` | fieldId | pending | — | 1 + 积蓄效率提升 | modifier (bucket) | 3.2.1 |
| 异常积蓄抗性区 | `anomalyBuildupResistanceZone` | fieldId | pending | — | 1 - 抗性 + 抗性降低 | modifier (bucket) | 3.2.1 |
| 异常精通区 | `anomalyProficiencyZone` | fieldId | Anomaly Proficiency Zone | — | proficiency / 100，参与异常伤害公式 | core-internal | 3.3.1 |
| 伤害等级区 | `damageLevelZone` | fieldId | pending | — | trunc(1+1/59×(level-1), 4) | core-internal | 3.3.2 |
| 异常增伤区 | `anomalyDamageBonusZone` | fieldId | pending | — | 1 + 异常伤害提升 | modifier (bucket) | 3.3.3 |
| 异常暴击区 | `anomalyCritZone` | fieldId | pending | — | 简·杜专属 | core-internal | 3.3.4 |
| 紊乱倍率 | `disorderRatio` | fieldId | pending | — | 各属性独立公式（450%+step·t） | core-internal | 3.4.1 |
| 失衡等级区 | `dazeLevelZone` | fieldId | pending | — | 1 + 0.0075×level（紊乱专用） | core-internal | 3.4.2 |
| 极性紊乱 | `polarityDisorder` | fieldId | pending | polarityMutation | 月城柳触发的特殊紊乱 | event | 3.4.1 |
| 异放 | `release` | fieldId | pending | — | 薇薇安触发的特殊异常伤害 | event | 3.3.5 |

### 虚拟代理人 / 贡献分摊（QA P2 新增）

| 中文权威名 | 英文 ID | 定义 |
|---|---|---|
| 虚拟代理人 | `virtualAgent` | 多代理人参与异常积蓄时按贡献占比加权得到的虚拟快照（等级**向下取整**）；用于异常 / 紊乱伤害计算 |
| 积蓄贡献占比 | `buildupContributionRatio` | 单代理人单次攻击的异常积蓄占总有效积蓄的比例 |
| 溢出积蓄 | `overflowBuildup` | 超过阈值的积蓄部分；不参与虚拟代理人加权 |
| 邦布积蓄排除 | `excludedBangbooBuildup` | 邦布造成的异常积蓄不参与虚拟代理人加权（攻略 3.3.5） |
| 贡献快照 | `contributionSnapshot` | 单次攻击触发积蓄时记录的代理人属性快照（等级 / 攻击力 / 异精 / 冲击力 / 穿透 / 当次增伤区 / 失衡值提升区） |

---

## 6. 命破 / 贯穿伤害

| 中文权威名 | 英文 ID | idKind | 官方英文 | 备注 |
|---|---|---|---|---|
| 命破特性 | 合并到 `agentSpecialty: "rupture"` | enumValue | Rupture | 不再独立 |
| 贯穿伤害 | `sheerDamage` | fieldId | Sheer damage（pending）| 跳过防御区 + 启用贯穿增伤区 |
| 贯穿力 | `sheerForce` | fieldId | Sheer Force | 攻击力×系数1+生命×系数2 |
| 贯穿力转化系数 | `breachConversionCoeffs` | fieldId | pending | 每个命破角色独立 |
| 常规伤害 | `regularDamage` | fieldId | pending | 走防御区的非贯穿伤害 |
| 真实伤害 | `trueDamage` | fieldId | True Damage | ⚠️ 与"贯穿伤害"严格区分；只走基础伤害区 |

---

## 7. 秽息系统

| 中文权威名 | 英文 ID | idKind | 官方英文 | 定义 | 适用层 |
|---|---|---|---|---|---|
| 秽浊流界 | `corruptedDomain` | fieldId | pending | 防御 +80% / 减伤 25% / 抗打断 +2 / 浸染 +30% | snapshot.enemy.state |
| 秽盾 | `corruptedShield` | fieldId | pending | 秽浊流界附带护盾；削减后触发净除 | snapshot.enemy.state |
| 秽盾上限 | `corruptedShieldCap` | fieldId | pending | 标 2200 / 高 3500 / 色雷斯人 4500 | data.enemy |
| 秽盾削减值 | `corruptedShieldReduction` | fieldId | pending | 攻击对秽盾的削减量；查表 | data.skill |
| 秽盾削减效率 | `corruptedShieldReductionEfficiency` | fieldId | pending | 代理人侧 1+提升 | modifier (bucket) |
| 秽盾被削减效率 | `corruptedShieldReceivedEfficiency` | fieldId | pending | 敌人侧 1+提升 | modifier (bucket) |
| 秽盾净除 | `corruptedShieldPurge` | fieldId | pending | 默认 15% / 危局-2.2 前秽息司祭 3% / 之后所有秽盾首领 2.5% | event |
| 秽染 | `defile` | fieldId | pending | 敌人攻击附带，命中累积秽息浸染 | event / data.enemy |
| 秽息浸染 | `defileBuildup` | fieldId | pending | 队伍累积值，达上限触发当前生命值百分比真实伤害 | snapshot.team.state |
| 秽息泽 | `defilePool` | fieldId | pending | 地表特殊物质，强化敌人 / 召唤 / 恢复 | event |

---

## 8. 部位破坏 / 真实伤害

| 中文权威名 | 英文 ID | idKind | 备注 |
|---|---|---|---|
| 部位破坏 | `partBreak` | fieldId | 触发后字样显示的为典型，否则非典型 |
| 典型部位破坏 | `partBreakTypical` | enumValue | 主要在首领敌人 |
| 非典型部位破坏 | `partBreakAtypical` | enumValue | 精英 / 普通敌人 |
| 伤害触发型 | `damageTriggered` | enumValue | 累积伤害削减部位生命值 |
| 非伤害触发型 | `nonDamageTriggered` | enumValue | 紊乱 / 招架 / 特定动作 |
| 部位生命值 | `partHp` | fieldId | 通常最大生命值百分比 |
| 部位破坏真实伤害 | `partBreakTrueDamage` | fieldId | 触发时对本体造成最大生命值百分比真实伤害 |

---

## 9. 打断系统

| 中文权威名 | 英文 ID | idKind | 官方英文 | 备注 |
|---|---|---|---|---|
| 打断等级 | `interruptLevel` | fieldId | pending | 1~6 一般 |
| 抗打断等级 | `interruptResistLevel` | fieldId | pending | 1~9999；进入失衡 -2 |
| 设置抗打断等级 | `setInterruptResist` | handlerId | pending | 直接设值 |
| 调整抗打断等级 | `adjustInterruptResist` | handlerId | pending | ±N |
| 强制抗打断等级 | `forceInterruptResist` | handlerId | pending | 转阶段固定 |
| 破招 | `parryHit` | fieldId | pending | 打断敌人攻击回 10 喧响值 |
| 硬直 | `hitstun` | fieldId | pending | ⚠️ 改名（v0.1 staggerHit 与失衡 stagger 冲突） |
| 招架支援（事件） | `parrySupportEvent` | typeName | pending | 三种类型 |
| 强化招架 | `parryEnhanced` | handlerId | pending | 当次打断等级 +2 |
| 无视招架 | `parryIgnore` | handlerId | pending | 轻 -2 / 重&连续 -4 |

---

## 10. 能量 / 闪能 / 喧响

| 中文权威名 | 英文 ID | idKind | 官方英文 | 备注 |
|---|---|---|---|---|
| 能量 | `energy` | fieldId | Energy | 上限默认 120 |
| 能量上限 | `maxEnergy` | fieldId | Energy Limit | v0.3.2 新增 |
| 能量自动回复 | `energyRegen` | fieldId | Energy Regen | 接战状态下每秒 |
| 能量获得效率 | `energyGenerationRate` | fieldId | Energy Generation Rate | 1 + 效率 |
| 闪能 | `adrenaline` | fieldId | Adrenaline ✅ | 命破代理人专属，替代能量（lo-user 截图证实） |
| 闪能上限 | `maxAdrenaline` | fieldId | Max Adrenaline | v0.3.2 新增 |
| 闪能自动累积 | `automaticAdrenalineAccumulation` | fieldId | Automatic Adrenaline Accumulation | — |
| 闪能获得效率 | `adrenalineGenerationRate` | fieldId | Adrenaline Generation Rate | 1 + 效率 |
| 喧响值 | `resonance` | fieldId | pending | 终结技资源 |
| 喧响等级 | `resonanceTier` | enumValue | pending | 喧 / 特 / 极 |
| 喧响值获得效率 | `resonanceGainEfficiency` | fieldId | pending | 1 + 效率 |
| 喧响值伴随获得效率 | `resonanceCoGainEfficiency` | fieldId | pending | 多数 50%，部分 52.5% |
| 接战状态 | `engagementState` | enumValue | pending | **V1 不计算，仅 enum 占位**（QA E.1） |

---

## 11. 攻击标签

`tags` 字段的 enum 候选值。`idKind: enumValue`。**P0 必填双语**（lo-user 升级到 P0）。

| 中文 | 英文 ID | label.zh | label.en | 官方英文 |
|---|---|---|---|---|
| 普通攻击 | `basic` | 普通攻击 | Basic Attack | Basic Attack |
| 冲刺攻击 | `dash` | 冲刺攻击 | Dash Attack | Dash Attack |
| 闪避反击 | `dodgeCounter` | 闪避反击 | Dodge Counter | Dodge Counter |
| 特殊技 | `special` | 特殊技 | Special Attack | Special Attack |
| 强化特殊技 | `exSpecial` | 强化特殊技 | EX Special Attack | EX Special |
| 终结技 | `ultimate` | 终结技 | Ultimate | Ultimate |
| 连携技 | `chain` | 连携技 | Chain Attack | Chain Attack |
| 支援突击 | `assistAssault` | 支援突击 | Assist Assault ⚠️pending | pending |
| **招架支援（标签）** | `parrySupportTag` | 招架支援 | Defensive Assist ⚠️pending | pending |
| 快速支援 | `quickAssist` | 快速支援 | Quick Assist | Quick Assist |
| 回避支援 | `evadeAssist` | 回避支援 | Evasive Assist ⚠️pending | pending |
| 重击 | `heavyHit` | 重击 | Heavy Attack ⚠️pending | pending |
| 追加攻击 | `followUp` | 追加攻击 | Follow-up Attack ⚠️pending | pending |

> 与 §9 `parrySupportEvent`（事件类型）拆分：§11 `parrySupportTag` 是攻击 tag 枚举值，§9 `parrySupportEvent` 是事件类型名（QA P2 / Product E）。

---

## 12. 敌人类型与状态

| 中文 | 英文 ID | idKind | 备注 |
|---|---|---|---|
| 普通敌人 | `enemyMinion` | enumValue | 1 阶 |
| 精英敌人 | `enemyElite` | enumValue | 2 阶 |
| 首领敌人 | `enemyBoss` | enumValue | 3 阶 |
| 强化型 | `enhanced` | enumValue | 骷髅头标识 |
| 非强化型 | `nonEnhanced` | enumValue | 默认形态 |
| 弱点属性 | `weaknessAttribute` | fieldId | 三抗均 -20% |
| 抗性属性 | `resistAttribute` | fieldId | 三抗均 +20% |
| 失衡 | `dazed` | enumValue | 受伤害被失衡易伤倍率加成 |
| 失衡恢复 | `dazeRecovering` | enumValue | 恢复期 |
| 临界 | `dazeCritical` | enumValue | 失衡瞬间到恢复开始（1s） |
| 异常状态（敌人当前） | `currentAnomalyStatus` | fieldId | enum: anomalyStatus[] |
| 异常触发次数 | `anomalyTriggerCount` | fieldId | 影响积蓄阈值；不重置 |

---

## 13. 角色加强系统（含 v0.2 新增 5 项）

| 中文权威名 | 英文 ID | idKind | 官方英文 | 备注 |
|---|---|---|---|---|
| 代理人 | `agent` | typeName / fieldId | Agent | 1~3 名组队 |
| 邦布 | `bangboo` | typeName / fieldId | Bangboo | V1 不实现，schema 占位 |
| **角色特性** | `agentSpecialty` | enumValue | Specialty | enum：`attack` 强攻 / `stun` 击破 / `anomaly` 异常 / `support` 支援 / `defense` 防护 / `rupture` 命破 |
| **角色阵营** | `agentFaction` | enumValue | Faction | 维多利亚家政 / 邦布社 / 卡利冬家 / 白祇重工 / 防卫军 等 |
| **角色属性** | `agentAttribute` | enumValue | Attribute | enum: §4.1 attribute |
| **核心被动** | `coreSkill` | typeName | Core Skill | 默认被动，不需激活 |
| **额外能力** | `additionalAbility` | typeName | Additional Ability | 队伍条件触发的被动 |
| 影画 | `mindscapeCinema`（v0.4 主名） | fieldId / typeName | Mindscape Cinema | 0~6 命；v0.4 改名为 ZZZ 国际服官方 "Mindscape Cinema"；旧 `mindscape` 进 sourceAliases |
| 影画词条 | `mindscapeCinemaEffect` | fieldId | — | data 派生 typed modifier；v0.4 重命名 |
| 音擎 | `wEngine` | typeName | W-Engine | 含等级 / 精炼 |
| 音擎被动 | `wEnginePassive` | fieldId | W-Engine Passive | data 派生 typed modifier |
| 驱动盘 | `driveDiscs`（snapshot 字段名，plural array） / `DriveDisc`（TS 类型名 singular） | fieldId / typeName | Drive Disc | v0.4 区分：snapshot 字段名 `driveDiscs[]`（plural array）；TS 类型 `DriveDisc`（singular），与 TL-3 PR #5 BattleSnapshot 一致 |
| 驱动盘主词条 | `driveDiscMainStat` | fieldId | Main Stat | slot 受限 |
| 驱动盘副词条 | `driveDiscSubStat` | fieldId | Sub Stat | 每件 4 个 |
| 驱动盘 4 件套 | `driveDiscSet4` | typeName | 4-Piece Set Effect | data 派生 typed modifier |
| 驱动盘 2 件套 | `driveDiscSet2` | typeName | 2-Piece Set Effect | data 派生 typed modifier |
| 鸣徽 | `resonium` | typeName | Resonium | 鏖战 / 拟真战术鏖战 / 调查员培训课等模式的临时增益（**非危局强袭战**，v0.3 描述错误已修订）；@lo-user 确认官方英文 Resonium |
| 潜能激化 | `potentialActivation` | typeName | pending | 玩家系统升级解锁的能力（与核心被动 / 额外能力区分） |

> ⚠️ **核心被动 vs 额外能力 vs 潜能激化 三者区别**：
> - `coreSkill`：默认被动，无条件
> - `additionalAbility`：队伍组成条件触发（攻略 1.7 / 4.3.3 多次出现）
> - `potentialActivation`：玩家在角色系统里升级 / 突破 / 解锁的能力

---

## 14. 工具内系统术语（含 v0.2 大量新增）

### 14.1 schema / 类型

| 中文权威名 | 英文 ID | idKind | 备注 |
|---|---|---|---|
| 战斗瞬间快照 | `BattleSnapshot` | typeName | snapshot.json 顶层 schema |
| 当前出手者 | `activeActor` | fieldId | 触发本次结算者 |
| 攻击段 | `attackSegment` | typeName | 最小独立结算单位 |
| 计算结果 | `CalcResult` | typeName | core 输出结构 |
| 伤害类型 | `damageType` | enumValue | enum: regular / sheer / true / anomaly / disorder（v0.3.2 `breach` → `sheer`） |
| 修正项 | `modifier` | typeName | typed modifier |
| 修正项分类 | `modifierBucket` | enumValue | 各乘区 / 资源 bucket |
| 处理器 | `handler` | typeName | 已注册纯函数 |
| 处理器规范 | `handlerSpec` | typeName | handler 元数据 |
| 作用目标 | `appliesTo` | fieldId | self / team / agent[id] / enemy / global |
| 字段来源 | `fieldProvenance` | fieldId | data / user-override / panel / stats |
| data 覆盖标记 | `overriddenFromData` | fieldId | trace 字段 |
| 警示 | `warnings` | fieldId | JSON 顶层数组 |
| 计算追踪 | `trace` | fieldId | 每个乘区 / modifier 的前后值 |

### 14.2 取整与显示值（QA P1 新增）

| 中文权威名 | 英文 ID | idKind | 备注 |
|---|---|---|---|
| 理论值 | `rawDamage` | fieldId | 不取整的伤害数值 |
| 显示值 | `displayDamage` | fieldId | 游戏内显示的伤害数值（向上取整后） |
| 单段显示值 | `segmentDisplayDamage` | fieldId | 多段攻击单段游戏显示值（每段独立向上取整） |
| 取整模式 | `roundingMode` | enumValue | enum: `ceil` / `floor` / `none` |
| 单段向上取整 | `ceilPerSegment` | enumValue | 多段攻击逐段向上取整后求和（攻略 PART 01 开头） |
| 公式向下取整 | `floorForFormula` | enumValue | 异常掌控 / 虚拟代理人等级 / 失衡比例显示 |

### 14.3 防御链路（v0.3 拆 defenseReduction vs defenseIgnore）

| 中文权威名 | 英文 ID | 类型 | 定义 |
|---|---|---|---|
| 攻击方等级基数 | `levelBase` | fieldId (number) | 攻略 1.4 等级查表（1L=50 / 60+L=794） |
| 受击方有效防御 | `effectiveDefense` | core-internal | 受击方防御 ×(1- 穿透率) - 穿透值 ≥ 0 |
| 减防（无视防御百分比） | `defenseReduction` | modifier (bucket, percentage) | "无视防御%"百分比聚合项；与减防加算（攻略 1.4） |
| 完全无视防御 | `defenseIgnore` | flag (boolean) | 是否完全跳过防御链路（贯穿伤害专用） |

> **结算顺序**（攻略 1.4 已锁）：`defenseIgnore=true` → 直接跳过 → 否则按减防加算 → 穿透率乘算 → 穿透值减算。
>
> ⚠️ **`defenseReduction` 与 `defenseIgnore` 严格区分**：
> - `defenseReduction`：百分比数值，与攻击方"减防加算"聚合后乘以原防御
> - `defenseIgnore`：boolean，true 则贯穿伤害公式不走防御区

### 14.4 版本与来源（QA P2/P3 新增）

| 中文权威名 | 英文 ID | 用途 |
|---|---|---|
| Schema 版本 | `schemaVersion` | snapshot.json 顶层 |
| 数据版本 | `dataVersion` | data 包版本 |
| 来源版本 | `sourceVersion` | 爬虫快照 / 数据原始来源版本（如 NGA tid=44468012 v2026-05-04） |
| 游戏版本 | `gameVersion` | ZZZ 游戏大版本（如 `2.1` / `2.2`），与 `sourceVersion` 解耦 |
| 规则版本 | `ruleSetVersion` | 公式规则版本（当前 `rules-v0.1-attached-2026-05-04`） |
| 来源 | `source` | data 派生 modifier 的来源（角色 / 音擎 / 鸣徽 / 攻略章节 / 手动） |
| 来源锚点 | `sourceAnchor` | 攻略章节 anchor |
| 抓取时间 | `fetchedAt` | 爬虫数据时间戳 |
| 解析自 | `parsedFrom` | 数据来自哪个 Excel / 网页路径 |

### 14.5 fixture

| 中文权威名 | 英文 ID | 备注 |
|---|---|---|
| 黄金 fixture | `goldenFixture` | CONFIRM-4 L2 测试用例；隔离在 `__fixtures__/golden/`，不进入正式 data 包 |

---

## 15. 游戏模式 / 活动（v0.3.2 重大更新：Lost Void / 式舆防卫战 / 鸣徽分类）

| 中文权威名 | 英文 ID | label.zh | label.en | 优先级 | 备注 |
|---|---|---|---|---|---|
| **零号空洞** | `lostVoid` | 零号空洞 | Lost Void | **P0** | ✅ lo-user 截图证实官方英文 Lost Void；**鸣徽 `resonium` 来源**（v0.3.2 修正 v0.3 错误描述"鏖战 / 危局强袭战"） |
| **式舆防卫战** | `defenseGameMode` | 式舆防卫战 | Shiyu Defense ⚠️pending | **P0**（lo-user 升级） | 候选官方英文待截图，"剧变节点 / 烈度效果"作为 modifier 来源进 V1 modifier 库 |
| 危局强袭战 | `hollowZeroAssault` | 危局强袭战 | Hollow Zero Assault | P1 | CONFIRM-11 数据来源之一 |
| 拟真战术鏖战 | `tacticalBrawl` | 拟真战术鏖战 | ⚠️pending | P1 | 候选官方英文待补 |
| 鏖战高塔 | `battleTower` | 鏖战高塔 | ⚠️pending | P1 | — |
| 调查员培训课 | `investigatorTraining` | 调查员培训课 | ⚠️pending | P1 | — |
| 空洞（通用） | `hollow` | 空洞 | Hollow | P2 | 烈度效果通用容器 |
| 限时活动 | `limitedEvent` | 限时活动 | Limited-time Event | P2 | 一次性活动出处通用（v0.3 改名 `event` → `limitedEvent`） |

### 15.1 零号空洞子模块（V1 不入词典，仅记录截图证实的英文）

按 lo-user "不要额外支持不太可能用到的术语" 原则，子模块**不入词典**，仅在 sourceAliases 备查：

- Resonium Database（鸣徽数据库）
- Corruption Research（秽息研究）
- Special Area Research（特殊区域研究）
- Lost from the Old Capital
- Outpost Primer
- Withered Domain（枯萎之域）

### 15.2 鸣徽分类 enum（lo-user 后续可选补图，v0.3.2 占位）

按攻略中提到的 7 个分类（中文）+ lo-user 截图见到的 1 个英文 [Critical]，UX 暂占位：

| 中文分类 | 候选英文 ID（待截图证实） | 攻略章节 |
|---|---|---|
| `[强袭]` | candidate `[Critical]`（lo-user 截图证实之一）/ pending | 1.5 / 2.1.6 |
| `[决斗]` | pending | 2.3.2 |
| `[诡术]` | pending | 3.2.1 |
| `[引燃]` | pending | 3.3.3 |
| `[能量]` | pending | 4.3.2 |
| `[黄铜镇纸]` | 应是分类 `[镇纸]` 或类似 / pending | 1.5 |
| 其他 | 待补 | — |

待 lo-user 后续可选补图后，`resonium` 词条下增加 `category` 字段 enum 完整化。

---

## 后续维护

- **新增术语**：发现攻略未覆盖的术语（潜能激化具体子术语 / 新版本机制 / 未来角色特殊机制）时，必须先增补到本文件再写代码
- **英文 ID 命名规则**：
  - 字段 / enum 值：camelCase（`anomalyProficiency`、`sheerForce`）
  - TS 类型 / handler 类：PascalCase（`BattleSnapshot`、`CalcResult`）
  - 同义不同语境：用前缀区分（`wEngine` vs `wEnginePassive`、`driveDisc` vs `driveDiscMainStat`、`parrySupportTag` vs `parrySupportEvent`）
- **官方英文优先**：标 `pending` 的等 ZZZ 国际服客户端 / 官方英文资料确认；数据爬虫接入英文资源时随时更新
- **易混淆术语**：所有 ⚠️ 标记必须在错误文案 / AI prompt 模板中显式区分
- **审稿轮次**：v0.2 → @Product / @TechLead / @QA 评审 → v0.3（含修订）→ 进 `docs/glossary/glossary.md`

## v0.3.2 → v0.4 / S2 阶段待办

**v0.3.2 已 lock（基于 lo-user 截图）**：
- ✅ 异常 ID 候选 Y（精通=Proficiency / 掌控=Mastery）
- ✅ 鸣徽 = `resonium`，来源 = 零号空洞 `lostVoid`
- ✅ 闪能 = `adrenaline` 全套
- ✅ 贯穿 = `sheer*` 全套
- ✅ 畏缩 = `flinch`
- ✅ 命破特性 = `agentSpecialty: "rupture"`
- ✅ D-11 命名体系全套官方化（原则层）

**仍 pending（不阻塞 V1，等数据爬虫接入英文资源时批量补）**：
1. 鸣徽分类 enum 完整中英对照（lo-user 后续可选补图）
2. 式舆防卫战官方英文（候选 `Shiyu Defense`）
3. 拟真战术鏖战 / 鏖战高塔 / 调查员培训课 等 P1 游戏模式官方英文
4. 攻击标签中 ⚠️pending 的 5 项（assistAssault / parrySupportTag / evadeAssist / heavyHit / followUp）官方英文
5. 长尾术语（部位破坏 / 打断 / 秽息）官方英文
6. `label.en` 长尾占位（P2 范围，可不做）
7. 音擎 / 驱动盘字段名 `wEngine` vs `weaponEngine` 由 S2 naming-policy.md 最终锁定（D-11 双层框架）

## sourceAliases 系统化记录（v0.3.2 全面扩充）

为支持 v0.1 ~ v0.3 旧 ID + 社区常见写法 + ZZZ 官方缩写，sourceAliases 列扩充到：

| 当前英文 ID | sourceAliases |
|---|---|
| **D-11 全套官方化迁移** | |
| `sheerForce` | `["breach", "breachForce", "Sheer Force"]` |
| `sheerDamage` | `["breachDamage", "Sheer Damage"]` |
| `sheerDamageBonus(Zone)` | `["breachDamageBonus", "breachDamageBonusZone", "Sheer DMG Bonus"]` |
| `adrenaline` | `["breachEnergy", "decibel", "sheerEnergy", "Adrenaline"]` |
| `automaticAdrenalineAccumulation` | `["breachEnergyRegen", "Automatic Adrenaline Accumulation"]` |
| `adrenalineGenerationRate` | `["breachEnergyGainEfficiency", "Adrenaline Generation Rate"]` |
| `maxAdrenaline` | `["Max Adrenaline"]` |
| `agentSpecialty: rupture` | `["breachAttribute", "Rupture"]` |
| `energyGenerationRate` | `["energyGainEfficiency", "Energy Generation Rate"]` |
| **历史 v0.x 命名迁移** | |
| `daze`(value/ratio/cap/...) | `["stagger", "stun", "Daze"]` |
| `dazed` | `["staggered"]` |
| `dazeVulnerabilityZone` | `["staggerVulnerabilityZone"]` |
| `dazeLevelZone` | `["staggerLevelZone"]` |
| `hitstun` | `["staggerHit"]`（v0.1 名占用，与 daze 解耦） |
| `disorder` | `["mutation", "Disorder"]` |
| `polarityDisorder` | `["polarityMutation"]` |
| `bangboo` | `["bomb", "Bangboo"]` |
| `resonium` | `["chime", "resonia", "combatBuffToken", "Resonium"]` |
| `lostVoid` | `["Lost Void"]`（v0.3 鸣徽来源描述错误已修正） |
| `flinch` | `["Flinch"]` |
| `wEngine` 或 `weaponEngine`（S2 锁） | `["W-Engine"]` |
| `driveDisc` 或 `drive`（S2 锁） | `["Drive Disc"]` |
| `mindscapeCinema` | `["mindscape", "Mindscape", "Mindscape Cinema"]` |
| `coreSkill` | `["Core Skill"]` |
| `additionalAbility` | `["Additional Ability"]` |
| `anomalyProficiency` | `["Anomaly Proficiency"]` |
| `anomalyMastery` | `["Anomaly Mastery"]` |
| **ZZZ 官方缩写迁移**（公开字段不缩写） | |
| `defense` | `["def", "DEF"]` |
| `attack` | `["atk", "ATK"]` |
| `maxHp` | `["hp", "HP", "hpMax", "Max HP"]` |
| `critRate` | `["CRIT Rate"]` |
| `critDamage` | `["critDmg", "CRIT DMG"]` |
| `penetrationRate` | `["penRate", "PEN Ratio"]` |
| `flatPenetration` | `["penFlat", "PEN"]` |
| `impact` | `["Impact"]` |
| `energy` | `["Energy"]` |
| `maxEnergy` | `["energyLimit", "Energy Limit"]` |
| `energyRegen` | `["Energy Regen"]` |
| **§15 游戏模式 / §11 攻击标签 / §13 装备 等** | 见各章节内行级 sourceAliases |
| **限时活动** | |
| `limitedEvent` | `["event", "Limited-time Event"]` |
| `anomalyStatus` | `["anomalyState"]` |
| `critDamage` | `["critDmg", "CRIT DMG"]` |
| `penetrationRate` | `["penRate", "PEN Ratio"]` |
| `flatPenetration` | `["penFlat", "PEN"]` |
| `maxHp` | `["hpMax", "HP", "Max HP"]` |
| `hitstun` | `["staggerHit", "stagger"]` ⚠️ 与 `daze` 别名重叠时优先 `daze` |
| `limitedEvent` | `["event"]` |
| `anomalyStatus` | `["anomalyState"]` |

> 在 data 爬虫匹配 / migration / AI prompt 处理时，遇到 alias 自动映射到当前权威 ID 并发出 deprecation warning（QA 验收点）。

---

（v0.3.2 完。约 **190 条 / 15 类**（v0.3 = 183 / 15）；相对 v0.3.1 新增：D-11 全套官方化（breach* → sheer/adrenaline/rupture）+ 6 个属性独立增伤 + 13 项攻击标签 P0 双语 + 零号空洞主词条 + 鸣徽分类 enum 占位 + 双语三档优先级 + sourceAliases 大幅扩充。下一步：作为 S2 naming-policy.md 输入；进 `docs/glossary/glossary.md` 顶层位置。）
