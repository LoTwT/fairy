# Fairy v0.1.1 — Release Notes

> Patch release draft/reference. The release workflow generates the final
> GitHub Release body from `git-cliff`; Product/TL may copy this text into the
> release body only as part of the release operation.

## TL;DR

v0.1.1 publishes the post-v0.1.0 nanoka data expansion and package-size fix as
a patch release. The runtime data remains nanoka-exclusive and configured-live
for current rows (`nanoka-zzz@2.8`), while historical Deadly Assault rows live in
a dedicated non-current `historicalDAPeriods` bucket.

This release does not restore Excel, Mihoyo D-17, or buhflipexplode D-12 as
runtime sources. They remain archived audit references only.

## Compatibility Notes

- `GameData.historicalDAPeriods` is a new additive schema field. It contains
  historical Deadly Assault period rows keyed by `releaseVersion#periodId`.
- Current runtime DA remains in `GameData.deadlyAssaultPeriods` and is still
  restricted to configured-live `nanoka-zzz@2.8`.
- Consumers that enumerate all `GameData` keys should update allowlists or
  exhaustive checks for `historicalDAPeriods`.
- `@randomplay/data` root exports still provide typed runtime access. The
  package now loads the bundled runtime JSON artifact at runtime instead of
  inlining that artifact into `dist/index.mjs`.
- Direct JSON imports such as
  `@randomplay/data/cleaned/runtime/game-data.json` remain supported.

## Migration Guide

For CLI users:

```bash
pnpm dlx @randomplay/cli@0.1.1 --help
pnpm dlx @randomplay/cli@0.1.1 calc <your-snapshot.json> --view brief
```

For library consumers:

```bash
pnpm add @randomplay/core@0.1.1 @randomplay/data@0.1.1
```

If you use package data directly:

- use `@randomplay/data` for the typed root runtime API;
- use `@randomplay/data/cleaned/runtime/game-data.json` for direct artifact
  access;
- use `data.historicalDAPeriods` only for historical DA lookup, not current
  runtime fallback.

## Highlights

- **Full nanoka data batch** — runtime data now includes the approved-live
  nanoka 2.8 catalogs for:
  - 39 Bangboos and 63 promoted Bangboo skill sections;
  - 53 Agents;
  - 89 W-Engines;
  - 26 Drive Disc sets;
  - 269 Enemies and 573 enemy variants;
  - 38 current Deadly Assault periods, 114 zones, and 2242 `boss_adjust` rows.
- **Historical DA bucket** — 10 manifest-available non-current DA snapshots are
  available in `historicalDAPeriods` with 505 historical rows, 1506 zones, and
  58445 `boss_adjust` rows. Historical rows carry their own source versions and
  `currentRuntime = false`.
- **Package-size fix** — `dist/index.mjs` no longer embeds the 37 MB runtime
  JSON artifact. Measured package-prep results:
  - `dist/index.mjs`: about 30 MB to 52.4 KB;
  - `dist/` total: about 31.7 MB to 130.83 KB;
  - npm dry-run packed size: 2.14 MiB;
  - npm dry-run unpacked size: 40.86 MiB.
- **Release size guard** — release CI now runs
  `pnpm --filter @randomplay/data verify:package-size`, which fails if packed
  size, unpacked size, `dist/index.mjs`, or total `dist` bytes exceed the
  configured thresholds.
- **Existing replay baseline preserved** — the 28-anchor golden replay remains
  the executable compatibility gate.

## Data Source Notice

`@randomplay/data` bundles cleaned ZZZ data for local damage calculation. v0.1.1
runtime data is derived from approved-live nanoka source snapshots and preserves
source metadata in the package.

Historical Deadly Assault rows are preserved for lookup and audit. They do not
authorize non-live data for current runtime output and must not be used as
current-runtime fallback.

This is not an official HoYoverse / miHoYo package. Game data, text, and images
belong to their respective rights holders. If this package infringes your
rights, contact the maintainers through a GitHub issue and we will respond
within 24-72 hours.

## Verification

Pre-release PRs passed independent QA review across the V1.2.x data batch and
package-size optimization:

- `pnpm check`
- `pnpm build`
- `pnpm test` (core 53 / data 145 / cli 27)
- `pnpm --filter @randomplay/data verify:buhflipexplode-da`
- `pnpm --filter @randomplay/data verify:excel`
- `pnpm --filter @randomplay/data verify:golden-v1`
- `pnpm --filter @randomplay/data verify:mihoyo-da`
- `pnpm --filter @randomplay/data verify:nanoka`
- `pnpm --filter @randomplay/data verify:nanoka-da-history`
- `pnpm --filter @randomplay/data verify:nanoka-runtime`
- `pnpm --filter @randomplay/data verify:package-size`
- `pnpm --filter @randomplay/data verify:source-registry`
- `pnpm --filter @randomplay/data verify:source-migration`
- `pnpm --filter @randomplay/data sync-cleaned -- --check`
- npm pack dry-run payload checks
- root import and direct JSON import smoke from the built package

Release-readiness still needs to validate the published npm packages, matching
`@randomplay/core`, `@randomplay/data`, and `@randomplay/cli` versions, SLSA
provenance, GitHub Release, fresh install/import smoke, direct JSON import
smoke, CLI smoke, and the `verify:package-size` evidence from release CI.

## Rollback

If a critical regression or takedown request surfaces after release:

1. Deprecate affected package versions on npm.
2. Open an emergency rollback/removal PR.
3. If runtime data must be restored, reactivate archived baselines only with
   explicit Product + lo-user approval.
4. Publish a replacement patch through the standard release workflow.

See `docs/data-source/takedown-rollback.md` for the detailed runbook.

## Links

- Repository — https://github.com/LoTwT/fairy
- Runtime source registry — `data/source-registry.json`
- D-20 migration decision — `docs/product/decisions/D-20-data-source-migration.md`
- Golden source coverage — `docs/qa/golden-source-coverage.md`
- Release workflow — `docs/release/README.md`
