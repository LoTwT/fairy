# Fairy — documentation map

This is the single routing source. It says where things live; it does not hold
the content itself. Other entry points point here and do not duplicate this map.

## Where to look

| You want | Go to | Holds |
| --- | --- | --- |
| Why a change was made / how to do it / how to verify it | `docs/rfcs/` | Decision records (one per change: decision + implementation design + execution plan + acceptance gates + rollout) |
| What the old fairy was / which npm versions shipped | `docs/history/` | Read-only history. Never a source for new work. |
| The iron rules for working here | [../AGENTS.md](../AGENTS.md) | Clean-slate, human-in-the-loop, npm version monotonicity |

## Current state

The project is resetting (see [rfcs/0001-clean-slate-reset.md](rfcs/0001-clean-slate-reset.md)).
The pre-reset code is still in the tree until the clearing PR (RFC 0001, PR 2)
and is legacy only — not a source for new work. The new product direction and
architecture come in a later RFC (0002).

## Conventions

- **One doc type for changes: `rfcs/`.** A change is one document. RFC ≠ spec:
  an RFC is a point-in-time decision record (with its implementation design),
  not a living contract. Status lives in each RFC's front matter
  (`proposal` / `accepted` / `archived`).
- **Execution lives in the RFC + Slock, not in a `plans/` folder.** Each RFC has
  an Execution Plan section; live progress is tracked in Slock tasks and PRs.
  An unusually large implementation design may use a sibling
  `rfcs/{NNNN}-{slug}.impl.md`, still part of that RFC.
- **Folders are created on demand, not pre-built empty.** This documentation
  model has only `index.md`, `history/`, and `rfcs/`. (Pre-reset docs subfolders
  — `ai-plugin/`, `architecture/`, `data-contract/`, `data-source/`, `product/`,
  `qa/`, `release/`, `ux/`, etc. — are still in `docs/` until the clearing PR
  (RFC 0001, PR 2); they are legacy and are not part of this map.) Two future
  homes are defined here so they are turnkey when needed:
  - `specs/` — created only if a stable contract (schema / API / behavior)
    becomes scattered across several RFCs or needs a single doc that code and
    tests reference. Until then, accepted RFCs are the current truth.
  - `runbooks/` — created when a repeatable operational process (release,
    rollback, cleanup, QA gate, smoke) is reused a second time; it is then
    distilled out of its RFC. One-off processes stay in their RFC.
