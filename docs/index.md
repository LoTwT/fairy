# Fairy — documentation map

这是唯一的文档路由来源。它只说明内容放在哪里，不承载具体内容本身。其他入口只指向这里，不重复维护这份地图。

## Where to look

| You want                                                     | Go to                                   | Holds                                                                                       |
| ------------------------------------------------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------- |
| Requirements, conventions, standards, or interface design    | `docs/specs/`                           | Specs：定义某个事项是什么、应保持什么不变，以及轻量设计（函数签名、模块边界）——不写详细代码 |
| Supporting facts and background (incl. the pre-reset record) | `docs/references/`                      | Reference material：外部资料、数据、术语表、历史记录。只作为事实背景；永远不是实现来源      |
| The iron rules for working here                              | [../AGENTS.md](../AGENTS.md)            | Clean-slate、human-in-the-loop、npm version monotonicity                                    |
| A task, chore, bug — or its owner / status                   | GitHub Issues (or the Slock task board) | 执行跟踪。不放在 docs 里                                                                    |

## Current state

项目已经按 clean-slate 重置（见
[specs/0001-clean-slate.md](specs/0001-clean-slate.md)）。重置前的代码和文档已从工作树移除，只作为历史保留（git tags、npm，以及
[references/history.md](references/history.md)）。重置后的第一份实现 spec 是
[specs/0002-project-initialization.md](specs/0002-project-initialization.md)：根工作区初始化计划。包代码和伤害模型会在后续 PR 中进入。

## Conventions

- **项目只有一种决策文档类型：`specs/`。** spec 描述某个事项是什么（requirements、conventions、standards、interface design），并在自己的 `Rationale` 章节保留理由，因此不另设 decision log。模板见
  [specs/README.md](specs/README.md)。
- **spec 使用中文 canonical prose，contract surface 保持英文。** 叙述、理由、验收说明用中文作为权威正文；schema key、field name、enum value、CLI/API/package surface、命令和代码标识符保持英文。每个 concern 只保留一份 canonical source。
- **`references/` 保存事实，不保存决策。** 背景和历史记录放在这里，默认保持扁平结构。见
  [references/README.md](references/README.md)。
- **任务和状态永远不放进 docs。** 小任务、chore、bug 以及 owner/status 放在 GitHub Issues（或 Slock task board），不放进 docs。
- **按需创建文件夹，不预建空目录。** `docs/` 只有 `specs/`、`references/` 和这个 `index.md`。只有出现真实内容时才新增其他文件夹。
