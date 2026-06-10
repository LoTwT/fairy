# Fairy — documentation map

This is the single routing source. It says where things live; it does not hold
the content itself. Other entry points point here and do not duplicate this map.

## Where to look

| You want | Go to | Holds |
| --- | --- | --- |
| Requirements, conventions, standards, or interface design | `docs/specs/` | Specs: what something is and should remain true, plus lightweight design (function signatures, module boundaries) — no detailed code |
| Supporting facts and background (incl. the pre-reset record) | `docs/references/` | Reference material: external docs, data, glossaries, history. Read-only; never a source |
| The iron rules for working here | [../AGENTS.md](../AGENTS.md) | Clean-slate, human-in-the-loop, npm version monotonicity |
| A task, chore, bug — or its owner / status | GitHub Issues (or the Slock task board) | Execution tracking. Not in docs |

## Current state

The project is resetting (see [specs/0001-clean-slate.md](specs/0001-clean-slate.md)).
The pre-reset code is still in the tree until the clearing PR and is legacy only —
not a source for new work. The new product direction and architecture come in a
later spec.

## Conventions

- **One doc type for the project: `specs/`.** A spec describes what something is
  (requirements, conventions, standards, interface design) and keeps its own
  reasoning in a `Rationale` section, so there is no separate decision log. See
  [specs/README.md](specs/README.md) for the template.
- **`references/` holds facts, not decisions.** Background and historical records
  live there, flat by default. See [references/README.md](references/README.md).
- **Tasks and status never live in docs.** Small tasks, chores, and bugs — with
  owner and status — go to GitHub Issues (or the Slock task board), not docs.
- **Folders are created on demand, not pre-built empty.** This documentation
  model has only `specs/` and `references/` (plus this `index.md`). (Pre-reset
  docs subfolders — `ai-plugin/`, `architecture/`, `data-contract/`,
  `data-source/`, `product/`, `qa/`, `release/`, `ux/`, etc. — are still in
  `docs/` until the clearing PR; they are legacy and not part of this map.) Add
  another folder only when it has real content to hold.
