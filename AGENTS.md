# Fairy — Agent Instructions (canonical)

Fairy is a Zenless Zone Zero (ZZZ) damage calculator. The project is being
rebuilt from a clean slate. These are the canonical instructions for any agent
(Claude, Codex, or other) working in this repository.

This file holds the durable rules. It does not duplicate the documentation map.
**For where to find things, read the single routing source: [docs/index.md](docs/index.md).**

## Iron rules

These are non-negotiable for every change.

1. **Clean-slate.** Do not reference or copy any pre-reset code. The previous
   implementation exists only as history (git tags `v0.0.1`–`v0.1.4`, the
   published npm versions, and `docs/history/`). Treat it as a record, never as
   a source. Any logic copied from the old implementation violates the reset.
2. **Human-in-the-loop.** Work in small, reviewable PRs — one concern per PR.
   Nothing merges without the maintainer's explicit review and approval. Write
   PR descriptions that state the exact diff scope and what to look at.
3. **npm versions are monotonic.** Published versions of `@randomplay/core`,
   `@randomplay/data`, and `@randomplay/cli` cannot be deleted, overwritten, or
   re-published. The highest published version is `0.1.4`; the next publish must
   be strictly greater. Never republish a `0.1.x`.

## Progressive disclosure

Keep entry points thin and push detail into referenced files, loaded as needed.

- This file: the iron rules only.
- [docs/index.md](docs/index.md): the one place that says where everything lives.
- Each change lives in one RFC under `docs/rfcs/` (decision + implementation
  design + execution plan + acceptance, in a single document).

Do not restate rules across files. There is one source per concern: iron rules
here, navigation in `docs/index.md`, decisions in `docs/rfcs/`.
