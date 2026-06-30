# Fairy — Agent Instructions (canonical)

Fairy is a Zenless Zone Zero (ZZZ) damage calculator. The project is being
rebuilt from a clean slate. These are the canonical instructions for any agent
(Claude, Codex, or other) working in this repository.

This file holds the durable rules. It does not duplicate the documentation map.
**For where to find things, read the single routing source: [docs/index.md](docs/index.md).**

## Iron rules

These are non-negotiable for every change.

1. **Clean-slate.** The pre-reset implementation has been removed from the tree.
   It survives only as history (git tags `v0.0.1`–`v0.1.4`, the published npm
   versions, and [docs/references/history.md](docs/references/history.md)). Never
   restore it as a source, build on it, or copy its logic. Any logic copied from
   the old implementation violates the reset.
2. **Human-in-the-loop.** Work in small, reviewable PRs — one concern per PR.
   Nothing merges without the maintainer's explicit review and approval. Write
   PR descriptions that state the exact diff scope and what to look at.
   If a concern needs a spec, keep the spec and its execution in the same PR by
   default. Split a spec into a separate PR only when it is large enough to need
   review before execution, or when the maintainer explicitly asks for a split.
3. **npm versions are monotonic.** Published versions of `@randomplay/core`,
   `@randomplay/data`, and `@randomplay/cli` are immutable: never delete,
   overwrite, or re-publish any already-published version (`0.0.1`–`0.1.4`). The
   highest published version is `0.1.4`; every future publish must be a new
   version strictly greater than `0.1.4`.

## Progressive disclosure

Keep entry points thin and push detail into referenced files, loaded as needed.

- This file: the iron rules only.
- [docs/index.md](docs/index.md): the one place that says where everything lives.
- Requirements, conventions, standards, and lightweight design live as specs
  under `docs/specs/` (each spec keeps its own reasoning in a `Rationale`
  section). Supporting facts and history live under `docs/references/`.
- ZZZ terminology, code identifiers, config keys, data fields, and log labels use
  [docs/references/glossary.md](docs/references/glossary.md) as the canonical
  naming source; [docs/specs/0003-terminology.md](docs/specs/0003-terminology.md)
  defines the rules around it.

Do not restate rules across files. There is one source per concern: iron rules
here, navigation in `docs/index.md`, requirements and conventions in
`docs/specs/`.

## Verification

Before proposing a change, run the default gates and confirm they pass; state in
the PR which you ran.

- `pnpm check` — lint + format check.
- `git diff --check` — no whitespace errors.
- Tracked-Markdown relative-link check — no broken links.

For dependency or package-manager changes, also run a frozen install and
re-verify after the lockfile updates: `pnpm install --frozen-lockfile`, then
re-run the gates above.
