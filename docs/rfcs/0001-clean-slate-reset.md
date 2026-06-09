---
title: Clean-slate reset
status: proposal
owner: Product (PM-Rin)
date: 2026-06-10
supersedes: none
related: none
---

# RFC 0001 — Clean-slate reset

## Decision

Restart fairy from a clean slate. The previous implementation (the
`@randomplay/core` / `data` / `cli` monorepo, versions `0.0.1`–`0.1.4`) is kept
only as history and is not reused as a source for the new build.

**What is decided here**

- Rebuild rather than refactor. Old code becomes a historical record (git tags,
  npm registry, `docs/history/`), never a source.
- Keep the package names `@randomplay/core` / `data` / `cli`. Publishing stays
  monotonic: the next publish must be strictly greater than `0.1.4`.
- Establish a thin documentation skeleton and the working rules for the rebuild
  (clean-slate, human-in-the-loop, version monotonicity).
- The new product direction and architecture are **not** decided here. They come
  in a later RFC (0002).

**What is rejected**

- Refactoring the old code in place. The maintainer wants a fresh start and will
  review the new code in detail; behavior-preserving migration is out of scope.
- Copying any old logic into the new build.

**Why**

The maintainer chose a complete fresh start and full human-in-the-loop review.
Treating the old implementation as a baseline would constrain the rebuild and
invite copy-forward; archiving it cleanly removes that pull while keeping every
version recoverable.

## Implementation Design

This RFC delivers the meta-layer skeleton and the rules. It does not design the
product (that is RFC 0002).

**Repository skeleton**

```
fairy/
├── AGENTS.md            # canonical agent instructions (iron rules + pointer to docs/index.md)
├── CLAUDE.md            # thin Claude Code entry: pointer + @AGENTS.md
├── README.md            # human entry
└── docs/
    ├── index.md         # the single documentation routing source
    ├── history/         # read-only pre-reset record (README, npm-versions, archive-index)
    └── rfcs/            # decision records (this file is 0001)
```

**Single-source chain.** `CLAUDE.md` → `AGENTS.md` → `docs/index.md` →
subfolders. Navigation lives only in `docs/index.md`; `AGENTS.md` holds only the
iron rules and points to it. No routing table is duplicated.

**Document model.** One doc type for changes: `docs/rfcs/`. Each RFC is a single
document carrying decision + implementation design + execution plan + acceptance
gates + rollout. Status lives in front matter (`proposal` / `accepted` /
`archived`). There is no `plans/` folder (execution lives in the RFC and in Slock
tasks/PRs) and no `specs/` folder yet (accepted RFCs are the current truth).
`specs/` and `runbooks/` are defined as future homes in `docs/index.md` and are
created only when their trigger condition is met.

**Iron rules** (full text in `AGENTS.md`): clean-slate (no old code as source),
human-in-the-loop (small reviewable PRs, no merge without review),
npm-version-monotonic (next publish > `0.1.4`).

**Old-tree clearing scope.** The pre-reset code, old docs, and old build/release
config are removed (inventory in `docs/history/archive-index.md`). The removal is
a separate PR (see Execution Plan), not part of this PR.

## Execution Plan

Small, reviewable PRs in order:

1. **PR 1 (this RFC) — skeleton + RFC, additive.** Add `AGENTS.md` (now the
   canonical real file; the old `AGENTS.md → CLAUDE.md` symlink is removed),
   rewrite `CLAUDE.md` as a pointer, rewrite `README.md`, replace `docs/index.md`
   with the new router, add `docs/history/` and this RFC. No code is deleted.
2. **PR 2 — clearing.** Remove the old code, old docs, and old build/release
   config per `docs/history/archive-index.md`, leaving the skeleton from PR 1.
   Repo emerges clean. Recoverable at tag `v0.1.4`.
3. **RFC 0002 — product direction + architecture.** Decide what the new fairy is
   and how it is built. New implementation starts from the empty skeleton.

Live progress is tracked in Slock (task #259) and the PRs.

## Acceptance Gates

**PR 1 (this PR)**

- Docs/config only; no source code deleted.
- `CLAUDE.md` → `AGENTS.md` (via `@AGENTS.md`) → `docs/index.md` chain resolves;
  no duplicated routing table.
- All intra-doc links resolve (no dangling links).
- `docs/history/npm-versions.md` matches the registry and git tags; highest is
  `0.1.4`.
- The old `AGENTS.md` symlink is gone and `AGENTS.md` is a real canonical file.

**PR 2 (clearing)**

- Only the inventory in `archive-index.md` is removed; nothing new is added.
- The pre-reset tree is recoverable at tag `v0.1.4`; no extra safety tag is
  needed (tags `v0.0.1`–`v0.1.4` already exist).
- No remaining file references old code as a source.

## Rollout / Cleanup

- The clearing (PR 2) is reversible: everything removed stays in git history and
  on npm. To recover, check out tag `v0.1.4`.
- npm package names are retained; the registry is untouched. The next release
  must be a version strictly greater than `0.1.4`.
- Every PR is human-reviewed before merge (human-in-the-loop).
