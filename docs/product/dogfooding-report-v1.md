# Fairy V1 · Dogfooding Report

- 文档版本：v1.0（release gate evidence）
- 报告人：@Product
- dogfooding 期间：2026-05-05 ~ 2026-05-07
- 试用人：lo-user 单人深度试用（DD-003 锁定）
- 整体打分：**4 / 5**
- 结论：**通过 release gate**

---

## 1. dogfooding 范围

按 `docs/product/dogfooding-v1.md` §1.2 执行：

| 维度 | 验证方式 | 结果 |
|---|---|---|
| **可用性** | 按 getting-started.md 从零跑通 | ✅ clone + install + S1/S2/S3 alias + verify:golden-v1 全过 |
| **可读性** | CLI 输出能看懂 / trace + sourceRefs 够解释 | ⚠️ 默认输出反馈"太复杂"→ 触发 D-19 reform，已修 |
| **数值正确性** | S1/S2/S3 + 自建 snapshot 数值符合预期 | ✅ 安比核心技 F + basic 16 + 杜拉罕 defense 952.8 → nonCrit=224 / crit=336 / dazeValue=37.536，三方校对通过 |
| **错误友好性** | ERR-* 文案能让试用人 self-recover | ⚠️ Day 3 边界探测 lo-user 决策跳过，未触发 ERR 文案验证；记 known limitation（§4） |
| **范围漏洞** | 想算但 V1 不支持 | 未报告 |

---

## 2. dogfooding 反馈卡（汇总）

### F-2026-05-06-01：默认 CLI 输出过于复杂
- **类别**：U-Scenario
- **现象**：lo-user 试用 Day 1/2 反馈默认 `fairy calc` 输出包含 `attackSegments / buckets / modifiers / trace` 全字段太多，需要 jq 过滤才能看到核心结果
- **期望**：默认输出简洁，需要详尽时 opt-in
- **解决**：D-19 V1 CLI 输出 reform — `--view brief|verbose` 默认 brief，`summary.lanes.{nonCrit, crit, fixed}` + `summary.daze` 一眼看懂
- **修复 PR**：#30（commit `74c5f83`）
- **状态**：✅ 已修 + lo-user 验证通过

### F-2026-05-06-02：暴击 / 不暴击应并列展示，废 expectation 默认
- **类别**：U-Scenario / B-Calc.non-blocker（输出形态）
- **现象**：原默认输出含 expectation 加权平均；玩家对账时不直观，希望直接看到 nonCrit / crit 两栏并列
- **期望**：默认 nonCrit + crit 双值；expected 可选
- **解决**：D-19 同 PR：summary lanes 双栏 + `--result-mode expected` 保留可选
- **修复 PR**：#30
- **状态**：✅ 已修

### F-2026-05-06-03：自建 snapshot 流程
- **类别**：U-Scenario（dogfooding 体验，非 bug）
- **现象**：lo-user 想自建 my-anby-snapshot.json 测自己队伍，但需要查游戏内权威数值（base attack / 倍率 / boss defense 等）
- **期望**：有人帮查权威数据
- **解决**：TL 协助提供 Excel 数据源对照（task #62 / #63）；Anby fixture 加入正式 fixture 集
- **状态**：✅ 已解决；安比 fixture 入仓作为 dogfooding regression baseline

### F-2026-05-06-04：G22/G23 manual acceptance + provider/skill-level fail-loud
- **类别**：B-Calc.blocker（实施期间发现）
- **现象**：QA 在 PR #28 review 中发现 C 模板（Yanagi 极性紊乱）在缺 provider 或缺技能等级时会 silent fallback 到 1 级 / 0 精通，违反"技能等级必须明确"心智
- **期望**：fail loud
- **解决**：schema 层加 fail-loud 校验 + 负向测试
- **修复 PR**：#28 commit `3f5e67a`
- **状态**：✅ 已修 + QA 二次复核通过

### F-2026-05-08-05：米游社 sourceConflict 3 条 audit 决议
- **类别**：D-Data（dogfooding 期间触发的 audit gate，非 calc bug）
- **现象**：cleaned typed modifier 留存 3 条米游社 vs buhflipexplode 危局强袭战 buff 数值冲突（21 澄意 / 8 灼冽 / 1 破招），Day 0 标记 non-blocking 但 release 前需要拍板
- **期望**：人工 audit + 决议
- **解决**：lo-user 用 nanoka (`https://zzz.nanoka.cc/boss/`) 作为人工查询源（不接管线），三方比对结果 nanoka 与 buhflipexplode 一致（2:1 vs Mihoyo）；lo-user 决策 `Q1，按 buhflipexplode`，cleaned release evidence 记录为 `resolved-prefer-buhflipexplode`，Mihoyo 原值与 sourceRefs 保留作为审计线索
- **修复 PR**：#33 commit `04e7077`（task #72）
- **状态**：✅ 已决议，audit 文件入仓 `data/cleaned/audit/mihoyo-buhflipexplode.source-conflicts.json`

### F-2026-05-08-06：CLI framework 切 citty
- **类别**：U-Scenario（dogfooding 期间触发的 CLI baseline 收敛，非 calc bug）
- **现象**：现有 CLI 是手写 thin shell（parseArgs + switch），lo-user 询问 unjs 生态 citty 是否更合适
- **期望**：V1 release 前在 baseline 阶段切换，避免 V1.x 再做 breaking 迁移
- **解决**：TL 调研后确认 citty 更贴合 ESM-first / 类型安全 / 命令子树扩展，实施迁移
- **修复 PR**：#34 commit `4c7b753`（task #73）
- **状态**：✅ 已合入 main + QA 回归通过

---

## 3. lo-user 整体打分

**4 / 5**

dogfooding 通过 release gate（≥4/5）。

### 4/5 而不是 5/5 的可能失分点

> 待 lo-user 选填 — 暂无具体失分项；按"无具体失分点"记录。如果 lo-user 后续想补充，可作为 V1.x backlog 触发条件。

---

## 4. 已知限制（V1 release notes 待标注）

- **DD-003 单人 dogfooding 限制**：V1 仅由 lo-user 单人深度 dogfood 验证 + QA 回归，**未经社区广泛验证**
- **V1 黄金集 = 19 anchors**（D-13 errata）：G13 / G18 / G19 / G20 原推迟到 V1.x；截至 2026-05-14，G13 / G18 / G19 / G20 均已进入 executable replay，当前无 deferred golden anchor
- **米游社 sourceConflict 3 个**（21 澄意 / 8 灼冽 / 1 破招）：~~non-blocking historical 记录，cleaned typed modifier 发布前需人工 audit gate 触发时再决~~ → ✅ 2026-05-08 已 audit 决议（accept buhflipexplode；F-05 / PR #33），不再属于 known limitation，转记为已解决项
- **dogfooding 边界探测 Day 3 跳过**：lo-user 决策跳过 Day 3（`--lang en` 验证 / 故意造错 ERR-* 验证），release 后视真实使用反馈再决定是否回补；属 known limitation，不阻塞 release

---

## 5. release-readiness gate

按 `docs/product/dogfooding-v1.md` §4.1 检查：

| 条件 | 状态 |
|---|---|
| B-Calc.blocker：0 件未修 | ✅ 0 件 |
| B-Calc.non-blocker：已重新分类 | ✅ F-02 归 U-Scenario，已 absorbed by D-19 |
| U-ErrCopy / U-Scenario：可修已修，不修加 known limitation 注解 | ✅ F-01 / F-02 / F-03 / F-06 已修；Day 3 跳过记 known limitation |
| D-Data：audit gate 决议落地 | ✅ F-05 已决议（accept buhflipexplode），audit 文件入仓 |
| P-Range：全部入 V1.x backlog | ✅ G13/G18/G19/G20 已完成；其他无新增 |
| lo-user 整体打分 ≥ 4/5 | ✅ 4/5 |

**通过 release gate**。

---

## 6. 后续流程

按 `docs/product/dogfooding-v1.md` §4.2 + 2026-05-08 release decisions：

**release 决策快照**（lo-user 拍板）：
- npm scope: `@randomplay/data` / `@randomplay/core` / `@randomplay/cli`（root = `fairy-monorepo`，CLI bin 仍 `fairy`）
- 起始版本 `v0.0.1`（与 design-system 同节奏）
- npm publish = 是（OIDC + Trusted Publisher，复用 design-system DS-D-09）
- release artifact = git-cliff generated `CHANGELOG.md` + GitHub Release page
- 公告 = 仅 #fairy
- rollback = 完整 runbook（npm deprecate + revert PR + GitHub Release pre-release）

**5-Phase 流水线**：

1. ✅ lo-user 宣布通过 + 打分（2026-05-07 00:58）
2. ✅ Product 整理 dogfooding-report-v1.md（本文件）
3. ✅ Phase 1 包名 rename PR #35（`@fairy/*` → `@randomplay/*`，commit `dd78a4b`）+ Phase 2 release workflow PR #36（bumpp + allowlist publish + OIDC，commit `a0ca3e6`）
4. ✅ Phase 3 PR #31 refresh + QA re-pass + Product squash merge；Product 起 errata PR：DD-001（米游社 D-17 + 2026-05-08 audit 决议）+ DD-002（D-13 19 anchors）+ DD-003（dogfooding gate）+ V1 release notes 草稿
5. ✅ Phase 4 lo-user 首发 v0.0.1 + 在 npmjs.com 配 Trusted Publisher
6. ⏳ Phase 5 v3 release CI OIDC 验证：迁移到 canonical v3 runbook 后，以 v0.0.2
   作为实弹 ship evidence。

---

## 附录 A · dogfooding 期间合入的关键 PR

| PR | 内容 | commit |
|---|---|---|
| PR #28 | G22/G23 manual acceptance + fail-loud | `3f5e67a` |
| PR #30 | D-19 CLI 输出 reform（brief view + lanes） | `74c5f83` |
| PR #33 | 米游社 sourceConflict audit 决议（accept buhflipexplode） | `04e7077` |
| PR #34 | CLI framework 切 citty | `4c7b753` |
| PR #35 | npm scope rename `@fairy/*` → `@randomplay/*`（root `fairy-monorepo`，CLI bin `fairy` 不变） | `dd78a4b` |
| PR #36 | release workflow + package-readiness（bumpp + allowlist publish + OIDC + rollback runbook；后续由 canonical v3 migration supersede） | `a0ca3e6` |

## 附录 B · 整体打分明细（lo-user 自评）

1. 安装是否成功？花了多久？卡在哪？— 成功 / 一次跑通
2. 跑过哪些命令？— calc + verify:golden-v1 + S1/S2/S3 alias + 自建 my-anby-snapshot
3. 输出能看懂吗？哪里看不懂？— 默认输出曾"太复杂"反馈触发 D-19 修复，修后看懂
4. 数值是否对得上预期？— 安比 nonCrit 224 / crit 336 / dazeValue 37.536 三方校对通过
5. 想算但 V1 不支持的场景？— 未报告
6. 整体 1~5 分？— **4 / 5**
