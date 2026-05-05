# Fairy

Fairy is a Zenless Zone Zero static snapshot damage calculator.

V1 focuses on a TypeScript monorepo with three packages:

- `@fairy/data`: official-release data ingestion, cleaning, and queryable game data.
- `@fairy/core`: pure calculation functions and traceable multiplier breakdowns.
- `@fairy/cli`: JSON-only command-line access to `@fairy/core`.

Start with [docs/index.md](docs/index.md).

## Development

Fairy uses pnpm workspaces. See [docs/architecture/monorepo-development.md](docs/architecture/monorepo-development.md) for package boundaries, dependency rules, verification commands, and PR workflow.
