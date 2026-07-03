# Fairy — documentation map

这是唯一的文档路由来源。它只说明内容放在哪里，不承载具体内容本身。其他入口只指向这里，不重复维护这份地图。

## 去哪里看

| 你要找的内容                                             | 去哪里                                  | 放什么                                                                                                                                              |
| -------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| requirements、conventions、standards 或 interface design | `docs/specs/`                           | Specs：定义某个事项是什么、应保持什么不变，以及轻量设计（函数签名、模块边界）——不写详细代码                                                         |
| supporting facts 和 background（含 pre-reset 记录）      | `docs/references/`                      | Reference material：外部资料、数据、术语表、历史记录。只作为事实背景；永远不是实现来源                                                              |
| source review、evidence note 或 raw inventory sample     | `docs/data/` 和 `data/`                 | Data review workspace：candidate source registry、minimum evidence reference、raw observed sample；不放 canonical glossary / formula / package code |
| 本仓库工作 iron rules                                    | [../AGENTS.md](../AGENTS.md)            | Clean-slate、human-in-the-loop、npm version monotonicity                                                                                            |
| task、chore、bug，或它的 owner / status                  | GitHub Issues (or the Slock task board) | 执行跟踪。不放在 docs 里                                                                                                                            |

## Current state

项目已经按 clean-slate 重置（见
[specs/0001-clean-slate.md](specs/0001-clean-slate.md)）。重置前的代码和文档已从工作树移除，只作为历史保留（git tags、npm，以及
[references/history.md](references/history.md)）。重置后的第一份实现 spec 是
[specs/0002-project-initialization.md](specs/0002-project-initialization.md)：根工作区初始化计划。Source / data 工作从
[specs/0003-source-data-inventory.md](specs/0003-source-data-inventory.md)
开始：Phase 1 acquisition and inventory plan。Phase 2 的 sample workspace 从
[docs/data/README.md](data/README.md) 进入，只记录 candidate source、minimum evidence reference 和 raw observed inventory sample。包代码和伤害模型会在后续 PR 中进入。

## Conventions

- **项目只有一种决策文档类型：`specs/`。** spec 描述某个事项是什么（requirements、conventions、standards、interface design），并在自己的 `Rationale` 章节保留理由，因此不另设 decision log。模板见
  [specs/README.md](specs/README.md)。
- **spec 使用中文 canonical prose，contract surface 保持英文。** 叙述、理由、验收说明用中文作为权威正文；schema key、field name、enum value、CLI/API/package surface、命令和代码标识符保持英文。每个 concern 只保留一份 canonical source。
- **`references/` 保存事实，不保存决策。** 背景和历史记录放在这里，默认保持扁平结构。见
  [references/README.md](references/README.md)。
- **任务和状态永远不放进 docs。** 小任务、chore、bug 以及 owner/status 放在 GitHub Issues（或 Slock task board），不放进 docs。
- **按需创建文件夹，不预建空目录。** `docs/` 当前只有 `specs/`、`references/`、`data/` 和这个 `index.md`；仓库根的 `data/` 当前只保存 Phase 2 sample evidence / raw inventory，不是 package data source。只有出现真实内容时才新增其他文件夹。
