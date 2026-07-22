# 规格如何定义、评审和演进

本文件定义 Fairy 项目中 spec 的权威、结构、生命周期和验收规则。它不登记哪些 spec 当前有效；current membership 的唯一事实源是 `docs/specs/index.md`。

本文中的“必须”和“不得”是规范要求。“应”表示除非有明确、可审查的理由，否则需要遵循。

## 权威与当前状态

- project rules 规定工作过程和跨领域 invariant。
- 只有同时存在于 current main 的 active tree 且登记在 current registry 中的 spec，才能在自身 declared scope 内规定 intended behavior。
- branch、task 或 PR 中尚未进入 current registry 的 proposed spec 没有 current authority。
- proposed spec 可以按 [Implementation migration](#implementation-migration) 与实现组成一个获批的 exact atomic candidate，但它的 authority 只在该候选原子合并后生效；合并前不得据此改变 current main、已发布行为或其他 external effect。
- code、tests、fixtures、artifacts 和 live readback 只能证明 observed behavior，不能反向创造规范。
- references、`docs/HISTORY.md` 和 Git history 只提供背景、已发布事实或审计记录，没有 current behavior authority。
- 同一 concern 必须只有一个 canonical normative source；其他位置只能链接到它，不得复制并独立演进同一合同。

如果这些来源缺失或冲突，absence is not permission：保持 unsupported 或停止，不得由实现者选择 silent default。

## 身份与登记

每份 spec 必须声明：

- 稳定的 `id`；
- 单调递增的 `version`；
- canonical `scope`；
- 完整的 required core；
- replacement 时可选的 `supersedes`。

`version` 的 canonical form 是从 `1` 开始的十进制正整数；同一 `id` 的后续 version 必须按数值单调递增。不得使用前导零、SemVer、tag 或字符串排序表达 spec version。

`(id, version)` 是 spec 的语义身份。spec 文件不得重复 `status: current`；current membership 只由 registry 持有。spec 也不得记录 owner、task、PR、本仓库 active-work commit/head、review status、progress、reminder 或其他进行中工作状态。

上述限制不禁止 `Authority and provenance` 记录外部来源的 immutable identity。外部 Git 来源可以记录 source repository、完整 commit SHA、path 与 evidence context；mutable branch、branch HEAD 或无法证明不可变的 ref 不能作为 provenance identity。

本文中的 `decision owner` 和 `bounded task contract` 分别使用[仓库工作与停止规则](agent-work.md#decision-owner)中的角色定义和[可复核记录要求](agent-work.md#bounded-task-contract)；spec 或 registry 不记录具体 owner 或 active task state。

canonical `scope` 必须说明可观察的 capability、domain 或 surface，以及 supported boundary。可选的 `paths` 只能帮助定位当前实现，不能授予、缩小或扩大 authority：

- 仅命中某个 path，不代表该 path 中所有行为都在 scope 内；
- observable contract 未改变时，路径重构本身不自动构成新规范；
- observable behavior 扩大时，即使仍位于原路径，也必须按规范变化处理。

registry 只保存 scope summary 以便路由；完整边界必须留在 spec。

## Required core

每份 spec 必须包含以下七部分。某部分不适用时，必须写明理由，不得直接省略。

1. **Problem and outcome**：要解决的问题，以及用户或系统能够观察到的结果。
2. **Scope and unsupported behavior**：supported boundary、明确不支持的行为和 non-goals。
3. **Normative contract and invariants**：输入、输出、状态变化，以及不能被窄层删除或放宽的约束。
4. **Authority and provenance**：规范依据、来源、版本或 as-of、evidence reference，以及未知项。
5. **Observable acceptance**：可观察的 happy、error、edge 结果和必须执行的真实 verifier。
6. **Failure, degradation, and stop conditions**：error、warning、degraded、unsupported 与必须停止的边界。
7. **Compatibility and migration**：兼容性、迁移影响与退出策略；不适用时说明原因。

## Conditional modules

spec 只加载与 declared scope 有关的模块。conditional module 只能细化 required core，不能替代或跳过 required core。

- **Numeric**：units、precision、operation order、rounding 和 worked examples。
- **Data or content**：source、version、as-of、evidence、license、provenance 和 unknowns。
- **API or schema**：validation、errors、compatibility 和 serialization。
- **UI or UX**：states、accessibility、responsive、loading、empty、error 和 degraded behavior。
- **Security or privacy**：trust boundary、sensitive fields、retention 和 network effects。
- **Release or distribution**：version、migration、rollback 和 artifact provenance。

需要但未定义的模块内容必须保持 unsupported 或触发停止，不得由默认值补齐。

## Canonical fixtures and acceptance

- fixture 或 example 只能支撑 canonical contract，不能成为独立的第二套 oracle。
- 如果存在 machine-readable fixture，tests 和 verifier 必须消费同一份 canonical bytes，不得复制预期值到另一份独立维护的 fixture。
- acceptance 必须覆盖适用的 happy、error、edge 和 negative guard，并说明真实执行路径；仅有空跑或未经过真实路径的 verifier 不构成验收证据。
- evidence 必须绑定可复核的 exact object 和 fresh result。旧对象上的通过结果不能证明新对象。

## Version lifecycle

normative contract、scope、invariant、acceptance、failure 或 trust boundary、compatibility 中任一语义变化，都必须递增 `version`。纯排版或链接修复只有在能证明规范含义未变时才可保留版本。

每个 `id` 同时最多有一个 current identity。

### Introduction

首次引入一个从未作为 current identity 出现过的 `id`，必须在同一原子 diff 中：

1. 写入 `version: 1` 的 active spec；
2. 将该 identity 加入 registry；
3. 不写 `supersedes`。

曾被 withdrawal 的 `id` 不再属于首次引入；它受 [Reactivation](#reactivation) 规则约束。

### Replacement

replacement 必须在同一原子 diff 中完成：

1. 写入更高 `version` 的新 active spec；
2. 让新 spec 的 `supersedes` 精确指向变更前真实 current `(id, version)`；
3. 将 registry 切换到新 identity；
4. 删除旧 active spec。

Git history 保留旧 bytes。不得在 `docs/specs/` 中保留第二套历史材料。若未来需要解释性历史材料，必须另行批准并放入 non-normative reference surface。

replacement 合并后，`supersedes` target 不再需要留在 active tree；它的真实存在由变更前 current main/tree 中的 current identity 和合并后的 Git ancestry 证明。只有在该原子变更前确实为 current 的 identity 才能成为 target；仅出现在无关 history 或 reference 中的 identity 不合格。

### Implementation migration

如果 replacement 改变 intended behavior，且 current implementation 不满足新 spec，必须选择以下一种完整模式；不得让 proposed spec 或 implementation 单独提前生效。

1. **Atomic migration**：decision owner 在 active work surface 明确批准 prior current identity、target identity、affected implementation surface 与 exact atomic boundary。同一候选必须同时完成新 spec、registry 切换、旧 active spec 删除，以及全部适用的 implementation、tests、fixtures 与真实 verifier；它只能作为一个 exact object 评审和合并，不得拆分 merge、提前 deploy 或产生部分 external effect。
2. **Staged migration**：先原子合并一个 transitional current spec。该 spec 必须把现有实现与目标实现都明确列为暂时 supported behavior，分别定义 observable acceptance、compatibility、failure boundary 与不依赖 task/PR/head 的 completion criteria。后续 implementation change 必须始终落在该 current spec 的 supported boundary 内；完成后再通过新的 replacement 移除 transitional allowance。

仅合并一个已经排除 current implementation 的新 spec，或仅合并一个与 current spec 冲突的 implementation，都不是合法迁移。

### Withdrawal

withdrawal 必须在同一原子 diff 中从 registry 移除 identity，并删除对应 active spec。Git history 保留历史。

withdrawal 后不得有 current spec 通过 `supersedes` 指向被撤回 identity；同一 `id` 最多一个 current，跨 `id` `supersedes` 仍然无效。历史 identity 和链只保留在 Git ancestry 中。

### Reactivation

withdrawal 后不得重新启用同一 `id`。这种变化既不是 Introduction，也不是 Replacement，不得通过更高 version 或 `supersedes` 绕过。若未来确有 same-id reactivation 需求，必须先由 decision owner 批准独立 lifecycle 规则与 lineage identity；在该规则成为 current project rule 前必须停止。

### Invalid transitions

以下情况均无效：

- version 复用、倒退，或 normative change 未递增 version；
- `supersedes` 指向自身、无法从变更前 current main/tree 证明为真实 current 的 identity、非变更前 current identity，或形成 cycle；
- registry 指向不存在的文件；
- active spec 未登记、同一 `id` 有两个 current，或重复 `(id, version)`；
- 将曾被 withdrawal 的 `id` 当作 Introduction 或 Replacement 重新启用；
- 用 `supersedes` 隐式完成跨 `id` rename。跨 `id` rename 需要独立、明确的规则与 decision owner 决定。

## Monotonic refinement

窄层可以补充更具体的约束，或解析上层明确留出的选择，但不得：

- 删除、放宽或改写上层 `MUST`；
- 扩大 declared scope；
- 跳过 required core；
- 用 conditional module 规避 project rule；
- 把 unsupported、unknown 或 missing authority 变成 silent default。

human-approved bounded task contract 通常只能补 current spec 未覆盖的选择，不能覆盖 current spec。两者冲突时，必须先由 decision owner 判断并更新 canonical authority，不能把 task 指令静默当成 spec replacement。唯一例外是按 [Implementation migration](#implementation-migration) 获批并保持原子性的 migration contract；它只授权构造和评审 exact candidate，不会让 proposed spec 在 merge 前获得 current authority。
