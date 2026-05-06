# Fairy V1 · Dogfooding Runbook v0.1

- 文档版本：v0.1（Product 起草，定稿入仓 `docs/product/dogfooding-v1.md`）
- Owner：@Product
- 起始：2026-05-05
- 形态：repo-local CLI baseline（非 npm 全局）
- 试用人：**仅 lo-user 一人深度试用**（DD-003 锁定）
- 已知限制：V1 仅由 lo-user 单人 dogfood 验证 + QA 回归，未经社区广泛验证

---

## 0. 文档关系

- **本文件**：dogfooding 流程（试用人怎么参与 / 反馈怎么收 / 怎么分类 / release trigger）
- **`docs/getting-started.md`**（TL 已交付 PR #29 / commit c216157）：技术上手 + 5 命令 + S1/S2/S3 示例
- **`docs/ux/starter-scenarios.md`**（UX）：场景叙事 + 字段说明 + 黄金锚点关联
- **本文件不重复技术细节**，按"参考 `docs/getting-started.md` §X"引用

---

## 1. Dogfooding 范围与目标

### 1.1 V1 release gate（DD-003 锁定）
1. ✅ 黄金集 19 anchors 全 pass（PR #28 已达成）
2. ⏳ **lo-user 单人深度 dogfood 通过**（本文件覆盖）
3. ⏳ Product errata PR 合入（DD-001 米游社 + DD-002 19 anchors + DD-003 dogfooding gate）

### 1.2 dogfooding 验证什么
- **可用性**：能否按 getting-started 从零跑通
- **可读性**：CLI 输出能看懂吗？trace / sourceRefs 是否够解释
- **数值正确性**：S1/S2/S3 是否符合预期；改自己的队伍后是否合理
- **错误友好性**：ERR-* 文案是否能让试用人 self-recover
- **范围漏洞**：是否有"想算但 V1 不支持"的常见场景

### 1.3 不验证什么（V1 范围外）
- 浏览器 / Web UI（V2）
- npm 全局发布（V1.x 决定）
- 社区使用（DD-003 已声明 V1 限制）

---

## 2. 三日推荐流程（弹性，无强制 deadline）

### Day 1 · 上手 + S1/S2/S3 跑通
1. clone repo → install → run `pnpm test` + `verify:golden-v1`（按 `docs/getting-started.md §1`）
2. 跑 `pnpm --silent fairy:s1` / `:s2` / `:s3`（§2）
3. 每个示例：
   - stdout 是否纯 JSON？`| jq empty` 通过？
   - `errors[]` 是否为空？
   - `summary.displayTotalDamage` 是否合理？
   - 看 trace + buckets，理解每段乘区贡献
   - 看 modifiers + sourceRefs，验证来源标注
4. **保留产物**：S1/S2/S3 三命令的 stdout 文件或摘要保存到 `docs/product/dogfooding/day1-stdout/`（或在反馈卡附摘要），供 QA 复核
5. **填 Day 1 反馈卡**（见 §3）

### Day 2 · 改自己的队伍
1. 复制 `examples/snapshots/s1-yixuan-sheer.json` 到本地
2. 改成你自己的队伍配置（队员 / 面板 / boss）
3. 跑 `pnpm --silent fairy -- calc <yourfile> --lang zh --pretty`
4. 验证：
   - 数值与游戏内显示对得上？（理论值 vs 显示值）
   - 与你已有的攻略对账锚点对得上？
5. 跑 `compare`（A/B 配装）+ `scan`（乘区曲线）
6. **填 Day 2 反馈卡**：B-Calc 类反馈**必须附最小复现 snapshot（脱敏后）+ 完整命令**，否则 TL/QA 无法复现

### Day 3 · 边界探测
1. 故意制造错误：缺字段 / 错误 ID / 错误数值范围
2. 验证 ERR-* 文案是否友好（能说清是什么错 + 怎么修）
3. 边界场景：DA 期次切换 / Nicole+Yanagi acceptance toggle on/off / 紊乱 vs 异常
4. **试 `--lang en`**：英文输出整体流畅？术语映射一致？翻译错位？（D-A 双语承诺验证）
5. 列出"想算但跑不通 / 跑出来怀疑"的场景
6. **填 Day 3 反馈卡 + 整体打分**

---

## 3. 反馈分类与路由（4 类 + Owner）

| 类别 | 触发条件 | Owner | 处理路径 |
|---|---|---|---|
| **B-Calc / blocker** | crash / schema false-negative（合法输入被误拒）/ V1 支持场景数值错 / JSON stdout 被污染 | @TechLead + @QA | 必修；TL 起 PR + QA 回归 |
| **B-Calc / non-blocker** | unsupported 场景 schema error / 输入不完整导致的 ERR / trace 可读性问题 | 重新分类为 P-Range / U-* / known limitation | 不直接算 release blocker |
| **U-ErrCopy** ERR-* 文案不友好 | 看不懂 / 缺关键信息 / 误导 | @UX | micro-PR 修 `messages.{zh,en}.json` |
| **U-Scenario** 示例 / starter-scenarios 难懂 / 命令复杂 / 文档不易读 | 跑不通 / 字段意义不清 / 命令路径卡 | **@UX 主（first responder）/ @TechLead 协作** | UX 评估 root cause 后定 micro-PR 范围（叙事 → UX；命令路径 → ping TL；getting-started 文案 → ping TL + UX 出文案建议；数值不对 → 转 B-Calc） |
| **P-Range** V1 范围漏洞 | 想算但 V1 不支持 | @Product → V1.x backlog | 入 backlog，不修 |

### 反馈卡格式（每条独立）
```
ID: F-2026-05-XX-NN
日期: yyyy-mm-dd
类别: B-Calc.blocker / B-Calc.non-blocker / U-ErrCopy / U-Scenario / P-Range
命令: pnpm --silent fairy:s1
快照文件: examples/snapshots/s1-yixuan-sheer.json（或自定义路径）
最小复现 snapshot: <B-Calc.blocker 必填，脱敏后内联或附件>
现象: <一两句描述发生了什么>
期望: <描述你期望发生什么>
stdout 摘要: <相关字段或 ERR-* code 或 raw stderr>
备注: <自由写，例如 raw stderr 文本，UX 自分类 MISSING-KEY / UNFRIENDLY 用>
建议: <可选>
Owner: <自动按类别填>
```

---

## 4. release 触发条件

### 4.1 dogfooding 通过 = 同时满足
- **B-Calc / blocker**：0 件未修
- **B-Calc / non-blocker**：已重新分类
- U-ErrCopy / U-Scenario 类：可修的已修；不修的有显式 known limitation 注解
- P-Range 类：全部入 V1.x backlog（不阻塞 V1）
- lo-user 整体打分 ≥ 4/5（自评）

### 4.2 通过后流程
1. lo-user 在 #fairy 宣布 "dogfooding 通过 + 整体打分 X/5"
2. Product 整理 dogfooding-report-v1.md（反馈清单 + 修复 PR 列表 + 已知限制）+ 入仓 `docs/product/dogfooding-report-v1.md`
3. **QA release-readiness review task**（独立 task，不替代 lo-user dogfood）：
   - 重跑 `pnpm check` / `pnpm test` / `verify:golden-v1` / S1/S2/S3 alias + `jq empty`
   - 抽查本轮 B-Calc.blocker 修复项是否通过回归
   - 输出 release-readiness 证据
4. Product 发 errata PR（DD-001 + DD-002 + DD-003 + dogfooding-report 链接）
5. Product errata + V1 release notes 合入后 → V1 正式发布
6. **release 形态（git tag 命名 / 是否 npm publish）待 errata PR 时一并定**

### 4.3 不通过怎么办
- B-Calc / blocker 必修：循环 TL 修 → QA 回归 → lo-user 重测受影响场景
- 如果 dogfood 暴露 **core formula 级问题**，Product 重新评估 V1 发布节奏（可能延期或缩范围）
- 整体打分 < 4：lo-user 加注 known limitation 或推到 V1.x

---

## 5. 时间预算

- **Day 1~3**：上手 + 自队伍 + 边界（建议但不强制连续 3 天，弹性）
- **修复期**：依赖发现的 B-Calc 数量；预估 3~7 天
- **errata + release**：1 天

总预算 **~1~2 周**，无 deadline，按 lo-user 节奏走。

---

## 6. 与 ayingott-me 的优先级关系

lo-user 17:14 已锁：**fairy 优先**。dogfooding 期间 ayingott-me 的设计推进继续是后台任务，UX 在 fairy 间隙推进 design v0.1。

---

## 附录 A · 反馈清单（活页）
（dogfooding 进行时 lo-user / Product 在这里累积所有 F-* 卡片）

## 附录 B · 整体打分模板
1. 安装是否成功？花了多久？卡在哪？__
2. 跑过哪些命令？__
3. 输出能看懂吗？哪里看不懂？__
4. 数值是否对得上预期？__
5. 想算但 V1 不支持的场景？__
6. 整体 1~5 分？__ 为什么？__
