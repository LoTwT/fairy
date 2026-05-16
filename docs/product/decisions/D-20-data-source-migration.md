# D-20 数据源迁移：Excel 永久停更后的换源决策 (v0.4.2)

> 状态：v0.4.2 final draft（2026-05-15，含 TL + QA review precision fold-in）
> Owner: @Product
> Cross-reviewer: @TechLead（artifacts + adapter contract + Phase 2 实施）/ @QA（8 acceptance gates + Phase 0-4 validation）
> 触发：lo-user msg `89a85bb2`（2026-05-14 17:29）— Excel 数据源停止更新
> Lo-user 最终决策：msg `4b7cb27b`（2026-05-15 02:49）— R1/R4/R6 final lock
> 影响 prior decisions：D-07 / D-10 / D-12 / D-13 / D-16 / D-17 / CONFIRM-4 / CONFIRM-11
> 可逆性：中（数据源切换可滚回，但 cleaned data 写入的 source ref 不可撤销）

---

## 1. Background

V0.0.4 ship 后（2026-05-14），lo-user 通告 Excel 数据源（`git-history:data/source/excel/data.xlsx`）上游永久停更。该 raw archive 已在 V0.1.2 后从当前树移除，仅可从 git history 恢复。Excel 是 fairy V0.0.4 的：

- 角色 panel + skill multipliers + 失衡倍率 + 异常积蓄主源
- 邦布属性 + 邦布技能数据源（V1.1 26 anchors 中 G24/G25/G26 强依赖）
- 敌人 panel 数据源（G13/G18/G19/G20 强依赖）

需要在 phase3（V1.2+ AI plugin / 截图识别 / 邦布数据 batch）深入开发前完成迁移（lo-user 紧急 sprint level），避免新功能基于失稳数据源开发。

## 2. Lo-user 决策汇总（locked R1-R6）

| ID | 决策 | 状态 |
|---|---|---|
| Q1 | Excel 永久停 | ✅ lock（msg `74b52454`）|
| Q2 | 紧急 sprint | ✅ lock（同上）|
| Q3 | 不破例 CONFIRM-4 L1（缺字段进 `deferredRows`）| ✅ lock（同上）|
| Q4 | 清洗后数据无论来源都发布 + README "如有侵权请联系删除" | ✅ lock（同上）|
| Q4 §3 | 仅正式服已发布数据，beta/CBT/leaks/datamine 排除 | ✅ lock（msg `5ab319a7`）|
| Q5 | 优选选源（Product/TL propose → lo-user 拍）| ✅ lock（同上）|
| Q6 | Golden 渐进（新增 G27/G28，不重写 G01-G26）| ✅ lock（msg `74b52454`）|
| Q7 | 立刻起 D-20 草稿 | ✅ lock（同上）|

### R1-R6 final lock（msg `4b7cb27b`）

| ID | 决策 | 状态 |
|---|---|---|
| **R1** | **nanoka-exclusive for ALL source-backed cleaned data** | ✅ **final lock** |
| **R2** | canonical-generated 45-row matrix（鸣徽 row 移除） | ✅ lock |
| **R3** | TL → lo-user escalation 路径备用 | ✅ lock |
| **R4** | DA + Sentinel + patch history 进 V0.1.0 scope；**鸣徽 (Resonium) removed**；**patch history = R4.a snapshot-derived numeric diff** | ✅ **final lock** |
| **R5** | V0.1.0 minor bump（schema breaking） | ✅ lock |
| **R6** | **DA 切 nanoka，无 D-17/D-12 exception**（V0.1.0 cutover 时正式 deprecate） | ✅ **final lock** |

## 3. Source scope split（R1+R6 nanoka-exclusive）

**关键 framing**：Path C = "nanoka-first adapter proof + field-level promote"，**不是 "一次性切 nanoka 替换 Excel"**。每字段必须证明可 promote 才切；未证明的进 `missingFields` / `deferredRows` + CI fail-loud。

| Scope | 用途 | 数据源 | redistributionRisk |
|---|---|---|---|
| **Numeric 主源（包含 DA）** | 角色/邦布/敌人 panel + skill multipliers + 失衡倍率 + 异常积蓄/阈值 + 失衡恢复 + **DA period/zones/buffs/monster/weakness/`boss_adjust`** + **Sentinel rp/fever data** | **nanoka detail JSON** (`/zh/{kind}/{id}.json`) + boss data (`/zh/boss/{id}.json`) | `accepted-by-owner`（per Q4）|
| **Patch history (R4.a)** | 版本数值改动 history | nanoka `manifest.available` + 每版本 raw snapshot hash + fairy 内部 diff tool（snapshot-derived numeric diff，**不是 prose patch-notes**）| `derived` |
| **Archived audit baseline（不 runtime）** | Phase 3 drift audit reference + Phase 4 cutover 前的 fallback 留档 | 米游社 entry_page detail JSON (D-17) + buhflipexplode (D-12) | `archived-audit-baseline` |
| **排除** | beta/CBT/leaks/datamine/preview | — | `forbidden` |
| **移除（R4）** | 鸣徽 (Resonium / Lost Void) | — | `removed/out-of-product-scope`（不进 formal data / 不进 matrix；现有 canonical schema `GameData.resonium` 字段 presence 为 **compatibility-only**，直到 V0.1.0 schema cleanup 显式移除或重定义）|

**关键 framing 调整**（vs v0.3）：
- DA 从 "explicit retained-non-nanoka exception" → **nanoka-exclusive**（per R1+R6 final lock）
- 鸣徽从 "deferred V1.x" → **removed out-of-product-scope**（per R4）
- Sentinel 从 "V1 out of scope" → **进 V0.1.0 scope**（per R4，nanoka has raw data）
- Patch history 从 "推迟" → **R4.a snapshot-derived numeric diff in V0.1.0**

## 4. Supply chain audit trail（per-source registry + Formal-Live Gate）

### 4.1 Per-source registry（`packages/data/source-registry.json`）

```jsonc
{
  "sourceId": "nanoka-zzz",
  "kind": "wiki-static-json",
  // URL allowlist 拆为 3 类（per TL precision msg `547fbd05`）：
  // (1) manifestUrl 用于读 manifest.zzz.live / latest / available
  // (2) versionedIndexUrls 用于 DA period 索引、未来其他 index 类静态资源
  // (3) localizedDetailUrls 用于角色 / 邦布 / 敌人 / W-Engine / 驱动盘 detail
  "urlAllowlist": {
    "manifestUrl": "^https://static\\.nanoka\\.cc/manifest\\.json$",
    "versionedIndexUrls": "^https://static\\.nanoka\\.cc/zzz/[^/]+/[a-z]+\\.json$",
    "localizedDetailUrls": "^https://static\\.nanoka\\.cc/zzz/[^/]+/(?:zh|en|ja|ko)/[a-z]+/\\d+\\.json$"
  },
  "license": "unknown",
  "tosStatus": "audited-pending",
  // R1+R6+R4.a 边界：分清 license 明确许可 与 lo-user 接受残余风险
  "redistributionRisk": "accepted-by-owner",
  "redistributionRiskRef": "D-20#8",
  "scope": "numeric-primary",
  "server": "live",
  "releaseChannel": "stable",
  // R1 Formal-Live Gate：current cleaned output rows 必须 == configuredLiveVersion（即 manifest.zzz.live）
  "configuredLiveVersion": "2.8",         // 当前 release artifact lock 的 live version
  "liveVersionRef": "manifest.zzz.live",
  // approvedLiveVersions 供 runtime-primary live lock、R4.a snapshot-diff 历史输入、
  // archived audit fixtures 使用；current cleaned output 仍必须 == configuredLiveVersion
  "approvedLiveVersions": ["2.8"],
  "approvedLiveVersionsScope": "runtime-primary | snapshot-diff-historical-input | archived-audit-fixture",
  "fetchedAt": "2026-05-15T...",
  "lastVerifiedAt": "2026-05-15T...",
  "contentHash": "sha256:...",
  "takedownPath": "docs/data-source/takedown-rollback.md#nanoka",
  "fallbackPlan": "runtime rollback requires explicit lo-user hotfix approval; archived Excel/D-17/D-12 snapshots remain audit references only"
}
```

### 4.2 Formal-Live Gate（per PR #54 audit finding）

**关键发现**：nanoka `manifest.json` 区分 `latest` vs `live`：

```json
{
  "zzz": {
    "latest": "3.0.2+15625449",   // 含未发布 DA period (e.g. 690391/690401/690411/690421)
    "live": "2.8",                 // 当前正式服真实版本
    "available": ["2.8", "2.8.12", ..., "3.0.2+15625449"]
  }
}
```

**硬要求**（per TL precision msg `547fbd05` — 分清 current cleaned output 与 historical / archived audit）：

1. **Current cleaned output rows 必须 `sourceVersion == configuredLiveVersion`**（即 == `manifest.zzz.live` 解析值）。**`approvedLiveVersions[]` 不能 authorize current cleaned output**。
2. Research / drift audit / sample fetching 可读 `manifest.zzz.latest`，**但 latest 不得进 current cleaned output**，除非 lo-user 显式 approve 新 `configuredLiveVersion`
3. Time-windowed DA records 加 row-level filter：`period.begin_time <= configuredLiveSnapshotDate`；future-window periods → `forbiddenRows` + fail-loud
4. **R4.a patch history 的 diff 输入** 可以从 `approvedLiveVersions[]` 取（历史 live snapshots，作 derived 输入）；**不能直接吃 latest/pre-release snapshots**
5. **Archived audit fixtures** 可用 `approvedLiveVersions[]` 中的历史 live snapshots
6. Version upgrade guard：如 `manifest.zzz.live` 从 `2.8` 升 `2.9`，adapter 检测 `fetchedLiveVersion != configuredLiveVersion` → fail-loud；lo-user approve 新 live → 更新 `configuredLiveVersion`，并把旧 `2.8` 加入 `approvedLiveVersions[]` 作 historical snapshot-diff 输入
7. **V1.2.x historical DA exception**：lo-user 选择 dedicated `historicalDAPeriods` bucket 后，manifest-available 非当前版本 DA rows 可进入 `GameData.historicalDAPeriods`，但每行必须 `currentRuntime=false`、`releaseVersion != configuredLiveVersion`，并且不得作为 `GameData.deadlyAssaultPeriods` 或 current-runtime fallback。

### 4.3 Per-row metadata（cleaned data 内嵌）

每条 cleaned row 必须有 `sourceId` + `sourceVersion`（实际版本，不是 placeholder）+ `sourceAnchor`（raw JSON path）+ `contentHash` ref to registry。

### 4.4 CI 校验（release CI `verify:source-registry`）

- 任何 cleaned row 引用的 `sourceId` 必须在 registry 存在
- 任何 `redistributionRisk = cross-check-only | forbidden` 的 source 的 row 必须**不**进 npm payload
- 任何 `redistributionRisk = accepted-by-owner` 必须有 `redistributionRiskRef` 引用 D-20
- **任何 current cleaned output row `sourceVersion != configuredLiveVersion` → fail-loud**（`approvedLiveVersions[]` 不放宽此要求）
- 任何 snapshot-diff / archived audit input 的 `sourceVersion` 不在 `approvedLiveVersions[]` → fail-loud
- 任何 URL 不匹配 `urlAllowlist.{manifestUrl, versionedIndexUrls, localizedDetailUrls}` 之一 → fail-loud
- registry 缺关键字段 → fail-loud

### 4.5 QA scope boundary

QA 验证 supply chain 完整性 + Formal-Live Gate 执行 + structured `missingFields` / `deferredRows`，**不验证** legal redistribution 合法性（属 §8 lo-user owner-accepted risk）。

## 5. Phase boundary（4-phase + retention of D-17/D-12）

> **TL precision lock**：PR #54 仅证明 nanoka raw source exists；runtime cutover 仍需 #127 matrix update + Phase 2 adapter semantic mapping + QA gates。**D-17 + D-12 runtime path 保留到 Phase 4 cutover 才正式 deprecate**。

### Phase 0 — Schema-first inventory（done via PR #52）

- Canonical schema (`packages/core/src/schema/*`) 反推 → 41-row matrix（PR #52 baseline）
- Schema contract + nanoka coverage matrix（机器 + 人读）
- **status：✅ QA PASS（PR #52 task #121/#123 done）**

### Phase 1 — needs-tl-research 收敛（done via PR #53 + #55）

- PR #53 (task #122 Batch 1): 41 → 41 rows split agents.promotionExtraStats; 25 verified / 0 needs-owner-research
- PR #54 (task #125): DA / Sentinel / patch history feasibility audit + Formal-Live Gate discovery
- PR #55 (task #127): 45-row matrix update — DA / Sentinel / patch rows 加入 + 鸣徽 removed + `sourceVersion=manifest.zzz.live` policy + D-17/D-12 archived
- **status：✅ QA PASS（PR #55 task #127 done）**

### Phase 2 — Adapter implementation（不 cutover runtime）

**Deliverables**（TL）：

1. nanoka adapter（`raw snapshot → normalized → cleaned` 三层 pipeline）
2. `data/raw/nanoka/<version>/` raw snapshot 入仓 + content hash + offline snapshotability
3. `packages/data/cleaned/candidate/nanoka/` 输出 candidate cleaned shape（不替换 runtime cleaned data）
4. **panel normalization formula**（raw `stats + level growth + extra_level` → cleaned final panel）
5. **enemy `monster_info.*` variant mapping**（Hati / Dullahan / Greta variants ↔ cleaned enemy）
6. **DA `boss_adjust` + score/HP + period filter semantic mapping**
7. **Sentinel typed promote**（unit + naming mapping 锁定）
8. **patch history snapshot-diff tool**（R4.a，approved-live-versions allowlist gating）
9. CI `verify:source-registry` + missing-fields fail-loud 测试

**关键边界**：
- **不动 runtime cleaned data** — D-17/D-12 仍是 runtime 主路径
- Excel adapter 仍 runtime（archived，但保留）
- 现有 `packages/data/cleaned/` 不替换

**QA Gates 4-6 acceptance**：见 §9。

### Phase 3 — Parallel period drift audit（可配置窗口）

- candidate source（nanoka）+ archived Excel/D-17/D-12 baseline **双跑** drift audit
- 每次 sync 生成 drift report（5 类：same / changed / missing / new / semantic-mismatch）
- 每条 changed / missing / semantic-mismatch 触发人工 ruling（Product / TL 联合 + lo-user 必要时拍）
- ruling 入 `docs/product/decisions/data-source-rulings.md` 历史记录

**默认窗口**：2 个 sync / ~2-3 周 sprint 节奏（per Q2 紧急）
**最长 fallback**：6 周（1 个 ZZZ 大版本），需 lo-user 显式 OK 延期

**关键边界**：
- ❌ Phase 3 不允许 silent fallback to Excel/D-17/D-12（archived as audit reference only）
- 仅 drift audit，不是多源 fallback

**Exit gate**：连续 2 sync drift report 无未 ruling 项 + golden replay G01-G26 全 PASS（仍跑 Excel ref）+ G27/G28 proof anchors PASS

### Phase 4 — Cutover + V0.1.0 ship

- 入选源（nanoka）promote 为 runtime 主源，新增/切换 runtime cleaned artifact + loader/export
- Excel / D-17 米游社 / D-12 buhflipexplode raw snapshots 在 V0.1.2 data ownership cleanup 中物理删除，仅保留 source-registry git-history recovery pointer 作 retired audit reference
- D-17 米游社 + D-12 buhflipexplode runtime path **正式 deprecate**（runtime/export fail-loud if 引用 archived source ids）
- G01-G26 历史 source refs **保留作 release evidence**（per R6 渐进）+ 同时加 new-source parallel refs
- 新增 **G27 / G28**（new-source proof anchors）：1 个最新角色 + 1 个最新邦布
- `v1-replay-report.json` 扩展到 28 anchors，`releaseReady=true` 保持
- `packages/data/cleaned/runtime/game-data.json` 标 `runtimeCutoverReady=true`，`GameData.sourceVersion=nanoka-zzz@2.8`
- Release `v0.1.0`（**minor bump，schema breaking**，per R5）
- Release notes 标 "Schema migration: nanoka-exclusive source-backed data"

**Phase 4 cutover gate**：QA 8 gates 全 PASS（见 §9）+ 28 executable anchors PASS + archived source IDs 不被 runtime 引用。

**Phase 4 release gate**：release notes / CHANGELOG / README disclaimer 完成 + lo-user S2/S3 approve + registry smoke / provenance / GitHub Release 验证通过。

## 6. Matrix reference

**45-row canonical-generated matrix**（PR #55 task #127）权威基线，存于：
- `docs/data-source/nanoka-coverage-matrix.md`（人读版）
- `packages/data/cleaned/audit/nanoka-coverage-matrix.json`（机器版）

**Matrix status counts (PR #55)**：见 PR 文档。每字段含 `nanoka endpoint` + `raw field path` + `transform rule` + `sample entity` + `status` + `failed-research evidence`（如 needs-owner-research）。

**Schema-driven authority**：CI check 「canonical schema 每字段必有 inventory row」防 schema 变化漏字段。

**手工 A-J 清单 deprecated**：v0.1/v0.2/v0.3 中讨论版 A-J 仅作历史 reference，不作权威。

## 7. Golden anchor migration（渐进，per R6）

风险面：**G13 / G18 / G19 / G20 + G24-G26 = Excel-numeric-strong-dependency**（7 anchors）。其他 19 anchors 已多源 cross-check。

迁移策略：
- ✅ **Phase 4 cutover 时新增 G27 / G28** = 新源 (nanoka) proof anchors（1 最新角色 + 1 最新邦布）
- ✅ G01-G26 保留历史 Excel source refs 作 release evidence
- ✅ G01-G26 expected numeric values 维持不变；新源若给出不同值需 Product / TL ruling + 单独 PR + 决策日志记录
- ❌ 不一次性重写 G01-G26 source refs
- ⏸️ Phase 4 之后第 N 个里程碑可考虑给 7 strong-dep anchors 加 parallel new-source refs

## 8. README disclaimer + takedown response policy（per Q4）

### 8.1 README disclaimer 段（fairy + `@randomplay/data` 包 README 同步）

```markdown
## 数据来源声明 / Data Sources

本项目（@randomplay/data）汇总和清洗了来自 nanoka 等公开来源的 ZZZ 游戏内数值规则数据，
用于本地伤害计算用途。所有数据均派生自正式服已发布的游戏内容（per nanoka manifest.zzz.live）。

来源详情见 [`packages/data/source-registry.json`](packages/data/source-registry.json)，每条 cleaned 数据
均带 `sourceId` + `sourceVersion` + `sourceAnchor` 追溯字段。

**如有侵权，请联系作者删除：[联系方式]**

We will respond to takedown requests within 24-72 hours of receipt.
```

### 8.2 Takedown response policy

- 接收路径：GitHub issue (`takedown` label) + 邮箱（lo-user 主邮箱）
- 响应 SLA：24-72h（含周末延长到 5 个工作日）
- 响应内容：(1) 确认 takedown 范围 (2) 暂时 npm package deprecate（添加 deprecation message）(3) 起 emergency PR 移除涉源 cleaned data + rollback 到 fallback（archived Excel/D-17/D-12 baseline 重新激活，或 lo-user 调研新源） (4) 决策日志记录
- 不影响：fairy 代码（MIT）+ `@randomplay/core`（不含 data）

### 8.3 Legal residual risk acknowledgment

lo-user 已 explicitly 接受以下残余风险（per msg `74b52454`）：

- "如有侵权请联系删除" disclaimer 是 goodwill 不是 legal cure，不消除上游 copyright/ToS 违反责任
- Per-source legal classification 仍存在 `@randomplay/data` payload 中（不混在一起）
- 接收 takedown 通知后必须 24-72h 内实际响应
- Phase 4 release 前必须先完成 takedown response runbook（PR2 scope）

## 9. QA acceptance gates（per QA spec msg `78bf2ba3`）

8 gates 应用于 Phase 2-4 实施：

### Gate 1 — Formal-live source version
- Cleaned output 默认只能使用 `manifest.zzz.live` 对应版本
- `manifest.zzz.latest` 仅 research / drift input；除非 lo-user 显式 approve 不进 cleaned
- `source-registry` 含 `liveVersionRef: "manifest.zzz.live"` + `sourceVersion` + `fetchedAt` + `contentHash` + `approvedLiveVersions[]`
- Negative fixture: `3.0.2+15625449` / future DA period 进入 cleaned output 时 fail-loud

### Gate 2 — Matrix/schema completeness
- canonical schema 每个 source-backed 字段必须有 inventory row
- R1/R6 后不得残留 `retained-non-nanoka` 作 DA runtime；D-17/D-12 仅 `archived audit baseline / deprecated candidate until Phase 4 cutover`
- 鸣徽 row 必须 `removed / out-of-product-scope`，不可继续 `deferred`
- DA / Sentinel / patch-history rows 必须存在，并带 `status` + `promotable` + `blockedBy` + `sampleSource`

### Gate 3 — Evidence and promote rules
- `verified-from-nanoka` 必须有 URL pattern + raw JSON path + sample entity + hash/evidence
- `promotableNow=true` 必须额外有 deterministic transform + normalized sample expectation
- `promotable=false` 必须有具体 `blockedBy`，不能只写 "needs research"
- ❌ 不允许 silent fallback / 默认值填充 / 从非 nanoka 临时补值

### Gate 4 — DA formal-live gate
- 用 live `boss.json` + `zh/boss/{id}.json` fixture 验证 period/zones/buffs/monster/weakness/`boss_adjust` raw availability
- Period filter: `begin_time <= configuredLiveSnapshotDate`；future period → `rejected/forbidden rows`
- `boss_adjust` / score/HP / 场地规则语义未映射前，DA row 只能 `verified-from-nanoka`，不能 promotable/runtime cutover

### Gate 5 — Sentinel typed promote gate
- live character fixture 验证 `stats.rp_max` / `stats.rp_recover` / skill `fever_recovery` / `rp_recovery` raw availability
- typed promote 前必须 lock canonical naming + unit normalization；否则 `promotable=false`
- latest-only sample 仅标 research evidence

### Gate 6 — Patch history gate
- R4.a snapshot-derived numeric diff：输入只能来自 `approvedLiveVersions[]` + content hash
- ❌ 不得直接吃 latest/pre-release snapshots
- `snapshotDiffHistory` 标 `derived`；如官方 patch-note 不存在，标 `not-found / owner decision`，**不可伪造 prose changelog**

### Gate 7 — Missing-fields fail-loud
- 任一 required source-backed 字段缺 raw path / hash / transform / live approval → 进 `missingFields` / `deferredRows` / `forbiddenRows` 机器报告
- CI 必须能检测这些报告；release gate 不允许"报告存在但继续通过"

### Gate 8 — Phase 3 drift audit
- Phase 3 = nanoka output ↔ archived Excel / D-17 / D-12 evidence drift audit，**不是 runtime fallback**
- Drift report 必须产出 package-owned JSON：
  `packages/data/cleaned/audit/nanoka-drift-report/<syncId>.json`
- 人读报告路径：`docs/data-source/drift-reports/<syncId>.md`
- Drift status 枚举：`same` / `changed` / `missing` / `new` /
  `semantic-mismatch`
- `changed` / `missing` / `new` / `semantic-mismatch` 均进入 ruling queue；
  `same` 为 `not-required`
- 可执行命令：
  - `pnpm --filter @randomplay/data audit:source-migration --sync-id <syncId>`
  - `pnpm --filter @randomplay/data verify:source-migration --sync-id <syncId>`
- Exit gate：连续 2 sync `unresolvedCount === 0` + G01-G26 golden replay PASS
  + 新 G27/G28 source-backed anchors PASS
- `runtimeCutoverReady` 必须保持 `false` 到 Phase 4；Phase 3 不允许接回
  Excel/D-17/D-12 runtime fallback

### Phase 2 test files（5 个）

- `tests/data-source/nanoka-source-gate.test.ts`
- `tests/data-source/formal-live-version-gate.test.ts`
- `tests/data-source/missing-fields-failloud.test.ts`
- `tests/data-source/nanoka-da-source-gate.test.ts`
- `tests/data-source/patch-history-allowlist.test.ts`

## 10. Open decisions（待 Phase 2 实施后拍板）

| ID | 问题 | 决策时机 |
|---|---|---|
| D-20.OQ.1 | Phase 2 panel normalization formula 验证：与 G24-G26 已 ship Excel 数据一致后才能 promote | Phase 2 panel mapping |
| D-20.OQ.2 | 字段缺失阈值：candidate 覆盖率达多少 % 进 Phase 3？（建议 ≥ 95%）| Phase 2 末 |
| D-20.OQ.3 | Phase 3 并跑期：默认 2 sync / 2-3 周；如 drift unresolved 或 lo-user 指示，可延长到最多 6 周 | Phase 2 末 |
| D-20.OQ.4 | G27/G28 entities：选哪个最新角色 + 邦布 | ✅ resolved：G27 = 仪玄 `1371`，G28 = Plugboo `54008` |
| D-20.OQ.5 | Patch history schema 设计：snapshotDiffHistory 字段结构 + 多版本 diff 表达式 | Phase 2 patch tool |
| D-20.OQ.6 | nanoka manifest.zzz.live 何时 approve 新版本（如 2.9 上线）| live version 升级时 |

## 11. Cross-doc references

| 文档 | 关系 |
|---|---|
| `docs/product/decisions/index.md` D-07 数据规则源 | D-20 supersedes Excel 主源声明 |
| `docs/product/decisions/index.md` D-10 数据维护责任 | D-20 supersedes 「lo-user 提供 Excel 主源」 |
| `docs/product/decisions/index.md` D-12 buhflipexplode 算法处理 | **保留作 archived audit baseline**；Phase 4 cutover 时正式 deprecate runtime path |
| `docs/product/decisions/index.md` D-13 V1 范围收窄到危局强袭战 | DA 主源声明保留；新增 numeric 主源 = nanoka |
| `docs/product/decisions/index.md` D-16 Source priority | D-20 supersedes Excel base 优先级；新 priority: nanoka (numeric + DA) / archived Excel/D-17/D-12 (audit baseline only) |
| `docs/product/decisions/index.md` D-17 米游社 V1 抓取范围 | **保留作 archived audit baseline**；Phase 4 cutover 时正式 deprecate runtime path |
| `docs/product/decisions/index.md` CONFIRM-4 数据手写边界 | **保持不变**（L1 不破例 per Q3=a）|
| `docs/product/decisions/index.md` CONFIRM-11 数据源 | D-20 supersedes；「仅正式服」边界强化为 Formal-Live Gate (`manifest.zzz.live`) |
| `docs/data-contract/cleaned-schema-contract.md`（PR #52）| Schema contract，canonical = `packages/core/src/schema/*` |
| `docs/data-source/nanoka-coverage-matrix.md`（PR #55 latest）| 45-row coverage matrix 人读版 |
| `packages/data/cleaned/audit/nanoka-coverage-matrix.json`（PR #55）| 45-row matrix 机器版 |
| `docs/data-source/source-migration-candidates.md`（PR #51）| 三源 audit 历史记录 |
| `docs/data-source/da-sentinel-patch-nanoka-feasibility.md`（PR #54）| DA/Sentinel/patch feasibility audit |
| `docs/data-contract/source-adapter-contract.md`（PR #51）| Adapter contract |
| `docs/qa/golden-source-coverage.md` | Phase 4 新增 G27/G28 anchor entries |
| `packages/data/source-registry.json`（Phase 2 NEW）| Supply chain audit trail 实现 |
| `docs/data-source/takedown-rollback.md`（Phase 4 PR2 NEW）| Q4 takedown response runbook |

## 12. Phase / Milestone

| Phase | 内容 | Owner | 时间估算 |
|---|---|---|---|
| **Phase 0** | D-20 v0.1-v0.4 draft + 三方 review + 决策 lock | Product + TL + QA | done ✅ |
| **Phase 1** | Schema-first inventory + audit + matrix lock (PR #52/#53/#54/#55) | TL + QA | done ✅ |
| **Phase 1.5** | D-20 v0.4 PR（本文档）| Product | ~1-2 小时 |
| **Phase 2** | nanoka adapter + panel normalization + enemy variant mapping + DA semantic + Sentinel typed promote + patch diff tool + 9 deliverables | TL + QA validate | ~3-5 天 |
| **Phase 3** | Parallel period drift audit（2 sync + rulings + G27/G28 proof anchors）| TL + Product + QA + lo-user 必要时 | done ✅ |
| **Phase 4** | Runtime cutover + V0.1.0 release + G27/G28 executable replay + D-17/D-12 deprecate | TL + QA + lo-user release approve | cutover done ✅ / release prep in progress |

**总估算**：**~3-4 周 sprint**（默认 Phase 3 短窗口 per Q2 紧急），最长 ~7-8 周（Phase 3 conservative fallback）。

## 13. Risk Log

| Risk | mitigation |
|---|---|
| Phase 2 nanoka adapter `boss_adjust` / score-HP / period-filter semantic mapping 复杂 | TL audit 已暴露具体 raw 字段；Phase 2 用当前 live DA period 跑端到端 fixture 验证；QA Gate 4 enforce |
| Phase 2 Sentinel typed promote 单位/命名 mapping 错 | live character fixture 与已知 V0.0.4 character 行为对照（lo-user 实测）；QA Gate 5 enforce |
| Phase 2 panel normalization formula 与 G24-G26 数据不一致 | Phase 2 实施时 cross-check against G24-G26 已 ship 数据；QA Gate 3 evidence/promote rules enforce（panel typed promote 必须有 deterministic transform + normalized sample expectation）+ Phase 2 panel-specific acceptance check；TL ruling + Product surface |
| Phase 2 patch history `manifest.available` 含未 approved-live 版本 | R4.a allowlist gating + QA Gate 6 enforce；diff 输入只取 `approvedLiveVersions[]` |
| nanoka 停更（无 explicit SLA） | D-20 §4 supply chain audit trail + `lastVerifiedAt`；如停更 ≥ 6 周触发 source-switch evaluation；archived Excel V0.0.4 final + D-17 + D-12 snapshot 永久保留 |
| nanoka 收到 takedown notice | §8 README disclaimer + §8.2 24-72h SLA + fallback to archived Excel/D-17/D-12 baseline 重新激活 |
| nanoka 升级 `manifest.zzz.live` 自动跳 2.9（影响 Phase 3 drift） | adapter 检测 `fetchedLiveVersion != configuredLiveVersion` → fail-loud 等 lo-user approve；`approvedLiveVersions[]` 显式 extend |
| Phase 3 drift report 大量未 ruling 项 | 默认 2-3 周窗口 → 可配置延 6 周；lo-user 必要时介入 ruling；连续 2 sync 无未 ruling 才 exit |
| Phase 4 cutover D-17/D-12 deprecate 前发现新 corner case | archived audit baseline 仍保留；cutover 失败可临时回 D-17/D-12 runtime path（rollback PR + V0.0.5 patch）|
| Phase 4 G27/G28 anchor 数值与已 ship V0.0.4 数据有 drift | Product/TL ruling + 决策日志记录；可能 hold V0.1.0 ship 等修复 |

## 14. Doc state

- Version: **v0.6 V1.2.x historical DA addendum**（2026-05-16）
- Owner: @Product
- Cross-reviewer: @TechLead（Phase 2 实施）/ @QA（8 acceptance gates Phase 2-4 validation）
- Last update: 2026-05-16

## Changelog

- **v0.6** (2026-05-16) — V1.2.x historical DA addendum：lo-user 选择 D 方案，新增 dedicated `historicalDAPeriods` bucket；非当前 manifest-available DA snapshots 可进入历史查询 bucket，但必须标 `currentRuntime=false` / `releaseVersion != configuredLiveVersion`，不得放宽 current cleaned output Formal-Live Gate 或作为 runtime fallback。
- **v0.5** (2026-05-15) — Phase 4 release-prep fold-in：PR #75 runtime cutover 已合入 main（nanoka runtime `GameData` artifact/export、28 executable anchors、archived-source runtime guard、`runtimeCutoverReady=true`）。Phase 4 PR2 准备 V0.1.0 release notes / CHANGELOG / README disclaimer / takedown rollback runbook，并将 Phase 4 状态拆分为 cutover gate done 与 release gate pending。
- **v0.4.2** (2026-05-15) — QA review precision fold-in per PR #56 comment 4456471475：(1) §3 Resonium row 措辞修正为 "不进 formal data / 不进 matrix；现有 canonical schema `GameData.resonium` 字段 presence 为 compatibility-only，until V0.1.0 schema cleanup 显式移除或重定义"（避免与 PR #55 compatibility-only 边界冲突）；(2) §11 cross-doc references `source-adapter-contract.md` attribution 修正 PR #54 → PR #51（实际起源）
- **v0.4.1** (2026-05-15) — TL review precision fold-in per PR #56 comment 4453935202 / msg `547fbd05`：(1) §4.1 source-registry `urlPattern` → `urlAllowlist.{manifestUrl, versionedIndexUrls, localizedDetailUrls}`（覆盖 `manifest.json` + DA `/boss.json` index + localized detail 3 类）；(2) §4.2 / §4.4 Formal-Live Gate 分清 `current cleaned output` 与 `snapshot-diff historical input / archived audit fixture`：current cleaned 必须 == `configuredLiveVersion`，`approvedLiveVersions[]` 不放宽 current cleaned output；(3) §13 risk log "最新 DA period" → "当前 live DA period"；(4) §13 risk log panel normalization 引用 Gate 3 + Phase 2 panel-specific acceptance（替代 Gate 4 — Gate 4 是 DA-specific）
- **v0.4** (2026-05-15) — Final lock per lo-user `4b7cb27b`：R1/R4/R6 final lock + nanoka-exclusive for ALL source-backed data（含 DA）+ 鸣徽 removed + Sentinel+patch history 进 V0.1.0 scope（R4.a snapshot-diff）+ Formal-Live Gate (`manifest.zzz.live`) 新增 + 8 QA gates spec fold-in + 45-row matrix (PR #55) reference + D-17/D-12 retained as archived audit baseline until Phase 4 cutover + Phase 2 实施 deliverables 完整化
- **v0.3** (2026-05-14 18:08) — QA consistency fix msg `c9c49106`：§8 D-20.OQ.3 措辞与 §5/§10 对齐
- **v0.2** (2026-05-14 18:05) — QA quick review fold-in msg `169c67cc`：5 项 precision (Phase 3 configurable window + QA scope boundary + redistributionRisk enum + Phase 1 QA deliverables + Excel path fact-fix)
- **v0.1** (2026-05-14 17:55) — initial draft per lo-user msg `5ab319a7` + TL framing align：融合 Product OQ + TL 7 项技术风险 + TL pipeline 4 层 + 字段级 diff 5 类 + parser 边界 + license=release blocker + QA 5 acceptance gates + 米游社 scope（旧 framing，v0.4 已升级 nanoka-exclusive）+ zzz.gachabase.net 新候选（v0.4 已 deprecated by audit）

## Next action

1. @QA review V1.2.x PR-F historical DA bucket gates.
2. @Product / @Lo丶 decide the eventual version bump only after the full V1.2.x batch accumulation is ready to ship.
