# Fairy Documentation

## Architecture

- [Package Structure](package-structure.md) — Package naming, layout, responsibilities, and boundary rules

## Child Plans

This index lists the child plans in the recommended implementation sequence.
Use the sequence as a rollout path, not as a strict dependency graph.

1. [Repo Scaffolding](plans/repo/scaffolding.md) — Placeholder plan for bootstrapping the monorepo structure
2. [Core Domain Model](plans/core/domain-model.md) — Static snapshot calculation model, rule layers, and exported constant boundaries
3. [Core Implementation](plans/core/implementation.md) — Concrete implementation order, source layout, and validation steps for `@randomplay/fairy-core`
4. [Data Contract](plans/data/contract.md) — Placeholder plan for normalized data schema and versioning
5. [Data-to-Core Mapping](plans/data/core-mapping.md) — Placeholder plan for mapping normalized data into calculation inputs
6. [CLI Contract](plans/cli/contract.md) — Placeholder plan for commands, parameters, and output formats
