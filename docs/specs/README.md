# Specs

Specs hold the project's requirements, conventions, and standards, plus
lightweight design: interface shapes — function names, parameters, returns,
module boundaries — but not detailed implementation. A spec describes what
something **is** and should remain true; it is not a point-in-time decision log.

## Template

Each spec is `NNNN-{slug}.md` with these sections:

- **Scope** — what this spec governs and what it does not.
- **Rationale** — why it is defined this way (keeps the reasoning, so there is no
  separate decision doc).
- **Contract** — the stable constraints: rules, conventions, naming, API / CLI
  shape, function and module boundaries, data structures.
- **Implementation Notes** — pseudocode-level design only: function signatures,
  parameters, returns, module boundaries, and the overall flow, enough to keep
  the design coherent. No detailed code.
- **Acceptance** — how to verify something conforms to the spec.

Do not put owner, status, progress, or todos in a spec — those live in the
tracker (GitHub Issues / Slock task board) and in PRs.

## Index

- [0001-clean-slate.md](0001-clean-slate.md) — the clean-slate reset: the working
  rules and the repository-reset contract.
- [0002-project-initialization.md](0002-project-initialization.md) — the
  root workspace setup plan and initialization acceptance gates.
- [0003-damage-calculation.md](0003-damage-calculation.md) — core damage
  calculation: the multiplier-zone formula, stat model, and package boundaries
  (PART 01 of the data introduction; stagger/anomaly/etc. are later specs).
