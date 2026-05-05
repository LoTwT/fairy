# Fairy · Agent Entry

Fairy is a ZZZ static snapshot damage calculator for 1-3 agents.

## Read First

1. Project map: [docs/index.md](docs/index.md)
2. V1 dogfooding quick start: [docs/getting-started.md](docs/getting-started.md)
3. Product scope: [docs/product/v2.0.md](docs/product/v2.0.md)
4. Terminology: [docs/glossary/glossary.md](docs/glossary/glossary.md)
5. Data contracts: [docs/data-contract/](docs/data-contract/)

## Current Rules

- Use glossary terms for public schema, API, trace, and docs names.
- D-11 is official-first naming: prefer ZZZ official English semantic camelCase.
- Keep JSON schema keys and enum values language-independent English.
- Default human-facing language is `zh`; `en` is optional where V1 needs it.
- Do not add runtime script injection for handlers.
- Formal `@fairy/data` data must come from Excel/crawler pipelines, not hand-written values.
- Test fixtures may be hand-written and reviewed; they do not ship as formal data.
- Current Mihoyo DA ingestion uses public JSON APIs plus Cheerio for embedded
  rich-text fragments; Playwright/browser rendering is discovery-only unless a
  new decision explicitly approves it.

## Current Phase

S5 data ingestion. Current engineering entry points:

- `docs/architecture/naming-policy.md`
- `docs/architecture/monorepo-development.md`
- `docs/data-contract/`
- `docs/data-source/`
- `docs/data-source/mihoyo/`
- `packages/core/src/engine/`
- `packages/cli/`
- `packages/data/`
- `examples/snapshots/`
