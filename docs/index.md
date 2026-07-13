# Fairy — documentation map

这是唯一的文档路由来源。它只说明内容放在哪里，不承载具体内容本身。其他入口只指向这里，不重复维护这份地图。

## 去哪里看

| 你要找的内容                                                                                         | 去哪里                                                            | 放什么                                                                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| requirements、conventions、standards 或 interface design                                             | `docs/specs/`                                                     | Specs：定义某个事项是什么、应保持什么不变，以及轻量设计（函数签名、模块边界）——不写详细代码                                                                                                                                                    |
| supporting facts 和 background（含 source snapshot、glossary seed 和 pre-reset 记录）                | `docs/references/`                                                | Reference material：外部资料、source snapshot、数据、sample-backed 术语表 seed、历史记录。只作为事实背景；永远不是实现来源、runtime input、scraper input、resolver input 或 package schema                                                     |
| source review、evidence note、raw inventory sample、field map sample 或 fixture expectation seed     | `docs/data/` 和 `data/`                                           | Data review workspace：记录候选 source registry、minimum evidence reference、raw observed sample、evidence-traced field map sample 和 Phase 5 fixture expectation seed；不放 canonical glossary / formula runtime / package code               |
| calculation spec、formula baseline、calculation fixture expectation 或 core calculation API contract | `docs/specs/`、`docs/references/` 和 `data/calculation-fixtures/` | Phase 5/6 calculation artifacts：定义 2.0 formula baseline、formula / bucket / effect contract、fixture expectation seed、Phase 6A core API contract 和 Phase 6B first implementation boundary；不是 3.0 final truth、package data 或 resolver |
| 本仓库工作 iron rules                                                                                | [../AGENTS.md](../AGENTS.md)                                      | Clean-slate、human-in-the-loop、npm version monotonicity                                                                                                                                                                                       |
| task、chore、bug，或它的 owner / status                                                              | GitHub Issues (or the Slock task board)                           | 执行跟踪。不放在 docs 里                                                                                                                                                                                                                       |

## Current state

项目已经按 clean-slate 重置（见
[specs/0001-clean-slate.md](specs/0001-clean-slate.md)）。重置前的代码和文档已从工作树移除，只作为历史保留（git tags、npm，以及
[references/history.md](references/history.md)）。重置后的第一份实现 spec 是
[specs/0002-project-initialization.md](specs/0002-project-initialization.md)：根工作区初始化计划。Source / data 工作从
[specs/0003-source-data-inventory.md](specs/0003-source-data-inventory.md)
开始：Phase 1 acquisition and inventory plan。Phase 2 的 sample workspace 从
[docs/data/README.md](data/README.md) 进入，只记录候选 source、minimum evidence reference 和 raw observed inventory sample。Phase 3 field map 从
[specs/0004-domain-field-map.md](specs/0004-domain-field-map.md)
开始；sample artifact 位于
[../data/field-map/phase-3-sample.md](../data/field-map/phase-3-sample.md)。Phase 4 terminology glossary 从
[specs/0005-terminology-glossary.md](specs/0005-terminology-glossary.md)
开始；第一版 sample-backed seed glossary 位于
[references/glossary.md](references/glossary.md)。Phase 5 calculation spec 从
[specs/0006-calculation-spec.md](specs/0006-calculation-spec.md)
开始；2.0 formula baseline reference 位于
[references/formula-baseline-2-0.md](references/formula-baseline-2-0.md)，2.0 guide source
snapshot 位于
[references/source-snapshots/](references/source-snapshots/README.md)，Phase 5 fixture
expectation seed / review artifact 位于
[../data/calculation-fixtures/phase-5-seed.md](../data/calculation-fixtures/phase-5-seed.md)。Phase 6A core calculation API contract 从
[specs/0007-core-calculation-api.md](specs/0007-core-calculation-api.md)
开始；Phase 6B first implementation slice 已在 `packages/core` 实现第一版
`CalculationInput -> FormulaSpec / BucketSpec normalization -> CalculationResult` 链路与
`calculate(input)` public API，当前只覆盖 `regular_damage` 和 `sheer_damage`。Package data、resolver、
raw text parsing、角色 / 装备 / 敌人数据库、optimizer、custom registry、UI 和 CLI 仍不在当前实现范围内。

## Conventions

- **项目只有一种决策文档类型：`specs/`。** spec 描述某个事项是什么（requirements、conventions、standards、interface design），并在自己的 `Rationale` 章节保留理由，因此不另设 decision log。模板见
  [specs/README.md](specs/README.md)。
- **文档语言默认以中文承载 human-facing prose。** 面向人阅读的叙述、理由、边界说明和验收说明默认用中文；术语、identifier、field name、schema key、source_id、evidence_ref、raw_key、context、URL、命令、API/package/code surface 保持英文。英文更准确或属于稳定技术表达时保留英文。
- **spec 使用中文 canonical prose，contract surface 保持英文。** 叙述、理由、验收说明用中文作为权威正文；schema key、field name、enum value、CLI/API/package surface、命令和代码标识符保持英文。每个 concern 只保留一份 canonical source。
- **`references/` 保存事实，不保存决策。** 背景、source snapshot 和历史记录放在这里。source snapshot 只用于 provenance；不作为 package data、runtime input、scraper input、resolver input 或实现来源。见
  [references/README.md](references/README.md)。
- **任务和状态永远不放进 docs。** 小任务、chore、bug 以及 owner/status 放在 GitHub Issues（或 Slock task board），不放进 docs。
- **按需创建文件夹，不预建空目录。** `docs/` 当前只有 `specs/`、`references/`、`data/` 和这个 `index.md`；仓库根的 `data/` 当前只保存 reviewed data / fixture expectation artifacts（Phase 2 sample evidence / raw inventory、Phase 3 field map sample、Phase 5 fixture expectation seed），不是 package data source。只有出现真实内容时才新增其他文件夹。
