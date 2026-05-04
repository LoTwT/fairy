# Data Contract

Data-contract documents define the stable JSON and TypeScript-facing contracts used by
`@fairy/data`, `@fairy/core`, and `@fairy/cli`.

S2 starts with documents first. Runtime validators and package source schemas should
mirror these contracts after cross-role review.

## Inputs

- [Naming policy](../architecture/naming-policy.md)
- [Pending term resolution table](pending-term-resolution-table.md)
- [Glossary](../glossary/glossary.md)
- [Product v2.0](../product/v2.0.md)

## Contracts

- [BattleSnapshot](battle-snapshot.md): user-authored static battle input.
- [GameData](game-data.md): cleaned generated game data consumed by core.
- [CalcResult](calc-result.md): JSON-only calculation output.
- [Trace](trace.md): explainability and golden-test evidence model.
- [Handler spec](handler-spec.md): safe typed modifier and handler boundary.

## Hard Rules

- `attackSegments[]` is always an array; no executable schema may collapse it
  to a single `attackSegment`.
- JSON keys and enum values are English and language-independent.
- `--lang` only affects messages, explanations, and prompt rendering.
- Runtime handlers are registered deterministic functions. JSON data never
  contains arbitrary scripts.
- Formal `@fairy/data` values must be source-derived. User overrides and test
  fixtures are separate provenance classes.
