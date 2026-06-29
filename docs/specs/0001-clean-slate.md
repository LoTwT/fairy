# Spec 0001 — Clean-slate reset

## Scope

This spec governs the reset of fairy to a clean slate and the working rules for
the rebuild. It covers the documentation skeleton, the iron rules, and how the
old implementation is retired.

It does **not** define the product or its architecture — what the new fairy is
and how it is built comes in a later spec, once that direction is decided.

## Rationale

The maintainer chose a complete fresh start with full human-in-the-loop review,
rather than refactoring the old code in place. Treating the old implementation as
a baseline would constrain the rebuild and invite copy-forward. Archiving it
cleanly removes that pull while keeping every published version recoverable
(see [references/history.md](../references/history.md)).

## Contract

The stable rules for working in this repository:

1. **Clean-slate.** The pre-reset implementation has been removed from the tree.
   It survives only as history (git tags `v0.0.1`–`v0.1.4`, the published npm
   versions, and `references/history.md`). Never restore it as a source, build on
   it, or copy its logic. Any logic copied from it violates the reset.
2. **Human-in-the-loop.** Work in small, reviewable PRs — one concern each.
   Nothing merges without the maintainer's explicit review. PR descriptions state
   the exact diff scope and what to look at.
3. **npm versions are monotonic.** Published versions of `@randomplay/core`,
   `@randomplay/data`, and `@randomplay/cli` are immutable: never delete,
   overwrite, or re-publish any already-published version (`0.0.1`–`0.1.4`). The
   highest published version is `0.1.4`; every future publish must be a new
   version strictly greater than `0.1.4`.

Documentation conventions:

- `docs/index.md` is the single routing source; `AGENTS.md` and `CLAUDE.md` point
  to it and do not duplicate the map. Chain: `CLAUDE.md` → `AGENTS.md` →
  `docs/index.md` → subfolders.
- `docs/specs/` holds requirements / conventions / standards + lightweight design
  (this folder). `docs/references/` holds supporting facts and background.
- Folders are created on demand, not pre-built empty.

## Implementation Notes

The reset established the repository baseline; product work follows from this
empty skeleton:

1. **Skeleton + clearing.** The current baseline keeps `AGENTS.md` as the
   canonical real file, `CLAUDE.md` as a pointer, a minimal `README.md`, the
   routing source `docs/index.md`, `docs/specs/`, and `docs/references/`. The old
   implementation, old docs, old build/release config, and old tooling listed in
   [references/history.md](../references/history.md) remain removed.
2. **Product spec (future).** Decide what the new fairy is and how it is built.
   New implementation starts from the empty skeleton.

## Acceptance

Current baseline:

- The new skeleton is present and only the skeleton remains: `AGENTS.md`,
  `CLAUDE.md`, `README.md`, `LICENSE`, `.gitignore`, and `docs/{index.md, specs/,
references/}`.
- Everything in the `references/history.md` removal inventory is gone; nothing
  from the old implementation is copied into the new tree as a source.
- The pre-reset tree is recoverable at tag `v0.1.4` (tags `v0.0.1`–`v0.1.4`
  already exist; no extra safety tag needed).
- The `CLAUDE.md` → `AGENTS.md` → `docs/index.md` chain resolves; no duplicated
  routing table; all intra-doc links resolve.
- `AGENTS.md` is a real canonical file (no longer a symlink).
- `references/history.md` matches the npm registry and git tags; highest is
  `0.1.4`.
