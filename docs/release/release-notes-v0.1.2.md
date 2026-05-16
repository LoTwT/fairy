# Fairy v0.1.2 — Release Notes

> Patch release draft/reference. The release workflow generates the final
> GitHub Release body from `git-cliff`; Product/TL may copy this text into the
> release body only as part of the release operation.

## TL;DR

v0.1.2 publishes the data package ownership refactor after v0.1.1. Public
runtime APIs, cleaned JSON subpath imports, current nanoka runtime policy, and
calculator behavior remain unchanged.

The repository no longer has a root `data/` tree. `@randomplay/data` now owns
its raw nanoka source snapshots, cleaned artifacts, source registry, scripts,
tests, and package guards under `packages/data/`.

## Compatibility Notes

- `@randomplay/data` root exports and direct JSON imports such as
  `@randomplay/data/cleaned/runtime/game-data.json` remain supported.
- The npm payload still includes cleaned runtime/golden/audit artifacts,
  `source-registry.json`, and `dist`, and still excludes raw source archives,
  `.xlsx`, `src`, scripts, tests, and fixtures.
- Excel, Mihoyo D-17, and buhflipexplode D-12 are retired audit baselines. Their
  physical raw archives are removed from the current tree and recoverable only
  from git history.
- Retired source ids remain fail-loud audit references and must not be used as
  current runtime source refs.
- `sync-cleaned`, `verify:excel`, `verify:mihoyo-da`, and
  `verify:buhflipexplode-da` are removed. Use the nanoka, source-registry,
  golden, package-size, source-migration, and package payload gates instead.

## Migration Guide

For CLI users:

```bash
pnpm dlx @randomplay/cli@0.1.2 --help
pnpm dlx @randomplay/cli@0.1.2 calc <your-snapshot.json> --view brief
```

For library consumers:

```bash
pnpm add @randomplay/core@0.1.2 @randomplay/data@0.1.2
```

For repository contributors:

- use `packages/data/source/` for retained raw nanoka snapshots;
- use `packages/data/cleaned/` for canonical generated cleaned artifacts;
- use `packages/data/source-registry.json` for source policy metadata;
- do not recreate root `data/`;
- do not add `packages/data/source/**` or `.xlsx` files to npm payload rules.

## Highlights

- **Package-owned data layout** — root `data/` was removed. The data package now
  owns `source/`, `cleaned/`, `source-registry.json`, scripts, tests, and package
  guards in one package-local boundary.
- **Retired source cleanup** — Excel, Mihoyo D-17, and buhflipexplode D-12 raw
  archives, parser scripts, parser tests, and parser-only dependencies were
  removed from active code. Their source ids remain as git-history audit
  baselines.
- **Mirror removal** — `sync-cleaned` and byte-identical root/package mirror
  assertions were removed. `packages/data/cleaned/` is now the single canonical
  cleaned artifact tree.
- **Release gate alignment** — release CI now runs
  `pnpm --filter @randomplay/data verify:nanoka-da-history` and no longer runs
  retired Excel/Mihoyo/buhflipexplode source gates.
- **Package guard retained** — package-size and pack payload checks continue to
  enforce that raw source files and `.xlsx` files are not published.

## Data Source Notice

`@randomplay/data` bundles cleaned ZZZ data for local damage calculation. v0.1.2
does not add new runtime data; it reorganizes repository ownership and source
retention policy after the v0.1.1 nanoka data batch.

This is not an official HoYoverse / miHoYo package. Game data, text, and images
belong to their respective rights holders. If this package infringes your
rights, contact the maintainers through a GitHub issue and we will respond
within 24-72 hours.

## Verification

PR #89 passed Product review and independent QA review with:

- `pnpm check`
- `pnpm build`
- `pnpm test`
- `pnpm fairy:s1`
- `pnpm fairy:s2`
- `pnpm fairy:s3`
- `pnpm --filter @randomplay/data test`
- `pnpm --filter @randomplay/data check`
- `pnpm --filter @randomplay/data build`
- `pnpm --filter @randomplay/data verify:nanoka`
- `pnpm --filter @randomplay/data verify:nanoka-da-history`
- `pnpm --filter @randomplay/data verify:nanoka-runtime`
- `pnpm --filter @randomplay/data verify:golden-v1`
- `pnpm --filter @randomplay/data verify:source-registry`
- `pnpm --filter @randomplay/data verify:source-migration`
- `pnpm --filter @randomplay/data verify:package-size`
- `git diff --check`
- npm pack dry-run payload checks
- local tarball install, root import, direct JSON import, CLI help, and CLI calc
  smoke tests

Measured `@randomplay/data` dry-run package evidence:

- packed size: 2.15 MiB;
- unpacked size: 41.55 MiB;
- payload count: 31 files;
- included: cleaned runtime/golden/audit artifacts, `source-registry.json`, and
  `dist`;
- excluded: `source/`, `.xlsx`, `src`, scripts, tests, and fixtures.

Release-readiness still needs to validate the published npm packages, matching
`@randomplay/core`, `@randomplay/data`, and `@randomplay/cli` versions, SLSA
provenance, GitHub Release, fresh install/import smoke, direct JSON import
smoke, CLI smoke, and the `verify:package-size` evidence from release CI.

## Rollback

If a critical regression or takedown request surfaces after release:

1. Deprecate affected package versions on npm.
2. Open an emergency rollback/removal PR.
3. If retired sources must be restored, recover them from git history only with
   explicit Product + lo-user approval.
4. Publish a replacement patch through the standard release workflow.

See `docs/data-source/takedown-rollback.md` for the detailed runbook.

## Links

- Repository — https://github.com/LoTwT/fairy
- Runtime source registry — `packages/data/source-registry.json`
- D-20 migration decision — `docs/product/decisions/D-20-data-source-migration.md`
- Golden source coverage — `docs/qa/golden-source-coverage.md`
- Release workflow — `docs/release/README.md`
