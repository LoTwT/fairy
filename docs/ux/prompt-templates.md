# Prompt Templates — UX v0.3 重定向稿 B

作者：@UX  日期：2026-05-05  状态：v0.4.1（D-19 patch — 默认 nonCrit/crit 双栏，expected 改为可选）

> **用途**：AI plugin / CLI / Slock skill 把 `CalcResult` JSON 渲染为人类可读输出的模板库。
> **结构**：4 档输出粒度（tiny / brief / verbose / debug）× 2 语言（zh / en）= 8 套模板。
> **填充语法**：Mustache 风格 `{{placeholder}}`；条件块 `{{#cond}}...{{/cond}}`；循环 `{{#list}}...{{/list}}`。
> **占位符引用 glossary v0.4 + naming-policy.md**；具体字段路径以 TL-3 PR #5 已 merge 的 `CalcResult` 合同为准（v1.0 字段映射见末尾 §字段映射 v1.0）。

---

## 4 档粒度定义

| 档 | 受众 | 内容 | 输出长度 |
|---|---|---|---|
| **tiny** | 普通玩家（移动端 AI 聊天 / 一行汇总） | 仅总伤害双栏数字（暴击 / 非暴击） | ≤ 2 行 |
| **brief** | 配装规划玩家（P2 配队党） | tiny + 关键乘区贡献 top 3 + warnings 摘要 | ≤ 8 行 |
| **verbose** | 数据党 / 攻略作者（P3） | brief + 完整乘区拆解 + 公式溯源 + warnings 全文 | 完整段落 |
| **debug** | 开发者 / QA 对账 | verbose + trace 中所有 modifier（生效 + 未生效 + 原因）+ 版本元数据 | 详尽 |

CLI `calc` JSON 视图切换：`--view brief|verbose`，默认 `brief`。AI/plugin 渲染器仍可在 tiny / brief / verbose / debug 四档之间选择人类可读模板。
AI plugin 默认按用户问题深度自动选档；显式可指定。

---

## 模板（8 套）

### T1 · tiny / zh

```
{{activeAgentName}} 的 {{attackName}}：非暴击 {{nonCritDamage}} / 暴击 {{critDamage}}。
```

填充示例（仪玄 强化特殊技 vs 秽息司祭）：
```
仪玄 的 符法千重-破：非暴击 4,200,000 / 暴击 12,500,000。
```

### T2 · tiny / en

```
{{activeAgentName}}'s {{attackName}} deals {{nonCritDamage}} non-crit / {{critDamage}} crit damage.
```

Example fill:
```
Yixuan's Sigil Shroud — Break deals 4,200,000 non-crit / 12,500,000 crit damage.
```

### T3 · brief / zh

```
{{activeAgentName}} 的 {{attackName}}（{{damageType}}）
- 非暴击伤害：{{nonCritDamage}}
- 暴击伤害：{{critDamage}}

主要乘区贡献（top 3）：
{{#topZones}}
- {{name}}：{{value}}（贡献 {{contributionPct}}%）
{{/topZones}}

{{#hasWarnings}}⚠ {{warningCount}} 条提示：{{warningSummary}}{{/hasWarnings}}
```

填充示例：
```
仪玄 的 符法千重-破（贯穿伤害）
- 非暴击伤害：4,200,000
- 暴击伤害：12,500,000

主要乘区贡献（top 3）：
- 基础伤害区：29,076（贡献 35%）
- 暴击区：2.110（贡献 22%）
- 贯穿增伤区：1.40（贡献 18%）

⚠ 1 条提示：贯穿伤害对秽盾首领约 3.16x 常规伤害（攻略 5.3）
```

### T4 · brief / en

```
{{activeAgentName}}'s {{attackName}} ({{damageType}})
- Non-crit damage: {{nonCritDamage}}
- Crit damage: {{critDamage}}

Top 3 zone contributions:
{{#topZones}}
- {{name}}: {{value}} ({{contributionPct}}%)
{{/topZones}}

{{#hasWarnings}}⚠ {{warningCount}} warning(s): {{warningSummary}}{{/hasWarnings}}
```

Example fill:
```
Yixuan's Sigil Shroud — Break (Sheer Damage)
- Non-crit damage: 4,200,000
- Crit damage: 12,500,000

Top 3 zone contributions:
- Base Damage Zone: 29,076 (35%)
- Crit Zone: 2.110 (22%)
- Sheer Damage Bonus Zone: 1.40 (18%)

⚠ 1 warning: Sheer Damage vs Corrupted Shield boss is ~3.16x regular damage (Strategy 5.3)
```

### T5 · verbose / zh

```
# {{activeAgentName}} · {{attackName}} · {{damageType}}

**结果**
- 非暴击伤害：{{nonCritDamage}}
- 暴击伤害：{{critDamage}}
{{#hasExpectedDamage}}- 期望伤害（可选 result-mode=expected）：{{expectedDamage}}{{/hasExpectedDamage}}
{{#hasMultipleSegments}}- 多段总和（逐段向上取整后）：{{segmentDisplaySum}}{{/hasMultipleSegments}}

**乘区拆解**
| 乘区 | 输入 | 计算 | 结果 | 来源 |
|---|---|---|---|---|
{{#zones}}
| {{name}} | {{input}} | {{formula}} | {{result}} | {{source}} |
{{/zones}}

{{#hasModifiers}}**已生效 modifiers**（{{modifierCount}}）
{{#modifiers}}
- {{id}}（来自 {{source.kind}}:{{source.name}}）→ {{bucket}}：{{effect}}
{{/modifiers}}
{{/hasModifiers}}

{{#hasWarnings}}**提示与警示**
{{#warnings}}
- {{code}}：{{message}}
{{/warnings}}
{{/hasWarnings}}

**版本与来源**
- 规则：{{ruleSetVersion}} | 数据：{{dataVersion}} | 游戏：{{gameVersion}}
{{#hasOverrides}}- 用户覆盖字段：{{overrideCount}}（详见 debug 档）{{/hasOverrides}}
```

### T6 · verbose / en

```
# {{activeAgentName}} · {{attackName}} · {{damageType}}

**Result**
- Non-crit damage: {{nonCritDamage}}
- Crit damage: {{critDamage}}
{{#hasExpectedDamage}}- Expected damage (optional result-mode=expected): {{expectedDamage}}{{/hasExpectedDamage}}
{{#hasMultipleSegments}}- Multi-segment sum (ceil per segment): {{segmentDisplaySum}}{{/hasMultipleSegments}}

**Zone breakdown**
| Zone | Input | Formula | Result | Source |
|---|---|---|---|---|
{{#zones}}
| {{name}} | {{input}} | {{formula}} | {{result}} | {{source}} |
{{/zones}}

{{#hasModifiers}}**Active modifiers** ({{modifierCount}})
{{#modifiers}}
- {{id}} (from {{source.kind}}:{{source.name}}) → {{bucket}}: {{effect}}
{{/modifiers}}
{{/hasModifiers}}

{{#hasWarnings}}**Warnings**
{{#warnings}}
- {{code}}: {{message}}
{{/warnings}}
{{/hasWarnings}}

**Versions**
- Rule set: {{ruleSetVersion}} | Data: {{dataVersion}} | Game: {{gameVersion}}
{{#hasOverrides}}- User overrides: {{overrideCount}} (see debug detail){{/hasOverrides}}
```

### T7 · debug / zh

```
{{>verbose-zh}}

---

## DEBUG · 完整 trace

**所有 modifier（含未生效）**
{{#allModifiers}}
- [{{appliedStatus}}] {{id}} | bucket={{bucket}} | appliesTo={{appliesTo}} | source={{source.kind}}:{{source.name}}
  {{#applied}}前值: {{beforeValue}} → 后值: {{afterValue}}{{/applied}}
  {{#notApplied}}未生效原因：{{reason}}{{/notApplied}}
{{/allModifiers}}

**取整链路**
{{#segments}}
- 段 {{id}}：理论 {{raw}} → 单段游戏显示（ceil）{{display}}
{{/segments}}
- 总显示值（segmentDisplaySum）：{{segmentDisplaySum}}

**用户覆盖字段（fieldProvenance / overriddenFromData）**
{{#overrides}}
- {{fieldPath}}：data 值 {{originalValue}} → 用户值 {{overrideValue}}（原因：{{reason}}）
{{/overrides}}

**版本元数据全集**
- ruleSetVersion: {{ruleSetVersion}}
- dataVersion: {{dataVersion}}
- gameVersion: {{gameVersion}}
- sourceVersion: {{sourceVersion}}
- schemaVersion: {{schemaVersion}}
{{#hasOriginalVersions}}- originalGameVersion: {{originalGameVersion}}
- originalRuleSetVersion: {{originalRuleSetVersion}}
- originalDataVersion: {{originalDataVersion}}
- originalSourceVersion: {{originalSourceVersion}}{{/hasOriginalVersions}}

**虚拟代理人**（异常 / 紊乱场景）
{{#hasVirtualAgent}}
- level: {{virtualAgent.level}}（向下取整）
- attack: {{virtualAgent.attack}}
- anomalyProficiency: {{virtualAgent.anomalyProficiency}}
- contributors: {{virtualAgent.contributors}} 名代理人
- excludedBangbooBuildup: {{virtualAgent.excludedBangbooBuildup}}
{{/hasVirtualAgent}}
```

### T8 · debug / en

```
{{>verbose-en}}

---

## DEBUG · Full trace

**All modifiers (including non-applied)**
{{#allModifiers}}
- [{{appliedStatus}}] {{id}} | bucket={{bucket}} | appliesTo={{appliesTo}} | source={{source.kind}}:{{source.name}}
  {{#applied}}before: {{beforeValue}} → after: {{afterValue}}{{/applied}}
  {{#notApplied}}skipped reason: {{reason}}{{/notApplied}}
{{/allModifiers}}

**Rounding chain**
{{#segments}}
- Segment {{id}}: raw {{raw}} → segment display (ceil) {{display}}
{{/segments}}
- Total display (segmentDisplaySum): {{segmentDisplaySum}}

**User overrides (fieldProvenance / overriddenFromData)**
{{#overrides}}
- {{fieldPath}}: data value {{originalValue}} → user value {{overrideValue}} (reason: {{reason}})
{{/overrides}}

**Version metadata (full)**
- ruleSetVersion: {{ruleSetVersion}}
- dataVersion: {{dataVersion}}
- gameVersion: {{gameVersion}}
- sourceVersion: {{sourceVersion}}
- schemaVersion: {{schemaVersion}}
{{#hasOriginalVersions}}- originalGameVersion: {{originalGameVersion}}
- originalRuleSetVersion: {{originalRuleSetVersion}}
- originalDataVersion: {{originalDataVersion}}
- originalSourceVersion: {{originalSourceVersion}}{{/hasOriginalVersions}}

**Virtual Agent** (anomaly / disorder scenarios)
{{#hasVirtualAgent}}
- level: {{virtualAgent.level}} (floor)
- attack: {{virtualAgent.attack}}
- anomalyProficiency: {{virtualAgent.anomalyProficiency}}
- contributors: {{virtualAgent.contributors}} agent(s)
- excludedBangbooBuildup: {{virtualAgent.excludedBangbooBuildup}}
{{/hasVirtualAgent}}
```

---

## 字段映射 v1.0（基于 TL-3 PR #5 已 merge 的 CalcResult 合同）

✅ **全部字段路径已锁定**，模板 placeholder 与 `CalcResult` 一一对应可机械解析。

| 模板占位符 | CalcResult 字段路径 | 来源 |
|---|---|---|
| `{{activeAgentName}}` | i18n: `glossary[agentId].label.<lang>` 派生；fallback `result.summary.activeActorId` | UX-1 glossary + UX-2 messages |
| `{{attackName}}` | `result.attackSegments[i].id` 或 i18n 资源；多段时聚合段名 | TL-3 calc-result.md §3 |
| `{{damageType}}` | `result.summary.damageType` (enum: `regular` / `sheer` / `anomaly` / `disorder` / `trueDamage` / `daze`，与 TL-3/PR #7 锁定一致) | TL-3 calc-result.md §2 |
| `{{nonCritDamage}}` | `result.summary.lanes.nonCrit.displayDamage` | TL-3 calc-result.md §2 + D-19 |
| `{{critDamage}}` | `result.summary.lanes.crit.displayDamage` | TL-3 calc-result.md §2 + D-19 |
| `{{expectedDamage}}` | Optional: `result.summary.expectedDamage` when `--result-mode expected` is requested | TL-3 calc-result.md §2 + D-19 |
| `{{expectedDamageRaw}}` | Deprecated transition: `result.summary.rawTotalDamage` in verbose/full results | TL-3 calc-result.md §2 + D-19 |
| `{{expectedDamageDisplay}}` | Deprecated transition: `result.summary.displayTotalDamage` in verbose/full results | TL-3 calc-result.md §2 + D-19 |
| `{{segmentDisplaySum}}` | `Σ result.attackSegments[].segmentDisplayDamage` (= `displayTotalDamage`) | TL-3 calc-result.md §3 |
| `{{segments}}` 循环（各段 raw/display） | `result.attackSegments[]` (each: `id` / `rawDamage` / `segmentDisplayDamage` / `roundingMode`) | TL-3 calc-result.md §3 |
| `{{topZones}}` (top 3 by contribution) | `result.buckets[]` 按 `effectiveMultiplier` 偏离 1 的程度排序 top 3；each bucket: `bucketId` / `effectiveMultiplier` / contributors[] top 1 | TL-3 calc-result.md §4 |
| `{{zones}}` 完整 | `result.buckets[]` (each: `bucketId` / `before` / `after` / `effectiveMultiplier` / `contributors[]`) | TL-3 calc-result.md §4 |
| `{{modifiers}}` 已生效 | `result.modifiers[]` filter `active === true` | TL-3 calc-result.md §5 |
| `{{allModifiers}}` 含未生效 | `result.modifiers[]` 全集；each: `id` / `handlerId` / `active` / `appliesTo` / `bucket` / `source` / `inactiveReason` | TL-3 calc-result.md §5 |
| `{{events}}` (manual events) | `result.events[]` (each: `id` / `kind` / `ruleId` / `rawDamage` / `displayDamage`) | TL-3 calc-result.md §6 |
| `{{warnings}}` | `result.warnings[]` (each: `key` / `severity` / `path` / `messageParams` / `source`)；渲染时按 `key` + `messageParams` 走 `messages.<lang>.json` | TL-3 calc-result.md §7 + UX-2 |
| `{{warningCount}}` / `{{hasWarnings}}` | `result.warnings.length` | derived |
| `{{warningSummary}}` | 前 N 个 warning 的简短文案；超过则附 `… and N more` | derived |
| `{{errors}}` | `result.errors[]`（severity=error；渲染优先） | TL-3 calc-result.md §7 |
| `{{schemaVersion}}` 等当前版本 | `result.schemaVersion` / `result.gameVersion` / `result.ruleSetVersion` / `result.dataVersion` / `result.sourceVersion` | TL-3 calc-result.md §1 |
| `{{originalRuleSetVersion}}` 等 | `result.originalRuleSetVersion` / `originalDataVersion` / `originalSourceVersion` / `originalGameVersion`（仅路径 A 出；4 个，不含 originalSchemaVersion） | TL-3 calc-result.md §1 + §9 |
| `{{hasOriginalVersions}}` | `result.originalRuleSetVersion !== undefined` | derived |
| `{{virtualAgent}}` | `result.trace[].kind === "virtualAgent"` 中携带的字段（`level` / `attack` / `anomalyProficiency` / `contributors` / `excludedBangbooBuildup`） | TL-3 trace.md / handler-spec.md AnomalyContributionInput |
| `{{overrides}}` | `BattleSnapshot.overrides[]` 由 `result.trace[]` 中 `overriddenFromData` 事件展示（each: `path` / `originalValue` / `overrideValue` / `reason`） | TL-3 battle-snapshot.md §provenance + trace.md |
| `{{hasOverrides}}` / `{{overrideCount}}` | derived from above | derived |

**渲染建议**：
- `top 3 by contribution` 排序：建议按 `|effectiveMultiplier - 1.0|` 倒序（接近 1 的乘区贡献最小）
- `appliedModifiers` / `skippedModifiers`：从 `result.modifiers[]` 按 `active` 字段二分
- `defenseSkipped`（贯穿伤害）：检查 `result.summary.damageType === "sheer"` 且 trace 中有 `defenseSkipped` 标记 → verbose 档输出"防御区已跳过"

**双语 i18n 边界（与 v0.3 一致）**：
- 模板内嵌固定标签（"非暴击伤害" / "Crit damage" 等）硬编码
- `{{warnings.message}}` / `{{errors.message}}` 走 `messages.<lang>.json`（UX-2 v0.4）
- 术语标签（`贯穿伤害` / `Sheer Damage`）走 glossary v0.4 `label.<lang>`

---

## 双语 i18n 复用 messages 资源

模板内嵌的固定标签（如 `非暴击伤害` / `Crit damage` / `已生效 modifiers` / `Active modifiers`）是模板硬编码，**不**走 `messages.zh.json` / `messages.en.json`（那是错误文案库）。

但模板填充中的：
- `{{warnings.message}}` — 走 `messages.<lang>.json` 的 ERR-* 文案（与 UX-2 一致）
- 术语标签（`贯穿伤害` / `Sheer Damage` / `失衡` / `Daze`）— 由 glossary v0.3.2 `label.zh` / `label.en` 派生

---

## 使用约定

- AI plugin / Slock skill：把 `CalcResult` JSON 与对应模板（按用户档级 + 用户语言）传给模板引擎渲染，再返给用户
- CLI（V1 不做内置渲染层 / 见 D-11 决策）：可选脚手架样例放 `examples/render/` 给开发者参考
- 模板版本 = `v0.1`（与 glossary 一并随 ruleSetVersion 演进）
- 模板更新时不破坏向后兼容：新字段加 `{{#newField}}...{{/newField}}` 条件块即可

---

## v0.3 → v0.4 待补

1. TL-3 schema 锁定后字段路径对齐
2. partials（`{{>verbose-zh}}` / `{{>verbose-en}}`）渲染引擎选型（Mustache / Handlebars / 简易 string interpolation）由 TL 在 plugin 实现阶段决定
3. 增加"扫描结果"档（如未来加 scan 命令支持）
4. 增加"对比结果"档（A/B 对比；V1 cli-only 阶段不做 compare 命令时省略）
5. starter scenarios 各场景的"期望渲染输出"作为 QA 黄金集对账参考

UX-3 task #16 已 ready。
