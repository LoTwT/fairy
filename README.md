# Fairy

Fairy is a Zenless Zone Zero static snapshot damage calculator.

V1 focuses on a TypeScript monorepo with three packages:

- `@randomplay/data`: official-release data ingestion, cleaning, and queryable game data.
- `@randomplay/core`: pure calculation functions and traceable multiplier breakdowns.
- `@randomplay/cli`: JSON-only command-line access to `@randomplay/core`.

Start with [docs/index.md](docs/index.md).

## V1 Release Gate Status

V1 has passed lo-user single-person dogfooding with an overall 4/5 score and
zero unresolved B-Calc blockers. It has not gone through broad community
dogfooding yet.

Use [docs/getting-started.md](docs/getting-started.md) for the repo-local
dogfooding flow and executable examples.

`fairy calc` defaults to `--view brief`, which returns summary-first non-crit
and crit lanes. The dogfooding Anby fixture is covered by the `@randomplay/cli` test
suite and remains part of the fixed `pnpm test` verification chain.

## Development

Fairy uses pnpm workspaces. See [docs/architecture/monorepo-development.md](docs/architecture/monorepo-development.md) for package boundaries, dependency rules, verification commands, and PR workflow.
