# Spec 0001 — Clean-slate reset

## Scope

这份 spec 管 Fairy 的 clean-slate 重置和重建工作规则。它覆盖文档骨架、iron rules，以及旧实现如何退场。

它**不**定义产品或产品架构；新的 Fairy 是什么、如何构建，会在方向确定后的后续 spec 中定义。

## Rationale

maintainer 选择完整重新开始，并保留 full human-in-the-loop review，而不是在旧代码上原地重构。把旧实现当作 baseline 会限制重建，并诱导 copy-forward。干净归档旧实现可以移除这种牵引，同时让所有已发布版本仍可恢复（见
[references/history.md](../references/history.md)）。

## Contract

本仓库的稳定工作规则：

1. **Clean-slate.** 重置前的实现已从工作树移除。它只作为历史存在（git tags `v0.0.1`–`v0.1.4`、已发布 npm versions，以及 `references/history.md`）。绝不能把它恢复为 source、基于它继续构建，或复制它的逻辑。任何从旧实现复制来的逻辑都违反本次 reset。
2. **Human-in-the-loop.** 所有工作都通过小而可 review 的 PR 进行，每个 PR 只处理一个 concern。没有 maintainer 的明确 review 就不能 merge。PR description 必须说明精确 diff scope 和需要 review 的内容。
3. **npm versions are monotonic.** 已发布的 `@randomplay/core`、`@randomplay/data`、`@randomplay/cli` versions 是 immutable：绝不能删除、覆盖或重新发布任何已发布版本（`0.0.1`–`0.1.4`）。当前最高已发布版本是 `0.1.4`；未来每次 publish 都必须使用严格大于 `0.1.4` 的新版本。

文档约定：

- `docs/index.md` 是唯一的路由来源；`AGENTS.md` 和 `CLAUDE.md` 指向它，不重复维护地图。链路是：`CLAUDE.md` → `AGENTS.md` → `docs/index.md` → subfolders。
- `docs/specs/` 保存 requirements / conventions / standards + lightweight design（也就是本文件夹）。`docs/references/` 保存 supporting facts 和 background。
- 文件夹按需创建，不预建空目录。

## Implementation Notes

这次 reset 建立了仓库 baseline；产品工作从这个空骨架继续：

1. **Skeleton + clearing.** 当前 baseline 保留 `AGENTS.md` 作为 canonical real file，`CLAUDE.md` 作为指针，一个最小 `README.md`，路由来源 `docs/index.md`，以及 `docs/specs/` 和 `docs/references/`。列在
   [references/history.md](../references/history.md) 中的旧实现、旧文档、旧 build/release config 和旧 tooling 都保持移除状态。
2. **Product spec (future).** 决定新的 Fairy 是什么、如何构建。新实现从空骨架开始。

## Acceptance

当前 baseline：

- 新骨架存在，且只保留骨架：`AGENTS.md`、`CLAUDE.md`、`README.md`、`LICENSE`、`.gitignore`，以及 `docs/{index.md, specs/, references/}`。
- `references/history.md` 的 removal inventory 中列出的内容都已移除；没有任何旧实现内容作为 source 复制进新工作树。
- 重置前工作树可以通过 tag `v0.1.4` 恢复（tags `v0.0.1`–`v0.1.4` 已存在；不需要额外 safety tag）。
- `CLAUDE.md` → `AGENTS.md` → `docs/index.md` 链路可解析；没有重复 routing table；所有 intra-doc links 都可解析。
- `AGENTS.md` 是真实 canonical file（不再是 symlink）。
- `references/history.md` 与 npm registry 和 git tags 匹配；最高版本是 `0.1.4`。
