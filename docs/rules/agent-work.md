# 仓库工作与停止规则

本文件规定 Fairy 仓库内工作的发现、范围、证据和停止边界。它不复制组织级协作流程，也不选择未来的 core、data、UI、CLI、package、API 或 release 路线。

## 开始工作

在第一次写入前：

1. 固定 fresh current main，并指认适用的 bounded task contract 和 affected scope。
2. 从文档索引按任务选择路线，只读取适用规则与权威。
3. 判断 proposed change 命中哪些工作分类：research、rule/spec/docs、behavior、data/content、UI/UX、tooling/maintenance、bug 或 external effect；分类不互斥。
4. 读取全部适用路线，确认每条路线的 authority 都完整且没有冲突，并确认 verifier 会经过真实路径。

不要默认恢复 Git history、reference 或旧实现中的设计。

## Bounded task contract

`bounded task contract` 必须是 active work surface 上由 decision owner 明确批准、可复核且仍适用于当前工作的记录，至少写明 affected scope 和获批的 bounded decision。开始工作时必须指认该记录，handoff 时必须保留同一指针。

它不进入 current spec 或 registry，也不能从普通聊天、history、observed implementation、tests 或 artifacts 中推断。

bounded task contract 不能让 proposed spec 提前成为 current authority。唯一可以构造与 current spec 不一致候选的情况，是 decision owner 明确批准[实现迁移](specs.md#implementation-migration)中的 exact atomic candidate；该批准只允许准备和评审同一原子候选，不允许拆分合并、提前部署或把 proposed spec 当作当前已生效行为。

## Decision owner

`decision owner` 是对 affected canonical authority 拥有明确 decision right 的 human repository maintainer，或由其明确委托的 human。agent、task assignee、reviewer 或 code author 不会仅因承担工作而自动成为 decision owner。

如果没有可确认的 decision owner、decision right 不清楚，或多位 decision owner 的结论冲突，这本身就是 conflicting authority：必须停止，报告候选 decision right 与冲突，并等待 human 明确解决。

## 条件读取

工作分类不是单选分支。一个 change 同时命中多个分类时，必须读取并满足全部适用路线；任一路线要求停止，整体工作就必须停止。不得选择较宽松的分类绕过 current spec、trust、compatibility、migration、verifier 或 external-effect 要求。

- **Research or exploration**：只有在明确 non-normative、不会改变 contract 时，才可在没有 current spec 的情况下继续；结论不能自动成为 authority。
- **Rule or spec work**：读取[规格定义与演进规则](specs.md)，并按 canonical source 与 lifecycle 处理。
- **Behavior, data, content, or UI work**：读取[当前有效规格](../specs/index.md)并定位 applicable spec。没有 applicable spec 且 bounded task contract 也不足时，必须停止。
- **Tooling or maintenance**：只有不改变 shipped、runtime 或 user-visible behavior 的 repo-internal 工作才是 `tooling-only`。它不强制创建 business spec，但仍须保持全部 applicable contract 并执行真实 verifier；一旦改变上述 behavior，就必须同时应用 behavior、UI 或其他命中的路线。
- **Bug work**：先查 applicable current spec。实现与 spec 冲突时，由 decision owner 先判断 spec 错误还是 implementation 错误；不得把 bug fix 自动当成 spec change。
- **History question**：只查询 `docs/HISTORY.md` 或 Git history；历史事实不能被提升为 current behavior authority。

按全部命中的路线读取，不要求任何任务先读完全部规则与 spec。

## Authority and refinement

authority 按以下边界协作，而不是互相覆盖：

1. project rules 管理工作过程和跨领域 invariant；
2. current spec 只在自身 declared scope 内规定 intended behavior；
3. human-approved bounded task contract 只能补 current spec 未覆盖的选择；
4. code、tests、fixtures、artifacts 和 live readback 只证明 observed behavior；
5. references、HISTORY 和 Git history 没有 current behavior authority。

获批的 atomic migration contract 是构造和评审 exact candidate 的过程授权，不是 proposed spec 的 current behavior authority；current main 在原子 merge 完成前仍受原 current spec 约束。

窄层必须 monotonic refinement：只能增加具体约束或解析上层明确留出的选择，不能削弱上层要求、扩大 scope、跳过 required core，或把 unsupported、unknown、missing authority 变成默认行为。

## 执行边界

- 只做满足 task contract 的 smallest complete change。
- 保持 exact scope；任何 source、scope、trust、compatibility 或 external effect 扩大都需要重新判断 authority。
- 同步适用的 docs、canonical fixtures、tests 和 verifier；不得维护第二套 oracle。
- 验证 happy、error、edge 和 negative guard，并保留 fresh exact-object evidence。
- 没有规范依据时，tests 通过只能证明 observed behavior，不能证明 contract 已获接受。

## 必须停止的情况

出现以下任一情况时，必须在**下一次仓库写入或外部写入前**停止：

- applicable authority 缺失或互相冲突；
- source、data provenance 或 trust boundary 未决定；
- public API、compatibility 或 migration 决定缺失；
- security、privacy、credential 或 external write 未获明确授权；
- unsupported behavior、default、warning、error 或 degradation 未定义；
- verifier 没有经过真实路径，或缺少决定性 acceptance；
- proposed change 扩大 source 或 declared scope；
- reference、HISTORY 或 observed implementation 被当作 current authority。

停止后必须：

1. 保留当前 worktree，不先做所谓“可逆”写入；
2. 报告 missing 或 conflicting authority；
3. 报告 affected scope 和 blocked decision；
4. 指明 required decision owner；
5. 等 canonical authority 明确后再继续。

不得静默选择某个来源，也不得临时把 reference 或 history 升格为 spec。

## Evidence and handoff

交付证据必须说明：

- frozen base、reviewed head、tree 和 exact file scope；
- 执行过的真实 verifier 与结果；
- scenario、negative 和 freshness evidence；
- 明确未改变的 surface；
- 剩余风险、证据限制和下一位 decision owner。

这些是工作证据，不得写入 current spec 或 registry。现有 lint、format 或 `pnpm check` 通过，只证明对应工具检查通过；除非另有获批的 checker 和 script，否则不得声称本协议已被 machine-enforced 或自动 fail closed。

## 中立路由场景

从 `AGENTS.md` 出发，每个场景必须在最多三次文档路由选择内到达 applicable authority 或明确停止，且不要求全量读取五个协议文件。

| 场景                    | 条件路线                             | 预期结果                                                                                                  |
| ----------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| data update             | 文档索引 → 本规则 → current registry | provenance 缺失时停止；不得用默认来源继续                                                                 |
| UI change               | 文档索引 → 本规则 → current registry | required states 或 accessibility 缺失时停止                                                               |
| tooling-only dependency | 文档索引 → 本规则                    | 不改变 shipped/runtime/user-visible behavior；可无 business spec，但仍须保持 contract 并执行真实 verifier |
| behavior bug            | 文档索引 → 本规则 → current registry | 与 current spec 冲突时由 decision owner 先判断 spec 或 implementation，不能自动改 spec                    |

registry 为空是合法 positive case：需要 current behavior authority 的工作明确停止，不得为通过流程而创建 placeholder spec。
