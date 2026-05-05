# Snapshot Schema · UX 字段语义与心智模型

Status: v0.4（基于 TL-3 schema PR #5 已 merge 同步 + UX-v0.4 errata 文案精度修订）
Owner: @UX
Reviewers: @TechLead (data contract 合规), @QA (黄金集断言可达), @Product (心智模型一致性)
Inputs: TL-3 schemas (battle-snapshot.md / calc-result.md / trace.md / handler-spec.md), glossary v0.3.2, Product v2.0 §5

> **本文用途**：从用户 / AI 视角解释 `BattleSnapshot` 与 `CalcResult` 的字段含义、心智模型与典型场景。
> **不重复 TL 工程合同**（路径见 README）：本文聚焦"为什么这样设计"+"用户如何理解"+"AI 如何引用"。
> **D-11 全套官方化原则**已生效；命名以 glossary v0.3.2 + naming policy 为权威。

---

## Part 1 · 队伍快照心智模型

### 1.1 一句话定义

> `BattleSnapshot` = "**一支 1~3 名代理人队伍 + 一名敌人 + 当前出手者 + 当前这次攻击**" 的瞬间状态。

它**不是**：
- 战斗模拟器（不连续推演时间轴）
- 角色构筑（仅装备 / 影画 / 音擎，不含敌人 / 攻击事件）
- DPS / rotation 计算（V1 不模拟时序）

它**是**：
- 给计算引擎的"我现在按这一帧的状态算这次伤害是多少"的全部输入

### 1.2 1~3 代理人队伍（D-1 决策）

V1 队伍**人数可变**，1 / 2 / 3 都支持：
- **1 人**：开服初期 / 攻略对账 / 单人 demo
- **2 人**：早期组队
- **3 人**：实战标配

不强制 3 人是为了让早期玩家与攻略作者也能用工具，不会被"凑不齐"劝退。

`team: [AgentSnapshot] | [AgentSnapshot, AgentSnapshot] | [AgentSnapshot, AgentSnapshot, AgentSnapshot]` 的 tuple 类型在 schema 层硬约束这点。

### 1.3 当前出手者 = activeActor 锚点

每次计算都有**唯一一个出手者**触发结算。`activeActor.agentId` 必须等于 `team[].agentId` 中的一个。

为什么这个锚点重要：
- 所有 typed modifier 的 `appliesTo`（self / agent[id] / enemy / global）以 activeActor 为参照
- 队友增益是否生效要看"是否作用于当前出手者或当前出手时的敌人状态"
- 紊乱 / 异常的虚拟代理人加权在多代理人场景里依赖于知道"哪一段攻击由谁触发了积蓄"

V1 心智模型简化：**activeActor 只是代理人**。V1.1+ 才考虑 activeActor 是邦布的情况。

### 1.4 邦布 = V1 占位 / V1.1 实装（D-1 决策）

`AgentSnapshot.subordinate` 字段是邦布的占位槽。V1：
- schema 保留字段防止 V1.1 升级破坏
- 用户 build.json 里写 `subordinate` 字段会触发"unsupported feature"类型 diagnostic（具体 key 由 S3 runtime schema 阶段 TL 锁定，本文不预设具体 ERR ID；候选 ERR-UI-003 已写入 messages 资源备用）
- core 不计算邦布 damage event；不参与异常虚拟代理人加权（攻略 3.3.5 硬规则）

为什么把邦布建模为"代理人的子结构"而非第 4 名队员：
- 玩家心智里"我的队伍 + 我带的邦布"，不是 4 人
- 攻略硬规则（不积蓄异常 / 不削秽盾 / 不参与虚拟代理人加权）天然把邦布与代理人区分

### 1.5 战斗瞬间快照 = 一帧的全部输入

一个 BattleSnapshot 描述的是**一帧静态时刻**，含：
- **配置层**：队伍代理人 + 各自装备 / 影画 / 音擎 / 驱动盘 / 鸣徽 / 潜能激化
- **状态层**：activeActor 与攻击段（attackSegments[]）+ 敌人当前状态（dazed / 秽盾 / 异常）
- **修饰层**：已激活的 typed modifiers（队友增益 / data 派生效果 / 用户临时增益）+ 手动事件（真实伤害 / 部位破坏触发）
- **元数据层**：5 维版本字段（schema / game / ruleSet / data / source）+ provenance / overrides

不在 snapshot 里的（V1 不做）：
- 时间轴 / 连续帧
- 能量循环（PART 04 系统）
- 秽盾削减进度（仅静态修正 + 手动净除事件）
- 部位破坏的实际累积过程

### 1.6 多段攻击 = attackSegments[]

**一次"攻击"可以有多段**（如仪玄强化特殊技 5 段普攻 + 总击）。每段独立：
- 独立 `damageRatio` / `dazeRatio` / `attribute` / `tags` / `distanceDecay`
- **逐段向上取整**后求和（攻略 PART 01 开头硬规则）→ 对应 SegmentResult.segmentDisplayDamage / displayTotalDamage

为什么不退化为单段：
- 黄金锚点 #7（多段取整）必须能被 fixture 表达
- AI / 用户描述"强化特殊技完整释放"时是多段的概念

UX 心智 / AI prompt 写法：把 attackSegments 描述为"一连串攻击点"，每段自己算自己的伤害再加总。

### 1.7 队友增益传播 = typed modifier `appliesTo`

队友提供的乘区增益（如妮可减防 / 莱卡恩失衡易伤 +35%）通过 typed modifier 显式表达：
- `id` + `handlerId`：handler 是已注册的纯函数（CONFIRM-1 安全约束）
- `appliesTo`：作用范围（self / team / agent[id] / enemy / global）
- `when`：可选条件（如 `enemy.dazed === true` 才触发）
- `source`：来源（角色技能 / 影画 / 音擎 / 鸣徽 / 用户临时）
- `bucket`：作用乘区（damageBonusZone / sheerDamageBonusZone / dazeVulnerabilityZone 等）

**UX 关键设计原则**：所有 modifier 必须**显式化**，不要让计算引擎"猜"队友增益。这是 V1 静态计算与"模拟器"的核心差异。

### 1.8 用户配置 vs data 包数据 vs 测试 fixture（CONFIRM-4 / CONFIRM-13）

三层职责严格分离：

| 层 | 来源 | 允许人工编辑？ | 用户可在 snapshot 中覆盖？ |
|---|---|---|---|
| `@fairy/data` 游戏规则数据 | Excel + 爬虫 | ❌ 不允许人工编辑 | — |
| BattleSnapshot 中引用 data 的字段 | data 派生 | — | ✅ overrides + `overriddenFromData` trace |
| BattleSnapshot 中用户面板 / 装备选择 / 增益勾选 | 用户提供 | ✅ 必须 | — |
| 测试 fixtures（`__fixtures__/golden/`） | 人工审核（L2） | ✅ 仅供 core 单测 | — |

用户**可以**通过 `overrides[]` 在 snapshot 顶层覆盖任意字段路径（含 attackSegments / manualEvents 等），但 trace 中必须显式标 `overriddenFromData`。

---

## Part 2 · CalcResult 字段语义（用户 / AI 视角）

> 字段定义见 `docs/data-contract/calc-result.md`（TL-3 维护）；本节解读"每个字段对用户 / AI 意味着什么"+"prompt 模板里如何引用"。

### 2.1 顶层结构 = 5 块（按渐进披露顺序）

```
CalcResult
├─ versions（5 维 + original*）   ← debug 档展示
├─ summary                       ← tiny / brief 档展示主体
├─ attackSegments[] (SegmentResult)  ← 多段攻击的逐段证据
├─ buckets[] (BucketResult)      ← verbose 档展示乘区拆解
├─ modifiers[] (ModifierResult)  ← debug 档展示 modifier 生效与否
├─ events[] (ManualEventResult)  ← 真实伤害事件
├─ trace[] (TraceEvent)          ← debug 档展示推理链路
├─ warnings[] (Diagnostic)       ← brief 档摘要 / verbose 档全文
└─ errors[] (Diagnostic)         ← 始终展示（计算不可信）
```

### 2.2 summary：用户最先看到的"主结果"

```ts
interface CalcSummary {
  activeActorId: string         // 谁打出的 → AI prompt: "{{活动代理人}} 的"
  enemyId?: string              // 打了谁
  damageType: DamageType        // regular / sheer / anomaly / disorder / trueDamage / daze（与 TL-3/PR #7 锁定一致）
  rawTotalDamage: number        // 理论值（不取整）
  displayTotalDamage: number    // 游戏显示值（每段向上取整后求和）
  expectedDamage?: number       // 期望值（含 critRate * critDamage 加权）
  critDamage?: number           // 暴击数值
  nonCritDamage?: number        // 非暴击数值
  dazeValue?: number            // 该次累积的失衡值
  anomalyBuildup?: number       // 该次累积的异常值
  disorderDamage?: number       // 紊乱伤害（如适用）
  trueDamage?: number           // 真实伤害（如适用）
}
```

**UX 渲染优先级**：
- `tiny`：`expectedDamage` / `critDamage` / `nonCritDamage` 三档
- `brief`：tiny + `damageType` + warnings 摘要
- `verbose`：brief + `rawTotalDamage` vs `displayTotalDamage`（多段取整差异）
- `debug`：完整字段 + dazeValue / anomalyBuildup / disorderDamage / trueDamage 副输出

**易混淆**：
- `rawTotalDamage` 是**理论**总伤（不取整）；`displayTotalDamage` 是**游戏内显示**总伤（每段向上取整后求和）。**两者通常不相等**（攻略 PART 01 开头硬规则）。
- `expectedDamage` 是统计意义上的**期望**（含暴击概率加权）；不是"显示值"。

### 2.3 attackSegments / SegmentResult：多段证据

每段攻击独立计算 → segmentDisplayDamage（向上取整）。`displayTotalDamage = Σ segmentDisplayDamage`。

debug 档应展示每段的 raw → display 取整链路，便于 QA 黄金锚点 #7 对账。

### 2.4 buckets / BucketResult：乘区贡献证据

每个**乘区**（damageBonusZone / critZone / defenseZone / vulnerabilityZone / dazeVulnerabilityZone / sheerDamageBonusZone / specialZone 等）有：
- `before` → `after`：变化前后值
- `effectiveMultiplier`：实际进入公式的乘数
- `contributors[]`：哪些 modifier / data 字段贡献到这个乘区

**典型贡献者解读**：
- `defenseZone`：`levelBase` / `baseDefense` / `defenseReduction` / `penetrationRate` / `flatPenetration` 共同决定（Strategy 1.4）；如果命破贯穿伤害，整个 bucket 跳过（trace 标 `defenseSkipped`）
- `damageBonusZone`：6 个属性独立增伤（`fireDamageBonus` / `iceDamageBonus` / 等）+ 通用 / 队友增益贡献
- `dazeVulnerabilityZone`：当 `enemy.dazed=true` 时启用失衡时倍率；否则用未失衡时倍率（attribute=`未失衡时失衡易伤倍率`）
- `sheerDamageBonusZone`：仅命破贯穿伤害走；`fireDamageBonus` 等不进这里

### 2.5 modifiers / ModifierResult：增益生效与否的证据

**所有 modifiers 都进 modifiers[]，包括未生效的**（`includeTrace=true` 时）。这是 debug 档的核心数据：

```
未生效的 modifier 可能因为：
- when 条件未满足（如 enemy.dazed=false 时莱卡恩失衡易伤 +35% 不触发）
- appliesTo 不匹配（如 *illustrative*: 某 modifier 的 `appliesTo=enemy` 但当前 activeActor 触发的是 self-buff 路径 — 实际 handler / source ID 由 S3 runtime schema 锁定）
- source 缺失但策略要求 source（dev 模式）
- bucket 不在当前公式路径（如 sheerDamageBonusZone modifier 用于非贯穿伤害）
```

这些"未生效原因"对 P3 数据党 / 攻略作者非常关键——他们要确认"我的增益为什么没算上去"。

### 2.6 trace / TraceEvent：完整推理链路

debug 档展示。trace 的关键证据字段（TL-3 calc-result.md §8）：

| 类别 | 必出证据 |
|---|---|
| 防御 | `levelBase` / `baseDefense` / `defenseReduction` / `penetrationRate` / `flatPenetration` / `effectiveDefense` / `defenseZone` |
| 暴击 | `critRate` / `critDamage` / `critZone` / `expectedMultiplier` / 三档伤害 |
| 抗性 | 弱点 / 抗性属性映射 / `resistanceZone` |
| 减易伤 | `vulnerabilityZone` / `dazeVulnerabilityZone` |
| 失衡 | `dazeValue` / `dazeRatio` / `dazeCap` / `dazeResistance` / 恢复速度时间 |
| 异常 | `anomalyMastery` / `anomalyProficiency` / `anomalyBuildup` / `anomalyThreshold` / 触发计数 |
| 紊乱 | 公式 id / 剩余持续时间 / 虚拟代理人贡献 / overflow / 排除 |
| 命破 / 贯穿 | `agentSpecialty: rupture` / `sheerForce` / `sheerDamage` / `sheerDamageBonusZone` / 防御跳过证据 |
| 真实伤害 | manual event id / `enemy.maxHp` / 选定的 `trueDamageRule` / final true damage |
| Provenance | data source / 用户覆盖 / `overriddenFromData` / alias migration 证据 |

### 2.7 warnings / errors / Diagnostic

```ts
interface Diagnostic {
  key: string                                  // i18n key, e.g., "ERR-RNG-001"
  severity: "info" | "warning" | "error"
  path?: string                                 // 受影响 snapshot 字段路径
  messageParams?: Record<string, unknown>       // {raw} / {clamped} / {agentId} 等占位填充
  source?: SourceRef
}
```

**核心原则**（D-02-rev / D-11）：
- core **不输出本地化字符串**，只输出 `key` + `messageParams`
- CLI / AI prompt / Web UI 自己用 `messages.zh.json` / `messages.en.json` 渲染（UX i18n 资源）
- `key` 与 messages 资源中的 ERR-* key 一一对应（v0.4 = 27 条）

**`errors[]` vs `warnings[]`**：
- `errors[]` 非空 = 计算不可信（如 ERR-DAT-003 命破系数缺失，无法算贯穿）；UI 必须阻止用户当作可信结果使用
- `warnings[]` = 计算可继续，但接收方必须保留并展示警示（如 ERR-VER-001 版本兼容自动重算 / ERR-SRC-001 无来源 modifier）

### 2.8 版本字段族（FR-21 双路径）

**5 维当前版本字段 + 4 个 `original*`**（v0.4 修正：原写"5 个 original*"是错的；TL-3 合同只有 4 个 original*，不含 originalSchemaVersion）：

| 字段 | 含义 | 重算路径（A）| 只读路径（B）|
|---|---|---|---|
| `schemaVersion` | snapshot.json schema 版本 | 新导出/重算路径使用当前 schemaVersion | 只读导入路径保留原始 schemaVersion 并只读 |
| `gameVersion` | ZZZ 游戏大版本 | 当前 | 原版本 |
| `ruleSetVersion` | 公式规则版本 | 当前 | 原版本 |
| `dataVersion` | data 包版本 | 当前 | 原版本 |
| `sourceVersion` | 数据原始来源 | 当前 | 原版本 |
| `originalGameVersion` | 路径 A 保留导入 game 版本 | 路径 A 必填；路径 B 不出 | — |
| `originalRuleSetVersion` | 路径 A 保留导入 rule 版本 | 路径 A 必填；路径 B 不出 | — |
| `originalDataVersion` | 路径 A 保留导入 data 版本 | 路径 A 必填；路径 B 不出 | — |
| `originalSourceVersion` | 路径 A 保留导入 source 版本 | 路径 A 必填；路径 B 不出 | — |

**用户 / AI 心智**：
- "按当前规则重算"（路径 A）→ result 是当前版本计算 + 保留 original*；warnings 提示"自动重算"
- "保持原值只读"（路径 B）→ 所有版本字段冻结为原导入值；UI 全局只读；退出只读需二次确认

### 2.9 ManualEventResult：真实伤害手动事件证据

V1 不模拟破盾过程，但用户可以**手动声明事件**（部位破坏 / 秽盾净除 / 其他真实伤害）：

```ts
interface ManualEventResult {
  id: string
  kind: ManualEventKind            // partBreak / corruptedShieldCleanse / 其他
  ruleId?: string                  // 选定的真实伤害规则版本（如秽盾净除 default-15pct / pre-2.2-3pct / 2.2-2.5pct）
  source?: SourceRef
  basePath?: string                // e.g., "enemy.maxHp"
  baseValue?: number               // e.g., enemy.maxHp = 12000000
  multiplier?: number              // e.g., 0.15 (15%)
  flatValue?: number               // 部分情况是固定值
  rawDamage: number                // 真实伤害理论值
  displayDamage: number            // 真实伤害游戏显示值
  traceRefs: string[]
}
```

UX 心智：用户在 UI 上点"添加一次秽盾净除事件 + 选规则版本" → snapshot 加一条 ManualEvent → core 计算 ManualEventResult。**不暗示工具模拟了破盾或部位削减**。

---

## Part 3 · UX 渲染优先级速查表（与 prompt 模板 4 档对齐）

| 字段 | tiny | brief | verbose | debug |
|---|---|---|---|---|
| `summary.expectedDamage` | ✓ | ✓ | ✓ | ✓ |
| `summary.critDamage` / `nonCritDamage` | ✓ | ✓ | ✓ | ✓ |
| `summary.damageType` | — | ✓ | ✓ | ✓ |
| `summary.rawTotalDamage` vs `displayTotalDamage` | — | — | ✓ | ✓ |
| `attackSegments[]` 逐段 | — | — | （多段时简表） | 完整 |
| `buckets[]` top 3 contributors | — | ✓ | — | — |
| `buckets[]` 完整 | — | — | ✓ | ✓ |
| `modifiers[]` 已生效 | — | — | ✓ | ✓ |
| `modifiers[]` 未生效 + 原因 | — | — | — | ✓ |
| `events[]` (ManualEvent) | — | — | ✓ | ✓ |
| `trace[]` 完整 | — | — | — | ✓ |
| `warnings[]` 摘要 | — | ✓ | ✓ | ✓ |
| `warnings[]` 全文 + path | — | — | ✓ | ✓ |
| `errors[]` | ✓ | ✓ | ✓ | ✓ |
| 5 维版本 | — | — | — | ✓ |
| `original*` 版本 | — | — | — | ✓ |
| `overrides` / fieldProvenance | — | — | — | ✓ |

---

## Part 4 · UX 同步事项（v0.4 errata 待办）

基于 TL-3 schema 已 merge，UX 这些 follow-up 项纳入 v0.4：

1. **glossary v0.4 errata**：`mindscape` 主名 → `mindscapeCinema`；`driveDisc` → `driveDiscs`（plural 字段）+ `DriveDisc`（singular 类型名）双名约定；`stagger` → `daze*` 全套确认
2. **UX-2 starter scenarios JSON skeleton 同步**：S1 / S2 / S3 三个 BattleSnapshot 替换为 TL-3 真实字段（`mindscapeCinema` / `driveDiscs` / `panelSnapshot` 改 `panel` / 加 `attribute` / `agentSpecialty` / `attackSegments[]` / `enemy` 完整结构）
3. **UX-3 prompt-templates 字段映射 v1.0**：把 `{{placeholder}}` 占位符全部填实成 TL-3 真实字段路径（如 `result.summary.expectedDamage` / `result.buckets[?bucketId=defenseZone]` 等）
4. **错误文案库扩展**：随 ERR-VER-* 双路径具体化、ERR-EVENT-* 真实伤害事件错误（如缺 baseValue）等新增条目
5. **本文档**最终路径 = `docs/data-contract/snapshot-schema.md`（与 Product UX-4 任务描述一致）；UX 维护内容 + TL 维护可执行 schema 引用边界

---

（v0.3 重定向稿 C 完。本文 + UX-2（错误文案 + starter scenarios）+ UX-3（prompt 模板 4×2 双语）+ UX-1（glossary v0.3.2）共同构成 UX v0.3 重定向交付集合。下一步 v0.4 = TL-3 follow-up 同步。）
