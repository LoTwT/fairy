# Fairy v0.1.0 — Release Notes

> Schema migration release. This document is the release-notes
> draft/reference for v0.1.0. The release workflow still generates the final
> GitHub Release body from `git-cliff`; Product/TL may copy this text into the
> release body only as part of the PR3 release operation.

## TL;DR

v0.1.0 cuts Fairy's source-backed runtime data over to approved-live nanoka
(`nanoka-zzz@2.8`) and ships a nanoka-backed runtime `GameData` artifact through
`@randomplay/data`. The release keeps historical Excel, Mihoyo D-17, and
buhflipexplode D-12 snapshots as archived audit references, but they are no
longer runtime sources.

## Breaking Changes

- `@randomplay/data` now exposes nanoka runtime data as the formal V0.1.0
  runtime source. Consumers that depended on Excel/Mihoyo/buhflipexplode source
  ids as runtime provenance should migrate to `nanoka-zzz`.
- Runtime cleaned data has `sourceVersion = "nanoka-zzz@2.8"` and
  `runtimeCutoverReady = true`.
- `@randomplay/data/cleaned/runtime/game-data.json` is part of the package
  payload. Raw source archives remain repository-only and are excluded from npm
  package artifacts.
- G27 Yixuan and G28 Plugboo are executable replay anchors; the golden replay
  gate is now 28/28.

## Migration Guide

For CLI users:

```bash
pnpm dlx @randomplay/cli@0.1.0 --help
pnpm dlx @randomplay/cli@0.1.0 calc <your-snapshot.json> --view brief
```

For library consumers:

```bash
pnpm add @randomplay/core@0.1.0 @randomplay/data@0.1.0
```

If you inspect package data directly, use:

- `@randomplay/data` runtime exports for typed access;
- `@randomplay/data/cleaned/runtime/game-data.json` for the bundled runtime
  artifact;
- `@randomplay/data/cleaned/golden/v1-replay-report.json` for the 28-anchor
  replay report.

Do not treat raw Excel, Mihoyo D-17, or buhflipexplode D-12 snapshots as runtime
inputs after v0.1.0. They remain audit references and rollback evidence only.

## Highlights

- **Nanoka runtime cutover** — runtime `GameData` is generated from approved-live
  nanoka 2.8 source snapshots and exported by `@randomplay/data`.
- **28-anchor golden replay** — G01-G26 remain executable and G27/G28 add
  nanoka runtime-primary proof coverage for Yixuan and Plugboo.
- **Phase 3 drift evidence** — two drift syncs, 28 accepted rulings/proof
  anchors, and fail-loud exit evidence back the cutover.
- **Archived-source guard** — runtime data fails verification if it references
  archived Excel, Mihoyo D-17, buhflipexplode D-12, or historical manual source
  ids.
- **Release verification** — release CI runs `verify:nanoka-runtime` in addition
  to the existing source, golden, check, build, test, publish, and registry smoke
  gates.

## Data Source Notice

`@randomplay/data` bundles cleaned ZZZ data for local damage calculation. V0.1.0
runtime data is derived from approved-live nanoka source snapshots and preserves
source metadata in the package.

This is not an official HoYoverse / miHoYo package. Game data, text, and images
belong to their respective rights holders. If this package infringes your
rights, contact the maintainers through a GitHub issue and we will respond
within 24-72 hours.

## Verification

The Phase 4 PR1 cutover passed:

- `pnpm check`
- `pnpm build`
- `pnpm test` (core 53 / data 127 / cli 27)
- `pnpm --filter @randomplay/data verify:nanoka`
- `pnpm --filter @randomplay/data verify:nanoka-runtime`
- `pnpm --filter @randomplay/data verify:source-registry`
- `pnpm --filter @randomplay/data verify:source-migration`
- `pnpm --filter @randomplay/data verify:golden-v1`
- data package pack dry-run inclusion/exclusion

The V0.1.0 release also used the then-existing cleaned mirror check; that
command was retired in V0.1.2 when `packages/data/cleaned/` became the
canonical artifact tree.

PR3 release-readiness still needs to validate the published npm packages, SLSA
provenance, GitHub Release, fresh `pnpm dlx @randomplay/cli`, and import smoke
from a fresh temporary project. The workflow performs publish, GitHub Release
creation, registry availability checks, package install/import smoke, golden
report validation, and CLI smoke; SLSA provenance is a QA post-publish
release-readiness check.

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
- Runtime source registry — `packages/data/source-registry.json`
- D-20 migration decision — `docs/product/decisions/D-20-data-source-migration.md`
- Golden source coverage — `docs/qa/golden-source-coverage.md`
- Release workflow — `docs/release/README.md`
