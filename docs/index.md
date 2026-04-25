# Fairy Documentation

## Architecture

- [Package Structure](package-structure.md) — Package naming, layout, responsibilities, and boundary rules

## Child Plans

This index lists the child plans in the recommended implementation sequence.
Use the sequence as a rollout path, not as a strict dependency graph.

```text
Repo scaffolding
  -> Core model
  -> Core implementation
  -> Data source survey
  -> Data ingestion design
  -> Data contract
  -> Scenario contract
  -> Data-to-core mapping contract
  -> Data ingestion implementation
  -> Data package implementation
  -> Data-to-core mapping implementation
  -> CLI contract
  -> CLI implementation
  -> End-to-end verification
```

1. [Repo Scaffolding](plans/repo/scaffolding.md) — Placeholder plan for bootstrapping the monorepo structure
2. [Core Domain Model](plans/core/domain-model.md) — Static snapshot calculation model, rule layers, and exported constant boundaries
3. [Core Implementation](plans/core/implementation.md) — Concrete implementation order, source layout, and validation steps for `@randomplay/fairy-core`
4. [Data Source Survey](plans/data/source-survey.md) — Placeholder plan for evaluating source coverage, trust, gaps, and legal boundaries
5. [Data Ingestion](plans/data/ingestion.md) — Placeholder plan for source selection, raw data import, provenance, and corrections
6. [Data Contract](plans/data/contract.md) — Placeholder plan for normalized data schema and versioning
7. [Scenario Contract](plans/scenario/contract.md) — Placeholder plan for user-supplied calculation scenarios, builds, enemy state, and action selection
8. [Data-to-Core Mapping](plans/data/core-mapping.md) — Placeholder plan for mapping normalized data into calculation inputs
9. [Data Ingestion Implementation](plans/data/ingestion-implementation.md) — Placeholder plan for raw acquisition, refresh, correction, and pre-normalization validation tooling
10. [Data Package Implementation](plans/data/implementation.md) — Placeholder plan for implementing normalized catalog types, data artifacts, validation, and package exports
11. [Data-to-Core Mapping Implementation](plans/data/core-mapping-implementation.md) — Placeholder plan for implemented catalog/scenario to `core` snapshot and event builders
12. [CLI Contract](plans/cli/contract.md) — Placeholder plan for commands, parameters, and output formats
13. [CLI Implementation](plans/cli/implementation.md) — Placeholder plan for implementing command handlers, input loading, calculation execution, and output rendering
14. [End-to-End Verification](plans/repo/e2e-verification.md) — Placeholder plan for cross-package fixtures, CLI smoke tests, artifact checks, and release readiness
