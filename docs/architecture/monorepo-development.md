# Monorepo Development Guide

Status: S3 baseline
Owner: @TechLead
Inputs: Product v2.0, D-11 naming policy, TL-3 data contracts, WF-1~WF-4 workflow decisions

This guide defines how to work in the Fairy pnpm workspace without breaking package boundaries, data provenance, or review traceability.

## Workspace Layout

```text
.
├─ packages/
│  ├─ core/   # pure schemas, validators, formula engine, trace output
│  ├─ data/   # source ingestion, cleaning, source metadata, queryable game data
│  └─ cli/    # JSON-only command surface over core/data
├─ docs/
│  ├─ architecture/
│  ├─ data-contract/
│  ├─ glossary/
│  ├─ product/
│  ├─ qa/
│  └─ ux/
└─ fixtures/
   └─ golden/ # QA-owned fixture specs and later executable regression cases
```

`CLAUDE.md` is the short agent entry. `docs/index.md` is the documentation map.

## Package Responsibilities

| Package | Owns | Must Not Own |
|---|---|---|
| `@fairy/core` | Runtime schemas, validators, pure calculation functions, registered handler interfaces, traceable `CalcResult` output | Crawlers, file IO, network IO, CLI rendering, formal data source parsing |
| `@fairy/data` | Source readers, raw-to-clean transforms, source metadata, alias migration, queryable game data | Formula decisions, CLI UX, hand-written formal game values |
| `@fairy/cli` | JSON input/output shell, citty command/flag schemas, diagnostics rendering when needed | Core math, source scraping, package-private data mutation |

The core package is the lowest-level runtime dependency. It must stay deterministic and side-effect-light so QA can validate formulas and trace output independently.

## Dependency Rules

Allowed:

```text
@fairy/cli  -> @fairy/core
@fairy/cli  -> @fairy/data
@fairy/data -> @fairy/core   # only for shared schema/types/validators when useful
```

Forbidden:

```text
@fairy/core -> @fairy/data
@fairy/core -> @fairy/cli
@fairy/data -> @fairy/cli
```

Core code must not read files, call the network, use wall-clock time, use randomness, or infer hidden state in formula paths. If a handler needs data, the resolved data must be passed through `GameData`, `BattleSnapshot`, or registered handler params.

## pnpm Commands

Install from a clean checkout:

```bash
pnpm install --frozen-lockfile
```

Run the workspace checks exposed by packages:

```bash
pnpm check
pnpm test
```

Run one package:

```bash
pnpm --filter @fairy/core check
pnpm --filter @fairy/core test
pnpm --filter @fairy/data check
pnpm --filter @fairy/cli check
```

Package scripts may be added incrementally, but every PR that changes runtime code should leave `pnpm check` and relevant package tests passing.

## Data and Fixture Boundary

Formal data in `@fairy/data` must be source-derived:

- Excel rows supplied by @lo-user;
- live-server crawler output from approved sources;
- source metadata with `sourceId`, `sourceVersion`, `fetchedAt` or `parsedAt`, and parser version;
- alias migration at the ingestion boundary.

Do not hand-write formal game data directly into `@fairy/data`.

Fixtures are different. QA-owned fixtures under `fixtures/golden/` may be hand-authored and reviewed because they are test assertions, not redistributable game data. Before V1 release, golden fixtures that depend on real game values must either point to source-derived rows or be marked as pending data.

## Naming and i18n

Use D-11 official-first names for public JSON keys, TypeScript APIs, trace paths, and docs. Old names such as `breachForce`, `hpMax`, and candidate-X anomaly aliases belong in `sourceAliases` or migration traces, not in canonical output.

JSON keys and enum values are always English and language-independent. `locale: "zh" | "en"` affects human-facing diagnostics, explanations, and future renderers only.

## Handler and Formula Rules

V1 handlers are registered deterministic functions. Data may choose a handler by `handlerId` and provide structured `params`, but data must not inject arbitrary JavaScript or runtime scripts.

Each formula path must emit enough evidence for QA:

- per-segment raw and display values;
- bucket-level before/after/effective multiplier;
- applied and skipped modifiers with reasons;
- source metadata or source-missing diagnostics;
- override/provenance trace for user-overridden data;
- version mismatch path evidence.

## Branch and PR Workflow

Use small PRs with one owner and one main task. Every PR description must include:

```markdown
## Slock Context

- Owner: @TechLead
- Task: task #N
- Reviewers: @Product, @QA
- Related decisions: D-XX / CONFIRM-XX
- i18n impact: zh-only / zh+en / docs-only / no
```

Merge policy:

- require at least one cross-role review before self-merge;
- use squash and merge;
- delete the development branch after merge;
- critical formula, schema, data-source, crawler, and release PRs need explicit channel review before merge;
- production/deployment/data-run changes require @lo-user approval.

Keep the squash commit message tied to the PR/task so QA can trace main-branch changes back to evidence.

## Verification Before Handoff

For docs-only PRs:

```bash
git diff --check
```

For runtime/schema PRs:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
git diff --check
```

For data-ingestion PRs, add source-specific smoke checks and record the command output in the PR. A crawler skeleton may test fixture files; a formal data PR must prove source metadata exists and no hand-written formal values entered the cleaned data package.

## Release Notes

Packages are private during V1 development. Public publishing is out of scope until Product explicitly opens a release task.

When package publishing is introduced, release notes must include:

- package versions;
- `schemaVersion`, `ruleSetVersion`, `dataVersion`, and `sourceVersion`;
- source snapshot provenance;
- migration notes for renamed fields or aliases;
- QA golden fixture status.
