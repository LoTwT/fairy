# Meeting Notes: Cleaned Schema 设计讨论会

- 日期：2026-05-05 14:55 ~ 15:48 UTC+8
- 地点：Slock #fairy thread `04d8ffe6`
- 参与：@lo-user / @Product / @TechLead / @UX / @QA
- 主持：@Product
- 决策范围：`@fairy/data/cleaned/*` schema 设计的全部边界

---

## 议程

1. TechLead 输入材料过一遍（Excel sheets / buhflipexplode 数据形态 / 米游社页面结构）
2. cleaned 实体清单 + 字段范围 + source 归属
3. 三方数据合并策略
4. package exports 子路径 + import API
5. 数据更新节奏
6. lo-user 临时议题

---

## 1. 输入材料摘要

### 1.1 data.xlsx（@lo-user 2026-05-05 上传）

- workbook 版本 `2.6.0_R14028417`
- 31 sheets：26 visible + 5 hidden
- base data sheet：`代理人技能数据` / `代理人属性` / `敌人属性` / `异常条` / `敌人属性调整` / `音擎属性` / `音擎描述` / `驱动盘描述` / `邦布属性` / `邦布技能`
- 文本/说明 sheet：`代理人技能描述` / `代理人核心技描述` / `代理人影画描述` / `敌人强化` / `敌人转阶段` / `关于打断与抗打断` 等
- hidden sheet 是升级/成长曲线
- 注意：`敌人属性` 与 `敌人属性（1.3版本）` 并存

### 1.2 buhflipexplode DA raw snapshot（PR #19 已留档）

- live-only：35 期正式服 `1.4.1` 到 `2.7.3`；`2.8.1` 到 `3.0.3` 非正式服已排除
- `da-versions.live.json` 字段：`versionName / versionTime / versionBuffIDs / versionHPMult / versionDazeMult / versionAnomMult / versionEnemies[{id,type}]`
- `enemies.live.json`：16 个 DA enemy（仅 boss slot，无普通/精英敌人全集）
- `buffs.live.json`：54 个 DA buff
- 有 unresolved boss 不在 Excel 2.6.0：`Sanguine Sweeper` / 猎血清道夫

### 1.3 米游社页面结构

- 列表页 https://baike.mihoyo.com/zzz/wiki/channel/map/13/108
- 公开 list API：`/common/blackboard/zzz_wiki/v1/home/content/list?app_sn=zzz_wiki&channel_id=108`
- 详情页 API 未确认；可能需要 HTML 解析

---

## 2. 决策项与意见演进

### 2.1 deadly-assault 数据位置（A）

- **结论**：选项 1（独立 domain `@fairy/data/cleaned/deadly-assault`）
- TechLead 倾向：避免扩 `GameData.events` 牵动 core schema、CLI snapshot、golden fixture
- UX 倾向：与 prompt-templates v1.0 解耦
- QA 倾向：DA 是 event overlay 不应过早扩 base schema
- @lo-user 拍板选 1

### 2.2 未来 game mode 结构（B）

- **结论**：选项 1（每个 game mode 各自独立 domain；待第二个落地后再抽公共 event interface）
- @lo-user 拍板选 1

### 2.3 Excel 历史敌人表 / DA 数据范围（C 演进）

**最终决策（V1 主 DA + Excel 后备）**：
- V1 优先 `cleaned/deadly-assault`：boss slot / HP / daze / anomaly / buff / multiplier 直接以 buhflipexplode 为主源
- `cleaned/enemies` 全局 enemy base 不作为 V1 必交付
- Excel `敌人属性`保留 raw archive 作为 V1.x+ 扩展源
- DA boss 能映射 Excel 时补 `baseEnemyRef`；映射不到（如 Sanguine Sweeper）→ `externalBossId + sourceRefs + unresolvedMapping`，不阻断 DA domain

**演进**：
1. lo-user 原提议：仅用 buhflipexplode BOSS 简化
2. TechLead 反提议（实测 Excel 412 unique enemy vs buhflipexplode 16 DA boss）：仍 Excel 主源
3. lo-user 修订："V1 主要支持危局强袭战，buhflipexplode 更快，Excel 后备"
4. 团队 4 方接受新框定 + 黄金集 V1 收窄到 20 锚点

### 2.4 米游社详情 API（D）

- **结论**：选项 1（HTML 解析 + selector drift gate）
- TechLead schema PR 阶段再尝试找 API，找不到 lo-user 人工辅助
- @lo-user 拍板选 1 + 人工辅助

### 2.5 package exports 子路径（E）

- **结论**：V1 全做 4 入口
  - `@fairy/data/cleaned`（总入口）
  - `@fairy/data/cleaned/<domain>`（按 entity / domain）
  - `@fairy/data/types`（TS 类型独立入口）
  - `@fairy/data/cleaned/i18n/<domain>`（i18n 资源）
- @lo-user 拍板"V1 就可以"

### 2.6 lo-user 新设想：cleaned data 直接 typed modifier

- **结论**：完整接受，落地形态：

**双层结构**：
- Layer 1 原文层 `sourceText` / `localizedText`（核心技 / 音擎 / 驱动盘 / Buff 描述原文 + i18n + 人工复核）
- Layer 2 计算层 `modifiers[]` / `calculationEffects[]`（typed modifier 完整结构，与 PR #5/#10 一致）
- 风险层 `unparsedEffects[]`（不能可靠归类的效果，blocking/non-blocking 分级）

**bucket enum 受控**：严格匹配 glossary v0.4 D-11 锁定 enum；不允许自由字符串

**效果分级**：
- L1 静态属性增益 → 直接 typed modifier
- L2 静态条件触发 → typed modifier + Condition DSL when
- L3 动态参数 → handler ID + params
- L4 时序触发 → V1 必须 `requiresActivation: true` + snapshot 显式 active；data 不假设持续时间状态

**确定性 pipeline**：
- 固定表格字段自动转换
- 已知文本模式 parser/template registry
- 每条转换记录 `sourceTextHash + parserVersion + effectTemplateId + sourceRefs`，文本/parser 变化 fail loud
- AI 候选不能直接入 cleaned，必须 schema validation + golden/parity test + 人工接受记录

**人工不可消除**：但可控 — 每次新数据 release 才需要 audit unresolved；不修就不发布

### 2.7 V1 黄金集范围（A 选项 = 收窄）

- **结论**：黄金集 V1 收窄到 20 锚点
  - 推迟到 V1.x 数据扩展：18 部位破坏典型真实伤害 / 19 凶心疯汉失衡恢复时间 / 20 装甲哈提失衡恢复时间
  - V1 保留 1-17 + 21-23（DA 场景 + 队伍 1~3）
- 4 方一致推荐 A
- @lo-user 拍板选 A

### 2.8 i18n 边界与路径

- **结论**：完全分离两个 i18n 体系
  - **data 包 game labels**：源码 `packages/data/src/i18n/<domain>.{zh,en}.json` → 发布 `packages/data/cleaned/i18n/`（TL 维护）
  - **UX runtime error catalog**：`docs/ux/i18n/messages.{zh,en}.json`（UX 维护，含 ERR-* 33+ 条）
  - 两者职责不重叠

### 2.9 Source priority + multi-source metadata

- **结论**：
  - Excel = base entity 主源
  - buhflipexplode = DA event/enemy overlay
  - 米游社 = 中文 i18n / 描述源
  - 冲突时 fail loud + manual review，不自动覆盖
  - entity-level `sources[]` + 关键数值字段级 `sourceRefs`，trace 可解释合并来源
  - 发布前测试断言 required fields 没 sourceRef 失败

### 2.10 Unknown policy

- **结论**：分两级
  - **blocking**：影响计算 / 匹配 / source 追溯 → 阻断 cleaned 发布
  - **non-blocking**：纯描述缺失等 → warning 可发布，manifest 可查
- 不补假数据；不静默降级

### 2.11 ERR keys 新增

- **结论**：UX 跟随 schema 设计 PR 的 diagnostic contract 同步加 catalog
  - `ERR-DAT-005` blocking：multi-source conflict / 未解析 modifier 影响计算
  - `ERR-DAT-006` 或 `ERR-UI-004` non-blocking warning：locale mapping unresolved / 展示缺失

### 2.12 core 热替换 / 热增减

- **结论**：已 PR #5（数据契约）+ PR #10（core 引擎）实现，schema PR 显式说明
  - `TypedModifier[]` 数组 — 可热增删
  - handler registry — 已注册 handler 可热替换 params
  - Condition DSL — `appliesTo` + `when` 任意组合
  - bucket 受控 enum 严格匹配
  - `active: boolean` — snapshot 可禁用某增益
  - `overrides + fieldProvenance` — 玩家可覆盖 data 派生值（CONFIRM-13）

---

## 3. 待办连锁影响

| 项 | Owner | 状态 |
|---|---|---|
| TechLead 出 cleaned schema 设计文档 PR（task #47） | @TechLead | claim 完成，PR 起草中 |
| Product 出会议纪要 + decisions log update（task #49，本文件） | @Product | claim 完成，PR 起草中 |
| UX starter-scenarios v0.4.1 patch（S2 月城柳异常 enemy 替换为 DA-mapped boss + 部位破坏 / 失衡恢复时间 V1.x errata），等 schema PR 合入后启动 | @UX | task #48 claim 完成 |
| ERR-DAT-005 / ERR-DAT-006 加 catalog（schema PR 合入后） | @UX | 跟随 schema PR 后启动 |
| 实施 PR：#42 米游社抓取（HTML 解析 + selector drift gate） | @TechLead | 等 schema PR 合入 |
| 实施 PR：#43 黄金集 20 锚点真数据复算 | @TechLead + @QA | 等 schema PR 合入 |
| #40 Excel reader（V1 不做实际清洗，仅 raw archive） | @TechLead | V1.x+ |

---

## 4. 关键决策快照（写入 decisions log）

- **D-13** V1 范围收窄至危局强袭战（V1 = DA 计算器；通用敌人 / 部位破坏 / 失衡恢复时间在 V1.x）
- **D-14** typed modifier cleaned data 双层结构 + 确定性 pipeline + 人工 audit gate
- **D-15** V1 package exports 4 入口全做 + i18n 路径源/发布分离
- **D-16** Source priority + multi-source metadata + unknown policy 分级 + V1 黄金集收窄到 20 锚点

详见 [`docs/product/decisions/index.md`](../decisions/index.md)。

---

## 5. 流程

1. ✅ 4 方讨论收敛（本文件）
2. ⏳ TechLead schema 设计 PR（task #47） + Product 会议纪要 PR（task #49）并行
3. lo-user review 通过 → TechLead 启动实施 PR（#42 / #43）
4. UX 跟随同步 patch + ERR catalog
