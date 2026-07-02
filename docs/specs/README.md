# Specs

Specs 保存项目的 requirements、conventions、standards，以及轻量设计：接口形状、function names、parameters、returns、module boundaries；不写详细实现。spec 描述某个事项**是什么**、哪些内容应保持不变；它不是一次性的 decision log。

Specs 使用中文 canonical prose。schema key、field name、enum value、CLI/API/package surface、命令和代码标识符保持英文。每个 concern 只保留一份 canonical source，不维护中英文两套同等权威正文。

## Template

每份 spec 都是 `NNNN-{slug}.md`，并保持以下章节结构：

- **Scope** — 说明这份 spec 管什么、不管什么。
- **Rationale** — 说明为什么这样定义；理由保留在 spec 内，因此不另建 decision doc。
- **Contract** — 稳定约束：rules、conventions、naming、API / CLI shape、function and module boundaries、data structures。
- **Implementation Notes** — 只写 pseudocode-level design：function signatures、parameters、returns、module boundaries 和整体流程，足够保持设计一致；不写详细代码。
- **Acceptance** — 说明如何验证某个变更符合 spec。

不要在 spec 中记录 owner、status、progress 或 todos；这些属于 tracker（GitHub Issues / Slock task board）和 PR。

## Index

- [0001-clean-slate.md](0001-clean-slate.md) — clean-slate reset：工作规则和仓库重置契约。
- [0002-project-initialization.md](0002-project-initialization.md) — 根工作区初始化计划和初始化验收 gate。
