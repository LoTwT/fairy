# PR 6 执行 prompt

在 Fairy 主工作区 `/Users/caoyujie/codes/fairy` 实施“首批自动效果规则接入”。本次任务由用户明确要求使用 `gpt-6-astra`、`high`，并授权完成实现、review 修复、提交、推送及创建 PR。

## 当前准备状态

- 已使用 LoTwT 的操作级凭据核实并抓取远端 main，本地 main 为 `9d75cb11cabadaaceb4cac01d1dbe4a29a01f2d2`，包含 #166 的运行时校验修复。
- 主工作区原先干净，当前分支为 `codex/pr6-automatic-effect-rules`，从上述 main 创建。保留此分支与主工作区，不另外新建 worktree。
- 协调任务已编写实施规范及本 prompt；这些未提交文档是本任务的一部分，保留并随实现一起审查、提交，不当成无关用户改动丢弃。
- 规范入口为 `docs/index.md`，具体任务规范为 `docs/specs/effects/automatic-rules.md`，游戏证据与限制仍以 `docs/specs/effects/examples.md` 为唯一记录位置。

## 实施要求

1. 先读取适用 AGENTS.md 和任务规范，核对分支、基线及已有变更。用户已要求实施，不需要再为同一计划请求批准。
2. 按规范完成正式自动规则 JSON、明确的 npm 子路径、消费说明和真实制品的端到端验收。当前必交规则为玲珑妆匣 `w-engine:14131:energy-on-entry` 的一次基础回能请求；复用已有 `EffectEngine`。
3. 核对 Nanoka 3.1 中英文来源与全部精炼档位。逐项检查四组对象在实例页列出的证据缺口，更新准确状态。来源不足的机制维持受限，不能凭合成测试、第三方计算器、猜测或开关配置将其发布为已验证规则。
4. 精确遵守 `EventRequest.baseAmount` 边界：自动生成基础回能请求不代表最终能量结算或能量效率适用性已核实。不得把请求反复执行，也不得把普通切人伪装成支持的入场事件。
5. 保持 starter 三条规则及现有包依赖方向兼容；只在真实证据闭合且同步补充验收后扩展自动集。没有必要不改变 effects/core 公共 API。
6. 遵守数据管理读取和维护契约，使用经验证的静态发布副本或持锁读取；禁止擅自生成、更换或清理真实 raw/integrated/管理记录。普通构建测试不代替异常现场处置。
7. 使用有意义的回归与制品消费测试验证规范矩阵。最终运行 `pnpm check` 及适用的 `pnpm --filter @randomplay/data verify:browser`，记录真实结果，不用跳过测试或缩减断言获得通过。

## Review 与发布顺序

先完成实现和必要自检，向协调任务报告当前 diff、规则范围、证据限制、验证结果以及需审查事项，暂不提交和推送。协调任务会进行独立内容 review；收到发现后直接修改并复验，不要求用户再次授权同范围修复。

收到协调任务明确的 review 通过结论后，继续本次已授权的提交、推送和开 PR 流程，不停在“建议下一步”。按适用 git-commit、git-push、git-pr-submit 技能执行，保留 hooks 和签名配置。

本任务新任务执行者的提交 provenance 已由用户指定：`Agent-Model: gpt-6-astra`、`Agent-Effort: high`；这两个值只覆盖本 PR 6 任务中该执行者的提交，来源标记为 user-specified。作者和提交者使用全局约定的 `eruoos <github@eruoo.me>`，仅设置操作级环境。Git/API 读操作使用 LoTwT，向 LoTwT/fairy 的任务分支推送与创建 PR 使用 eruoos；在对应凭据上下文中验证实际 actor，不能用另一个账号替代失败操作。

PR 面向 `LoTwT/fairy:main`，标题和正文准确描述最终交付的规则及基础请求边界，列出保留的证据缺口及验收。创建后调用 attach_artifact，报告 PR URL、head OID 和 CI 状态。不得合并 PR 或发布 npm 包。若发布失败，先核实实际远端状态，避免重复创建 PR。

本 prompt 是任务交接文档，不改变任何模型、Git 或项目的持久默认配置。发现超出当前授权的阻塞时说明具体原因，并继续完成不受阻塞的部分。
